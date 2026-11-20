/**
 * 检索：查询分词、相关度排序、分页与摘要截断。
 * 导出 SearchOptions、SearchResult、queryTerms、shorten 与 rankSkills。
 */
import type { FolderConfig } from './config.ts';
import { folderByName, folderIndex } from './folders.ts';
import { isModelInvocable, type SkillSummary } from './skills.ts';

/** 参与评分的字段与权重。名称命中权重最高。 */
const FIELD_WEIGHTS = { name: 100, whenToUse: 45, description: 25 } as const;

/** 准确名称命中的加权值。 */
const EXACT_NAME_BONUS = 10000;

/** 不参与检索的通用词。 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'for',
  'of',
  'in',
  'with',
  'use',
  'using',
  'please',
  'help',
  'me',
  'skill',
  'skills',
  'search',
  'find',
]);

/** 检索参数。 */
export interface SearchOptions {
  /** 生效的文件夹。 */
  folders: readonly FolderConfig[];
  /** 只在该文件夹内检索。 */
  folder?: string | undefined;
  /** 返回数量上限。 */
  limit: number;
  /** 跳过多少条。 */
  offset: number;
  /** 摘要字符上限。 */
  descriptionMaxLength?: number | undefined;
}

/** 一条检索结果。 */
export interface SearchHit {
  /** 技能名。 */
  name: string;
  /** 截断后的描述。 */
  description: string;
  /** 截断后的使用时机。 */
  whenToUse: string;
  /** 所属文件夹名，未归组时为 null。 */
  folder: string | null;
  /** 匹配类型。 */
  match: 'exact' | 'partial' | 'folder';
}

/** 一次检索的结果。 */
export interface SearchResult {
  /** 命中总数。 */
  total: number;
  /** 本页结果。 */
  results: SearchHit[];
  /** 后续仍有结果。 */
  more: boolean;
}

/** 规范化为小写用于比较。 */
function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

/** 按名称比较，用于稳定排序。 */
function compareName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 把查询拆成可检索的词。
 * 英文与数字按词切分并丢弃通用词；中文按二字组切分，两个字的中文词整体保留。
 */
export function queryTerms(query: string): string[] {
  const text = normalize(query);
  const tokens = text.match(/[a-z0-9]+(?:[+#._-][a-z0-9]+)*|\p{Script=Han}+/gu) ?? [];
  const terms = new Set<string>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    if (/\p{Script=Han}/u.test(token)) {
      const chars = Array.from(token);
      if (chars.length <= 2) terms.add(token);
      else
        for (let index = 0; index < chars.length - 1; index += 1) {
          terms.add(chars.slice(index, index + 2).join(''));
        }
    } else {
      terms.add(token);
    }
  }
  return [...terms];
}

/** 按字符上限截断并加省略号。 */
export function shorten(value: string, maxLength: number): string {
  const chars = Array.from(
    String(value ?? '')
      .replaceAll(/\s+/g, ' ')
      .trim(),
  );
  return chars.length <= maxLength ? chars.join('') : `${chars.slice(0, maxLength - 1).join('')}…`;
}

/** 一条技能的命中评分。 */
interface Scored {
  /** 技能。 */
  skill: SkillSummary;
  /** 命中的查询词数量。 */
  matched: number;
  /** 加权总分。 */
  score: number;
  /** 查询是否等于技能名。 */
  exactName: boolean;
}

/** 计算技能对一个查询词的得分。 */
function scoreTerm(term: string, skill: SkillSummary): number {
  const fields: [string, number][] = [
    [normalize(skill.name), FIELD_WEIGHTS.name],
    [normalize(skill.whenToUse ?? ''), FIELD_WEIGHTS.whenToUse],
    [normalize(skill.description), FIELD_WEIGHTS.description],
  ];
  let best = 0;
  for (const [text, weight] of fields) if (text.includes(term) && weight > best) best = weight;
  return best;
}

/** 对技能集合评分并按相关度排序。 */
function scoreSkills(skills: readonly SkillSummary[], query: string): Scored[] {
  const terms = queryTerms(query);
  const exact = normalize(query).trim();
  const scored: Scored[] = [];
  for (const skill of skills) {
    if (!isModelInvocable(skill)) continue;
    const scores = terms.map((term) => scoreTerm(term, skill));
    const matched = scores.filter((score) => score > 0).length;
    const exactName = normalize(skill.name) === exact;
    if (!exactName && matched === 0) continue;
    const score =
      scores.reduce((sum, value) => sum + value, 0) + (exactName ? EXACT_NAME_BONUS : 0);
    scored.push({ skill, matched, score, exactName });
  }
  scored.sort(
    (a, b) =>
      Number(b.exactName) - Number(a.exactName) ||
      b.matched - a.matched ||
      b.score - a.score ||
      compareName(a.skill.name, b.skill.name),
  );
  return scored;
}

/** 生成一条检索结果。 */
function toHit(
  skill: SkillSummary,
  folder: string | null,
  match: SearchHit['match'],
  maxLength: number,
): SearchHit {
  return {
    name: skill.name,
    description: shorten(skill.description, maxLength),
    whenToUse: shorten(skill.whenToUse ?? '', maxLength),
    folder,
    match,
  };
}

/**
 * 检索技能。
 * 给出 `folder` 时先限定到该文件夹；同时给出 `query` 时在该文件夹内按关键词检索。
 */
export function rankSkills(
  skills: readonly SkillSummary[],
  query: string | undefined,
  options: SearchOptions,
): SearchResult {
  const maxLength = options.descriptionMaxLength ?? 320;
  const index = folderIndex(options.folders);
  const scoped =
    options.folder === undefined
      ? undefined
      : new Set(folderByName(options.folders, options.folder)?.skills ?? []);
  const pool = scoped === undefined ? skills : skills.filter((skill) => scoped.has(skill.name));
  const trimmed = query?.trim() ?? '';

  if (trimmed === '') {
    // 只按文件夹列出：按名称排序
    const listed = pool
      .filter(isModelInvocable)
      .slice()
      .sort((a, b) => compareName(a.name, b.name));
    const page = listed.slice(options.offset, options.offset + options.limit);
    return {
      total: listed.length,
      results: page.map((skill) =>
        toHit(skill, index.get(skill.name) ?? null, 'folder', maxLength),
      ),
      more: options.offset + page.length < listed.length,
    };
  }

  const scored = scoreSkills(pool, trimmed);
  const page = scored.slice(options.offset, options.offset + options.limit);
  return {
    total: scored.length,
    results: page.map(({ skill, matched, exactName }) =>
      toHit(
        skill,
        index.get(skill.name) ?? null,
        exactName || matched === queryTerms(trimmed).length ? 'exact' : 'partial',
        maxLength,
      ),
    ),
    more: options.offset + page.length < scored.length,
  };
}
