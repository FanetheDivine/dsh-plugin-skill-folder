/**
 * 配置页草稿模型：用官方 SettingsFormModel 暂存文件夹列表与两个搜索选项。
 * 文件夹列表以 JSON 文本作为草稿，结构化编辑后序列化写回。
 * 导出 ROW_ID、ROW_KEY、FolderFields、FolderFormState、FolderPageInjected 与 FolderForm。
 */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type {
  SettingsFieldSpec,
  SettingsFieldState,
  SettingsFormActions,
  SettingsFormScope,
  SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives';
import { SettingsFormModel } from '@deepseek-ai/dsh-client-ui-primitives';

import type { FolderConfig } from '../config.ts';
import { DESCRIPTION_MAX_LENGTH_RANGE, MAX_LIMIT, PLUGIN_ID } from '../constants.ts';
import { type FolderError, ungroupedOf, validateFolders } from '../folders.ts';

/** 行 id，同时是宿主配置条目 id 与表单命名空间。 */
export const ROW_ID = PLUGIN_ID;

/** 插件在“插件”页的配置页键：`<包名>#<行 id>`。 */
export const ROW_KEY = `${PLUGIN_ID}#${ROW_ID}`;

/** 配置页编辑的字段，取值与宿主 `Config` 的实时值一致。 */
export interface FolderFields {
  /** 技能文件夹列表。 */
  folders: FolderConfig[];
  /** 搜索默认返回数量。 */
  defaultLimit: number;
  /** 摘要字符上限。 */
  descriptionMaxLength: number;
}

/** 配置页读取的草稿与表单状态。 */
export interface FolderFormState extends SettingsFormShell {
  /** 文件夹列表的 JSON 草稿状态。 */
  folders: SettingsFieldState;
  /** 默认返回数量。 */
  defaultLimit: SettingsFieldState;
  /** 摘要字符上限。 */
  descriptionMaxLength: SettingsFieldState;
}

/** 配置页的编辑动作。 */
export interface FolderActions {
  /** 新建文件夹。 */
  addFolder: (name: string, description?: string) => void;
  /** 改名。 */
  renameFolder: (index: number, name: string) => void;
  /** 改简介。 */
  describeFolder: (index: number, description: string) => void;
  /** 删除文件夹，成员回到未分组。 */
  removeFolder: (index: number) => void;
  /** 把技能移到目标文件夹；`null` 表示未分组。 */
  moveSkill: (skill: string, target: string | null) => void;
  /** 替换整个文件夹列表。 */
  replaceFolders: (folders: readonly FolderConfig[]) => void;
}

/** 配置页向槽位组件提供的注入值。 */
export interface FolderPageInjected extends SettingsFormActions, FolderActions {
  /** 草稿与表单状态。 */
  hooks: { configForm: SnapshotStore<FolderFormState> };
}

/** 判断值是否是普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 把任意值规范为文件夹列表；无法识别的项丢弃。 */
export function coerceFolders(value: unknown): FolderConfig[] {
  if (!Array.isArray(value)) return [];
  const folders: FolderConfig[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const name = typeof entry['name'] === 'string' ? entry['name'] : '';
    const description = typeof entry['description'] === 'string' ? entry['description'] : '';
    const skills = Array.isArray(entry['skills'])
      ? entry['skills'].filter((skill): skill is string => typeof skill === 'string')
      : [];
    folders.push({ name, description, skills });
  }
  return folders;
}

/** 文件夹列表字段：草稿是 JSON 文本，非法或未通过校验时阻止保存。 */
const foldersSpec: SettingsFieldSpec = {
  field: 'folders',
  format: (value) => JSON.stringify(coerceFolders(value)),
  parse: (text) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return undefined;
    }
    if (!Array.isArray(parsed)) return undefined;
    const folders = coerceFolders(parsed).map((folder) => ({
      name: folder.name.trim(),
      description: folder.description.trim(),
      skills: folder.skills,
    }));
    if (validateFolders(folders).length > 0) return undefined;
    return { kind: 'set', value: folders };
  },
};

/** 整数字段：空草稿恢复默认，越界或非整数时阻止保存。 */
function integerSpec(field: string, min: number, max: number): SettingsFieldSpec {
  return {
    field,
    format: (value) => (typeof value === 'number' ? String(value) : ''),
    parse: (text) => {
      const trimmed = text.trim();
      if (trimmed === '') return { kind: 'clear' };
      const value = Number(trimmed);
      return Number.isInteger(value) && value >= min && value <= max
        ? { kind: 'set', value }
        : undefined;
    },
  };
}

/**
 * 暂存文件夹与搜索选项的编辑，保存时一次写入宿主配置。
 * 离开配置页丢弃草稿，写入只发生在保存。
 */
export class FolderForm {
  private readonly form: SettingsFormModel<FolderFields>;
  private readonly state: SnapshotStore<FolderFormState>;
  private readonly actions: SettingsFormActions;

  /** @param scope - 宿主为该行提供的配置表单。 */
  constructor(scope: SettingsFormScope<FolderFields>) {
    this.form = new SettingsFormModel(scope, [
      foldersSpec,
      integerSpec('defaultLimit', 1, MAX_LIMIT),
      integerSpec(
        'descriptionMaxLength',
        DESCRIPTION_MAX_LENGTH_RANGE.min,
        DESCRIPTION_MAX_LENGTH_RANGE.max,
      ),
    ]);
    this.actions = this.form.actions();
    this.state = this.form.bind(() => ({
      ...this.form.shell(),
      folders: this.form.field('folders'),
      defaultLimit: this.form.field('defaultLimit'),
      descriptionMaxLength: this.form.field('descriptionMaxLength'),
    }));
  }

  /** @returns 当前草稿中的文件夹列表副本。 */
  draftFolders(): FolderConfig[] {
    const text = this.form.field('folders').text;
    try {
      return coerceFolders(JSON.parse(text === '' ? '[]' : text));
    } catch {
      return [];
    }
  }

  /** @returns 当前草稿的校验错误。 */
  errors(): FolderError[] {
    return validateFolders(this.draftFolders());
  }

  /** @returns 给定技能中未归入草稿文件夹的名称，按名称排序。 */
  ungrouped(skills: readonly string[]): string[] {
    return ungroupedOf(this.draftFolders(), skills);
  }

  /** 暂存一个字段的草稿文本。 */
  edit(field: string, text: string): void {
    this.actions.edit(field, text);
  }

  /** 把字段恢复到组合层默认值。 */
  resetField(field: string): void {
    this.actions.resetField(field);
  }

  /** 写入全部草稿。 */
  async save(): Promise<void> {
    await this.form.save();
  }

  /** 丢弃全部草稿。 */
  discard(): void {
    this.actions.discard();
  }

  /** 把文件夹列表写入草稿。 */
  replaceFolders(folders: readonly FolderConfig[]): void {
    this.actions.edit(
      'folders',
      JSON.stringify(
        folders.map((folder) => ({
          name: folder.name,
          description: folder.description,
          skills: [...folder.skills],
        })),
      ),
    );
  }

  /** 新建文件夹。 */
  addFolder(name: string, description = ''): void {
    this.replaceFolders([...this.draftFolders(), { name, description, skills: [] }]);
  }

  /** 改名，保留成员。 */
  renameFolder(index: number, name: string): void {
    this.update(index, (folder) => ({ ...folder, name }));
  }

  /** 改简介。 */
  describeFolder(index: number, description: string): void {
    this.update(index, (folder) => ({ ...folder, description }));
  }

  /** 删除文件夹，成员回到未分组。 */
  removeFolder(index: number): void {
    this.replaceFolders(this.draftFolders().filter((_folder, at) => at !== index));
  }

  /** 把技能移到目标文件夹；`null` 表示未分组。 */
  moveSkill(skill: string, target: string | null): void {
    const folders = this.draftFolders().map((folder) => ({
      ...folder,
      skills: folder.skills.filter((name) => name !== skill),
    }));
    if (target !== null) {
      const folder = folders.find((entry) => entry.name === target);
      if (folder !== undefined) folder.skills.push(skill);
    }
    this.replaceFolders(folders);
  }

  /** @returns 配置页向槽位组件提供的注入值。 */
  inject(): FolderPageInjected {
    return {
      hooks: { configForm: this.state },
      ...this.actions,
      addFolder: (name, description) => this.addFolder(name, description),
      renameFolder: (index, name) => this.renameFolder(index, name),
      describeFolder: (index, description) => this.describeFolder(index, description),
      removeFolder: (index) => this.removeFolder(index),
      moveSkill: (skill, target) => this.moveSkill(skill, target),
      replaceFolders: (folders) => this.replaceFolders(folders),
    };
  }

  /** 释放对宿主表单的订阅。 */
  dispose(): void {
    this.form.dispose();
  }

  /** 修改一个文件夹。 */
  private update(index: number, change: (folder: FolderConfig) => FolderConfig): void {
    this.replaceFolders(
      this.draftFolders().map((folder, at) => (at === index ? change(folder) : folder)),
    );
  }
}
