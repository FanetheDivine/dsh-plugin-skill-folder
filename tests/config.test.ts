// 配置测试：默认值、文件夹规则、数值范围、未知键与热重载读取。
import { describe, expect, it } from 'vitest';

import { Config, DEFAULT_CONFIG, readConfig, resolveConfig } from '../src/config.ts';
import { PLUGIN_LABEL } from '../src/constants.ts';
import { volatile } from './helpers.ts';

/** 一个合法文件夹。 */
const folder = (name: string, skills: string[] = [], description = '') => ({
  name,
  description,
  skills,
});

describe('默认配置', () => {
  it('没有任何文件夹，使用默认数值', () => {
    expect(resolveConfig({})).toEqual({
      folders: [],
      defaultLimit: 5,
      descriptionMaxLength: 320,
    });
  });

  it('整份配置缺省时全部使用默认值', () => {
    for (const raw of [undefined, null]) expect(resolveConfig(raw)).toEqual(DEFAULT_CONFIG);
  });
});

describe('文件夹校验', () => {
  it('保留合法文件夹的字段', () => {
    const config = resolveConfig({ folders: [folder('lark', ['lark-doc'], '飞书')] });
    expect(config.folders).toEqual([{ name: 'lark', description: '飞书', skills: ['lark-doc'] }]);
  });

  it('名称去首尾空白，简介缺省为空串', () => {
    const config = resolveConfig({ folders: [{ name: '  lark  ', skills: [] }] });
    expect(config.folders[0]).toEqual({ name: 'lark', description: '', skills: [] });
  });

  it('名称不能为空或全空白', () => {
    for (const name of ['', '   ']) {
      expect(() => resolveConfig({ folders: [folder(name)] })).toThrow('folder name');
    }
  });

  it('名称超过 64 字符被拒绝', () => {
    expect(() => resolveConfig({ folders: [folder('a'.repeat(64))] })).not.toThrow();
    expect(() => resolveConfig({ folders: [folder('a'.repeat(65))] })).toThrow('64');
  });

  it('名称忽略大小写唯一', () => {
    expect(() => resolveConfig({ folders: [folder('Lark'), folder('lark')] })).toThrow(
      'duplicate folder name',
    );
  });

  it('简介超过 500 字符被拒绝', () => {
    expect(() => resolveConfig({ folders: [folder('a', [], 'x'.repeat(500))] })).not.toThrow();
    expect(() => resolveConfig({ folders: [folder('a', [], 'x'.repeat(501))] })).toThrow('500');
  });

  it('同一个技能最多属于一个文件夹', () => {
    expect(() =>
      resolveConfig({ folders: [folder('a', ['shared']), folder('b', ['shared'])] }),
    ).toThrow('shared');
  });

  it('文件夹与成员必须是字符串数组', () => {
    expect(() => resolveConfig({ folders: 'nope' })).toThrow('folders');
    expect(() => resolveConfig({ folders: [folder('a', [1 as unknown as string])] })).toThrow(
      'skills',
    );
  });
});

describe('数值范围', () => {
  it('defaultLimit 只接受 1–20 的整数', () => {
    expect(resolveConfig({ defaultLimit: 20 }).defaultLimit).toBe(20);
    expect(resolveConfig({ defaultLimit: 1 }).defaultLimit).toBe(1);
    for (const value of [0, 21, 1.5, '5', null]) {
      expect(() => resolveConfig({ defaultLimit: value })).toThrow('defaultLimit');
    }
  });

  it('descriptionMaxLength 只接受 40–2000 的整数', () => {
    expect(resolveConfig({ descriptionMaxLength: 40 }).descriptionMaxLength).toBe(40);
    expect(resolveConfig({ descriptionMaxLength: 2000 }).descriptionMaxLength).toBe(2000);
    for (const value of [39, 2001, 320.5, '320', null]) {
      expect(() => resolveConfig({ descriptionMaxLength: value })).toThrow('descriptionMaxLength');
    }
  });
});

describe('严格校验', () => {
  it('未知键报错并带插件标识', () => {
    expect(() => resolveConfig({ bogus: 1 })).toThrow('unknown config key "bogus"');
    expect(() => resolveConfig({ bogus: 1 })).toThrow(PLUGIN_LABEL);
  });

  it('非对象输入报错', () => {
    expect(() => resolveConfig([])).toThrow('config must be an object');
  });

  it('返回冻结的完整配置', () => {
    expect(Object.isFrozen(resolveConfig({}))).toBe(true);
  });
});

describe('读取实时配置 readConfig', () => {
  it('展开热重载引用后校验', () => {
    const config = { defaultLimit: volatile(7), descriptionMaxLength: volatile(120) };
    expect(readConfig(config)).toMatchObject({ defaultLimit: 7, descriptionMaxLength: 120 });
  });

  it('引用变化后读到新值', () => {
    const defaultLimit = volatile(3);
    const config = { defaultLimit };
    expect(readConfig(config).defaultLimit).toBe(3);
    defaultLimit.set(9);
    expect(readConfig(config).defaultLimit).toBe(9);
  });

  it('宿主未传入配置时使用默认值', () => {
    expect(readConfig(undefined)).toEqual(DEFAULT_CONFIG);
  });
});

describe('Config schema', () => {
  it('缺省值与实时读取', () => {
    const parsed = Config({});
    expect(parsed.defaultLimit.get()).toBe(5);
    expect(parsed.descriptionMaxLength.get()).toBe(320);
    expect(parsed.folders.get()).toEqual([]);
  });

  it('接受合法文件夹', () => {
    const parsed = Config({
      folders: [{ name: 'lark', description: '飞书', skills: ['lark-doc'] }],
    });
    expect(parsed.folders.get()).toEqual([
      { name: 'lark', description: '飞书', skills: ['lark-doc'] },
    ]);
  });
});
