/**
 * `skill_search` 工具定义：参数校验、文件夹解析、技能快照读取与结果渲染。
 * 导出 SkillSearchToolOptions、buildSearchTool 与 SEARCH_TOOL_DESCRIPTION。
 */

import type { FolderConfig } from './config.ts';
import { MAX_LIMIT, MAX_QUERY_LENGTH, PLUGIN_LABEL, TOOL_NAME } from './constants.ts';
import { folderByName } from './folders.ts';
import { rankSkills } from './search.ts';
import type { SkillSummary } from './skills.ts';

/** 工具说明。模型据此判断何时检索。 */
export const SEARCH_TOOL_DESCRIPTION =
  'Discover skills by keywords or by folder name, including folded skills hidden from the catalog list. Search returns summaries only; load a chosen skill with `skill` and its exact name.';

/** 工具构造参数。 */
export interface SkillSearchToolOptions {
  /** 生效的文件夹。 */
  folders: readonly FolderConfig[];
  /** 默认返回数量。 */
  defaultLimit: number;
  /** 摘要字符上限。 */
  descriptionMaxLength: number;
  /** 读取当前 Agent 的技能快照。 */
  readSkills: (context: ToolRunContextShape) => Promise<{
    readonly skills: readonly SkillSummary[];
    readonly complete: boolean;
  }>;
  /** 判断当前 Agent 是否看得到原生 `skill` 加载器。 */
  hasSkillLoader: (context: ToolRunContextShape) => boolean;
}

/** 工具执行上下文读取子集。 */
export interface ToolRunContextShape {
  /** 本步骤的 Agent。 */
  agent?: unknown;
  /** 中止信号。 */
  signal?: AbortSignal | undefined;
}

/** 工具参数。 */
export interface SearchToolArgs {
  /** 能力关键词或准确技能名。 */
  query?: unknown;
  /** 文件夹名。 */
  folder?: unknown;
  /** 返回数量上限。 */
  limit?: unknown;
  /** 跳过多少条。 */
  offset?: unknown;
}

/** 工输出。 */
export interface SearchToolOutput {
  /** 原始查询词，未提供时为 null。 */
  query: string | null;
  /** 请求的文件夹名，未提供时为 null。 */
  folder: string | null;
  /** 命中总数。 */
  total: number;
  /** 跳过的条数。 */
  offset: number;
  /** 后续仍有结果。 */
  more: boolean;
  /** 检索是否完整。 */
  complete: boolean;
  /** 本页结果。 */
  results: {
    /** 技能名。 */
    name: string;
    /** 截断后的描述。 */
    description: string;
    /** 截断后的使用时机。 */
    whenToUse: string;
    /** 所属文件夹名。 */
    folder: string | null;
    /** 匹配类型。 */
    match: string;
  }[];
}

/** 读取字符串参数，缺省返回 undefined。 */
function optionalString(value: unknown, key: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error(`${TOOL_NAME}: ${key} must be a string`);
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** 读取整数参数，缺省返回 fallback。 */
function optionalInteger(value: unknown, key: string, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`${TOOL_NAME}: ${key} must be an integer`);
  }
  return value;
}

/** 校验并归一化工具参数。 */
export function resolveArgs(
  args: SearchToolArgs,
  folders: readonly FolderConfig[],
  defaultLimit: number,
): { query: string | undefined; folder: string | undefined; limit: number; offset: number } {
  const query = optionalString(args.query, 'query');
  const folderName = optionalString(args.folder, 'folder');
  if (query === undefined && folderName === undefined) {
    throw new Error(`${TOOL_NAME}: provide query or folder`);
  }
  if (query !== undefined && query.length > MAX_QUERY_LENGTH) {
    throw new Error(`${TOOL_NAME}: query must contain 1–${MAX_QUERY_LENGTH} characters`);
  }
  const folder = folderName === undefined ? undefined : folderByName(folders, folderName)?.name;
  if (folderName !== undefined && folder === undefined) {
    throw new Error(`${TOOL_NAME}: unknown folder "${folderName}"`);
  }
  const limit = optionalInteger(args.limit, 'limit', defaultLimit);
  if (limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`${TOOL_NAME}: limit must be an integer from 1 to ${MAX_LIMIT}`);
  }
  const offset = optionalInteger(args.offset, 'offset', 0);
  if (offset < 0) throw new Error(`${TOOL_NAME}: offset must be a nonnegative integer`);
  return { query, folder, limit, offset };
}

/**
 * 可空字符串的 schema。
 * 宿主只接受单个 `type`，可空字段用 `oneOf` 表达。
 */
function nullableString(): { oneOf: { type: 'string' | 'null' }[] } {
  return { oneOf: [{ type: 'string' }, { type: 'null' }] };
}

/** 构造 `skill_search` 工具定义。 */
export function buildSearchTool(options: SkillSearchToolOptions) {
  return {
    name: TOOL_NAME,
    description: SEARCH_TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          description: `Capability keywords or an exact skill name, at most ${MAX_QUERY_LENGTH} characters; Chinese and English are both supported.`,
        },
        folder: {
          type: 'string',
          description: 'Folder name; lists every available member and matches case-insensitively.',
        },
        limit: {
          type: 'integer',
          description: `Maximum results, 1–${MAX_LIMIT}; default ${String(options.defaultLimit)}.`,
        },
        offset: {
          type: 'integer',
          description: 'Skip this many ranked results for pagination; default 0.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['query', 'folder', 'total', 'offset', 'more', 'complete', 'results'],
        properties: {
          query: nullableString(),
          folder: nullableString(),
          total: { type: 'integer' },
          offset: { type: 'integer' },
          more: { type: 'boolean' },
          complete: { type: 'boolean' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'description', 'whenToUse', 'folder', 'match'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                whenToUse: { type: 'string' },
                folder: nullableString(),
                match: { type: 'string', enum: ['exact', 'partial', 'folder'] },
              },
            },
          },
        },
      },
      render(_args: SearchToolArgs, value: SearchToolOutput) {
        return [
          {
            type: 'text',
            text: `${JSON.stringify(value)}\nThese are discovery summaries only. Load applicable instructions with skill({name: "exact-name"}).${
              value.complete
                ? ''
                : ' Discovery was incomplete; retry before concluding a skill is absent.'
            }`,
          },
        ];
      },
    },
    async execute(args: SearchToolArgs, context: ToolRunContextShape): Promise<SearchToolOutput> {
      const resolved = resolveArgs(args, options.folders, options.defaultLimit);
      if (!options.hasSkillLoader(context)) {
        throw new Error(`${PLUGIN_LABEL}: ${TOOL_NAME} needs the native skill loader`);
      }
      context.signal?.throwIfAborted();
      const snapshot = await options.readSkills(context);
      context.signal?.throwIfAborted();
      const result = rankSkills(snapshot.skills, resolved.query, {
        folders: options.folders,
        folder: resolved.folder,
        limit: resolved.limit,
        offset: resolved.offset,
        descriptionMaxLength: options.descriptionMaxLength,
      });
      return {
        query: resolved.query ?? null,
        folder: resolved.folder ?? null,
        total: result.total,
        offset: resolved.offset,
        more: result.more,
        complete: snapshot.complete,
        results: result.results.map((hit) => ({ ...hit })),
      };
    },
    isConcurrencySafe: () => true,
    presentCall: (args: SearchToolArgs) => ({
      card: 'generic',
      title: 'Search skills',
      kind: 'read',
      rawInput: typeof args.query === 'string' ? args.query : String(args.folder ?? ''),
    }),
  };
}
