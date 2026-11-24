/**
 * 自动分组：先按文件夹名匹配，其余未分组技能按 `-` 分段前缀合并。
 * 导出 segmentPrefix、longestSegmentPrefix、sameFolders 与 autoGroup。
 */
import type { FolderConfig } from './config.ts';
import { autoGroupNameKey, folderIndex } from './folders.ts';

/** 分组所需的最少成员数。 */
const MIN_GROUP_SIZE = 2;

/** 取技能名第一个 `-` 之前的部分；没有 `-` 时取整个名称。 */
export function segmentPrefix(name: string): string {
  const index = name.indexOf('-');
  return index <= 0 ? name : name.slice(0, index);
}

/** 取一组技能名按 `-` 分段的最长公共前缀；没有公共分段时返回空串。 */
export function longestSegmentPrefix(names: readonly string[]): string {
  if (names.length === 0) return '';
  const [first, ...rest] = names.map((name) => name.split('-'));
  const common: string[] = [];
  for (const [index, segment] of (first ?? []).entries()) {
    if (rest.every((parts) => parts[index] === segment)) common.push(segment);
    else break;
  }
  return common.join('-');
}

/** 判断两组文件夹在名称、简介与成员上完全一致。 */
export function sameFolders(a: readonly FolderConfig[], b: readonly FolderConfig[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((folder, index) => {
    const other = b[index];
    if (other === undefined) return false;
    return (
      folder.name === other.name &&
      folder.description === other.description &&
      folder.skills.length === other.skills.length &&
      folder.skills.every((skill, at) => skill === other.skills[at])
    );
  });
}

/** 按名称比较。 */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 判断技能是否属于该文件夹：名称相等或以「文件夹名-」开头。 */
function matchesFolder(skill: string, folderName: string): boolean {
  const name = folderName.trim().toLowerCase();
  if (name === '') return false;
  const target = skill.toLowerCase();
  return target === name || target.startsWith(`${name}-`);
}

/**
 * 为未分组技能生成文件夹，保留已在文件夹中的成员与现有文件夹顺序。
 * @param folders - 现有文件夹。
 * @param skills - 全部技能名。
 * @param describe - 为新文件夹生成简介，参数是分组前缀。
 * @returns 新的文件夹列表。
 */
export function autoGroup(
  folders: readonly FolderConfig[],
  skills: readonly string[],
  describe: (prefix: string) => string,
): FolderConfig[] {
  const index = folderIndex(folders);
  const result = folders.map((folder) => ({ ...folder, skills: [...folder.skills] }));
  const pending = skills.filter((skill) => !index.has(skill)).sort(compare);
  if (pending.length === 0) return result;

  // 第一步：名称匹配现有文件夹，多个匹配时取名称最长的那个
  const byName = new Map<string, FolderConfig>();
  for (const folder of result) byName.set(autoGroupNameKey(folder.name), folder);
  const remaining: string[] = [];
  for (const skill of pending) {
    const target = result
      .filter((folder) => matchesFolder(skill, folder.name))
      .sort((a, b) => b.name.trim().length - a.name.trim().length)[0];
    if (target === undefined) remaining.push(skill);
    else target.skills.push(skill);
  }

  // 第二步：按首段前缀合并，至少两个成员才成组
  const buckets = new Map<string, string[]>();
  for (const skill of remaining) {
    const prefix = segmentPrefix(skill);
    const bucket = buckets.get(prefix);
    if (bucket === undefined) buckets.set(prefix, [skill]);
    else bucket.push(skill);
  }
  const created: FolderConfig[] = [];
  for (const [bucketPrefix, members] of [...buckets].sort(([a], [b]) => compare(a, b))) {
    if (members.length < MIN_GROUP_SIZE) continue;
    members.sort(compare);
    const name = longestSegmentPrefix(members) || bucketPrefix;
    const existing = byName.get(autoGroupNameKey(name));
    if (existing !== undefined) {
      existing.skills.push(...members.filter((skill) => !existing.skills.includes(skill)));
      continue;
    }
    const folder: FolderConfig = { name, description: describe(name), skills: members };
    created.push(folder);
    byName.set(autoGroupNameKey(name), folder);
  }

  // 第三步：合并到预览列表时避免重复追加
  for (const folder of created) {
    if (!result.includes(folder)) result.push(folder);
  }
  return result;
}
