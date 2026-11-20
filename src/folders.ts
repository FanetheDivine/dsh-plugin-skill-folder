/**
 * 文件夹规则：查找、成员、未分组集合与校验。
 * 导出 folderByName、membersOf、ungroupedOf、folderNamesOf、autoGroupNameKey、
 * validateFolders、describeFolders 与 FolderError。
 */

import type { FolderConfig } from './config.ts';
import { MAX_FOLDER_DESCRIPTION_LENGTH, MAX_FOLDER_NAME_LENGTH } from './constants.ts';

/** 一条文件夹校验错误，`index` 定位到文件夹。 */
export interface FolderError {
  /** 出错文件夹在列表中的下标。 */
  index: number;
  /** 错误类别。 */
  code:
    | 'name-empty'
    | 'name-too-long'
    | 'name-duplicate'
    | 'description-too-long'
    | 'skill-duplicate';
}

/** 文件夹摘要，用于模型目录与界面计数。 */
export interface FolderSummary {
  /** 文件夹名称。 */
  name: string;
  /** 简介。 */
  description: string;
  /** 成员数量。 */
  count: number;
}

/** 比较名称用的键：忽略大小写与首尾空白。 */
export function autoGroupNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** 按名称查找文件夹，忽略大小写。 */
export function folderByName(
  folders: readonly FolderConfig[],
  name: string,
): FolderConfig | undefined {
  const key = autoGroupNameKey(name);
  return folders.find((folder) => autoGroupNameKey(folder.name) === key);
}

/** 按名称取文件夹成员，找不到时返回空数组。 */
export function membersOf(folders: readonly FolderConfig[], name: string): string[] {
  return [...(folderByName(folders, name)?.skills ?? [])];
}

/** 技能名到文件夹名的映射。 */
export function folderIndex(folders: readonly FolderConfig[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const folder of folders) for (const skill of folder.skills) index.set(skill, folder.name);
  return index;
}

/** 未归入任何文件夹的技能名，按名称排序。 */
export function ungroupedOf(folders: readonly FolderConfig[], skills: readonly string[]): string[] {
  const index = folderIndex(folders);
  return skills.filter((name) => !index.has(name)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** 只列出至少有一个成员的文件夹名。 */
export function folderNamesOf(folders: readonly FolderConfig[]): string[] {
  return folders.filter((folder) => folder.skills.length > 0).map((folder) => folder.name);
}

/** 校验文件夹列表，返回按索引定位的错误。 */
export function validateFolders(folders: readonly FolderConfig[]): FolderError[] {
  const errors: FolderError[] = [];
  const names = new Set<string>();
  const members = new Set<string>();
  for (const [index, folder] of folders.entries()) {
    const name = folder.name.trim();
    if (name === '') {
      errors.push({ index, code: 'name-empty' });
    } else {
      if (name.length > MAX_FOLDER_NAME_LENGTH) errors.push({ index, code: 'name-too-long' });
      const key = autoGroupNameKey(name);
      if (names.has(key)) errors.push({ index, code: 'name-duplicate' });
      names.add(key);
    }
    if (folder.description.length > MAX_FOLDER_DESCRIPTION_LENGTH) {
      errors.push({ index, code: 'description-too-long' });
    }
    let duplicate = false;
    for (const skill of folder.skills) {
      if (members.has(skill)) duplicate = true;
      members.add(skill);
    }
    if (duplicate) errors.push({ index, code: 'skill-duplicate' });
  }
  return errors;
}

/** 生成有成员的文件夹摘要，保持配置顺序。 */
export function describeFolders(folders: readonly FolderConfig[]): FolderSummary[] {
  return folders
    .filter((folder) => folder.skills.length > 0)
    .map((folder) => ({
      name: folder.name,
      description: folder.description,
      count: folder.skills.length,
    }));
}
