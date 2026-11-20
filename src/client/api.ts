/**
 * 配置页调用的同源路由：读取全局技能列表。
 * 导出 SkillItem、SkillsPayload 与 fetchSkills。
 */
import { ROUTE_PATH } from '../constants.ts';
import type { SkillItem } from '../skills.ts';

export type { SkillItem };

/** 路由返回的全局技能列表。 */
export interface SkillsPayload {
  /** 列表是否完整。 */
  complete: boolean;
  /** 按名称排序的全局技能。 */
  skills: SkillItem[];
}

/** 判断值是否是普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 把路由响应规范为技能条目，忽略无法识别的项。 */
export function parseSkillsPayload(value: unknown): SkillsPayload {
  if (!isRecord(value) || !Array.isArray(value['skills'])) {
    throw new Error('unexpected skills response');
  }
  const skills: SkillItem[] = [];
  for (const entry of value['skills']) {
    if (!isRecord(entry) || typeof entry['name'] !== 'string') continue;
    skills.push({
      name: entry['name'],
      description: typeof entry['description'] === 'string' ? entry['description'] : '',
      ...(typeof entry['whenToUse'] === 'string' ? { whenToUse: entry['whenToUse'] } : {}),
      source: typeof entry['source'] === 'string' ? entry['source'] : '',
      ...(typeof entry['path'] === 'string' ? { path: entry['path'] } : {}),
    });
  }
  return { complete: value['complete'] !== false, skills };
}

/** 读取全局技能列表；失败时抛出带路由错误文本的异常。 */
export async function fetchSkills(signal?: AbortSignal): Promise<SkillsPayload> {
  const response = await fetch(ROUTE_PATH, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    ...(signal === undefined ? {} : { signal }),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = text === '' ? {} : JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${String(response.status)}`);
  }
  if (!response.ok) {
    const error = isRecord(body) ? body['error'] : undefined;
    throw new Error(typeof error === 'string' ? error : `HTTP ${String(response.status)}`);
  }
  return parseSkillsPayload(body);
}
