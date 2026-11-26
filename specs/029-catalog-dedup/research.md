# Research: 折叠目录重复注入修复

**Feature**: `fix/029-catalog-dedup` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

结论优先。每条给出决定、理由与被否掉的替代方案，证据路径相对仓库根或宿主安装目录。

## R-001 判定来源：读会话当前可见记录

**决定**：在 `agent/pre-step` 里用 `agent.session.deriveMessages()` 取模型可见历史。

**理由**：

- `deriveMessages()` 是 `Session` 的公开方法，没有 `@deprecated` 标记；同名文件里 `eventAt` / `snapshotEvents` / `ownEvents` 都标注 `@deprecated ... new calls are prohibited`（`node_modules/.pnpm/@deepseek-ai+dsh-session@0._8cdd61b1154f5d685261866b42f1df49/node_modules/@deepseek-ai/dsh-session/src/index.ts` 约 737–780 行、1079 行）。
- 内部按 `surface.contentGeneration` 缓存，纯追加只处理新节点，每步调用一次的成本与新增表面节点数同阶。
- `user/message` 事件在派生时原样返回 `event.data`（`src/surface.ts` 的 `deriveEventMessage`，120–152 行），所以派生消息保留 `source` 与折叠后的 `content`，足以识别目录消息并读到正文。
- 插件不需要新增依赖：`agent.session` 的类型经 `@deepseek-ai/dsh-agent` 的 `declare module './types.ts'` 暴露（`node_modules/@deepseek-ai/dsh-agent/src/runtime-types.ts` 约 191 行）。已在本 worktree 用 `npx tsc --noEmit` 实测 `agent.session.deriveMessages()`、`message.source.kind`、文本块访问零错误。

**被否掉的替代方案**：

| 方案 | 否掉原因 |
| --- | --- |
| `eventAt` / `snapshotEvents` / `ownEvents` | 标注「新调用禁止」；宿主自己的目录监听仍在用，新代码不跟 |
| 插件按 Agent 缓存上次正文 | 进程重启、会话分叉、上下文压缩后不可靠；压缩把目录块移出可见面时会漏注入 |
| `sessionQuery` 服务 / 会话查询工具 | 面向查询与工具调用，异步且需额外注入，单步内多一层跨服务调用 |

**风险**：`deriveMessages()` 属于宿主 `Session` 类的方法，不是服务接口；宿主升级可能改名。写入 `docs/known-risks.md`，并在调用处做能力检测（缺失时按未知处理）。

## R-002 识别「已呈现的目录」

**决定**：在 `deriveMessages()` 结果里从后向前找第一条 `role === 'user'` 且 `source.kind === 'skill-catalog'` 的消息，取它的正文作为比较基准。

**理由**：宿主与插件都通过 `user/message` 表面节点发布目录；`source` 在派生后仍在。该顺序与宿主 `catalogHistory` 的「最近的可见目录」一致。

**边界**：最后一条目录可能是原生未折叠文本（插件刚启用、或以当前配置没有折叠任何条目）。此时正文与折叠正文不同，按「未呈现」注入一条折叠目录，符合 spec US3-4。

## R-003 正文比较口径

**决定**：比较正文，即从 `<available_skills>` 首行到文本末尾（含 `<skill_folders>` 段与固定加载指引）；首句不参与比较。

**理由**：宿主首次发布与后续更新的首句不同，这正是本缺陷里「内容看起来相同却被判为变化」的形态之一；spec FR-002 已固定该口径。

**实现**：把 `renderCatalog` 拆成「首句」与「正文」两段，正文单独计算，比较与输出复用同一份。

## R-004 丢弃方式

**决定**：判定为相同后，从 `decision.messages` 里过滤掉本次这条目录消息。

**理由**：宿主 `dsh-agent-loop` 的 `step()` 遍历最终 `decision.messages` 逐条 `session.append(..., { surfaceOp: 'append' })`（宿主 `dsh-agent-loop/src/agent.ts` 约 460–480 行）。被过滤的消息既不进本次请求，也不写会话记录，同时满足 SC-001 与 SC-003。

**被否掉的替代方案**：

| 方案 | 否掉原因 |
| --- | --- |
| 把正文替换成一句「目录无变化」的短提示 | 仍占 token，还要新增文案与测试 |
| 只在正文里加标记、保留消息 | 重复块仍进会话记录，SC-003 不达标 |

## R-005 读取失败的安全退化

**决定**：读取、解析、比较整段包在 `try` 内；异常、`session` 缺失、`deriveMessages` 不存在、消息结构异常、没有目录记录，一律按「未呈现」处理，正常注入并计入日志（warn）。

**理由**：spec FR-009；判定是优化，不能成为新故障点。

## R-006 渲染文本保持逐字节兼容

**决定**：拆分只改变代码结构，不改折叠文本的任何字节。

**理由**：`tests/catalog.test.ts` 与 `specs/020-skill-search-ui/contracts/catalog-message.md` 依赖现有形态；本次修复不涉及文案。

## R-007 实机验证口径

**决定**：在实机 profile 里注入一个测试专用的「抖动技能 provider」，让宿主技能发现在完整与不完整之间交替，驱动连续多轮对话，断言会话记录里 `skill-catalog` 事件只有 1 条、模型请求里折叠目录块只有 1 份。

**理由**：只跑稳定目录无法覆盖回归路径——目录稳定时宿主本来就不重发，修复前后都通过，测不出缺陷。抖动用例是唯一能证明修复有效的实机证据。

**风险**：抖动 provider 只存在于实机 profile 的隔离配置里，不进包、不进 `package.json`。

## 现有实现事实（供设计对照）

| 事实 | 位置 |
| --- | --- |
| 原生日录消息识别只看 `source.kind` 与 `entries` 数组 | `src/catalog.ts` 的 `isSkillCatalogMessage` |
| 没有条目被折叠时返回原消息对象 | `src/catalog.ts` 的 `foldedMessage` |
| 折叠文本由首句、`<available_skills>`、`<skill_folders>` 与固定指引拼成 | `src/catalog.ts` 的 `renderCatalog` |
| pre-step 只在批次里存在目录消息时才读技能快照 | `src/index.ts` 的 `agent/pre-step` 监听 |
| 测试用 ctx 已能跑完整 pre-step 链 | `tests/support/plugin-ctx.ts` 的 `_runPreStep` |
