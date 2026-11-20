// 自动分组测试：文件夹名匹配、最长名称优先、首段前缀合并、成员下限与组名规则。
import { describe, expect, it } from 'vitest';
import { autoGroup, longestSegmentPrefix, segmentPrefix } from '../src/client/auto-group.ts';
import type { FolderConfig } from '../src/config.ts';

/** 生成简介：`<前缀> 系列技能`。 */
const makeDescription = (prefix: string) => `${prefix} 系列技能`;

/** 简化断言用的文件夹投影。 */
function shape(folders: readonly FolderConfig[]) {
  return folders.map((folder) => ({ name: folder.name, skills: folder.skills }));
}

describe('分段前缀', () => {
  it('取第一个 - 之前的部分', () => {
    expect(segmentPrefix('lark-doc-a')).toBe('lark');
    expect(segmentPrefix('single')).toBe('single');
  });

  it('取成员按 - 分段的最长公共前缀', () => {
    expect(longestSegmentPrefix(['lark-doc-a', 'lark-doc-b'])).toBe('lark-doc');
    expect(longestSegmentPrefix(['lark-doc-a', 'lark-sheet'])).toBe('lark');
    expect(longestSegmentPrefix(['a', 'b'])).toBe('');
    expect(longestSegmentPrefix([])).toBe('');
  });
});

describe('按文件夹名匹配', () => {
  it('名称等于文件夹名或以「文件夹名-」开头时进入该文件夹', () => {
    const folders: FolderConfig[] = [{ name: 'lark', description: '飞书', skills: [] }];
    const result = autoGroup(folders, ['lark', 'lark-doc', 'chrome-devtools'], makeDescription);
    // 同名技能与同前缀技能进入已有文件夹；独占首段前缀的技能保持未分组
    expect(shape(result)).toEqual([{ name: 'lark', skills: ['lark', 'lark-doc'] }]);
  });

  it('一个技能匹配多个文件夹时进入名称最长的那个', () => {
    const folders: FolderConfig[] = [
      { name: 'lark', description: '', skills: [] },
      { name: 'lark-doc', description: '', skills: [] },
    ];
    const result = autoGroup(folders, ['lark-doc-write'], makeDescription);
    expect(shape(result)).toEqual([
      { name: 'lark', skills: [] },
      { name: 'lark-doc', skills: ['lark-doc-write'] },
    ]);
  });

  it('已分组的成员保持原有归属', () => {
    const folders: FolderConfig[] = [{ name: 'lark', description: '', skills: ['lark-doc'] }];
    const result = autoGroup(folders, ['lark-doc', 'lark-sheet'], makeDescription);
    expect(result[0]?.skills).toEqual(['lark-doc', 'lark-sheet']);
  });
});

describe('按前缀合并', () => {
  it('同一首段前缀合并为一组，组名取最长分段公共前缀', () => {
    const result = autoGroup(
      [],
      ['lark-doc-a', 'lark-doc-b', 'lark-sheet', 'lark-calendar'],
      makeDescription,
    );
    expect(shape(result)).toEqual([
      { name: 'lark', skills: ['lark-calendar', 'lark-doc-a', 'lark-doc-b', 'lark-sheet'] },
    ]);
    expect(result[0]?.description).toBe(makeDescription('lark'));
  });

  it('只有两个文档类技能时组名为 lark-doc', () => {
    const result = autoGroup([], ['lark-doc-a', 'lark-doc-b'], makeDescription);
    expect(shape(result)).toEqual([{ name: 'lark-doc', skills: ['lark-doc-a', 'lark-doc-b'] }]);
  });

  it('成员少于 2 个不建组', () => {
    expect(autoGroup([], ['lark-calendar'], makeDescription)).toEqual([]);
  });

  it('不同首段前缀各自成组', () => {
    const result = autoGroup([], ['lark-a', 'lark-b', 'x-c', 'x-d'], makeDescription);
    expect(shape(result)).toEqual([
      { name: 'lark', skills: ['lark-a', 'lark-b'] },
      { name: 'x', skills: ['x-c', 'x-d'] },
    ]);
  });

  it('与现有文件夹重名时并入该文件夹', () => {
    const folders: FolderConfig[] = [{ name: 'lark', description: '飞书', skills: [] }];
    const result = autoGroup(folders, ['lark-a', 'lark-b'], makeDescription);
    expect(shape(result)).toEqual([{ name: 'lark', skills: ['lark-a', 'lark-b'] }]);
    expect(result[0]?.description).toBe('飞书');
  });

  it('名称忽略大小写并入现有文件夹', () => {
    const folders: FolderConfig[] = [{ name: 'Lark', description: '', skills: [] }];
    const result = autoGroup(folders, ['lark-a', 'lark-b'], makeDescription);
    expect(shape(result)).toEqual([{ name: 'Lark', skills: ['lark-a', 'lark-b'] }]);
  });

  it('没有可用前缀时保持原文件夹列表', () => {
    const folders: FolderConfig[] = [{ name: 'keep', description: '', skills: ['a'] }];
    expect(autoGroup(folders, ['a', 'b', 'c'], makeDescription)).toEqual(folders);
  });
});

describe('顺序与稳定性', () => {
  it('保留现有文件夹顺序，新文件夹按前缀排序追加在后', () => {
    const folders: FolderConfig[] = [{ name: 'zzz', description: '', skills: [] }];
    const result = autoGroup(folders, ['x-a', 'x-b', 'lark-a', 'lark-b'], makeDescription);
    expect(result.map((folder) => folder.name)).toEqual(['zzz', 'lark', 'x']);
  });

  it('成员按名称排序', () => {
    const result = autoGroup([], ['x-c', 'x-a', 'x-b'], makeDescription);
    expect(result[0]?.skills).toEqual(['x-a', 'x-b', 'x-c']);
  });

  it('重复执行结果一致', () => {
    const once = autoGroup([], ['lark-a', 'lark-b'], makeDescription);
    const twice = autoGroup(once, ['lark-a', 'lark-b'], makeDescription);
    expect(shape(twice)).toEqual(shape(once));
  });
});
