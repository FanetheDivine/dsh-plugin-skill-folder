/**
 * 插件入口。导出宿主约定的 name、inject、apply 与 Config。
 */
import { autoGroup, sameFolders } from './auto-group.ts';
import { foldCatalog, type SkillCatalogMessage } from './catalog.ts';
import { type FolderConfig, type PluginConfig, readConfig } from './config.ts';
import { PLUGIN_LABEL, TOOL_NAME } from './constants.ts';
import { type RouteHost, registerSkillsRoute } from './routes.ts';
import { buildSearchTool } from './search-tool.ts';
import type { SkillSummary } from './skills.ts';
import type { Context } from './types.ts';

export { Config } from './config.ts';

/** 插件名，与 cordis.patch.yml 的 id 一致。 */
export const name = PLUGIN_LABEL;

/** 需要宿主注入的服务。`connection` 与 `sessionQuery` 按功能可选。 */
export const inject = ['tools', 'skills', 'workingDirectory'];

/** 宿主 `skills` 服务的最小读取面。 */
interface SkillsService {
  /** 读取带完整性标记的快照。 */
  snapshot: (options: {
    cwd?: string | undefined;
    scope?: object | undefined;
    signal?: AbortSignal | undefined;
  }) => Promise<{ readonly skills: readonly SkillSummary[]; readonly complete: boolean }>;
}

/** 宿主 `tools` 服务的最小面。 */
interface ToolsService {
  /** 按名称与作用域读取工具定义。 */
  get: (toolName: string, scope?: object) => { readonly name?: string } | undefined;
  /** 注册工具定义。 */
  register: (definition: object) => () => void;
}

/** 宿主 `workingDirectory` 服务的最小面。 */
interface WorkingDirectoryService {
  /** 读取会话工作目录。 */
  ensure: (agent: object, signal?: AbortSignal) => Promise<string>;
}

/** 宿主 `agentPresets` 服务的最小面。 */
interface AgentPresetsService {
  /** 取得默认 preset 的作用域租约；不传 id 时用注册表的默认 preset。 */
  acquireScope: (id?: string) => Promise<{ readonly key: object }>;
}

/** 宿主 `configEditor` 服务的最小面。 */
interface ConfigEditorService {
  /** 校验并写入插件配置；`change` 返回下一份完整配置。 */
  edit: (
    entry: object,
    change: (
      current: Record<string, unknown>,
      inherited: Record<string, unknown>,
    ) => Record<string, unknown>,
  ) => Promise<void>;
}

/** 当前 Fiber 的配置条目。 */
interface FiberCarrier {
  /** 插件在 profile 中的装载条目。 */
  fiber?: { entry?: object } | undefined;
}

/** `skills/change` 监听面。事件由宿主 `@deepseek-ai/dsh-skill` 声明。 */
interface SkillsChangeSource {
  /** 注册监听，返回注销函数。 */
  on: (event: 'skills/change', listener: () => unknown) => () => boolean;
}

/** 一次技能快照读取。 */
type SkillSnapshot = Awaited<ReturnType<SkillsService['snapshot']>>;

/** 本插件用到的宿主服务。 */
interface PluginServices {
  /** 技能注册表。 */
  skills?: SkillsService | undefined;
  /** 工具注册表。 */
  tools?: ToolsService | undefined;
  /** 会话工作目录。 */
  workingDirectory?: WorkingDirectoryService | undefined;
  /** 按名称读取服务；宿主未装载该服务时返回 undefined。 */
  get?: ((service: string) => unknown) | undefined;
  /** 日志。 */
  logger: { info?: (message: string) => void; warn?: (message: string) => void };
}

/**
 * 释放 preset 作用域租约。
 * `Symbol.asyncDispose` 不在 `es2024` lib 里，运行时按名字取。
 */
async function releasePresetScope(lease: object): Promise<void> {
  const key = (Symbol as unknown as Record<string, symbol | undefined>)['asyncDispose'];
  if (key === undefined) return;
  const dispose = (lease as unknown as Record<symbol, unknown>)[key];
  if (typeof dispose === 'function') await (dispose as () => Promise<void>).call(lease);
}

/** 判断消息来源是否是原生技能目录。 */
function isCatalogSource(message: { source?: unknown }): boolean {
  const source = message.source as { kind?: unknown } | undefined;
  return source?.kind === 'skill-catalog';
}

/**
 * 插件启用时调用：解析配置、改写模型目录、监听配置热更新。
 * `config` 的字段是热重载引用，保存配置后读取新值。
 */
export function apply(ctx: Context, config?: unknown): void {
  let current: Readonly<PluginConfig> = readConfig(config);
  const services = ctx as unknown as PluginServices;
  services.logger.info?.(`[${PLUGIN_LABEL}] apply: folders=${String(current.folders.length)}`);

  /** 读取本 Agent 的技能快照。 */
  const readSkills = async (context: { agent?: unknown; signal?: AbortSignal | undefined }) => {
    const agent = context.agent as object | undefined;
    const cwd = await services.workingDirectory?.ensure(agent ?? {}, context.signal);
    const snapshot = await services.skills?.snapshot({
      cwd,
      scope: agent,
      signal: context.signal,
    });
    if (snapshot === undefined) throw new Error(`${PLUGIN_LABEL}: skills service unavailable`);
    return snapshot;
  };

  /** 按当前配置注册检索工具，返回注销函数。 */
  const registerTool = () => {
    const tool = buildSearchTool({
      folders: current.folders,
      defaultLimit: current.defaultLimit,
      descriptionMaxLength: current.descriptionMaxLength,
      readSkills,
      hasSkillLoader: (context) =>
        services.tools?.get('skill', context.agent as object) !== undefined,
    });
    return services.tools?.register(tool) ?? (() => undefined);
  };

  let disposeTool = registerTool();
  ctx.effect(
    () => () => {
      disposeTool();
    },
    `${PLUGIN_LABEL}: search tool`,
  );

  /**
   * 读取配置页的全局技能。
   * 默认 preset 的 `skill-filesystem` 注册在 agent 作用域，根作用域快照看不到它，
   * 因此先取默认 preset 的作用域再读；取作用域失败时退回根作用域，并把列表标记为不完整。
   */
  const readGlobalSnapshot = async (): Promise<SkillSnapshot> => {
    const skills = services.skills;
    if (skills === undefined) throw new Error(`${PLUGIN_LABEL}: skills service unavailable`);
    const presets = services.get?.('agentPresets') as AgentPresetsService | undefined;
    // 宿主没有 preset 注册表时，根作用域快照就是全部
    if (presets === undefined) return skills.snapshot({});
    let lease: { readonly key: object };
    try {
      lease = await presets.acquireScope();
    } catch (error) {
      services.logger.warn?.(`[${PLUGIN_LABEL}] preset scope unavailable: ${String(error)}`);
      const snapshot = await skills.snapshot({});
      return { skills: snapshot.skills, complete: false };
    }
    try {
      return await skills.snapshot({ scope: lease.key });
    } finally {
      await releasePresetScope(lease);
    }
  };

  // 配置页读取全局技能：按默认 preset 的作用域读取
  registerSkillsRoute(ctx as unknown as RouteHost, { snapshot: readGlobalSnapshot });

  /** 读取全局技能名。 */
  const readGlobalSkillNames = async (): Promise<string[]> => {
    const snapshot = await readGlobalSnapshot();
    return snapshot.skills.map((skill) => skill.name);
  };

  /** 按当前全局技能重算文件夹；结果与现有配置一致时返回 undefined。 */
  const planAutoGroup = async (): Promise<FolderConfig[] | undefined> => {
    const next = autoGroup(current.folders, await readGlobalSkillNames(), () => '');
    return sameFolders(next, current.folders) ? undefined : next;
  };

  /** 写回文件夹；缺少配置编辑能力时只记录警告。 */
  const writeFolders = async (folders: FolderConfig[]): Promise<void> => {
    const editor = services.get?.('configEditor') as ConfigEditorService | undefined;
    const entry = (ctx as unknown as FiberCarrier).fiber?.entry;
    if (editor === undefined || entry === undefined) {
      services.logger.warn?.(`[${PLUGIN_LABEL}] auto group skipped: config editor unavailable`);
      return;
    }
    await editor.edit(entry, (raw) => ({ ...raw, folders }));
    current = { ...current, folders };
  };

  let grouping = false;
  let regroupPending = false;

  /** 执行一次自动分组；多次触发串行，期间的触发合并为下一次。 */
  const runAutoGroup = async (): Promise<void> => {
    if (!current.alwaysGroup) return;
    if (grouping) {
      regroupPending = true;
      return;
    }
    grouping = true;
    try {
      const next = await planAutoGroup();
      if (next !== undefined) await writeFolders(next);
    } catch (error) {
      services.logger.warn?.(`[${PLUGIN_LABEL}] auto group skipped: ${String(error)}`);
    } finally {
      grouping = false;
      if (regroupPending) {
        regroupPending = false;
        void runAutoGroup();
      }
    }
  };

  ctx.effect(
    () => (ctx as unknown as SkillsChangeSource).on('skills/change', () => runAutoGroup()),
    `${PLUGIN_LABEL}: always group`,
  );

  ctx.effect(
    () =>
      ctx.on(
        'agent/pre-step',
        async ({ agent, signal }, next) => {
          const decision = await next();
          if (decision.kind === 'reject') return decision;
          // 本 Agent 看不到检索工具时保持原生行为
          const searchVisible = services.tools?.get(TOOL_NAME, agent) !== undefined;
          if (!searchVisible) return decision;
          if (!decision.messages.some(isCatalogSource)) return decision;
          const cwd = await services.workingDirectory?.ensure(agent, signal);
          let snapshot: Awaited<ReturnType<SkillsService['snapshot']>> | undefined;
          try {
            snapshot = await services.skills?.snapshot({ cwd, scope: agent, signal });
          } catch (error) {
            // 读取失败时保持原生目录，下一轮再试
            services.logger.warn?.(`[${PLUGIN_LABEL}] skill snapshot failed: ${String(error)}`);
            return decision;
          }
          if (snapshot === undefined) return decision;
          const folded = foldCatalog(decision.messages as unknown as SkillCatalogMessage[], {
            skills: snapshot.skills,
            folders: current.folders,
            toolVisible: true,
          });
          return { ...decision, messages: folded as unknown as typeof decision.messages };
        },
        { prepend: true },
      ),
    `${PLUGIN_LABEL}: catalog`,
  );

  // 热重载：读取失败时保持当前状态
  ctx.on('loader/volatile-update', () => {
    const wasAlwaysGroup = current.alwaysGroup;
    try {
      current = readConfig(config);
    } catch (error) {
      services.logger.warn?.(`[${PLUGIN_LABEL}] config update ignored: ${String(error)}`);
      return;
    }
    // 工具说明中的默认数量来自配置，重新注册以同步
    disposeTool();
    disposeTool = registerTool();
    services.logger.info?.(
      `[${PLUGIN_LABEL}] config updated: folders=${String(current.folders.length)}`,
    );
    // 勾选并保存后立即分组一次；已开启时的其他配置更新不触发
    if (!wasAlwaysGroup && current.alwaysGroup) return runAutoGroup();
    return undefined;
  });
}
