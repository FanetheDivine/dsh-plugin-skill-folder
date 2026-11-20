/**
 * 技能读取：模型可调用过滤、全局来源判定与全局列表读取。
 * 导出 SkillSummary、SkillItem、isModelInvocable、isGlobalSummary、
 * loadGlobalSkills 与 toSkillItem。
 */

/** 宿主技能摘要的最小结构。 */
export interface SkillSummary {
  /** 技能名。 */
  name: string;
  /** 描述。 */
  description: string;
  /** 使用时机。 */
  whenToUse?: string | undefined;
  /** 来源。 */
  source: string;
  /** 提供者。 */
  provider?: string | undefined;
  /** 技能文件路径。 */
  path?: string | undefined;
  /** 调用权限。 */
  invocation: { readonly modelInvocable: boolean; readonly userInvocable: boolean };
}

/** 配置页使用的技能条目。 */
export interface SkillItem {
  /** 技能名。 */
  name: string;
  /** 描述。 */
  description: string;
  /** 使用时机。 */
  whenToUse?: string | undefined;
  /** 来源。 */
  source: string;
  /** 技能文件路径。 */
  path?: string | undefined;
}

/** 全局技能读取结果。 */
export interface GlobalSkills {
  /** 按名称排序的条目。 */
  skills: SkillItem[];
  /** 检索是否完整。 */
  complete: boolean;
}

/** 宿主 `skills` 服务的读取子集。 */
export interface SkillsReader {
  /** 读取摘要列表。 */
  list?: (options: Record<string, never>) => Promise<readonly SkillSummary[]>;
  /** 读取带完整性标记的快照。 */
  snapshot?: (options: Record<string, never>) => Promise<{
    readonly skills: readonly SkillSummary[];
    readonly complete: boolean;
  }>;
}

/** 判断技能是否可由模型调用。 */
export function isModelInvocable(skill: { invocation: { modelInvocable: boolean } }): boolean {
  return skill.invocation.modelInvocable === true;
}

/** 规范化路径，用于比较：统一分隔符并忽略大小写。 */
function normalizePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
}

/**
 * 判断技能是否是全局技能。
 * 非 `project-` 来源直接算全局；`project-` 来源在与全局列表中的同名技能路径相同时也算全局，
 * 这样会话根目录位于用户主目录时把全局技能标成项目来源仍能正确折叠。
 */
export function isGlobalSummary(
  skill: SkillSummary,
  globalSkills: readonly SkillSummary[],
): boolean {
  if (!skill.source.startsWith('project-')) return true;
  if (skill.path === undefined) return false;
  const path = normalizePath(skill.path);
  return globalSkills.some(
    (candidate) =>
      candidate.name === skill.name &&
      candidate.path !== undefined &&
      normalizePath(candidate.path) === path,
  );
}

/** 把技能摘要投影为界面条目。 */
export function toSkillItem(skill: SkillSummary): SkillItem {
  return {
    name: skill.name,
    description: skill.description,
    ...(skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse }),
    source: skill.source,
    ...(skill.path === undefined ? {} : { path: skill.path }),
  };
}

/** 读取全局技能：不传工作区与作用域，只保留可由模型调用的技能。 */
export async function loadGlobalSkills(reader: SkillsReader): Promise<GlobalSkills> {
  const options = {} as Record<string, never>;
  const snapshot = reader.snapshot === undefined ? undefined : await reader.snapshot(options);
  const listed =
    snapshot === undefined
      ? await (reader.list?.(options) ?? Promise.resolve([]))
      : snapshot.skills;
  const skills = listed
    .filter((skill) => isModelInvocable(skill))
    .filter((skill) => isGlobalSummary(skill, listed))
    .map(toSkillItem)
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { skills, complete: snapshot?.complete ?? true };
}
