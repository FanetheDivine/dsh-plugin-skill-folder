# Tasks: 修复实机测试脚本的 preset 会话配置

**Input**: Design documents from `specs/022-skill-catalog-missing/`

**Prerequisites**: spec.md（Approved）、plan.md（Approved）、research.md、quickstart.md

**Tests**: 新增 `tests/rdt-scripts.test.ts` 静态守卫与实机用例 `B0`；其余用例随 `run-test.mjs` 回归。

**Organization**: 按用户故事分组；每个阶段对应一个 commit。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1、US2、US3）

---

## Phase 1: Setup

无。脚本与文档已存在，本变更为就地修改。

---

## Phase 2: User Story 1 - 实机 GUI 会话保留技能目录 (Priority: P1) 🎯 MVP

**Goal**: `setup-env.sh` 以官方 web 默认 profile 为底本，不再覆写 `tool-skill` 与 `skill-filesystem`。

**Independent Test**: 用脚本搭建新 profile，`dsh --profile <name> --dump-config` 中不含对两个技能插件的显式启用；GUI 新建会话的请求含 `<available_skills>`。

### Implementation for User Story 1

- [X] T001 [US1] 在 `.dsh/skills/real-device-test/scripts/setup-env.sh` 的隔离补丁模板中删除 `- id: tool-skill` 与 `- id: skill-filesystem` 两段覆写及其注释，改为一句说明：技能工具与技能来源由官方 web 默认 profile 的 `standard` preset 提供

**Checkpoint**: 新建 profile 的技能插件状态与官方模板一致，GUI 会话有目录消息。

---

## Phase 3: User Story 2 - 驱动会话与真实会话同形 (Priority: P1)

**Goal**: `run-test.mjs` 创建的会话挂 `standard` preset，并新增 `B0` 用例守住形态。

**Independent Test**: `node run-test.mjs` 通过，且 `B0` 断言请求携带 `skill` 工具、会话存在 `skill-catalog` 消息、请求含 `<available_skills>`。

### Implementation for User Story 2

- [X] T002 [US2] 在 `.dsh/skills/real-device-test/scripts/run-test.mjs` 解析宿主 `@deepseek-ai/dsh-agent` 的 `installModelSelection`，启用 `runProfile` 后取 `app.get('agentPresets')`，缺失时抛出带宿主版本提示的错误，并用 `resolve('standard')` 缓存 preset
- [X] T003 [US2] 在 `.dsh/skills/real-device-test/scripts/run-test.mjs` 的 `create()` 中传入 `setup`：先 `installModelSelection(agentCtx)`，再 `presets.mount(agentCtx, preset.id)`（depends on T002）
- [X] T004 [US2] 在 `.dsh/skills/real-device-test/scripts/run-test.mjs` 的 A1 之后新增用例 `B0 preset 会话包含技能目录消息`：断言首个请求的 `tools` 含 `skill`、会话事件含 `source.kind === 'skill-catalog'`、请求文本含 `<available_skills>`（depends on T003）

**Checkpoint**: 后端用例全绿，`results.json` 含 `B0` 的 PASS。

---

## Phase 4: User Story 3 - 冲突不再复发 (Priority: P2)

**Goal**: 用例在配置回退时失败，并在文档与静态守卫中记录该冲突。

**Independent Test**: 把 profile 补丁改回启用根 `tool-skill` 后重跑，`B0` 失败；`pnpm test:code` 通过。

### Implementation for User Story 3

- [X] T005 [P] [US3] 在 `docs/known-risks.md` 新增「根作用域技能插件与 agent preset 冲突」小节：现象、原因、处理方式
- [X] T006 [P] [US3] 在 `.dsh/skills/real-device-test/references/pitfalls.md` 的「宿主契约」表新增一行：会话没有技能目录消息，根作用域启用了 `tool-skill`，停用并交由 preset 提供
- [X] T007 [P] [US3] 在 `.dsh/skills/real-device-test/SKILL.md` 阶段 1 说明「profile 以官方 web 默认 profile 为底本、不覆写技能插件」，并在阶段 2 用例表新增 `B0` 行
- [X] T008 [US3] 新增 `tests/rdt-scripts.test.ts`：断言 `setup-env.sh` 不再出现 `- id: tool-skill` 与 `- id: skill-filesystem`、`run-test.mjs` 使用 `agentPresets` 且含 `B0`、`SKILL.md` 用例表含 `B0`

**Checkpoint**: 文档三处齐全，静态守卫通过。

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 质量门禁、实机回归与变更记录

- [X] T009 运行 `pnpm format && pnpm check`，确认 typecheck、lint、单元测试全部通过
- [X] T010 用新 profile（`rdt-022-verify`）跑 `node run-test.mjs`，确认 A1、B0、B1–B8 全部通过
- [X] T011 把 profile 补丁改回启用根 `tool-skill`，重跑确认 `B0` 失败；改回后再次通过
- [X] T012 在 `CHANGELOG.md` 的 `Unreleased → Changed` 记录实机脚本改为官方 web 默认 profile 底本、驱动会话挂 `standard` preset

---

## Dependencies & Execution Order

```text
Phase 2 (T001)
  └─ Phase 3 (T002 → T003 → T004)
       └─ Phase 4 (T005, T006, T007 可并行；T008 独立)
            └─ Phase 5 (T009 → T010 → T011 → T012)
```

- T002 依赖 T001：不先去掉根 `tool-skill` 覆写，preset 会话仍丢目录。
- T004 依赖 T003：`B0` 断言依赖 preset 会话形态。
- T005、T006、T007 互不依赖，可并行。
- T008 读取前三个文件，可在 T001–T007 完成后一次写完。
- T009–T011 依次执行；T011 的失败结果本身是判据，不视为缺陷。

## Parallel Example: User Story 3

```sh
# 三个文档任务互不依赖
docs/known-risks.md
.dsh/skills/real-device-test/references/pitfalls.md
.dsh/skills/real-device-test/SKILL.md
```

## Implementation Strategy

- MVP 为 US1：只改 `setup-env.sh` 即可让实机 GUI 会话恢复目录，但驱动用例会因没有 preset 全部失去技能，因此 MVP 必须与 US2 一起提交。
- US2 完成后用例形态与真实会话一致，后续 US3 的文档与守卫才有意义。
- 每个阶段一个 commit；`B0` 失败信息要能直接指向「根作用域技能插件与 preset 冲突」。
