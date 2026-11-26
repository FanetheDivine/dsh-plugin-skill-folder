// 目录折叠测试：折叠文本、未归组逐项展示、空文件夹、保持原样与 source 不变。
import { describe, expect, it } from 'vitest';
import {
  catalogBody,
  foldCatalog,
  presentedBodyOf,
  type SkillCatalogMessage,
} from '../src/catalog.ts';
import type { FolderConfig } from '../src/config.ts';
import type { SkillSummary } from '../src/skills.ts';

/** 构造一条技能摘要。 */
function summary(name: string, extra: Partial<SkillSummary> = {}): SkillSummary {
  return {
    name,
    description: `${name} 的描述`,
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'user-agents',
    provider: 'filesystem',
    ...extra,
  };
}

/** 三个全局技能与一个项目级技能。 */
const skills: SkillSummary[] = [
  summary('lark-doc', { description: '飞书文档' }),
  summary('lark-sheet', { description: '飞书表格' }),
  summary('chrome-devtools', { description: '浏览器调试' }),
  summary('project-only', {
    source: 'project-agents',
    path: 'C:/work/.agents/skills/project-only/SKILL.md',
  }),
];

/** 两个文件夹：一个命中全局技能，一个引用不存在的技能。 */
const folders: FolderConfig[] = [
  { name: 'lark', description: '飞书工具', skills: ['lark-doc', 'lark-sheet'] },
  { name: 'missing', description: '不存在的成员', skills: ['gone'] },
];

/** 一条原生目录消息。 */
function catalogMessage(names: readonly string[]): SkillCatalogMessage {
  return {
    id: 'catalog-1',
    role: 'user',
    content: [{ type: 'text', text: 'NATIVE CATALOG' }],
    source: {
      kind: 'skill-catalog',
      form: 'catalog',
      entries: names.map((name) => ({ name, description: `${name} 的描述` })),
    },
  };
}

/** 折叠后的正文文本。 */
function textOf(message: SkillCatalogMessage | undefined): string {
  const block = message?.content[0];
  return block !== undefined && block.type === 'text' ? block.text : '';
}

describe('折叠模型目录', () => {
  it('已归组的技能换成文件夹摘要，未归组技能逐项展示', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'lark-sheet', 'chrome-devtools'])], {
      skills,
      folders,
      toolVisible: true,
    });
    const text = textOf(folded);
    expect(text).toContain('`chrome-devtools`');
    expect(text).not.toContain('`lark-doc`');
    expect(text).not.toContain('`lark-sheet`');
    expect(text).toContain('`lark` (2 skills): 飞书工具');
  });

  it('引用不存在成员的文件夹不展示', () => {
    const [folded] = foldCatalog([catalogMessage(['chrome-devtools'])], {
      skills,
      folders,
      toolVisible: true,
    });
    expect(textOf(folded)).not.toContain('`missing`');
    expect(textOf(folded)).not.toContain('`lark`');
  });

  it('项目级技能逐项展示，不进入文件夹计数', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'project-only'])], {
      skills,
      folders,
      toolVisible: true,
    });
    const text = textOf(folded);
    expect(text).toContain('`project-only`');
    expect(text).toContain('`lark` (1 skills): 飞书工具');
  });

  it('简介为空时只显示名称与数量', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc'])], {
      skills,
      folders: [{ name: 'lark', description: '', skills: ['lark-doc'] }],
      toolVisible: true,
    });
    expect(textOf(folded)).toContain('`lark` (1 skills)');
    expect(textOf(folded)).not.toContain('`lark` (1 skills):');
  });

  it('没有被折叠的条目时保持原消息对象', () => {
    const original = catalogMessage(['chrome-devtools', 'project-only']);
    const [result] = foldCatalog([original], {
      skills,
      folders: [{ name: 'lark', description: '', skills: ['lark-doc'] }],
      toolVisible: true,
    });
    expect(result).toBe(original);
  });

  it('没有 skill_search 时保持原消息对象', () => {
    const original = catalogMessage(['lark-doc']);
    const [result] = foldCatalog([original], { skills, folders, toolVisible: false });
    expect(result).toBe(original);
  });

  it('非目录消息保持不变', () => {
    const user = {
      id: 'user-1',
      role: 'user',
      content: [{ type: 'text', text: 'hello' }],
      source: { kind: 'user' },
    };
    const [result] = foldCatalog([user], { skills, folders, toolVisible: true });
    expect(result).toBe(user);
  });

  it('source.entries 保持原值，只追加折叠标记', () => {
    const original = catalogMessage(['lark-doc', 'chrome-devtools']);
    const [folded] = foldCatalog([original], { skills, folders, toolVisible: true });
    expect(folded?.source).toMatchObject({
      kind: 'skill-catalog',
      form: 'catalog',
      entries: original.source.entries,
      foldedBy: 'dsh-plugin-skill-folder',
    });
  });

  it('消息 id 与 role 保持原值，供原生摘要与界面继续使用', () => {
    const original = catalogMessage(['lark-doc']);
    const [folded] = foldCatalog([original], { skills, folders, toolVisible: true });
    expect(folded?.id).toBe('catalog-1');
    expect(folded?.role).toBe('user');
  });

  it('检索不完整时只折叠已确认的技能', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc'])], {
      skills: [skills[0] as SkillSummary],
      folders,
      toolVisible: true,
    });
    expect(textOf(folded)).toContain('`lark` (1 skills)');
  });

  it('多个文件夹按配置顺序展示', () => {
    const [folded] = foldCatalog([catalogMessage(['a-x', 'b-x'])], {
      skills: [summary('a-x'), summary('b-x')],
      folders: [
        { name: 'bbb', description: '', skills: ['b-x'] },
        { name: 'aaa', description: '', skills: ['a-x'] },
      ],
      toolVisible: true,
    });
    const text = textOf(folded);
    expect(text.indexOf('`bbb`')).toBeLessThan(text.indexOf('`aaa`'));
  });

  it('文本保留原生消息首句以外的加载指引', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'chrome-devtools'])], {
      skills,
      folders,
      toolVisible: true,
    });
    const text = textOf(folded);
    expect(text).toContain('<skill_folders>');
    expect(text).toContain('`skill_search`');
    expect(text).toContain('`skill`');
  });

  it('折叠文本逐字节稳定', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'lark-sheet', 'chrome-devtools'])], {
      skills,
      folders,
      toolVisible: true,
    });
    expect(textOf(folded)).toBe(
      [
        '<system-reminder>',
        'The following skills are available in this session. Folders group their members.',
        '',
        '<available_skills>',
        '- `chrome-devtools`: chrome-devtools 的描述',
        '</available_skills>',
        '',
        '<skill_folders>',
        '- `lark` (2 skills): 飞书工具',
        '</skill_folders>',
        '',
        'Skills inside a folder stay loadable. To find one, call `skill_search` with the folder name or with capability keywords, then load the chosen skill with `skill`. Load a listed skill directly when its description matches the task.',
        '</system-reminder>',
      ].join('\n'),
    );
  });

  it('宿主标记更新时首句改为已变化', () => {
    const original = catalogMessage(['lark-doc']);
    const updating = { ...original, source: { ...original.source, update: true as const } };
    const [folded] = foldCatalog([updating], { skills, folders, toolVisible: true });
    expect(textOf(folded)).toContain(
      'The available skill catalog changed. Folders below replace their members; the skills listed above stay available.',
    );
    expect(textOf(folded)).not.toContain('The following skills are available in this session.');
  });

  it('catalogBody 从折叠文本截出正文，不含首句', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'chrome-devtools'])], {
      skills,
      folders,
      toolVisible: true,
    });
    const body = catalogBody(textOf(folded));
    expect(body?.startsWith('<available_skills>')).toBe(true);
    expect(body?.endsWith('matches the task.')).toBe(true);
    expect(body).not.toContain('The following skills are available');
  });

  it('catalogBody 从原生目录文本截出正文', () => {
    const native = [
      '<system-reminder>',
      'The following skills are available in this session.',
      '',
      '<available_skills>',
      '- `lark-doc`: 飞书文档',
      '</available_skills>',
      '',
      'Load a skill before acting.',
      '</system-reminder>',
    ].join('\n');
    const body = catalogBody(native);
    expect(body).toBe(
      [
        '<available_skills>',
        '- `lark-doc`: 飞书文档',
        '</available_skills>',
        '',
        'Load a skill before acting.',
      ].join('\n'),
    );
  });

  it('catalogBody 找不到正文标记时返回 undefined', () => {
    expect(catalogBody('普通消息')).toBeUndefined();
    expect(catalogBody('')).toBeUndefined();
  });

  it('正文与本会话已呈现的那份相同时丢弃', () => {
    const options = { skills, folders, toolVisible: true };
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'chrome-devtools'])], options);
    const presented = catalogBody(textOf(folded));
    const result = foldCatalog([catalogMessage(['lark-doc', 'chrome-devtools'])], {
      ...options,
      presented,
    });
    expect(result).toEqual([]);
  });

  it('正文变化时保留新的折叠目录', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'chrome-devtools'])], {
      skills,
      folders,
      toolVisible: true,
      presented: '旧正文',
    });
    expect(textOf(folded)).toContain('<skill_folders>');
    expect(textOf(folded)).toContain('`chrome-devtools`');
  });

  it('已呈现未知时按首次注入处理', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc'])], {
      skills,
      folders,
      toolVisible: true,
      presented: undefined,
    });
    expect(textOf(folded)).toContain('<skill_folders>');
  });

  it('没有条目被折叠时不参与判定，返回原消息对象', () => {
    const original = catalogMessage(['chrome-devtools', 'project-only']);
    const [result] = foldCatalog([original], {
      skills,
      folders,
      toolVisible: true,
      presented: catalogBody('NATIVE CATALOG'),
    });
    expect(result).toBe(original);
  });

  it('丢弃只去掉目录消息，其余消息保持原对象与顺序', () => {
    const options = { skills, folders, toolVisible: true };
    const [folded] = foldCatalog([catalogMessage(['lark-doc'])], options);
    const presented = catalogBody(textOf(folded));
    const first = {
      id: 'user-1',
      role: 'user',
      content: [{ type: 'text', text: 'hi' }],
      source: { kind: 'user' },
    };
    const last = {
      id: 'user-2',
      role: 'user',
      content: [{ type: 'text', text: 'bye' }],
      source: { kind: 'user' },
    };
    const result = foldCatalog([first, catalogMessage(['lark-doc']), last], {
      ...options,
      presented,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(last);
  });

  it('presentedBodyOf 取最后一份目录消息的正文', () => {
    const [folded] = foldCatalog([catalogMessage(['lark-doc', 'chrome-devtools'])], {
      skills,
      folders,
      toolVisible: true,
    });
    const text = textOf(folded);
    const body = presentedBodyOf([
      { role: 'assistant', source: { kind: 'assistant' }, content: [{ type: 'text', text: 'hi' }] },
      {
        role: 'user',
        source: { kind: 'skill-catalog' },
        content: [{ type: 'text', text: '旧目录' }],
      },
      { role: 'user', source: { kind: 'skill-catalog' }, content: [{ type: 'text', text }] },
    ]);
    expect(body).toBe(catalogBody(text));
  });

  it('presentedBodyOf 没有目录消息时返回 undefined', () => {
    expect(presentedBodyOf([])).toBeUndefined();
    expect(
      presentedBodyOf([
        { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'hi' }] },
      ]),
    ).toBeUndefined();
  });

  it('presentedBodyOf 遇到不可读目录消息时返回 undefined', () => {
    expect(
      presentedBodyOf([{ role: 'user', source: { kind: 'skill-catalog' }, content: 'oops' }]),
    ).toBeUndefined();
  });
});
