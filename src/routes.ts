/**
 * 同源路由：向配置页提供全局技能列表与检索完整性。
 * 导出 registerSkillsRoute 与 JSON 编码辅助。
 */
import { ROUTE_PATH } from './constants.ts';
import { loadGlobalSkills, type SkillsReader } from './skills.ts';

/** 一条 Fetch 路由定义。 */
export interface ConnectionFetchRoute {
  /** 路径。 */
  path: string;
  /** 允许的方法。 */
  methods: readonly string[];
  /** 请求体读取方式。 */
  requestBody: 'buffered' | 'streaming';
  /** 处理函数。 */
  fetch: (request: Request) => Promise<Response>;
}

/** 宿主 `connection.fetch` 服务的最小面。 */
export interface ConnectionFetch {
  /** 注册路由，返回注销函数。 */
  register: (route: ConnectionFetchRoute) => () => Promise<void>;
}

/** 构造 JSON 响应。 */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** 全局技能列表响应。 */
export interface SkillsRouteBody {
  /** 列表是否完整。 */
  complete: boolean;
  /** 按名称排序的全局技能。 */
  skills: unknown[];
}

/** 读取全局技能并按约定编码；失败时返回 500 与错误文本。 */
export async function skillsResponse(reader: SkillsReader): Promise<Response> {
  try {
    const result = await loadGlobalSkills(reader);
    return jsonResponse({
      complete: result.complete,
      skills: result.skills,
    } satisfies SkillsRouteBody);
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
}

/**
 * 注册全局技能列表路由。
 * `connection` 缺失时不注册，配置页显示不可用状态。
 */
/** 注册路由所需的宿主切面。`connection` 声明来自未安装的宿主包，用结构类型代替。 */
export interface RouteHost {
  /** 等待服务就绪后执行回调。 */
  inject: (deps: readonly string[], callback: (child: ConnectionScope) => void) => unknown;
}

/** `connection` 服务的最小面。 */
export interface ConnectionScope {
  /** 连接服务。 */
  connection?: { fetch?: ConnectionFetch } | undefined;
}

export function registerSkillsRoute(ctx: RouteHost, reader: SkillsReader): void {
  ctx.inject(['connection'], (child) => {
    const fetchService = child.connection?.fetch;
    if (fetchService === undefined) {
      return;
    }
    fetchService.register({
      path: ROUTE_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => skillsResponse(reader),
    });
  });
}
