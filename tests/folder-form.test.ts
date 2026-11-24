// 配置表单测试：文件夹 JSON 草稿的格式化与解析、增删改、移动成员、保存与放弃。
import type { SettingsFormScope } from '@deepseek-ai/dsh-client-ui-primitives';
import { describe, expect, it } from 'vitest';

import { type FolderFields, FolderForm } from '../src/client/folder-form.ts';
import { makeConfigFormScope } from './helpers.ts';

/** 宿主快照里的初始值。 */
const initialValue: FolderFields = {
  folders: [{ name: 'lark', description: '飞书', skills: ['lark-doc'] }],
  defaultLimit: 5,
  descriptionMaxLength: 320,
  alwaysGroup: false,
};

/** 构造一组完整快照。 */
function setup(value: FolderFields | null = initialValue) {
  const fake = makeConfigFormScope<FolderFields>({
    value: value ?? undefined,
    base: { folders: [], defaultLimit: 5, descriptionMaxLength: 320, alwaysGroup: false },
    user: value === null ? undefined : { folders: value.folders },
  });
  const form = new FolderForm(fake.scope as SettingsFormScope<FolderFields>);
  return { fake, form };
}

/** 从表单读取当前草稿。 */
function draftOf(form: FolderForm) {
  const state = form.inject().hooks.configForm.getSnapshot();
  return { state, folders: form.draftFolders() };
}

describe('草稿读取', () => {
  it('载入生效配置的文件夹与数值', () => {
    const { form } = setup();
    const { state, folders } = draftOf(form);
    expect(state.available).toBe(true);
    expect(folders).toEqual(initialValue.folders);
    expect(state.defaultLimit.text).toBe('5');
    expect(state.descriptionMaxLength.text).toBe('320');
  });

  it('宿主没有配置时不非法、不脏', () => {
    const { form } = setup(null);
    const { state, folders } = draftOf(form);
    expect(folders).toEqual([]);
    expect(state.dirty).toBe(false);
    expect(state.invalid).toBe(false);
  });

  it('不可用时标记不可用', () => {
    const fake = makeConfigFormScope<FolderFields>({ status: 'unavailable' });
    const form = new FolderForm(fake.scope as SettingsFormScope<FolderFields>);
    expect(form.inject().hooks.configForm.getSnapshot().available).toBe(false);
  });
});

describe('文件夹编辑', () => {
  it('新建文件夹进入草稿并标记脏', () => {
    const { form } = setup();
    form.addFolder('web');
    const { state, folders } = draftOf(form);
    expect(folders.map((folder) => folder.name)).toEqual(['lark', 'web']);
    expect(state.dirty).toBe(true);
    expect(state.invalid).toBe(false);
  });

  it('改名保留成员', () => {
    const { form } = setup();
    form.renameFolder(0, 'lark2');
    expect(form.draftFolders()[0]).toMatchObject({ name: 'lark2', skills: ['lark-doc'] });
  });

  it('改简介', () => {
    const { form } = setup();
    form.describeFolder(0, '新的简介');
    expect(form.draftFolders()[0]?.description).toBe('新的简介');
  });

  it('删除文件夹后成员回到未分组', () => {
    const { form } = setup();
    form.removeFolder(0);
    expect(form.draftFolders()).toEqual([]);
    expect(form.ungrouped(['lark-doc', 'other'])).toEqual(['lark-doc', 'other']);
  });

  it('移动技能到目标文件夹', () => {
    const { form } = setup();
    form.addFolder('web');
    form.moveSkill('lark-doc', 'web');
    expect(form.draftFolders().map((folder) => folder.skills)).toEqual([[], ['lark-doc']]);
  });

  it('移动技能时从原文件夹移除，一个技能只属于一个文件夹', () => {
    const { form } = setup();
    form.addFolder('web');
    form.moveSkill('lark-doc', 'web');
    form.moveSkill('lark-doc', 'lark');
    expect(form.draftFolders().map((folder) => folder.skills)).toEqual([['lark-doc'], []]);
  });

  it('移动到未分组时从所有文件夹移除', () => {
    const { form } = setup();
    form.moveSkill('lark-doc', null);
    expect(form.draftFolders().map((folder) => folder.skills)).toEqual([[]]);
    expect(form.ungrouped(['lark-doc'])).toEqual(['lark-doc']);
  });

  it('替换整个文件夹列表', () => {
    const { form } = setup();
    form.replaceFolders([{ name: 'a', description: '', skills: [] }]);
    expect(form.draftFolders()).toEqual([{ name: 'a', description: '', skills: [] }]);
  });

  it('未分组按名称排序', () => {
    const { form } = setup();
    expect(form.ungrouped(['zulu', 'lark-doc', 'alpha'])).toEqual(['alpha', 'zulu']);
  });
});

describe('校验', () => {
  it('名称为空阻止保存并定位到索引', () => {
    const { form } = setup();
    form.addFolder('');
    const { state } = draftOf(form);
    expect(state.invalid).toBe(true);
    expect(form.errors()).toEqual([{ index: 1, code: 'name-empty' }]);
  });

  it('重名阻止保存', () => {
    const { form } = setup();
    form.addFolder('Lark');
    expect(form.errors()).toEqual([{ index: 1, code: 'name-duplicate' }]);
    expect(draftOf(form).state.invalid).toBe(true);
  });

  it('同一技能出现在两个文件夹时阻止保存', () => {
    const { form } = setup();
    form.replaceFolders([
      { name: 'lark', description: '', skills: ['lark-doc'] },
      { name: 'web', description: '', skills: ['lark-doc'] },
    ]);
    expect(form.errors()).toEqual([{ index: 1, code: 'skill-duplicate' }]);
    expect(draftOf(form).state.invalid).toBe(true);
  });

  it('数量越界标记字段非法', () => {
    const { form } = setup();
    form.edit('defaultLimit', '99');
    expect(draftOf(form).state.defaultLimit.invalid).toBe(true);
    expect(draftOf(form).state.invalid).toBe(true);
  });

  it('摘要长度越界标记字段非法', () => {
    const { form } = setup();
    form.edit('descriptionMaxLength', '10');
    expect(draftOf(form).state.descriptionMaxLength.invalid).toBe(true);
  });

  it('合法数值不标记非法', () => {
    const { form } = setup();
    form.edit('defaultLimit', '20');
    form.edit('descriptionMaxLength', '40');
    expect(draftOf(form).state.invalid).toBe(false);
  });
});

describe('保存与放弃', () => {
  it('保存写入文件夹 JSON 与数值', async () => {
    const { fake, form } = setup();
    form.addFolder('web');
    form.edit('defaultLimit', '7');
    await form.save();
    expect(fake.writes).toHaveLength(1);
    const ops = fake.writes[0] ?? [];
    const fields = ops.map((op) => (op.op === 'set' ? op.path.join('.') : 'unset'));
    expect(fields).toContain('folders');
    expect(fields).toContain('defaultLimit');
    const folders = ops.find((op) => op.op === 'set' && op.path[0] === 'folders');
    expect(folders).toMatchObject({
      value: [
        { name: 'lark', description: '飞书', skills: ['lark-doc'] },
        { name: 'web', description: '', skills: [] },
      ],
    });
  });

  it('非法草稿不写入', async () => {
    const { fake, form } = setup();
    form.addFolder('');
    await form.save();
    expect(fake.writes).toEqual([]);
  });

  it('放弃修改后恢复生效值', () => {
    const { form } = setup();
    form.addFolder('web');
    form.discard();
    expect(form.draftFolders()).toEqual(initialValue.folders);
    expect(draftOf(form).state.dirty).toBe(false);
  });

  it('逐字段恢复默认后写入 unset', async () => {
    const { fake, form } = setup();
    form.resetField('folders');
    await form.save();
    expect(fake.writes[0]).toEqual([{ op: 'unset', path: ['folders'] }]);
  });

  it('保存失败时保留草稿', async () => {
    const fake = makeConfigFormScope<FolderFields>({
      value: initialValue,
      user: { folders: initialValue.folders },
    });
    fake.scope.mutate = async () => false;
    const form = new FolderForm(fake.scope as SettingsFormScope<FolderFields>);
    form.addFolder('web');
    await form.save();
    expect(form.draftFolders().map((folder) => folder.name)).toEqual(['lark', 'web']);
    expect(form.inject().hooks.configForm.getSnapshot().failed).toBe(true);
  });

  it('只读时不写入', async () => {
    const fake = makeConfigFormScope<FolderFields>({
      value: initialValue,
      writable: false,
    });
    const form = new FolderForm(fake.scope as SettingsFormScope<FolderFields>);
    form.addFolder('web');
    await form.save();
    expect(fake.writes).toEqual([]);
  });
});

describe('生命周期', () => {
  it('释放时取消订阅', () => {
    const { fake, form } = setup();
    expect(fake.subscriberCount()).toBe(1);
    form.dispose();
    expect(fake.subscriberCount()).toBe(0);
  });
});

describe('始终分组开关', () => {
  it('默认关闭时草稿为空', () => {
    const { form } = setup();
    expect(draftOf(form).state.alwaysGroup.text).toBe('');
    expect(draftOf(form).state.alwaysGroup.invalid).toBe(false);
  });

  it('已开启时草稿为 true', () => {
    const { form } = setup({ ...initialValue, alwaysGroup: true });
    expect(draftOf(form).state.alwaysGroup.text).toBe('true');
  });

  it('勾选写入 true，取消清除该键', async () => {
    const { fake, form } = setup();
    form.edit('alwaysGroup', 'true');
    await form.save();
    expect(fake.writes[0]).toEqual([{ op: 'set', path: ['alwaysGroup'], value: true }]);

    const cleared = makeConfigFormScope<FolderFields>({ value: initialValue });
    const second = new FolderForm(cleared.scope as SettingsFormScope<FolderFields>);
    second.edit('alwaysGroup', 'false');
    await second.save();
    expect(cleared.writes[0]).toEqual([{ op: 'unset', path: ['alwaysGroup'] }]);
  });

  it('非法草稿阻止保存', () => {
    const { form } = setup();
    form.edit('alwaysGroup', 'yes');
    expect(draftOf(form).state.alwaysGroup.invalid).toBe(true);
    expect(draftOf(form).state.invalid).toBe(true);
  });
});
