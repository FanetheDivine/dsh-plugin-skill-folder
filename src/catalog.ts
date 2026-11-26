/**
 * 目录折叠：把原生技能目录消息改写为「未归组条目 + 文件夹摘要」。
 * 导出 SkillCatalogMessage、catalogBody、presentedBodyOf、foldMessage 与 foldCatalog。
 */
import type { FolderConfig } from './config.ts';
import { FOLDED_BY } from './constants.ts';
import { describeFolders } from './folders.ts';
import { isGlobalSummary, type SkillSummary } from './skills.ts';

/** 一条消息的内容块。 */
export interface TextBlock {
  /** 内容类型。 */
  type: string;
  /** 文本。 */
  text?: string;
}

/** 一条会话消息读取子集。 */
export interface CatalogMessageBase {
  /** 消息 id。 */
  id: string;
  /** 角色。 */
  role: string;
  /** 内容块。 */
  content: readonly TextBlock[];
  /** 消息来源。 */
  source: Record<string, unknown> & { kind?: unknown };
}

/** 一条原生技能目录消息。 */
export interface SkillCatalogMessage extends CatalogMessageBase {
  /** 已解析的目录条目。 */
  source: Record<string, unknown> & {
    kind: 'skill-catalog';
    form: 'catalog';
    entries: readonly { readonly name: string; readonly description: string }[];
    update?: true;
    incomplete?: true;
  };
}

/** 折叠所需上下文。 */
export interface FoldContext {
  /** 当前技能快照。 */
  skills: readonly SkillSummary[];
  /** 生效的文件夹。 */
  folders: readonly FolderConfig[];
  /** 本 Agent 是否看得到 `skill_search`。 */
  toolVisible: boolean;
  /** 本会话已呈现的最后一份目录正文；`undefined` 表示未知。 */
  presented?: string | undefined;
}

/** 判断消息是否是原生技能目录。 */
export function isSkillCatalogMessage(message: CatalogMessageBase): message is SkillCatalogMessage {
  const { source } = message;
  if (source['kind'] !== 'skill-catalog') return false;
  const entries = source['entries'];
  return Array.isArray(entries);
}

/** 目录条目名集合，用于判断是否需要折叠。 */
function catalogNames(message: SkillCatalogMessage): string[] {
  return message.source.entries.map((entry) => entry.name);
}

/** 折叠一条目录消息的结果。 */
export type FoldOutcome =
  | { readonly action: 'keep'; readonly message: SkillCatalogMessage }
  | { readonly action: 'drop' };

/** 折叠一条目录消息；正文与本会话已呈现的那份相同时判定为丢弃。 */
export function foldMessage(message: SkillCatalogMessage, context: FoldContext): FoldOutcome {
  if (!context.toolVisible) return { action: 'keep', message };
  const byName = new Map(context.skills.map((skill) => [skill.name, skill]));
  const globalSkills = context.skills.filter((skill) => isGlobalSummary(skill, context.skills));
  const globalNames = new Set(globalSkills.map((skill) => skill.name));
  const foldedNames = new Set<string>();
  for (const folder of context.folders) {
    for (const skill of folder.skills) if (globalNames.has(skill)) foldedNames.add(skill);
  }
  const present = catalogNames(message);
  const folded = present.filter((name) => foldedNames.has(name) && byName.has(name));
  // 没有条目被折叠时保持原消息：原生目录逐字节不变
  if (folded.length === 0) return { action: 'keep', message };
  const visible = present.filter((name) => !foldedNames.has(name));
  const summaries = describeFolders(
    context.folders.map((folder) => ({
      ...folder,
      skills: folder.skills.filter((skill) => folded.includes(skill)),
    })),
  );
  const body = renderBody(visible, summaries, message);
  // 正文已呈现过：丢弃这条重发，会话里那份保持不动
  if (context.presented !== undefined && context.presented === body) return { action: 'drop' };
  const text = renderCatalog(renderHeader(message.source['update'] === true), body);
  return {
    action: 'keep',
    message: {
      ...message,
      content: [{ type: 'text', text }],
      source: { ...message.source, foldedBy: FOLDED_BY },
    },
  };
}

/** 转义 XML 敏感字符。技能名已由宿主校验，不需要转义。 */
function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** 目录正文的起始标记。 */
const BODY_START = '<available_skills>';

/** 目录消息的结束标记。 */
const REMINDER_END = '</system-reminder>';

/** 正文末尾的固定加载指引。 */
const LOAD_HINT =
  'Skills inside a folder stay loadable. To find one, call `skill_search` with the folder name or with capability keywords, then load the chosen skill with `skill`. Load a listed skill directly when its description matches the task.';

/** 渲染目录首句：跟随宿主的更新标记。 */
function renderHeader(update: boolean): string {
  return update
    ? 'The available skill catalog changed. Folders below replace their members; the skills listed above stay available.'
    : 'The following skills are available in this session. Folders group their members.';
}

/** 渲染目录正文：未折叠条目与文件夹摘要，不含首句。 */
function renderBody(
  visible: readonly string[],
  summaries: readonly { name: string; description: string; count: number }[],
  message: SkillCatalogMessage,
): string {
  const folderLines = summaries.map(
    (folder) =>
      `- \`${folder.name}\` (${folder.count} skills)${
        folder.description === '' ? '' : `: ${escapeText(folder.description)}`
      }`,
  );
  return [
    BODY_START,
    ...visible.map((name) => `- \`${name}\`: ${escapeText(descriptionOf(name, message))}`),
    '</available_skills>',
    '',
    '<skill_folders>',
    ...folderLines,
    '</skill_folders>',
    '',
    LOAD_HINT,
  ].join('\n');
}

/** 用首句与正文拼出目录文本。 */
function renderCatalog(header: string, body: string): string {
  return ['<system-reminder>', header, '', body, REMINDER_END].join('\n');
}

/** 从目录文本里截取正文；找不到起始标记时返回 undefined。 */
export function catalogBody(text: string): string | undefined {
  const start = text.indexOf(BODY_START);
  if (start < 0) return undefined;
  const tail = text.slice(start);
  const end = tail.indexOf(REMINDER_END);
  return (end < 0 ? tail : tail.slice(0, end)).trimEnd();
}

/** 原生条目描述，找不到时返回空串。 */
function descriptionOf(name: string, message: SkillCatalogMessage): string {
  return message.source.entries.find((entry) => entry.name === name)?.description ?? '';
}

/** 折叠消息列表中的目录消息；判定为丢弃的目录消息移出列表，其余消息原样保留。 */
export function foldCatalog<T extends CatalogMessageBase>(
  messages: readonly T[],
  context: FoldContext,
): T[] {
  const result: T[] = [];
  for (const message of messages) {
    if (!isSkillCatalogMessage(message)) {
      result.push(message);
      continue;
    }
    const outcome = foldMessage(message, context);
    if (outcome.action === 'keep') result.push(outcome.message as unknown as T);
  }
  return result;
}

/** 读取一条消息里的文本；不是目录消息时返回 undefined。 */
function catalogTextOf(message: unknown): string | undefined {
  if (typeof message !== 'object' || message === null) return undefined;
  const { role, source, content } = message as {
    role?: unknown;
    source?: unknown;
    content?: unknown;
  };
  if (role !== 'user') return undefined;
  if (typeof source !== 'object' || source === null) return undefined;
  if ((source as { kind?: unknown }).kind !== 'skill-catalog') return undefined;
  if (!Array.isArray(content)) return undefined;
  const parts: string[] = [];
  for (const block of content as readonly unknown[]) {
    if (typeof block !== 'object' || block === null) continue;
    const { type, text } = block as { type?: unknown; text?: unknown };
    if (type === 'text' && typeof text === 'string') parts.push(text);
  }
  return parts.join('\n');
}

/** 从模型可见消息里取最后一份目录的正文；不可得时返回 undefined。 */
export function presentedBodyOf(messages: readonly unknown[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = catalogTextOf(messages[index]);
    if (text === undefined) continue;
    return catalogBody(text);
  }
  return undefined;
}
