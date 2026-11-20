---

description: "Task list for 025-config-skill-list"

---

# Tasks: 修复配置页缺失预设提供的全局技能

**Input**: Design documents from `specs/025-config-skill-list/`

**Prerequisites**: plan.md, spec.md

**Tests**: 用户要求不新增自动化测试；现有用例必须保持通过。

## Phase 1: 配置页按 preset 作用域读取技能 (P1 + P2)

**Goal**: 路由按默认 preset 的作用域返回全局技能；取不到作用域时回退并标记不完整。

**Independent Test**: 在启用 `standard` preset 的 profile 上打开「插件 → 折叠skill → 配置」，列表包含 `~/.agents/skills` 下的全部模型可调用技能。

- [X] T001 [US1] `src/index.ts`：`PluginServices` 增加可选 `get`，新增 `AgentPresetsService`、`SkillSnapshot` 与 `releasePresetScope`
- [X] T002 [US1] `src/index.ts`：新增 `readGlobalSnapshot`，用 `agentPresets.acquireScope()` 取默认 preset 作用域后调用 `skills.snapshot({ scope })`，读取结束释放租约
- [X] T003 [US2] `src/index.ts`：宿主没有 `agentPresets` 时用根作用域快照；取作用域失败时退回根作用域、记录警告并返回 `complete: false`
- [X] T004 [US1] `src/index.ts`：路由注册改用 `readGlobalSnapshot`
- [X] T005 [US1] `docs/how-it-works.md`：更新路由段，说明作用域来源与三种情况的 `complete`
- [X] T006 [US2] `docs/known-risks.md`：新增「配置页技能列表」一节
- [X] T007 [US1] `CHANGELOG.md`：`## Unreleased` 增加 Fixed 条目
- [X] T008 运行 `pnpm format && pnpm check` 与 `pnpm build`