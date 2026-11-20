# Research: 修复实机测试脚本的 preset 会话配置

**Created**: 2026-11-20 | **Host**: `@deepseek-ai/dsh` `0.2.2-rc.5`

## R-001 根作用域技能插件与 preset 冲突

**Decision**: profile 只保留根作用域 `skill-filesystem`，不在根作用域启用 `tool-skill`。

**Rationale**:

- `dsh-web-app/presets/standard.patch.yml` 定义的 `standard` preset 自带 `skill-filesystem` 与 `tool-skill`，GUI 会话因此有两个 `tool-skill` 实例。
- `dsh-tool-skill/lib/index.js` 的目录监听先做 `ctx.tools.get('skill', agent) === skillTool` 判断。根实例拿到的是 preset 实例的工具对象，判断不成立，按「本 Agent 没有技能」处理为空快照。
- 空快照分支 `!history.published && skills.length === 0 && !incomplete` 会删除本轮已存在的目录消息，于是 preset 实例刚加入的目录被根实例删掉。
- web 模板默认停用根 `tool-skill`，正是把技能工具交给 preset。

**Alternatives considered**:

- 保持根 `tool-skill` 启用、停用 preset：GUI 固定使用默认 preset，停用会让会话失去 preset 提供的全部工具，不可行。
- 让插件在缺少目录时自行构造：与规格 D-003 的结论冲突，插件不承担该职责。

## R-002 驱动会话挂 preset

**Decision**: `run-test.mjs` 的统一 `create()` 用 `app.get('agentPresets').resolve('standard')` 解析 preset，并在 `agents.create({ setup })` 中先 `installModelSelection(agentCtx)` 再 `presets.mount(agentCtx, resolved.id)`。

**Rationale**:

- 宿主 `SessionController.composeAgent` 正是这两步：`installModelSelection` 然后 `presets.mount`，驱动与真实会话同形。
- `installModelSelection` 由 `@deepseek-ai/dsh-agent` 导出，`run-test.mjs` 已通过 `createRequire(dshPkg)` 解析宿主包。
- 原型实测：挂 preset 后会话出现 `source.kind === 'skill-catalog'` 消息；配置文件夹后 `<skill_folders>` 出现且 `source.foldedBy` 为 `dsh-plugin-skill-folder`。

**Alternatives considered**:

- 通过 `sessionController` 的 Remote 接口创建会话：返回序列化负载，驱动拿不到 live agent，断言会话事件不便。
- 不挂 preset、继续依赖根作用域技能插件：回到冲突配置，用例与真实会话形态不一致。

## R-003 全局技能来源

**Decision**: 根作用域 `skill-filesystem` 保持启用。

**Rationale**:

- `app.get('skills').snapshot({})` 提供配置页与检索用的全局技能（本机 67 个）；preset 实例再加 preset 目录，agent 侧共 81 个。
- 该实例不参与目录消息的删除逻辑，与 preset 无冲突。

**Alternatives considered**:

- 只在 preset 内提供技能来源：配置页路由读根快照，会只剩 preset 目录里的技能，与真实用户环境不符。

## R-004 用例失败的形态

**Decision**: 新增用例断言 preset 会话的目录消息与请求内容；把根 `tool-skill` 改回启用时该用例必须失败。

**Rationale**: 目录消息缺失是静默失败，既不报错也不影响工具可见性，只有显式断言能守住。

**Alternatives considered**:

- 依赖 B1 的 `<available_skills>` 断言：B1 还承担工具定义断言，失败信息不够直接，且容易被后续改动削弱。
