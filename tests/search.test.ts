// 搜索测试：分词、排序、准确名称优先、分页、截断、按文件夹列出与参数校验。
import { describe, expect, it } from 'vitest';

import type { FolderConfig } from '../src/config.ts';
import { queryTerms, rankSkills, shorten } from '../src/search.ts';
import type { SkillSummary } from '../src/skills.ts';

/** 构造一条技能摘要。 */
function summary(
  name: string,
  description: string,
  extra: Partial<SkillSummary> = {},
): SkillSummary {
  return {
    name,
    description,
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'user-agents',
    provider: 'filesystem',
    ...extra,
  };
}

/** 搜索用的技能集合。 */
const skills: SkillSummary[] = [
  summary('lark-calendar', '飞书日历：创建日程与会议邀请'),
  summary('lark-sheets', '飞书电子表格：创建工作表'),
  summary('chrome-devtools', '浏览器调试与自动化'),
  summary('private-skill', '日历', { invocation: { modelInvocable: false, userInvocable: true } }),
];

/** 两个文件夹。 */
const folders: FolderConfig[] = [
  { name: 'lark', description: '飞书工具', skills: ['lark-calendar', 'lark-sheets'] },
  { name: 'web', description: '网页工具', skills: ['chrome-devtools'] },
];

describe('分词', () => {
  it('拆出英文词并丢弃停用词', () => {
    expect(queryTerms('find the chrome devtools')).toEqual(['chrome', 'devtools']);
  });

  it('中文按二字组切分', () => {
    expect(queryTerms('飞书日历')).toEqual(['飞书', '书日', '日历']);
  });

  it('两个汉字的中文词整体保留', () => {
    expect(queryTerms('日历')).toEqual(['日历']);
  });

  it('只包含停用词时没有查询词', () => {
    expect(queryTerms('please search skills for me')).toEqual([]);
  });

  it('保留带连字符的名称', () => {
    expect(queryTerms('lark-calendar')).toEqual(['lark-calendar']);
  });
});

describe('排序', () => {
  it('准确名称优先于其他命中', () => {
    const result = rankSkills(skills, 'chrome-devtools', { folders, limit: 5, offset: 0 });
    expect(result.results[0]?.name).toBe('chrome-devtools');
    expect(result.results[0]?.match).toBe('exact');
  });

  it('名称命中排在描述命中之前', () => {
    const result = rankSkills(skills, 'lark', { folders, limit: 5, offset: 0 });
    expect(result.results.map((item) => item.name)).toEqual(['lark-calendar', 'lark-sheets']);
  });

  it('中文关键词命中中文描述', () => {
    const result = rankSkills(skills, '电子表格', { folders, limit: 5, offset: 0 });
    expect(result.results[0]?.name).toBe('lark-sheets');
  });

  it('只包含停用词时没有结果', () => {
    expect(rankSkills(skills, 'please find skills', { folders, limit: 5, offset: 0 }).total).toBe(
      0,
    );
  });

  it('仅用户可调用的技能不出现在结果中', () => {
    const result = rankSkills(skills, '日历', { folders, limit: 5, offset: 0 });
    expect(result.results.some((item) => item.name === 'private-skill')).toBe(false);
  });

  it('结果带上所属文件夹，未归组时为 null', () => {
    const result = rankSkills([...skills, summary('loose-skill', '日历相关')], '日历', {
      folders,
      limit: 5,
      offset: 0,
    });
    expect(result.results.find((item) => item.name === 'lark-calendar')?.folder).toBe('lark');
    expect(result.results.find((item) => item.name === 'loose-skill')?.folder).toBeNull();
  });

  it('相关度相同时按名称稳定排序', () => {
    const same = [summary('b-skill', '测试'), summary('a-skill', '测试')];
    const result = rankSkills(same, '测试', { folders: [], limit: 5, offset: 0 });
    expect(result.results.map((item) => item.name)).toEqual(['a-skill', 'b-skill']);
  });
});

describe('按文件夹列出', () => {
  it('返回该文件夹的全部可用成员', () => {
    const result = rankSkills(skills, undefined, { folders, folder: 'lark', limit: 20, offset: 0 });
    expect(result.results.map((item) => item.name)).toEqual(['lark-calendar', 'lark-sheets']);
    expect(result.results.every((item) => item.match === 'folder')).toBe(true);
    expect(result.total).toBe(2);
  });

  it('文件夹名忽略大小写', () => {
    const result = rankSkills(skills, undefined, { folders, folder: 'LARK', limit: 20, offset: 0 });
    expect(result.total).toBe(2);
  });

  it('未找到的文件夹返回空结果', () => {
    const result = rankSkills(skills, undefined, { folders, folder: 'nope', limit: 20, offset: 0 });
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('同时给出关键词时只在该文件夹内搜索', () => {
    const result = rankSkills(skills, '表格', {
      folders,
      folder: 'lark',
      limit: 20,
      offset: 0,
    });
    expect(result.results.map((item) => item.name)).toEqual(['lark-sheets']);
  });
});

describe('分页', () => {
  const many = Array.from({ length: 12 }, (_, index) =>
    summary(`test-${String(index).padStart(2, '0')}`, '测试技能'),
  );

  it('返回 limit 条并从 offset 开始', () => {
    const first = rankSkills(many, '测试', { folders: [], limit: 5, offset: 0 });
    const second = rankSkills(many, '测试', { folders: [], limit: 5, offset: 5 });
    expect(first.total).toBe(12);
    expect(first.results).toHaveLength(5);
    expect(first.more).toBe(true);
    expect(second.results[0]?.name).toBe('test-05');
  });

  it('最后一页 more 为 false', () => {
    const last = rankSkills(many, '测试', { folders: [], limit: 5, offset: 10 });
    expect(last.results).toHaveLength(2);
    expect(last.more).toBe(false);
  });

  it('offset 超过总数时返回空页', () => {
    const empty = rankSkills(many, '测试', { folders: [], limit: 5, offset: 20 });
    expect(empty.results).toEqual([]);
    expect(empty.more).toBe(false);
  });
});

describe('摘要截断', () => {
  it('超过上限时截断并加省略号', () => {
    expect(shorten('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`);
  });

  it('未超过上限时原样返回', () => {
    expect(shorten('short', 10)).toBe('short');
  });

  it('压缩连续空白', () => {
    expect(shorten('a   b\n c', 20)).toBe('a b c');
  });

  it('按字符而不是字节计数，中文不被截断在半个字上', () => {
    expect(Array.from(shorten('中'.repeat(500), 320))).toHaveLength(320);
  });

  it('搜索结果描述按上限截断', () => {
    const long = [summary('long-skill', '长'.repeat(500))];
    const result = rankSkills(long, 'long-skill', {
      folders: [],
      limit: 5,
      offset: 0,
      descriptionMaxLength: 40,
    });
    expect(Array.from(result.results[0]?.description ?? '')).toHaveLength(40);
  });
});
