// 实机测试后端驱动：在真实宿主中加载已安装的插件与 mock provider，逐条运行用例。
// 用法：在 profile 目录运行 node run-test.mjs；RDT_KEEPALIVE=1 时结束后保留运行时。
// env：RDT_REPO 必填；RDT_PROFILE_DIR 默认脚本所在目录；RDT_PROFILE 默认目录名；RDT_DSH_PKG 默认全局宿主。
// 结果写入 results.json，全部通过时退出码为 0。
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { plain, TOOL_NAME } from './mock-provider.mjs';

const root = process.env.RDT_PROFILE_DIR ?? dirname(fileURLToPath(import.meta.url));
const REPO = process.env.RDT_REPO;
if (!REPO) throw new Error('RDT_REPO 必填：插件仓库绝对路径，例如 <drive>:/path/to/<repo>');
const PLUGIN = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).name;
const ROUTE = '/api/skill-folder/skills';
const dshPkg =
  process.env.RDT_DSH_PKG ??
  join(execSync('npm root -g', { encoding: 'utf8' }).trim(), '@deepseek-ai', 'dsh', 'package.json');

// 清理上一轮残留，固定的 sessionId 会与落盘会话冲突
for (const f of ['test-sessions', 'requests.jsonl', 'results.json', 'fatal.txt'])
  rmSync(join(root, f), { recursive: true, force: true });

const require = createRequire(dshPkg);
const { createUserMessage } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-llm')));
const { installModelSelection } = await import(
  pathToFileURL(require.resolve('@deepseek-ai/dsh-agent'))
);
const { createLaunchEnvironmentSnapshot } = await import(
  pathToFileURL(require.resolve('@deepseek-ai/dsh-launch-environment'))
);
const { runProfile } = await loadRunProfile(join(dirname(dshPkg), 'lib'));

/** 加载宿主的 runProfile。新版宿主提供 lib/profile-boot.js，旧版只有带 hash 的 profile-boot-*.js。 */
async function loadRunProfile(libDir) {
  const files = readdirSync(libDir)
    .filter((f) => /^profile-boot.*\.js$/.test(f))
    .sort((a, b) => a.length - b.length);
  for (const f of files) {
    const mod = await import(pathToFileURL(join(libDir, f)));
    if (typeof mod.runProfile === 'function') return mod;
  }
  throw new Error(`${libDir} 中找不到 runProfile`);
}

process.env.DSH_PROFILE = process.env.RDT_PROFILE ?? basename(root);
process.env.DSH_PROFILE_DIR = root;
process.env.DSH_TELEMETRY_DISABLED = '1';
const runtime = await runProfile({
  profile: process.env.DSH_PROFILE,
  environment: createLaunchEnvironmentSnapshot([{ source: 'process', values: process.env }]),
  patchFiles: [],
  args: ['--no-open', '--port', '0'],
});
const app = runtime.ctx;
const adapter = app.get('rdtMock');
const entry = [...app.loader.entries()].find((e) => e.options.name === PLUGIN);
const results = [];
const handles = [];

/** cordis fiber 状态：2 为已激活。 */
const FIBER_ACTIVE = 2;

/** 测试使用的基础配置：不折叠任何技能。 */
const base = { folders: [] };

/** 用例之间共享的现场：从真实技能目录里挑出的全局技能名。 */
const state = { available: [], chosen: [] };

/** 热更新插件配置并等待插件重新激活。 */
async function config(patch = {}) {
  await entry.update({ config: { ...base, ...patch } });
  await app.loader.await();
}

/** 会话使用的 agent preset：与 GUI 会话同形，技能工具与技能来源由它提供。 */
let presetSession;

/** 读取 preset 服务并解析 `standard`；宿主缺少该服务时说明版本不匹配。 */
async function standardPreset() {
  if (presetSession === undefined) {
    const presets = app.get('agentPresets');
    if (presets === undefined) {
      throw new Error(
        '宿主缺少 agentPresets 服务，无法挂 standard preset；请确认宿主版本与 package.json 的 @deepseek-ai/dsh-agent 一致',
      );
    }
    presetSession = { presets, preset: await presets.resolve('standard') };
  }
  return presetSession;
}

/** 用 mock 模型创建会话，挂载与 GUI 一致的 standard preset。 */
async function create(id) {
  const { presets, preset } = await standardPreset();
  const h = await app.agents.create({
    sessionId: id,
    meta: { cwd: REPO },
    agentOptions: { provider: 'mock', model: 'mock-model' },
    setup: async (agentCtx) => {
      installModelSelection(agentCtx);
      await presets.mount(agentCtx, preset.id);
    },
  });
  handles.push(h);
  return h.agent;
}

/** 发送一条用户消息并等待本轮结束，返回本轮的模型请求。 */
async function turn(agent, text, timeout = 60000) {
  const n = adapter.calls.length;
  agent.followup(
    createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }),
  );
  let timer;
  try {
    await Promise.race([
      agent.whenIdle(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`TEST_TIMEOUT ${agent.session.id}`)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  const calls = adapter.calls.slice(n);
  assert(
    calls.every((c) => c.provider === 'mock'),
    '出现了发往真实模型的请求',
  );
  return calls;
}

/** 发一条普通消息，返回本轮请求。 */
const probe = (agent) => turn(agent, '实机测试：请回复');

/** 会话事件列表。新版宿主提供 snapshotEvents()，旧版只有 events 属性。 */
const events = (agent) =>
  typeof agent.session.snapshotEvents === 'function'
    ? agent.session.snapshotEvents()
    : agent.session.events;

/** 会话事件中指定类型的事件。 */
const typed = (agent, type) => events(agent).filter((e) => e.type === type);

/** 请求中携带的工具定义。 */
const toolDef = (call) => (call.tools ?? []).find((t) => t.name === TOOL_NAME);

/** 从本轮请求里取出模型看到的技能目录。 */
function catalogOf(calls) {
  const text = plain(calls.flatMap((call) => call.messages ?? []));
  const available = /<available_skills>([\s\S]*?)<\/available_skills>/.exec(text)?.[1];
  const folders = /<skill_folders>([\s\S]*?)<\/skill_folders>/.exec(text)?.[1];
  const names = [...(available ?? '').matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
  return { text, available, folders, names };
}

/** 唯一的工具结果：错误文本与是否失败。 */
function toolOutcome(agent) {
  const list = typed(agent, 'tool/result');
  assert.equal(list.length, 1, `本轮应有 1 条工具结果，实际 ${list.length}`);
  const event = list[0];
  const message = event.data.message;
  return {
    event,
    text: plain([message]),
    isError: message?.isError === true || event.data.error !== undefined,
  };
}

/** 成功的工具结果：解析渲染文本首行的 JSON。 */
function toolPayload(agent) {
  const outcome = toolOutcome(agent);
  assert(!outcome.isError, `工具报错：${outcome.text}`);
  const line = outcome.text.split('\n', 1)[0];
  try {
    return { ...outcome, data: JSON.parse(line) };
  } catch {
    throw new Error(`工具结果首行不是 JSON：${line}`);
  }
}

/** 本轮请求调用工具时使用的消息文本。 */
const searchCase = (args) => `SEARCH_CASE:${JSON.stringify(args)}`;

/** 运行一条用例并记录结果。 */
async function check(label, fn) {
  try {
    const detail = await fn();
    results.push({ label, status: 'PASS', detail });
    console.log('PASS', label, JSON.stringify(detail ?? {}));
  } catch (e) {
    results.push({ label, status: 'FAIL', error: e?.stack ?? String(e) });
    console.error('FAIL', label, e?.stack ?? e);
  }
}

/** 记一条跳过：缺少全局技能时用，不算失败。 */
function skip(label, reason) {
  results.push({ label, status: 'SKIP', note: reason });
  console.log('SKIP', label, reason);
}

/** 全局技能名：配置页路由与检索都读同一份快照。 */
async function globalSkillNames() {
  const snapshot = await app.get('skills')?.snapshot({});
  return (snapshot?.skills ?? [])
    .filter((skill) => skill.invocation?.modelInvocable === true)
    .map((skill) => skill.name);
}

/** 取本轮可折叠的全局技能名：真实全局技能 ∩ 模型目录里列出的名称。 */
async function foldableNames(calls) {
  const global = new Set(await globalSkillNames());
  return catalogOf(calls).names.filter((name) => global.has(name));
}

try {
  await check('A1 插件装载且与仓库 dist 一致', async () => {
    assert(adapter, 'mock provider 未加载');
    assert(entry, `loader 中找不到 ${PLUGIN}`);
    assert.equal(entry.fiber.state, FIBER_ACTIVE, '插件未激活');
    const providers = await app.llm.listProviders();
    assert(
      providers.some((p) => p.id === 'mock'),
      'provider 列表缺少 mock',
    );
    const installed = join(root, 'node_modules', PLUGIN);
    const version = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
    assert.equal(version(installed), version(REPO), '加载的版本与仓库不一致');
    const hash = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12);
    const sha = hash(join(installed, 'dist', 'index.mjs'));
    // RDT_PATCHED_DIST=1：已安装副本带临时补丁，用于隔离插件缺陷的影响面
    if (process.env.RDT_PATCHED_DIST === '1') {
      return { version: version(installed), sha, repoDist: hash(join(REPO, 'dist', 'index.mjs')) };
    }
    assert.equal(sha, hash(join(REPO, 'dist', 'index.mjs')), '加载产物与仓库 dist 不一致');
    return { version: version(installed), sha };
  });
  if (results.at(-1)?.status !== 'PASS') throw new Error('装载失败，中止后续用例');

  await check('B0 preset 会话包含技能目录消息', async () => {
    await config();
    const a = await create('rdt-shape');
    const calls = await turn(a, '实机测试：请回复');
    const tools = (calls[0]?.tools ?? []).map((t) => t.name);
    assert(tools.includes('skill'), '首个请求缺少 skill 工具，standard preset 未挂上');
    assert(tools.includes(TOOL_NAME), `首个请求缺少 ${TOOL_NAME}，插件未注册检索工具`);
    const catalogs = typed(a, 'user/message').filter(
      (e) => e.data.source?.kind === 'skill-catalog',
    );
    assert.equal(
      catalogs.length,
      1,
      `会话应有 1 条技能目录消息，实际 ${catalogs.length}；根作用域启用 tool-skill 会删掉 preset 的目录`,
    );
    const catalog = catalogOf(calls);
    assert(catalog.available !== undefined, '请求中没有 <available_skills> 目录');
    return {
      tools: tools.filter((name) => /skill/.test(name)),
      catalogSeq: catalogs[0].seq,
      listed: catalog.names.length,
    };
  });

  await check('B1 首个请求携带 skill_search 工具定义', async () => {
    await config();
    const a = await create('rdt-tool');
    const calls = await turn(a, '实机测试：请回复');
    assert.equal(calls.length, 1, `首个请求应为 1 次，实际 ${calls.length}`);
    const tool = toolDef(calls[0]);
    assert(tool, `首个请求未携带 ${TOOL_NAME}`);
    const properties = tool.parameters?.properties ?? {};
    for (const key of ['query', 'folder', 'limit', 'offset']) {
      assert(properties[key], `工具参数缺少 ${key}`);
    }
    assert.equal(properties.limit.type, 'integer', 'limit 应为整数');
    assert.match(String(tool.description), /skill/i, '工具说明应描述技能检索');
    // 现场：本轮目录列出的名称，供后续用例挑真实技能
    const catalog = catalogOf(calls);
    state.available = await foldableNames(calls);
    // 第二名的存在让文件夹成员断言有意义
    state.chosen = state.available.slice(0, 2);
    assert(catalog.available !== undefined, '请求中没有 <available_skills> 目录');
    return {
      tool: TOOL_NAME,
      parameters: Object.keys(properties),
      availableSkills: catalog.names.length,
      globalSkills: state.available.length,
    };
  });

  await check('B2 query 检索返回按相关度排序的结果', async () => {
    const [chosen] = state.chosen;
    if (chosen === undefined) {
      skip('B2 query 检索返回按相关度排序的结果', '宿主里没有可检索的全局技能');
      return undefined;
    }
    await config();
    const a = await create('rdt-query');
    await turn(a, searchCase({ query: chosen }));
    const { data } = toolPayload(a);
    assert(data.results.length > 0, `查询 ${chosen} 没有结果`);
    assert.equal(data.results[0].name, chosen, `首位应是 ${chosen}，实际 ${data.results[0].name}`);
    assert.equal(data.results[0].match, 'exact', '准确名称命中应标记为 exact');
    assert.equal(data.query, chosen, `结果应回显查询词 ${chosen}`);
    assert.equal(data.folder, null, '未限定文件夹时 folder 应为 null');
    assert(
      typeof data.total === 'number' && data.total >= data.results.length,
      'total 应不小于本页条数',
    );
    return { query: chosen, total: data.total, first: data.results[0] };
  });

  await check('B3 folder 检索列出该文件夹成员', async () => {
    if (state.chosen.length === 0) {
      skip('B3 folder 检索列出该文件夹成员', '宿主里没有可折叠的全局技能');
      return undefined;
    }
    const members = state.chosen;
    await config({
      folders: [{ name: 'rdt-folder', description: '实机测试文件夹', skills: members }],
    });
    assert.equal(entry.fiber.state, FIBER_ACTIVE, '配置文件夹后插件应仍然激活');
    const a = await create('rdt-folder');
    await turn(a, searchCase({ folder: 'rdt-folder' }));
    const { data } = toolPayload(a);
    assert.equal(data.folder, 'rdt-folder', `结果应回显文件夹名，实际 ${data.folder}`);
    assert.equal(data.query, null, '只给 folder 时 query 应为 null');
    const names = data.results.map((hit) => hit.name);
    assert.deepEqual(
      names,
      [...members].sort(),
      `成员应为 ${members.join(', ')}，实际 ${names.join(', ')}`,
    );
    assert(
      data.results.every((hit) => hit.folder === 'rdt-folder' && hit.match === 'folder'),
      '按文件夹列出时每条结果都应标记 folder',
    );
    return { folder: 'rdt-folder', members: names };
  });

  await check('B4 既无 query 也无 folder 时报工具错误', async () => {
    await config();
    const a = await create('rdt-noargs');
    await turn(a, searchCase({}));
    const outcome = toolOutcome(a);
    assert(outcome.isError, `应报工具错误，实际返回：${outcome.text}`);
    assert.match(
      outcome.text,
      /provide query or folder/,
      `错误信息应指出缺少参数：${outcome.text}`,
    );
    return { error: outcome.text.slice(0, 200) };
  });

  await check('B5 limit 超出 1–20 时报工具错误', async () => {
    await config();
    const a = await create('rdt-badlimit');
    const query = state.chosen[0] ?? 'skill';
    await turn(a, searchCase({ query, limit: 99 }));
    const outcome = toolOutcome(a);
    assert(outcome.isError, `应报工具错误，实际返回：${outcome.text}`);
    assert.match(
      outcome.text,
      /limit must be an integer from 1 to 20/,
      `错误信息应指出 limit 越界：${outcome.text}`,
    );
    return { error: outcome.text.slice(0, 200) };
  });

  await check('B6 配置文件夹后请求目录折叠为 <skill_folders>', async () => {
    const [chosen] = state.chosen;
    if (chosen === undefined) {
      skip('B6 配置文件夹后请求目录折叠为 <skill_folders>', '宿主里没有可折叠的全局技能');
      return undefined;
    }
    await config({ folders: [{ name: 'rdt-fold', description: '实机测试', skills: [chosen] }] });
    const a = await create('rdt-fold');
    const calls = await probe(a);
    const catalog = catalogOf(calls);
    assert(catalog.available !== undefined, '请求中没有 <available_skills> 目录');
    assert(catalog.folders !== undefined, '请求中没有 <skill_folders> 块');
    assert(
      catalog.folders.includes('rdt-fold'),
      `<skill_folders> 未列出 rdt-fold：${catalog.folders}`,
    );
    assert(
      catalog.folders.includes('1 skills'),
      `<skill_folders> 未给出成员数：${catalog.folders}`,
    );
    assert(!catalog.names.includes(chosen), `${chosen} 已折叠，但 <available_skills> 仍列出了它`);
    return { folder: 'rdt-fold', foldedSkill: chosen, listedSkills: catalog.names.length };
  });

  await check('B7 folders 为空时目录保持原生列表', async () => {
    await config({ folders: [] });
    const a = await create('rdt-plain');
    const calls = await probe(a);
    const catalog = catalogOf(calls);
    assert(catalog.available !== undefined, '请求中没有 <available_skills> 目录');
    assert.equal(catalog.folders, undefined, `空配置不应产生 <skill_folders>：${catalog.folders}`);
    const [chosen] = state.chosen;
    if (chosen !== undefined) {
      assert(catalog.names.includes(chosen), `空配置下 ${chosen} 应逐项列出`);
    }
    return { listed: catalog.names.length, folded: false };
  });

  await check('B8 运行中的服务器返回全局技能 JSON', async () => {
    const webServer = app.get('webServer');
    assert(webServer, '缺少 webServer 服务');
    assert.equal(typeof webServer.getOrigin, 'function', 'webServer 没有 getOrigin()');
    const origin = webServer.getOrigin();
    const connection = app.get('connection');
    assert(connection, '缺少 connection 服务');
    assert.equal(
      typeof connection.authenticatedUrl,
      'function',
      'connection 没有 authenticatedUrl()',
    );
    // 浏览器的第一条请求用启动 token 换会话 cookie，之后的同源请求带 cookie
    const handshake = await fetch(connection.authenticatedUrl(`${origin}/`), {
      redirect: 'manual',
    });
    const cookies = (handshake.headers.getSetCookie?.() ?? []).map((c) => c.split(';', 1)[0]);
    assert(cookies.length > 0, `启动 token 未换到会话 cookie：HTTP ${handshake.status}`);
    const response = await fetch(`${origin}${ROUTE}`, {
      headers: { cookie: cookies.join('; ') },
    });
    assert.equal(response.status, 200, `${ROUTE} 返回 HTTP ${response.status}`);
    const body = await response.json();
    assert(
      Array.isArray(body.skills),
      `响应缺少 skills 数组：${JSON.stringify(body).slice(0, 200)}`,
    );
    assert.equal(typeof body.complete, 'boolean', '响应缺少 complete 布尔值');
    assert(body.skills.length > 0, '全局技能列表为空');
    assert(
      body.skills.every(
        (skill) => typeof skill.name === 'string' && typeof skill.source === 'string',
      ),
      '技能条目缺少 name 或 source',
    );
    const [chosen] = state.chosen;
    if (chosen !== undefined) {
      assert(
        body.skills.some((skill) => skill.name === chosen),
        `路由返回的列表缺少 ${chosen}`,
      );
    }
    return { status: response.status, skills: body.skills.length, complete: body.complete };
  });

  writeFileSync(join(root, 'results.json'), JSON.stringify(results, null, 2));
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const skipCount = results.filter((r) => r.status === 'SKIP').length;
  console.log(
    'RDT_DONE',
    JSON.stringify({ pass: results.length - fail - skipCount, fail, skip: skipCount }),
  );
  if (process.env.RDT_KEEPALIVE === '1') {
    console.log('RDT_KEEPALIVE');
  } else {
    for (const h of handles.reverse()) await h.dispose();
    await runtime.shutdown.shutdown(fail ? 1 : 0);
  }
} catch (e) {
  console.error(e);
  writeFileSync(join(root, 'fatal.txt'), e?.stack ?? String(e));
  writeFileSync(join(root, 'results.json'), JSON.stringify(results, null, 2));
  await runtime.shutdown.shutdown(1);
}
