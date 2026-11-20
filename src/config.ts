/**
 * 插件配置：schema、默认值与严格校验。
 * 导出 Config、PluginConfig、DEFAULT_CONFIG、resolveConfig 与 readConfig。
 */
import Schema from '@deepseek-ai/schemastery';

import {
  DEFAULT_DESCRIPTION_MAX_LENGTH,
  DEFAULT_LIMIT,
  DESCRIPTION_MAX_LENGTH_RANGE,
  MAX_FOLDER_DESCRIPTION_LENGTH,
  MAX_FOLDER_NAME_LENGTH,
  MAX_LIMIT,
  PLUGIN_LABEL,
} from './constants.ts';
import type { Volatile } from './types.ts';
import { isRecord } from './utils.ts';

/** 一个技能文件夹：名称、简介与成员技能名。 */
export interface FolderConfig {
  /** 文件夹名称，去首尾空白后 1–64 字符，忽略大小写唯一。 */
  name: string;
  /** 简介，0–500 字符，可为空。 */
  description: string;
  /** 成员技能名，同一名称在全部文件夹中最多出现一次。 */
  skills: string[];
}

/** 宿主传给 apply 的配置：每个字段是热重载引用，用 `.get()` 读取实时值。 */
export interface Config {
  /** 技能文件夹列表。 */
  folders: Volatile<FolderConfig[]>;
  /** 搜索默认返回数量。 */
  defaultLimit: Volatile<number>;
  /** 摘要字符上限。 */
  descriptionMaxLength: Volatile<number>;
}

/** 文件夹 schema：结构校验交给 resolveConfig。 */
const folderSchema = Schema.object({
  name: Schema.string().required(),
  description: Schema.string().default(''),
  skills: Schema.array(Schema.string()).default([]),
});

/**
 * 配置 schema。`.volatile()` 字段修改后不重启插件，并出现在“插件”面板的配置页。
 * schema 不拒绝未知键，严格校验由 resolveConfig 完成。
 */
export const Config: Schema<Config> = Schema.object({
  folders: Schema.array(folderSchema).default([]).volatile(),
  defaultLimit: Schema.number().default(DEFAULT_LIMIT).volatile(),
  descriptionMaxLength: Schema.number().default(DEFAULT_DESCRIPTION_MAX_LENGTH).volatile(),
}) as unknown as Schema<Config>;

/** 配置项的实时取值。 */
export type PluginConfig = {
  /** 技能文件夹列表。 */
  folders: FolderConfig[];
  /** 搜索默认返回数量。 */
  defaultLimit: number;
  /** 摘要字符上限。 */
  descriptionMaxLength: number;
};

/** 默认配置。 */
export const DEFAULT_CONFIG: Readonly<PluginConfig> = Object.freeze({
  folders: [],
  defaultLimit: DEFAULT_LIMIT,
  descriptionMaxLength: DEFAULT_DESCRIPTION_MAX_LENGTH,
});

/** 合法的配置键。出现其他键时报错。 */
const CONFIG_KEYS = new Set<string>(['folders', 'defaultLimit', 'descriptionMaxLength']);

/** 把缺省或 null 的输入转为空对象。 */
function normalizeConfigInput(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (!isRecord(raw)) throw new Error(`${PLUGIN_LABEL}: config must be an object`);
  return raw;
}

/** 校验一个文件夹，返回规范化副本。 */
function resolveFolder(raw: unknown, index: number): FolderConfig {
  if (!isRecord(raw))
    throw new Error(`${PLUGIN_LABEL}: config folders[${index}] must be an object`);
  const name = typeof raw['name'] === 'string' ? raw['name'].trim() : '';
  if (name === '')
    throw new Error(`${PLUGIN_LABEL}: config folder name must be a non-empty string`);
  if (name.length > MAX_FOLDER_NAME_LENGTH) {
    throw new Error(
      `${PLUGIN_LABEL}: config folder name holds at most ${MAX_FOLDER_NAME_LENGTH} characters`,
    );
  }
  const rawDescription = raw['description'];
  if (
    rawDescription !== undefined &&
    rawDescription !== null &&
    typeof rawDescription !== 'string'
  ) {
    throw new Error(`${PLUGIN_LABEL}: config folder description must be a string`);
  }
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';
  if (description.length > MAX_FOLDER_DESCRIPTION_LENGTH) {
    throw new Error(
      `${PLUGIN_LABEL}: config folder description holds at most ${MAX_FOLDER_DESCRIPTION_LENGTH} characters`,
    );
  }
  const rawSkills = raw['skills'];
  if (rawSkills !== undefined && rawSkills !== null && !Array.isArray(rawSkills)) {
    throw new Error(`${PLUGIN_LABEL}: config folder skills must be an array of strings`);
  }
  const skills: string[] = [];
  for (const entry of Array.isArray(rawSkills) ? rawSkills : []) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new Error(`${PLUGIN_LABEL}: config folder skills must be non-empty strings`);
    }
    skills.push(entry);
  }
  return { name, description, skills };
}

/** 校验文件夹列表：名称忽略大小写唯一，成员跨文件夹唯一。 */
function resolveFolders(raw: unknown): FolderConfig[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error(`${PLUGIN_LABEL}: config folders must be an array`);
  const folders = raw.map((entry, index) => resolveFolder(entry, index));
  const names = new Set<string>();
  const members = new Set<string>();
  for (const folder of folders) {
    const key = folder.name.toLowerCase();
    if (names.has(key)) {
      throw new Error(`${PLUGIN_LABEL}: duplicate folder name "${folder.name}"`);
    }
    names.add(key);
    for (const skill of folder.skills) {
      if (members.has(skill)) {
        throw new Error(`${PLUGIN_LABEL}: skill "${skill}" belongs to more than one folder`);
      }
      members.add(skill);
    }
  }
  return folders;
}

/** 校验一个整数配置项。只有缺省的 `undefined` 使用默认值。 */
function resolveInteger(
  key: string,
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${PLUGIN_LABEL}: config ${key} must be an integer from ${min} to ${max}`);
  }
  return value;
}

/** 校验配置并与默认值合并，返回冻结的完整配置。 */
export function resolveConfig(raw?: unknown): Readonly<PluginConfig> {
  const input = normalizeConfigInput(raw);
  for (const key of Object.keys(input)) {
    if (!CONFIG_KEYS.has(key)) throw new Error(`${PLUGIN_LABEL}: unknown config key "${key}"`);
  }
  const config: PluginConfig = {
    folders: resolveFolders(input['folders']),
    defaultLimit: resolveInteger(
      'defaultLimit',
      input['defaultLimit'],
      1,
      MAX_LIMIT,
      DEFAULT_CONFIG.defaultLimit,
    ),
    descriptionMaxLength: resolveInteger(
      'descriptionMaxLength',
      input['descriptionMaxLength'],
      DESCRIPTION_MAX_LENGTH_RANGE.min,
      DESCRIPTION_MAX_LENGTH_RANGE.max,
      DEFAULT_CONFIG.descriptionMaxLength,
    ),
  };
  return Object.freeze(config);
}

/** 判断值是否是热重载引用。 */
function isVolatileRef(value: unknown): value is { get(): unknown } {
  return isRecord(value) && typeof value.get === 'function';
}

/** 读取宿主传入配置的当前值：展开热重载引用后交给 resolveConfig 校验。 */
export function readConfig(config?: unknown): Readonly<PluginConfig> {
  if (!isRecord(config)) return resolveConfig(config);
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    values[key] = isVolatileRef(value) ? value.get() : value;
  }
  return resolveConfig(values);
}
