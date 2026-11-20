// 实机脚本守卫：profile 底本与驱动会话形态必须与真实 GUI 会话一致，
// 相关事实见 docs/known-risks.md 的「根作用域技能插件与 agent preset 冲突」。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** 仓库根目录（tests/ 的上一级）。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 读取仓库内文件。 */
const read = (relative: string) => readFileSync(path.join(ROOT, relative), 'utf8');

/** 实机测试 skill 目录。 */
const SKILL = '.dsh/skills/real-device-test';

describe('实机脚本：profile 以官方 web 默认 profile 为底本', () => {
  const setup = read(`${SKILL}/scripts/setup-env.sh`);

  it('使用官方 web 默认 profile 创建底本', () => {
    expect(setup).toContain('--from-default-profile web');
  });

  it('不覆写技能插件，交由 agent preset 提供', () => {
    expect(setup).not.toContain('- id: tool-skill');
    expect(setup).not.toContain('- id: skill-filesystem');
  });

  it('保留 mock 模型、会话目录与 HMR 隔离项', () => {
    expect(setup).toContain('- id: agent-default-model');
    expect(setup).toContain('- id: session-persistence-jsonl');
    expect(setup).toContain('- id: hmr');
  });
});

describe('实机脚本：驱动会话挂 standard preset', () => {
  const run = read(`${SKILL}/scripts/run-test.mjs`);

  it('通过 agentPresets 解析并挂载 preset', () => {
    expect(run).toContain("app.get('agentPresets')");
    expect(run).toContain("resolve('standard')");
    expect(run).toContain('presets.mount(agentCtx, preset.id)');
    expect(run).toContain('installModelSelection(agentCtx)');
  });

  it('缺少 preset 服务时给出宿主版本提示', () => {
    expect(run).toContain('宿主缺少 agentPresets 服务');
    expect(run).toContain('@deepseek-ai/dsh-agent');
  });

  it('包含 preset 会话的目录消息用例', () => {
    expect(run).toContain('B0 preset 会话包含技能目录消息');
    expect(run).toContain("source?.kind === 'skill-catalog'");
    expect(run).toContain('<available_skills>');
  });
});

describe('实机脚本：文档与用例表同步', () => {
  it('SKILL.md 用例表列出 B0', () => {
    expect(read(`${SKILL}/SKILL.md`)).toContain('| B0 会话形态 |');
  });

  it('known-risks 记录根作用域技能插件冲突', () => {
    expect(read('docs/known-risks.md')).toContain('根作用域技能插件与 agent preset 冲突');
  });

  it('pitfalls 记录症状与处理', () => {
    expect(read(`${SKILL}/references/pitfalls.md`)).toContain('<available_skills>');
  });
});
