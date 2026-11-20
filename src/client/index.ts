/**
 * 浏览器入口：注册插件行配置页所需的中英文字典。
 * 导出 apply；前端服务按功能可选。
 */
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';

import { en, NS, zh } from './locales.ts';

/** 插件在前端启用时调用。 */
export function apply(ctx: Context): void {
  ctx.inject(['locale'], (ctx) => {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-folder: dictionaries');
  });
}
