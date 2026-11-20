// 工具定义测试：输出 schema 必须落在宿主强制的 JSON Schema 子集内。
import { assertSupportedJsonSchema } from '@deepseek-ai/dsh-tools';
import { describe, expect, it } from 'vitest';

import { buildSearchTool, resolveArgs } from '../src/search-tool.ts';

/** 构造一个只关心定义的工具。 */
function definition() {
  return buildSearchTool({
    folders: [{ name: 'lark', description: '', skills: ['lark-doc'] }],
    defaultLimit: 5,
    descriptionMaxLength: 320,
    readSkills: async () => ({ skills: [], complete: true }),
    hasSkillLoader: () => true,
  });
}

describe('输出 schema', () => {
  it('落在宿主支持的 JSON Schema 子集内', () => {
    expect(() => {
      assertSupportedJsonSchema(definition().output.schema);
    }).not.toThrow();
  });

  it('可空字段用 oneOf，不用类型数组', () => {
    const serialized = JSON.stringify(definition().output.schema);
    expect(serialized).not.toContain('"type":[');
    expect(serialized).toContain('"oneOf":[{"type":"string"},{"type":"null"}]');
  });

  it('参数 schema 也落在宿主支持的子集内，且以对象为根', () => {
    const { parameters } = definition();
    expect(() => {
      assertSupportedJsonSchema(parameters);
    }).not.toThrow();
    expect(parameters.type).toBe('object');
    expect(Object.keys(parameters.properties)).toEqual(['query', 'folder', 'limit', 'offset']);
  });
});

describe('参数解析', () => {
  it('缺少 query 与 folder 时报错', () => {
    expect(() => resolveArgs({}, [], 5)).toThrow('provide query or folder');
    expect(() => resolveArgs({ query: '  ', folder: '' }, [], 5)).toThrow(
      'provide query or folder',
    );
  });

  it('未知文件夹报错', () => {
    expect(() => resolveArgs({ folder: 'nope' }, [], 5)).toThrow('unknown folder');
  });

  it('limit 与 offset 越界报错', () => {
    expect(() => resolveArgs({ query: 'a', limit: 0 }, [], 5)).toThrow('limit must be');
    expect(() => resolveArgs({ query: 'a', limit: 99 }, [], 5)).toThrow('limit must be');
    expect(() => resolveArgs({ query: 'a', offset: -1 }, [], 5)).toThrow('offset must be');
  });

  it('查询超过 512 字符报错', () => {
    expect(() => resolveArgs({ query: 'x'.repeat(513) }, [], 5)).toThrow('1–512');
  });

  it('缺省 limit 用配置默认值，文件夹名返回生效名称', () => {
    expect(
      resolveArgs(
        { query: 'a', folder: 'LARK' },
        [{ name: 'lark', description: '', skills: [] }],
        7,
      ),
    ).toEqual({ query: 'a', folder: 'lark', limit: 7, offset: 0 });
  });
});
