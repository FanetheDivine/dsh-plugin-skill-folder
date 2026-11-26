# Implementation Plan: 折叠目录重复注入修复

**Branch**: `fix/029-catalog-dedup` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/029-catalog-dedup/spec.md`

**Status**: Draft

## Open Decisions

- [ ] [P-001] 判定读取使用宿主 `Session.deriveMessages()` 这一内部面，是否接受，风险如何记录？ | Depends on: none | Status: not asked
- [ ] [P-002] 实机验证如何制造「完整标记抖动」：注册测试专用抖动 provider，还是只断言稳定目录？ | Depends on: none | Status: not asked
- [ ] [P-003] 文档落点：`README.md` 是否补一句用户可见行为变化？ | Depends on: none | Status: not asked
- [ ] [P-004] CHANGELOG 条目写在哪里、按哪个版本号？ | Depends on: none | Status: not asked
- [ ] [P-005] 单元测试范围是否包含「读取失败退化」与「最后一条是原生目录」两个用例？ | Depends on: none | Status: not asked

## Clarifications

### Session 2026-11-26

- 待确认决策见 `Open Decisions`。

## Review Record

- 2026-11-26 | Decision: Draft | Scope: current full document | Open items: P-001..P-005 | Risks: none

## Summary

插件在 `agent/pre-step` 折叠技能目录时新增一次判定：折叠后的正文与本会话当前可见的最后一份目录正文相同时，把这条重发的目录消息从本步骤消息列表里过滤掉——不进请求、不写会话记录；正文不同则照常注入。判定依据取自 `agent.session.deriveMessages()`，插件不保存跨请求状态。宿主每轮重算目录指纹的行为不改。

## Technical Context

**Language/Version**: TypeScript 6.0，Node.js ≥ 24.9

**Primary Dependencies**: 运行期只依赖宿主提供的 `@deepseek-ai/cordis` 与 `@deepseek-ai/schemastery`；类型来自既有 devDependencies `@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-tools`。本次不新增依赖。

**Storage**: 无自有存储。判定读宿主会话的模型可见历史。

**Testing**: vitest（`pnpm test:code`、`pnpm test:dist`）+ `pnpm check`（typecheck、biome、code 测试）+ `pnpm build`；实机用 `.dsh/skills/real-device-test` 的驱动脚本。

**Target Platform**: DSH 宿主 0.2.2-rc.5（Node 服务端插件，`dist/index.mjs`）

**Project Type**: 单包 DSH 插件（宿主入口 + 浏览器入口）

**Performance Goals**: 每个步骤多一次 `deriveMessages()` 调用与一次线性扫描；纯追加时宿主内部只处理新增表面节点。不引入额外快照读取。

**Constraints**: 折叠文本逐字节不变；没有条目被折叠时保持原生目录；任何读取失败都退化为「注入一条」，不得让步骤失败。

**Scale/Scope**: 改动集中在 `src/catalog.ts` 与 `src/index.ts`，测试补在 `tests/catalog.test.ts` 与 `tests/plugin.test.ts`，文档补在 `docs/`。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查项 | 结果 |
| --- | --- | --- |
| I. 宿主依赖版本 | 不新增 `@deepseek-ai/*` 依赖，版本不变 | 通过 |
| II. 测试同步 | 单元测试覆盖正文比较、丢弃、读取失败退化；实机覆盖连续多轮；不新增打包内容 | 通过（实机用例在 P-002 确认后落地） |
| III. 文档结构 | `docs/how-it-works.md` 记判定来源与流程，`docs/known-risks.md` 记宿主内部面与抖动，README 按 P-003 决定 | 通过 |
| IV. 质量门禁 | 每个阶段提交前跑 `pnpm format && pnpm check`，合并前 `pnpm check` | 通过 |
| V. 公开引用 | 文档只写仓库内相对路径与占位符，不写本机绝对路径 | 通过 |

**Complexity Tracking**: 无偏离。

## Project Structure

### Documentation (this feature)

```text
specs/029-catalog-dedup/
├── spec.md              # 已批准
├── plan.md              # 本文件
├── research.md          # 判定来源与口径（Phase 0）
├── data-model.md        # 正文与判定状态（Phase 1）
├── quickstart.md        # 验证步骤（Phase 1）
├── contracts/
│   └── catalog-dedup.md # 折叠判定的行为契约
└── tasks.md             # /speckit-tasks 生成
```

### Source Code (repository root)

```text
src/
├── catalog.ts           # 渲染拆成首句与正文；新增「已呈现正文」比较与丢弃
├── index.ts             # pre-step 读取会话可见记录并传入折叠上下文
├── skills.ts            # 不变
├── folders.ts           # 不变
└── constants.ts         # 需要时补常量

tests/
├── catalog.test.ts      # 正文比较、丢弃、原生最后一条、读取失败退化
├── plugin.test.ts       # pre-step 接线：丢弃与保留两条路径
└── support/plugin-ctx.ts# ctx 模拟补「会话可见记录」注入点

docs/
├── how-it-works.md      # 目录改写规则补判定来源
└── known-risks.md       # 宿主内部面与新判定
```

**Structure Decision**: 保持单包结构。判定逻辑放 `src/catalog.ts`（纯函数，便于单测），会话读取放 `src/index.ts` 的 pre-step 监听（唯一持有 `agent` 的地方）。

### 实现轮廓

1. `src/catalog.ts`：
   - 抽出 `renderHeader(message)` 与 `renderBody(visible, summaries)`；`renderCatalog` 组合两者，输出不变。
   - `FoldContext` 增加 `presented: string | undefined`（本会话最后一份可见目录的正文）。
   - `foldedMessage` 计算正文；`presented` 与正文相同则返回 `undefined`（表示丢弃），否则返回折叠消息。
   - `foldCatalog` 过滤掉返回 `undefined` 的目录消息，其余消息原样保留。
2. `src/index.ts` 的 pre-step：
   - 新增 `readPresentedBody(agent)`：`deriveMessages()` → 从后向前找 `role === 'user'` 且 `source.kind === 'skill-catalog'` → 取其正文（`<available_skills>` 起）。
   - 整段 try/catch，失败返回 `undefined`（按未呈现处理）并记 warn。
   - 把结果放进 `FoldContext`。
3. 文档与测试按上文补。

## 验证方式

| 层次 | 命令或手段 | 判定 |
| --- | --- | --- |
| 类型与静态检查 | `pnpm typecheck` | 零错误 |
| 单元测试 | `pnpm test:code` | 新增与既有用例全绿 |
| 全套检查 | `pnpm check` | 通过 |
| 构建与产物测试 | `pnpm build` | `dist` 更新且 `test:dist` 通过 |
| 实机 | `real-device-test` 驱动连续多轮 | 折叠目录块 1 份、`skill-catalog` 事件 1 条、changed 首句 0 次 |
