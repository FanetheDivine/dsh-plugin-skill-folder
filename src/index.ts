/**
 * 插件入口。导出宿主约定的 name、inject、apply 与 Config。
 */
import { PLUGIN_LABEL } from './constants.ts';
import type { Context } from './types.ts';

/** 插件名，与 cordis.patch.yml 的 id 一致。 */
export const name = PLUGIN_LABEL;

/** 需要宿主注入的服务。 */
export const inject = ['tools', 'skills', 'workingDirectory'];

/** 插件启用时调用。 */
export function apply(ctx: Context, config?: unknown): void {
  ctx.logger.info?.(`[${PLUGIN_LABEL}] apply: config=${JSON.stringify(config ?? null)}`);
}
