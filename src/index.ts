/**
 * 插件入口。导出宿主约定的 name、inject、apply 与 Config。
 */
import { foldCatalog, type SkillCatalogMessage } from './catalog.ts';
import { type PluginConfig, readConfig } from './config.ts';
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

/** 本插件用到的宿主服务。 */
interface PluginServices {
  /** 技能注册表。 */
  skills?: SkillsService | undefined;
  /** 工具注册表。 */
  tools?: ToolsService | undefined;
  /** 会话工作目录。 */
  workingDirectory?: WorkingDirectoryService | undefined;
  /** 日志。 */
  logger: { info?: (message: string) => void; warn?: (message: string) => void };
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

  // 配置页读取全局技能：不传工作区与作用域，只得到全局集合
  registerSkillsRoute(ctx as unknown as RouteHost, {
    snapshot: async () => {
      const snapshot = await services.skills?.snapshot({});
      if (snapshot === undefined) throw new Error(`${PLUGIN_LABEL}: skills service unavailable`);
      return snapshot;
    },
  });

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
  });
}
