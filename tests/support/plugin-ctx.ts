// 插件 ctx 模拟：提供 skills / tools / workingDirectory，并可直接运行 agent/pre-step 监听。
import type { SkillCatalogMessage } from '../../src/catalog.ts';
import type { SkillSummary } from '../../src/skills.ts';

/** 一条监听注册记录。 */
interface ListenerRecord {
  /** 事件名。 */
  event: string;
  /** 回调。 */
  fn: (payload: unknown, next: unknown) => Promise<unknown>;
  /** 注册选项。 */
  options: unknown;
}

/** 一次日志调用。 */
export interface PluginLogCall {
  /** 级别。 */
  level: 'info' | 'warn';
  /** 参数。 */
  args: unknown[];
}

/** 工具定义的读取子集。 */
export interface ToolStub {
  /** 工具名。 */
  name?: string;
  /** 参数 schema。 */
  parameters?: { properties?: Record<string, { description?: string }> };
  /** 执行函数。 */
  execute?: (args: Record<string, unknown>, context: unknown) => Promise<unknown>;
}

/** 插件 ctx 模拟的可配置项。 */
export interface PluginCtxOptions {
  /** 宿主可见的工具名，默认包含 `skill_search` 与 `skill`。 */
  tools?: string[];
  /** 技能快照。 */
  skills?: SkillSummary[];
  /** 技能检索是否完整。 */
  complete?: boolean;
  /** 会话工作目录。 */
  cwd?: string;
  /** `connection` 服务是否可用，默认可用。 */
  connection?: boolean;
}

/** 一条注册的 Fetch 路由。 */
export interface RouteStub {
  /** 路径。 */
  path: string;
  /** 允许的方法。 */
  methods: readonly string[];
  /** 处理函数。 */
  fetch: (request: Request) => Promise<Response>;
}

/** 构造一个全局技能摘要。 */
function summary(name: string, description: string): SkillSummary {
  return {
    name,
    description,
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'user-agents',
    provider: 'filesystem',
    path: `C:/Users/me/.agents/skills/${name}/SKILL.md`,
  };
}

/** 一条原生目录消息。 */
function catalogMessage(skills: readonly SkillSummary[]): SkillCatalogMessage {
  return {
    id: 'catalog-1',
    role: 'user',
    content: [{ type: 'text', text: 'NATIVE CATALOG' }],
    source: {
      kind: 'skill-catalog',
      form: 'catalog',
      entries: skills.map((skill) => ({ name: skill.name, description: skill.description })),
    },
  };
}

/**
 * 构造插件运行所需的 ctx 模拟。
 * 提供 skills、tools、workingDirectory 与 logger，并记录事件监听、注册的工具与日志。
 */
export function makePluginCtx(options: PluginCtxOptions = {}) {
  const skills = options.skills ?? [
    summary('lark-doc', '飞书文档'),
    summary('lark-sheet', '飞书表格'),
    summary('chrome-devtools', '浏览器调试'),
  ];
  const visibleTools = new Set(options.tools ?? ['skill_search', 'skill']);
  const listeners: ListenerRecord[] = [];
  const loggerCalls: PluginLogCall[] = [];
  const registeredTools: ToolStub[] = [];
  const activeTools = new Set<ToolStub>();
  const effectDisposers: Array<() => void> = [];
  const routes: RouteStub[] = [];
  const catalog = catalogMessage(skills);

  /** 按名称读取已注册的工具。 */
  const findTool = (toolName: string): ToolStub | undefined =>
    [...activeTools].find((tool) => tool.name === toolName);

  const ctx = {
    logger: {
      info: (...args: unknown[]) => loggerCalls.push({ level: 'info', args }),
      warn: (...args: unknown[]) => loggerCalls.push({ level: 'warn', args }),
    },
    effect(fn: () => unknown) {
      const disposer = fn();
      if (typeof disposer === 'function') effectDisposers.push(disposer as () => void);
      return () => undefined;
    },
    on(event: string, fn: (payload: unknown, next: unknown) => Promise<unknown>, opts?: unknown) {
      listeners.push({ event, fn, options: opts });
      return () => undefined;
    },
    inject(deps: string[], callback: (child: unknown) => unknown) {
      if (deps.includes('connection') && options.connection === false) return () => undefined;
      callback(ctx);
      return () => undefined;
    },
    connection: {
      fetch: {
        register: (route: RouteStub) => {
          routes.push(route);
          return async () => {
            routes.splice(routes.indexOf(route), 1);
          };
        },
      },
    },
    tools: {
      // 注册不改变本 Agent 的可见性：只有宿主报告的工具名才可见
      get: (toolName: string) =>
        visibleTools.has(toolName) ? (findTool(toolName) ?? { name: toolName }) : undefined,
      register: (definition: ToolStub) => {
        registeredTools.push(definition);
        activeTools.add(definition);
        return () => {
          activeTools.delete(definition);
        };
      },
    },
    skills: {
      snapshot: async (input: Record<string, unknown>) => {
        const reader = ctx.snapshot;
        if (reader === undefined) throw new Error('没有技能快照');
        return reader(input);
      },
      list: async () => skills,
    },
    workingDirectory: {
      ensure: async () => options.cwd ?? 'C:/workspace',
    },
    /** 技能快照读取，测试可替换。 */
    snapshot: (async () => ({
      skills,
      complete: options.complete ?? true,
    })) as
      | ((input: Record<string, unknown>) => Promise<{
          skills: readonly SkillSummary[];
          complete: boolean;
        }>)
      | undefined,
    /** 测试用的技能集合。 */
    skillsFixture: skills,
    /** 测试用的原生目录消息。 */
    catalog,
    _loggerCalls: loggerCalls,
    _listeners: listeners,
    _registeredTools: registeredTools,
    _routes: routes,
    _activeTools: activeTools,
    /** 读取某事件的注册选项。 */
    _onOptions: (event: string) => listeners.find((entry) => entry.event === event)?.options,
    /** 触发一个 emit 事件。 */
    _emit: (event: string, ...args: unknown[]) => {
      for (const entry of listeners.filter((item) => item.event === event)) {
        void entry.fn(args[0], undefined);
      }
    },
    /** 运行全部 agent/pre-step 监听，返回最外层结果。 */
    _runPreStep: async (payload: unknown, next: () => Promise<unknown>) => {
      const chain = listeners
        .filter((entry) => entry.event === 'agent/pre-step')
        .map((entry) => entry.fn);
      const run = async (index: number): Promise<unknown> =>
        index >= chain.length
          ? next()
          : (chain[index] as (p: unknown, n: () => Promise<unknown>) => Promise<unknown>)(
              payload,
              () => run(index + 1),
            );
      return run(0);
    },
    /** 判断某个工具当前是否已注册。 */
    _hasTool: (toolName: string) => findTool(toolName) !== undefined,
    /** 模拟插件卸载：执行全部 effect 清理函数。 */
    _dispose: () => {
      for (const disposer of effectDisposers.splice(0).reverse()) disposer();
    },
  };
  return ctx;
}
