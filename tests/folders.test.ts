// 文件夹规则测试：按技能名查文件夹、按文件夹查成员、未分组集合与校验。
import { describe, expect, it } from 'vitest';

import {
  autoGroupNameKey,
  describeFolders,
  folderByName,
  folderNamesOf,
  membersOf,
  ungroupedOf,
  validateFolders,
} from '../src/folders.ts';

/** 三个文件夹：两个带成员，一个为空。 */
const folders = [
  { name: 'lark', description: '飞书', skills: ['lark-doc', 'lark-sheet'] },
  { name: 'x', description: '', skills: ['x-card'] },
  { name: 'empty', description: '', skills: [] },
];

describe('按文件夹名查找', () => {
  it('忽略大小写', () => {
    expect(folderByName(folders, 'LARK')?.name).toBe('lark');
    expect(folderByName(folders, 'missing')).toBeUndefined();
  });
});

describe('成员与未分组', () => {
  it('按文件夹取成员', () => {
    expect(membersOf(folders, 'x')).toEqual(['x-card']);
    expect(membersOf(folders, 'empty')).toEqual([]);
  });

  it('未分组集合按名称排序', () => {
    expect(ungroupedOf(folders, ['lark-doc', 'zeta', 'alpha'])).toEqual(['alpha', 'zeta']);
  });

  it('全部已分组时未分组集合为空', () => {
    expect(ungroupedOf(folders, ['x-card'])).toEqual([]);
  });
});

describe('文件夹名列表', () => {
  it('只列出有成员的文件夹', () => {
    expect(folderNamesOf(folders)).toEqual(['lark', 'x']);
  });

  it('比较键忽略大小写', () => {
    expect(autoGroupNameKey('Lark')).toBe('lark');
  });
});

describe('校验', () => {
  it('合法文件夹没有错误', () => {
    expect(validateFolders(folders)).toEqual([]);
  });

  it('空名称、超长名称与重名各自给出定位到索引的错误', () => {
    const invalid = [
      { name: '', description: '', skills: [] },
      { name: 'x'.repeat(65), description: '', skills: [] },
      { name: 'dup', description: '', skills: [] },
      { name: 'DUP', description: '', skills: [] },
    ];
    expect(validateFolders(invalid)).toEqual([
      { index: 0, code: 'name-empty' },
      { index: 1, code: 'name-too-long' },
      { index: 3, code: 'name-duplicate' },
    ]);
  });

  it('同一技能出现在两个文件夹时报错', () => {
    const invalid = [
      { name: 'a', description: '', skills: ['shared'] },
      { name: 'b', description: '', skills: ['shared'] },
    ];
    expect(validateFolders(invalid)).toEqual([{ index: 1, code: 'skill-duplicate' }]);
  });

  it('简介超长报错', () => {
    const invalid = [{ name: 'a', description: 'x'.repeat(501), skills: [] }];
    expect(validateFolders(invalid)).toEqual([{ index: 0, code: 'description-too-long' }]);
  });
});

describe('描述', () => {
  it('列出成员数与名称', () => {
    expect(describeFolders(folders)).toEqual([
      { name: 'lark', description: '飞书', count: 2 },
      { name: 'x', description: '', count: 1 },
    ]);
  });
});
