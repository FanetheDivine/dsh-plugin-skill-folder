// 技能判定测试：可由模型调用过滤、全局来源与路径判定、全局列表读取。
import { describe, expect, it } from 'vitest';

import { isGlobalSummary, isModelInvocable, loadGlobalSkills, toSkillItem } from '../src/skills.ts';

/** 构造一条技能摘要。 */
function summary(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    description: `${name} description`,
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'user-agents',
    provider: 'filesystem',
    ...extra,
  };
}

describe('可由模型调用', () => {
  it('只接受 modelInvocable 为 true', () => {
    expect(isModelInvocable(summary('a'))).toBe(true);
    expect(
      isModelInvocable(
        summary('b', { invocation: { modelInvocable: false, userInvocable: true } }),
      ),
    ).toBe(false);
  });
});

describe('全局来源判定', () => {
  it('非 project- 来源视为全局', () => {
    for (const source of ['user-agents', 'user-dsh', 'bundled', 'custom', 'runtime']) {
      expect(isGlobalSummary(summary('a', { source }), [])).toBe(true);
    }
  });

  it('project- 来源默认不是全局', () => {
    for (const source of ['project-agents', 'project-dsh']) {
      expect(isGlobalSummary(summary('a', { source }), [])).toBe(false);
    }
  });

  it('主目录会话把全局技能标成 project-agents 时按路径认回', () => {
    const skill = summary('lark-doc', {
      source: 'project-agents',
      path: 'C:/Users/me/.agents/skills/lark-doc/SKILL.md',
    });
    const global = [summary('lark-doc', { path: 'C:/Users/me/.agents/skills/lark-doc/SKILL.md' })];
    expect(isGlobalSummary(skill, global)).toBe(true);
  });

  it('项目目录下的同名文件路径不同，仍不是全局', () => {
    const skill = summary('lark-doc', {
      source: 'project-agents',
      path: 'C:/work/app/.agents/skills/lark-doc/SKILL.md',
    });
    const global = [summary('lark-doc', { path: 'C:/Users/me/.agents/skills/lark-doc/SKILL.md' })];
    expect(isGlobalSummary(skill, global)).toBe(false);
  });

  it('路径分隔符与大小写差异不影响判定', () => {
    const skill = summary('lark-doc', {
      source: 'project-agents',
      path: 'c:\\Users\\me\\.agents\\skills\\lark-doc\\SKILL.md',
    });
    const global = [summary('lark-doc', { path: 'C:/Users/me/.agents/skills/lark-doc/SKILL.md' })];
    expect(isGlobalSummary(skill, global)).toBe(true);
  });
});

describe('全局列表读取', () => {
  it('过滤项目级与仅用户可调用的技能，并按名称排序', async () => {
    const skills = [
      summary('zeta'),
      summary('alpha'),
      summary('project-only', { source: 'project-dsh' }),
      summary('user-only', { invocation: { modelInvocable: false, userInvocable: true } }),
    ];
    const result = await loadGlobalSkills({ list: async () => skills });
    expect(result.skills.map((item) => item.name)).toEqual(['alpha', 'zeta']);
    expect(result.complete).toBe(true);
  });

  it('透传检索完整性', async () => {
    const result = await loadGlobalSkills({
      snapshot: async () => ({ skills: [summary('alpha')], complete: false }),
    });
    expect(result.complete).toBe(false);
  });

  it('只读取摘要列表，不读取指令正文', async () => {
    let getCalled = false;
    await loadGlobalSkills({
      list: async () => [summary('alpha')],
      get: async () => {
        getCalled = true;
        return undefined;
      },
    });
    expect(getCalled).toBe(false);
  });
});

describe('投影为界面条目', () => {
  it('保留名称、描述、用途、来源与路径', () => {
    const item = toSkillItem(
      summary('lark-doc', {
        whenToUse: '写成文档',
        path: 'C:/Users/me/.agents/skills/lark-doc/SKILL.md',
      }),
    );
    expect(item).toEqual({
      name: 'lark-doc',
      description: 'lark-doc description',
      whenToUse: '写成文档',
      source: 'user-agents',
      path: 'C:/Users/me/.agents/skills/lark-doc/SKILL.md',
    });
  });

  it('缺少用途与路径时省略这两个字段', () => {
    expect(toSkillItem(summary('a'))).toEqual({
      name: 'a',
      description: 'a description',
      source: 'user-agents',
    });
  });
});
