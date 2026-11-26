// 插件接线测试：导出契约、pre-step 折叠接线、工具可见性、热更新与卸载。
import { describe, expect, it } from 'vitest';
import { PLUGIN_LABEL } from '../src/constants.ts';
import { apply, inject, name } from '../src/index.ts';
import { volatile } from './helpers.ts';
import { makePluginCtx } from './support/plugin-ctx.ts';

describe('模块契约', () => {
  it('导出 name / inject / apply', () => {
    expect(name).toBe(PLUGIN_LABEL);
    expect(inject).toEqual(['tools', 'skills', 'workingDirectory']);
    expect(typeof apply).toBe('function');
  });
});

describe('apply 接线', () => {
  it('订阅 agent/pre-step 与 loader/volatile-update', () => {
    const ctx = makePluginCtx();
    apply(ctx as never, {});
    const events = ctx._listeners.map((entry) => entry.event);
    expect(events).toContain('agent/pre-step');
    expect(events).toContain('loader/volatile-update');
  });

  it('pre-step 监听以 prepend 注册，位于原生监听之外', () => {
    const ctx = makePluginCtx();
    apply(ctx as never, {});
    expect(ctx._onOptions('agent/pre-step')).toEqual({ prepend: true });
  });

  it('拒绝决策原样返回', async () => {
    const ctx = makePluginCtx();
    apply(ctx as never, {});
    const rejected = { kind: 'reject' as const };
    const result = await ctx._runPreStep({ agent: { id: 'a' } }, async () => rejected as never);
    expect(result).toBe(rejected);
  });

  it('看不到 skill_search 时原样返回', async () => {
    const ctx = makePluginCtx({ tools: ['skill'] });
    apply(ctx as never, {});
    const decision = { kind: 'enter' as const, messages: [ctx.catalog] };
    const result = await ctx._runPreStep({ agent: { id: 'a' } }, async () => decision);
    expect(result).toBe(decision);
  });

  it('没有目录消息时不读取技能快照', async () => {
    const ctx = makePluginCtx();
    let snapshots = 0;
    ctx.snapshot = async () => {
      snapshots += 1;
      return { skills: [], complete: true };
    };
    apply(ctx as never, {});
    await ctx._runPreStep({ agent: { id: 'a' } }, async () => ({
      kind: 'enter' as const,
      messages: [{ id: 'u', role: 'user', content: [], source: { kind: 'user' } }],
    }));
    expect(snapshots).toBe(0);
  });

  it('目录消息按文件夹折叠，工作目录与作用域来自本 Agent', async () => {
    const ctx = makePluginCtx();
    const seen: Record<string, unknown> = {};
    ctx.snapshot = async (options) => {
      Object.assign(seen, options);
      return { skills: ctx.skillsFixture, complete: true };
    };
    apply(ctx as never, {
      folders: [{ name: 'lark', description: '飞书', skills: ['lark-doc'] }],
    });
    const result = (await ctx._runPreStep({ agent: { id: 'a' } }, async () => ({
      kind: 'enter' as const,
      messages: [ctx.catalog],
    }))) as { messages: { content: { text?: string }[] }[] };
    expect(seen['cwd']).toBe('C:/workspace');
    expect(seen['scope']).toEqual({ id: 'a' });
    const text = result.messages[0]?.content[0]?.text ?? '';
    expect(text).toContain('`lark` (1 skills): 飞书');
    expect(text).not.toContain('`lark-doc`');
  });

  it('技能快照读取失败时保持目录不变并记录警告', async () => {
    const ctx = makePluginCtx();
    ctx.snapshot = undefined;
    apply(ctx as never, { folders: [{ name: 'lark', description: '', skills: ['lark-doc'] }] });
    const decision = { kind: 'enter' as const, messages: [ctx.catalog] };
    const result = await ctx._runPreStep({ agent: { id: 'a' } }, async () => decision);
    expect(result).toBe(decision);
    expect(ctx._loggerCalls.some((call) => call.level === 'warn')).toBe(true);
  });
});

describe('检索工具注册', () => {
  it('注册 skill_search，参数说明中的默认数量来自配置', () => {
    const ctx = makePluginCtx();
    apply(ctx as never, { defaultLimit: 9 });
    const tool = ctx._registeredTools.find((entry) => entry.name === 'skill_search');
    expect(tool).toBeDefined();
    expect(tool?.parameters?.properties?.limit?.description).toContain('default 9');
  });

  it('卸载时注销工具', () => {
    const ctx = makePluginCtx();
    apply(ctx as never, {});
    expect(ctx._hasTool('skill_search')).toBe(true);
    ctx._dispose();
    expect(ctx._hasTool('skill_search')).toBe(false);
  });

  it('配置更新后按新默认数量重新注册', () => {
    const ctx = makePluginCtx();
    const defaultLimit = volatile(5);
    apply(ctx as never, { defaultLimit });
    defaultLimit.set(11);
    ctx._emit('loader/volatile-update', [['defaultLimit']]);
    const active = [...ctx._activeTools].filter((entry) => entry.name === 'skill_search');
    expect(active).toHaveLength(1);
    expect(active[0]?.parameters?.properties?.limit?.description).toContain('default 11');
  });

  it('工具按当前文件夹检索，并透传检索完整性', async () => {
    const ctx = makePluginCtx();
    apply(ctx as never, {
      folders: [{ name: 'lark', description: '飞书', skills: ['lark-doc'] }],
    });
    const tool = ctx._registeredTools.find((entry) => entry.name === 'skill_search');
    const result = await tool?.execute(
      { folder: 'lark' },
      { agent: { id: 'a' }, signal: new AbortController().signal },
    );
    expect(result).toMatchObject({ folder: 'lark', total: 1, complete: true });
    expect(result?.results).toHaveLength(1);
    expect(result?.results?.[0]).toMatchObject({
      name: 'lark-doc',
      folder: 'lark',
      match: 'folder',
    });
  });

  it('原生加载器不可用时工具报错', async () => {
    const ctx = makePluginCtx({ tools: ['skill_search'] });
    apply(ctx as never, { folders: [] });
    const tool = ctx._registeredTools.find((entry) => entry.name === 'skill_search');
    await expect(tool?.execute({ query: 'lark' }, { agent: { id: 'a' } })).rejects.toThrow(
      'skill loader',
    );
  });
});

describe('配置热更新', () => {
  it('保存后使用新文件夹', async () => {
    const ctx = makePluginCtx();
    const folders = volatile<{ name: string; description: string; skills: string[] }[]>([]);
    apply(ctx as never, { folders });
    const before = (await ctx._runPreStep({ agent: { id: 'a' } }, async () => ({
      kind: 'enter' as const,
      messages: [ctx.catalog],
    }))) as { messages: readonly unknown[] };
    expect(before.messages[0]).toBe(ctx.catalog);

    folders.set([{ name: 'lark', description: '', skills: ['lark-doc'] }]);
    ctx._emit('loader/volatile-update', [['folders']]);
    const after = (await ctx._runPreStep({ agent: { id: 'a' } }, async () => ({
      kind: 'enter' as const,
      messages: [ctx.catalog],
    }))) as { messages: { content: { text?: string }[] }[] };
    expect(after.messages[0]?.content[0]?.text).toContain('`lark`');
  });

  it('非法更新被忽略并记录警告', async () => {
    const ctx = makePluginCtx();
    const folders = volatile<unknown[]>([{ name: 'ok', description: '', skills: [] }]);
    apply(ctx as never, { folders });
    folders.set([{ name: '', description: '', skills: [] }]);
    ctx._emit('loader/volatile-update', [['folders']]);
    expect(ctx._loggerCalls.some((call) => call.level === 'warn')).toBe(true);
    const result = (await ctx._runPreStep({ agent: { id: 'a' } }, async () => ({
      kind: 'enter' as const,
      messages: [ctx.catalog],
    }))) as { messages: readonly unknown[] };
    // 保持原状：旧配置没有折叠任何成员
    expect(result.messages[0]).toBe(ctx.catalog);
  });
});

describe('全局技能路由', () => {
  it('注册 GET /api/skill-folder/skills', () => {
    const ctx = makePluginCtx();
    apply(ctx as never, {});
    expect(ctx._routes.map((route) => [route.path, route.methods])).toEqual([
      ['/api/skill-folder/skills', ['GET']],
    ]);
  });

  it('返回按名称排序的全局技能与完整性', async () => {
    const ctx = makePluginCtx({ complete: false });
    apply(ctx as never, {});
    const response = await ctx._routes[0]?.fetch(new Request('http://x/api/skill-folder/skills'));
    expect(response?.status).toBe(200);
    const body = (await response?.json()) as { complete: boolean; skills: { name: string }[] };
    expect(body.complete).toBe(false);
    expect(body.skills.map((skill) => skill.name)).toEqual([
      'chrome-devtools',
      'lark-doc',
      'lark-sheet',
    ]);
  });

  it('路由读取全局集合：不传工作区与作用域', async () => {
    const ctx = makePluginCtx();
    const seen: Record<string, unknown>[] = [];
    ctx.snapshot = async (input) => {
      seen.push(input);
      return { skills: ctx.skillsFixture, complete: true };
    };
    apply(ctx as never, {});
    await ctx._routes[0]?.fetch(new Request('http://x/api/skill-folder/skills'));
    expect(seen).toEqual([{}]);
  });

  it('读取失败时返回 500 与错误', async () => {
    const ctx = makePluginCtx();
    ctx.snapshot = undefined;
    apply(ctx as never, {});
    const response = await ctx._routes[0]?.fetch(new Request('http://x/api/skill-folder/skills'));
    if (response === undefined) throw new Error('路由没有返回响应');
    expect(response.status).toBe(500);
    expect(((await response.json()) as { error: string }).error).toContain('没有技能快照');
  });

  it('connection 不可用时不注册路由', () => {
    const ctx = makePluginCtx({ connection: false });
    apply(ctx as never, {});
    expect(ctx._routes).toEqual([]);
  });
});

describe('检索选项热更新', () => {
  it('保存后新摘要长度作用于检索结果', async () => {
    const long = [
      {
        name: 'chrome-devtools',
        description: '长'.repeat(500),
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'user-agents',
        provider: 'filesystem',
        path: 'C:/Users/me/.agents/skills/chrome-devtools/SKILL.md',
      },
    ];
    const ctx = makePluginCtx({ skills: long });
    const descriptionMaxLength = volatile(320);
    apply(ctx as never, { descriptionMaxLength });
    descriptionMaxLength.set(40);
    ctx._emit('loader/volatile-update', [['descriptionMaxLength']]);
    const tool = ctx._registeredTools.filter((entry) => entry.name === 'skill_search').at(-1);
    const result = (await tool?.execute(
      { query: 'chrome-devtools' },
      { agent: { id: 'a' }, signal: new AbortController().signal },
    )) as { results: { description: string }[] } | undefined;
    expect(Array.from(result?.results[0]?.description ?? '')).toHaveLength(40);
  });
});

describe('始终分组', () => {
  /** 新增的飞书技能。 */
  const larkIm = {
    name: 'lark-im',
    description: '飞书消息',
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'user-agents',
    provider: 'filesystem',
    path: 'C:/Users/me/.agents/skills/lark-im/SKILL.md',
  };

  it('订阅 skills/change', () => {
    const ctx = makePluginCtx();
    apply(ctx as never, {});
    expect(ctx._listeners.map((entry) => entry.event)).toContain('skills/change');
  });

  it('开启后技能变化时按前缀写入配置，保留其他键', async () => {
    const folders = [{ name: 'lark', description: '飞书', skills: ['lark-sheet', 'lark-doc'] }];
    const config = { folders, alwaysGroup: true, defaultLimit: 9 };
    const ctx = makePluginCtx({ config });
    apply(ctx as never, config);
    ctx.snapshot = async () => ({
      skills: [...ctx.skillsFixture, larkIm],
      complete: true,
    });
    await ctx._emit('skills/change');
    expect(ctx._edits).toHaveLength(1);
    expect(ctx._edits[0]?.['folders']).toEqual([
      { name: 'lark', description: '飞书', skills: ['lark-sheet', 'lark-doc', 'lark-im'] },
    ]);
    expect(ctx._edits[0]?.['defaultLimit']).toBe(9);
  });

  it('关闭时不读取技能也不写配置', async () => {
    const ctx = makePluginCtx();
    let snapshots = 0;
    ctx.snapshot = async () => {
      snapshots += 1;
      return { skills: ctx.skillsFixture, complete: true };
    };
    apply(ctx as never, { alwaysGroup: false, folders: [] });
    await ctx._emit('skills/change');
    expect(ctx._edits).toEqual([]);
    expect(snapshots).toBe(0);
  });

  it('分组结果没有变化时不写配置', async () => {
    const folders = [{ name: 'lark', description: '', skills: ['lark-doc', 'lark-sheet'] }];
    const ctx = makePluginCtx({ config: { folders } });
    apply(ctx as never, { folders, alwaysGroup: true });
    await ctx._emit('skills/change');
    expect(ctx._edits).toEqual([]);
  });

  it('勾选并保存后立即分组一次', async () => {
    const alwaysGroup = volatile(false);
    const ctx = makePluginCtx({ config: {} });
    apply(ctx as never, { alwaysGroup, folders: [] });
    alwaysGroup.set(true);
    await ctx._emit('loader/volatile-update', [['alwaysGroup']]);
    expect(ctx._edits).toHaveLength(1);
    expect(ctx._edits[0]?.['folders']).toEqual([
      { name: 'lark', description: '', skills: ['lark-doc', 'lark-sheet'] },
    ]);
  });

  it('已开启时的其他配置更新不触发分组', async () => {
    const alwaysGroup = volatile(true);
    const ctx = makePluginCtx({ config: {} });
    apply(ctx as never, { alwaysGroup, folders: [] });
    await ctx._emit('loader/volatile-update', [['defaultLimit']]);
    expect(ctx._edits).toEqual([]);
  });

  it('配置编辑器缺失时保持原分组并记录警告', async () => {
    const ctx = makePluginCtx({ configEditor: false });
    apply(ctx as never, { alwaysGroup: true, folders: [] });
    await ctx._emit('skills/change');
    expect(ctx._edits).toEqual([]);
    expect(
      ctx._loggerCalls.some(
        (call) => call.level === 'warn' && String(call.args[0]).includes('config editor'),
      ),
    ).toBe(true);
  });

  it('技能读取失败时保持原分组并记录警告', async () => {
    const ctx = makePluginCtx();
    ctx.snapshot = undefined;
    apply(ctx as never, { alwaysGroup: true, folders: [] });
    await ctx._emit('skills/change');
    expect(ctx._edits).toEqual([]);
    expect(ctx._loggerCalls.some((call) => call.level === 'warn')).toBe(true);
  });
});

describe('目录去重接线', () => {
  /** 带会话可见记录的 agent。 */
  const agentWith = (messages: unknown[]) => ({
    id: 'a',
    session: { deriveMessages: () => messages },
  });

  /** 会话里已呈现的目录消息。 */
  const presentedMessage = (text: string) => ({
    role: 'user',
    source: { kind: 'skill-catalog', form: 'catalog', entries: [] },
    content: [{ type: 'text', text }],
  });

  /** 一条普通用户消息。 */
  const otherMessage = {
    id: 'user-1',
    role: 'user',
    content: [{ type: 'text', text: 'hi' }],
    source: { kind: 'user' },
  };

  /** 折叠一张目录并返回折叠文本。 */
  const foldOnce = async (ctx: ReturnType<typeof makePluginCtx>): Promise<string> => {
    const result = (await ctx._runPreStep({ agent: { id: 'a' } }, async () => ({
      kind: 'enter' as const,
      messages: [ctx.catalog],
    }))) as { messages: { content: { text?: string }[] }[] };
    return result.messages[0]?.content[0]?.text ?? '';
  };

  it('已呈现同一份正文时把重发的目录消息移出本步', async () => {
    const ctx = makePluginCtx();
    apply(ctx as never, { folders: [{ name: 'lark', description: '飞书', skills: ['lark-doc'] }] });
    const presented = await foldOnce(ctx);
    expect(presented).toContain('<skill_folders>');
    const result = (await ctx._runPreStep(
      { agent: agentWith([presentedMessage(presented)]) },
      async () => ({ kind: 'enter' as const, messages: [otherMessage, ctx.catalog] }),
    )) as { messages: unknown[] };
    expect(result.messages).toEqual([otherMessage]);
  });

  it('已呈现内容不同时注入折叠目录', async () => {
    const ctx = makePluginCtx();
    apply(ctx as never, { folders: [{ name: 'lark', description: '飞书', skills: ['lark-doc'] }] });
    const result = (await ctx._runPreStep(
      { agent: agentWith([presentedMessage('旧目录')]) },
      async () => ({ kind: 'enter' as const, messages: [otherMessage, ctx.catalog] }),
    )) as { messages: { content: { text?: string }[] }[] };
    expect(result.messages).toHaveLength(2);
    const text = result.messages[1]?.content[0]?.text ?? '';
    expect(text).toContain('<skill_folders>');
    expect(text).toContain('`lark` (1 skills): 飞书');
  });
});
