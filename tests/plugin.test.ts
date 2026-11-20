// 插件接线测试：导出契约、pre-step 折叠接线、工具可见性、热更新与卸载。
import { describe, expect, it } from 'vitest';
import { PLUGIN_LABEL } from '../src/constants.ts';
import { apply, inject, name } from '../src/index.ts';
import { makeCtx, volatile } from './helpers.ts';
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
    const ctx = makeCtx();
    apply(ctx, {});
    expect(ctx._onCallbacks.has('agent/pre-step')).toBe(true);
    expect(ctx._onCallbacks.has('loader/volatile-update')).toBe(true);
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
