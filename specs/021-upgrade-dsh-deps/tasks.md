# Tasks: 升级 DSH 宿主依赖到 0.2.2-rc.5

**Input**: Design documents from `/specs/021-upgrade-dsh-deps/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: 无新增测试；现有测试随 `full-check` 回归。

**Organization**: 按用户故事分组；每个阶段对应一个 commit。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1、US2）

---

## Phase 1: Setup

无。本变更为纯配置升级，无需初始化。

---

## Phase 2: User Story 1 - 插件与最新宿主版本对齐 (Priority: P1) 🎯 MVP

**Goal**: `package.json` 的 9 个 `@deepseek-ai/dsh-*` 依赖固定 `0.2.2-rc.5`。

**Independent Test**: 读取 `package.json` 确认版本；后续阶段的 `pnpm install` 验证可安装性。

### Implementation for User Story 1

- [ ] T001 [US1] 把 `package.json` 的 `@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-plugin-manager`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-renderer`、`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-tools` 从 `0.2.2-rc.3` 固定为 `0.2.2-rc.5`；cordis 系依赖保持 `~4.1.0`、`~1.1.0`、`~3.19.0` 不变

**Checkpoint**: 依赖声明指向 `0.2.2-rc.5`。

---

## Phase 3: User Story 2 - 版本对齐合规 (Priority: P1)

**Goal**: 豁免清单与锁文件与新声明一致，安装可执行。

**Independent Test**: `pnpm install` 成功；`pnpm-workspace.yaml` 与 `package.json` 一一对应。

### Implementation for User Story 2

- [ ] T002 [US2] 把 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 中 9 个条目从 `@0.2.2-rc.3` 替换为 `@0.2.2-rc.5`（depends on T001）
- [ ] T003 [US2] 运行 `pnpm install` 重新生成 `pnpm-lock.yaml`（depends on T002）

**Checkpoint**: 安装成功，无 minimumReleaseAge 阻塞。

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: 质量门禁与回归验证

- [ ] T004 运行 `pnpm format && pnpm check`（质量门禁，宪章原则 IV）
- [ ] T005 运行 `pnpm full-check`，确认 typecheck、lint、`test:code`、构建、`test:dist` 零失败
- [ ] T006 向用户汇报实机测试提醒：宿主依赖 `0.2.2-rc.3 → 0.2.2-rc.5`，按 quickstart.md 在真实 DSH 宿主上装载插件验证

---

## Dependencies & Execution Order

- T001 → T002 → T003 → T004 → T005 → T006，严格串行。
- 无并行任务：全部改动集中在 3 个文件且存在依赖。

## Implementation Strategy

单线程串行执行。MVP 即全部范围：US1 + US2 + 门禁验证。
