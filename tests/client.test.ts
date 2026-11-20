// 前端入口接线测试：服务分组、字典键集、配置页注册参数与中英文渲染。
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { parseSkillsPayload } from '../src/client/api.ts';
import { autoGroup as autoGroupFolders } from '../src/client/auto-group.ts';
import { type FolderFormState, ROW_ID, ROW_KEY } from '../src/client/folder-form.ts';
import {
  collapsedAfterRemoval,
  effectiveFolderCollapsed,
  FolderPage,
  filterSkillNames,
} from '../src/client/folder-page.tsx';
import * as clientEntry from '../src/client/index.ts';
import { en, NS, zh } from '../src/client/locales.ts';
import { type ClientServiceName, makeClientCtx } from './helpers.ts';

const { apply } = clientEntry;
const ALL_SERVICES: ClientServiceName[] = ['slots', 'locale', 'configForms'];

/** 用字典与 `{name}` 模板参数构造翻译函数，行为与宿主 locale 座一致。 */
function translate(dict: Record<string, string>): TranslateNS<typeof NS> {
  return (key, params) =>
    (dict[key] ?? key).replace(/\{(\w+)\}/g, (_match, name: string) =>
      String(params?.[name] ?? ''),
    );
}

/** 配置页的草稿状态。 */
function pageState(overrides: Partial<FolderFormState> = {}): FolderFormState {
  return {
    available: true,
    writable: true,
    dirty: false,
    invalid: false,
    saving: false,
    failed: false,
    folders: {
      text: JSON.stringify([{ name: 'lark', description: '飞书', skills: ['lark-doc'] }]),
      overridden: true,
      invalid: false,
    },
    defaultLimit: { text: '5', overridden: false, invalid: false },
    descriptionMaxLength: { text: '320', overridden: false, invalid: false },
    ...overrides,
  };
}

/** 渲染配置页：用假的选择器 Hook 返回给定状态。 */
function renderPage(
  view: 'page' | 'summary',
  dict: Record<string, string>,
  state = pageState(),
): string {
  const props = {
    view,
    t: translate(dict),
    useConfigForm: <S>(select: (value: FolderFormState) => S): S => select(state),
    edit: vi.fn(),
    resetField: vi.fn(),
    save: vi.fn(),
    discard: vi.fn(),
    addFolder: vi.fn(),
    renameFolder: vi.fn(),
    describeFolder: vi.fn(),
    removeFolder: vi.fn(),
    moveSkill: vi.fn(),
    replaceFolders: vi.fn(),
    loadSkills: () => new Promise(() => undefined),
  };
  return renderToStaticMarkup(createElement(FolderPage, props as never));
}

describe('前端入口', () => {
  it('不声明必需服务，按功能分组等待各自用到的服务', () => {
    expect('inject' in clientEntry).toBe(false);
    const ctx = makeClientCtx();
    apply(ctx);
    expect(ctx._injectGroups).toEqual([['locale'], ['slots', 'locale', 'configForms']]);
  });

  it('注册双语字典与插件行配置页', () => {
    const ctx = makeClientCtx();
    apply(ctx);
    expect(ctx._localeRegistrations.map((entry) => entry.ns)).toEqual([NS]);
    expect(Object.keys(ctx._localeRegistrations[0]?.dicts ?? {}).sort()).toEqual(['en', 'zh']);
    expect(ctx._slotInjections).toEqual(['plugins.row.config']);
    expect(ctx._slotRegistrations[0]?.options).toMatchObject({
      name: 'plugins.row.config',
      key: ROW_KEY,
      locale: NS,
    });
    expect(ctx._slotRegistrations[0]?.component).toBe(FolderPage);
    expect(ctx._configFormRequests).toEqual([ROW_ID]);
    expect(ROW_KEY).toBe('dsh-plugin-skill-folder#dsh-plugin-skill-folder');
  });

  it('注入值包含表单动作与技能读取', () => {
    const ctx = makeClientCtx();
    apply(ctx);
    const inject = ctx._slotRegistrations[0]?.options['inject'] as () => Record<string, unknown>;
    const injected = inject();
    for (const key of [
      'save',
      'discard',
      'edit',
      'resetField',
      'addFolder',
      'moveSkill',
      'loadSkills',
    ]) {
      expect(typeof injected[key]).toBe('function');
    }
  });

  it('卸载时释放配置表单的订阅', () => {
    const ctx = makeClientCtx();
    apply(ctx);
    const scope = ctx._configFormScopes[0];
    expect(scope?.subscriberCount()).toBe(1);
    ctx._dispose();
    expect(scope?.subscriberCount()).toBe(0);
  });
});

describe('前端服务可选', () => {
  /** 三个服务各有或无的全部 8 种组合。 */
  const combinations: ClientServiceName[][] = Array.from({ length: 8 }, (_, mask) =>
    ALL_SERVICES.filter((_name, index) => (mask >> index) & 1),
  );

  it.each(combinations.map((services) => [services]))('服务 %j 可用时启用成功', (services) => {
    const ctx = makeClientCtx({ services });
    expect(() => apply(ctx)).not.toThrow();
    const configPage = ALL_SERVICES.every((name) => services.includes(name));
    expect(ctx._activeSlots.size).toBe(configPage ? 1 : 0);
    expect(ctx._activeLocales.size).toBe(services.includes('locale') ? 1 : 0);
  });

  it('configForms 晚就绪后配置页自动注册', () => {
    const ctx = makeClientCtx({ services: ['slots', 'locale'] });
    apply(ctx);
    expect(ctx._activeSlots.size).toBe(0);
    ctx._grant('configForms');
    expect(ctx._activeSlots.size).toBe(1);
  });

  it('服务撤掉后清理配置页并释放订阅', () => {
    const ctx = makeClientCtx();
    apply(ctx);
    ctx._revoke('configForms');
    expect(ctx._activeSlots.size).toBe(0);
    expect(ctx._configFormScopes[0]?.subscriberCount()).toBe(0);
  });
});

describe('字典', () => {
  it('中英字典键集一致且无空文案', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
    expect(Object.values(zh).every((text) => text.trim() !== '')).toBe(true);
    expect(Object.values(en).every((text) => text.trim() !== '')).toBe(true);
  });
});

describe('配置页渲染', () => {
  it('summary 渲染一行描述', () => {
    expect(renderPage('summary', zh)).toContain('把全局技能归入文件夹');
    expect(renderPage('summary', en)).toContain('Group global skills into folders');
  });

  it('page 渲染工具栏、文件夹卡片、未分组区域与搜索选项', () => {
    const html = renderPage('page', zh);
    expect(html).toContain('data-skill-folder-page');
    expect(html).toContain('新建文件夹');
    expect(html).toContain('data-folder-card="lark"');
    expect(html).toContain('value="lark"');
    expect(html).toContain('value="飞书"');
    expect(html).toContain('data-skill-chip="lark-doc"');
    expect(html).toContain('data-ungrouped');
    expect(html).toContain('未分组的技能');
    expect(html).toContain('正在读取技能…');
    expect(html).toContain('data-skill-folder-options');
    expect(html).toContain('默认返回数量');
    expect(html).toContain('摘要长度上限');
    expect(html).toContain('保存');
  });

  it('页面提供标题、用途说明、操作区与自适应文件夹网格', () => {
    const html = renderPage('page', zh);
    expect(html).toContain('<h2');
    expect(html).toContain('技能文件夹');
    expect(html).toContain('按用途整理全局技能');
    expect(html).toContain('data-skill-folder-toolbar');
    expect(html).toContain('data-skill-folder-grid');
    expect(html).toContain('grid-template-columns:repeat(auto-fit');
    expect(html).toContain('data-skill-folder-focus-styles');
  });

  it('page 渲染英文文案', () => {
    const html = renderPage('page', en);
    expect(html).toContain('New folder');
    expect(html).toContain('Ungrouped skills');
    expect(html).toContain('Save');
  });

  it('文件夹提供带可访问名称与展开状态的折叠按钮', () => {
    const html = renderPage('page', zh);
    expect(html).toMatch(/<button[^>]*aria-label="折叠 lark"[^>]*aria-expanded="true"/);
    expect(html).toContain('data-folder-members="lark"');
    expect(html).toContain('共 1 个技能');
  });

  it('成员带「移动到」下拉框，选项包含未分组与全部文件夹', () => {
    const html = renderPage('page', zh);
    expect(html).toMatch(/<select[^>]*aria-label="移动到 lark-doc"/);
    expect(html).toContain('<option value="">未分组</option>');
    expect(html).toContain('<option value="lark" selected="">lark</option>');
    expect(html).toContain('data-skill-move="lark-doc"');
    expect(html).toContain('data-skill-drag-handle="lark-doc"');
    expect(html).toContain('aria-label="拖拽 lark-doc"');
  });

  it('文件夹名称为空时显示错误并标记输入框', () => {
    const html = renderPage(
      'page',
      zh,
      pageState({
        invalid: true,
        folders: {
          text: JSON.stringify([{ name: '', description: '', skills: [] }]),
          overridden: true,
          invalid: true,
        },
      }),
    );
    expect(html).toContain('文件夹名称不能为空。');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-errormessage="[^"]+"/);
    expect(html).toContain('文件夹配置有误，修正后才能保存。');
  });

  it('筛选输入关联实时结果计数，并提供状态与焦点语义', () => {
    const html = renderPage('page', zh);
    expect(html).toMatch(/<input[^>]*aria-label="筛选技能"[^>]*aria-describedby="[^"]+"/);
    expect(html).toMatch(/<span[^>]*id="[^"]+"[^>]*role="status"[^>]*aria-live="polite"/);
    expect(html).toContain('role="status"');
    expect(html).toContain('data-skill-folder-focus-styles');
    expect(html).toContain(':focus-visible');
  });

  it('提供自动分组规则与移动操作的实时播报区域', () => {
    const html = renderPage('page', zh);
    expect(html).toContain('先按文件夹名匹配');
    expect(html).toContain('data-skill-folder-live');
    expect(html).toContain('aria-live="polite"');
  });

  it('英文界面包含新增的页面、筛选与折叠文案', () => {
    const html = renderPage('page', en);
    expect(html).toContain('Organize global skills by purpose');
    expect(html).toContain('1 skills');
    expect(html).toContain('aria-label="Collapse lark"');
  });

  it('只读时禁用编辑控件与保存', () => {
    const html = renderPage('page', zh, pageState({ writable: false }));
    expect(html).toContain('此部署以只读方式保存设置。');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>新建文件夹/);
    expect(html).toMatch(/<input[^>]*aria-label="文件夹名称"[^>]*disabled/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>保存/);
  });

  it('数量越界时显示字段错误并阻止保存', () => {
    const html = renderPage(
      'page',
      zh,
      pageState({ invalid: true, defaultLimit: { text: '99', overridden: true, invalid: true } }),
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>保存/);
  });

  it('保存失败时显示提示并保留草稿', () => {
    const html = renderPage('page', zh, pageState({ dirty: true, failed: true }));
    expect(html).toContain('此部署未接受这些值，已保留以便修改。');
    expect(html).toContain('value="lark"');
  });

  it('已覆盖的字段显示恢复默认', () => {
    const html = renderPage(
      'page',
      zh,
      pageState({ defaultLimit: { text: '7', overridden: true, invalid: false } }),
    );
    expect(html).toContain('已覆盖');
    expect(html).toContain('恢复默认');
  });

  it('命名空间未下发时显示不可用文案', () => {
    expect(renderPage('page', zh, pageState({ available: false }))).toContain(
      '技能文件夹配置不可用。',
    );
  });

  it('列表读取中时未分组区域不下「全部已分组」的结论', () => {
    const html = renderPage('page', zh);
    expect(html).not.toContain('全部技能都已分组。');
    expect(html.match(/正在读取技能…/g)?.length).toBe(2);
  });

  it('有未保存修改时显示放弃按钮', () => {
    expect(renderPage('page', zh, pageState({ dirty: true }))).toContain('放弃修改');
    expect(renderPage('page', zh)).not.toContain('放弃修改');
  });
});

describe('配置页临时视图状态', () => {
  it('筛选同时匹配名称与描述，并忽略大小写和首尾空白', () => {
    const descriptions = new Map([
      ['lark-doc', 'Manage documents'],
      ['lark-sheet', 'Manage sheets'],
      ['x-calendar', 'Calendar tools'],
    ]);
    expect(
      filterSkillNames(['lark-doc', 'lark-sheet', 'x-calendar'], descriptions, ' LARK-DOC '),
    ).toEqual(['lark-doc']);
    expect(
      filterSkillNames(['lark-doc', 'lark-sheet', 'x-calendar'], descriptions, 'sheets'),
    ).toEqual(['lark-sheet']);
    expect(filterSkillNames(['lark-doc'], descriptions, 'missing')).toEqual([]);
  });

  it('筛选激活时临时展开有匹配项的文件夹', () => {
    expect(effectiveFolderCollapsed(true, true, 1)).toBe(false);
    expect(effectiveFolderCollapsed(true, true, 0)).toBe(true);
    expect(effectiveFolderCollapsed(true, false, 1)).toBe(true);
    expect(effectiveFolderCollapsed(false, true, 1)).toBe(false);
  });

  it('删除文件夹后折叠下标跟随原文件夹移动', () => {
    expect([...collapsedAfterRemoval(new Set([1, 3]), 1)]).toEqual([2]);
    expect([...collapsedAfterRemoval(new Set([0, 2]), 0)]).toEqual([1]);
    expect([...collapsedAfterRemoval(new Set([0, 1]), 3)]).toEqual([0, 1]);
  });
});

describe('技能列表响应', () => {
  it('解析路由返回的条目与完整性', () => {
    expect(
      parseSkillsPayload({
        complete: false,
        skills: [{ name: 'a', description: 'A', source: 'user-agents' }, { bogus: true }],
      }),
    ).toEqual({
      complete: false,
      skills: [{ name: 'a', description: 'A', source: 'user-agents' }],
    });
  });

  it('结构不符时报错', () => {
    expect(() => parseSkillsPayload({ nope: 1 })).toThrow('unexpected skills response');
  });
});

describe('按前缀自动分组', () => {
  it('页面渲染自动分组按钮', () => {
    expect(renderPage('page', zh)).toContain('按前缀自动分组');
    expect(renderPage('page', en)).toContain('Group by prefix');
  });

  it('把未分组技能按前缀写入文件夹，简介按当前语言生成', () => {
    expect(
      autoGroupFolders([], ['lark-a', 'lark-b', 'x-c'], (prefix) => `${prefix} 系列技能`),
    ).toEqual([{ name: 'lark', description: 'lark 系列技能', skills: ['lark-a', 'lark-b'] }]);
  });

  it('保留已分组技能的归属与现有文件夹顺序', () => {
    const result = autoGroupFolders(
      [
        { name: 'keep', description: '保留', skills: ['lark-a'] },
        { name: 'lark', description: '', skills: [] },
      ],
      ['lark-a', 'lark-b', 'lark-c'],
      (prefix) => prefix,
    );
    expect(result.map((folder) => [folder.name, folder.skills])).toEqual([
      ['keep', ['lark-a']],
      ['lark', ['lark-b', 'lark-c']],
    ]);
  });
});
