/**
 * 浏览器入口：注册中英文字典与“插件”页的技能文件夹配置页。
 * 导出 apply；前端服务按功能可选。
 */
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';
// Type-only：拉取 plugins.row.config 槽位声明。
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
// Type-only：拉取 ctx.slots 服务。
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
// Type-only：拉取 ctx.configForms 服务。
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';

import { fetchSkills } from './api.ts';
import { type FolderFields, FolderForm, ROW_ID, ROW_KEY } from './folder-form.ts';
import { FolderPage } from './folder-page.tsx';
import { en, NS, zh } from './locales.ts';

/**
 * 插件在前端启用时调用。
 * 每个功能用 `ctx.inject` 只等待自己用到的服务：服务缺失时该功能不加载，就绪后加载，撤掉后卸载。
 */
export function apply(ctx: Context): void {
  // 字典
  ctx.inject(['locale'], (ctx) => {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-folder: dictionaries');
  });

  // 配置页：宿主为该行提供的表单命名空间是行 id
  ctx.inject(['slots', 'locale', 'configForms'], (ctx) => {
    const form = new FolderForm(ctx.configForms.get<FolderFields>(ROW_ID));
    ctx.effect(
      () => () => {
        form.dispose();
      },
      'skill-folder: config form',
    );
    ctx.slots.inject('plugins.row.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.row.config',
          key: ROW_KEY,
          locale: NS,
          inject: () => ({ ...form.inject(), loadSkills: fetchSkills }),
        },
        FolderPage,
      ),
    );
  });
}
