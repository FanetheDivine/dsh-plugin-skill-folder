# Implementation Plan: 修复配置页缺失预设提供的全局技能

**Branch**: `fix/025-config-skill-list` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-config-skill-list/spec.md`

**Status**: Draft

## Open Decisions

无。三个决策已在规格中确认，第四个决策（不新增自动化测试）由用户提出。

## Clarifications

### Session 2026-11-21

- [D-001] Q: 配置页的技能列表从哪里读？ -> A: 用宿主 `agentPresets` 取默认 preset 作用域后读取。
- [D-002] Q: 取不到作用域时怎么办？ -> A: 回退根作用域快照，并标记列表不完整。
- [D-003] Q: 列表包含哪些技能？ -> A: 只列模型可调用的全局技能。
- [D-004] Q: 是否新增自动化测试？ -> A: 不新增。

## Review Record

- 2026-11-21 | Decision: Waived | Scope: current full document | Open items: none | Risks: 路由作用域回退没有自动化回归，靠实机配置页确认

## Summary

`GET /api/skill-folder/skills` 目前调用 `skills.snapshot({})`，只读根作用域。宿主把 `skill-filesystem` 挂在 agent preset 上，用户级技能注册在 agent 作用域，配置页因此只剩根层 provider 提供的少量技能。

修复方式：路由先用 `agentPresets.acquireScope()` 取默认 preset 的作用域，再用该作用域读取快照。宿主没有 `agentPresets` 时沿用根作用域快照；取作用域失败时退回根作用域并把 `complete` 置为 `false`。

## Technical Context

**Language/Version**: TypeScript 6，Node ≥ 24.9，ESM

**Primary Dependencies**: `@deepseek-ai/cordis`、`@deepseek-ai/schemastery`（宿主提供实例）；`@deepseek-ai/dsh-*` 仅类型导入

**Storage**: 无

**Testing**: vitest（现有用例保持通过；本次不新增用例）

**Target Platform**: DSH 插件，宿主 `0.2.2-rc.5` 的 Web 与 Desktop profile

**Project Type**: 单包插件（`src/` + `tests/`）

**Constraints**: `Symbol.asyncDispose` 不在 `es2024` lib 中，按名字取；`agentPresets` 通过 `ctx.get` 可选读取，不扩大 `inject`

**Scale/Scope**: 一个路由、一个宿主模块的局部改动

## Constitution Check

| 原则 | 结论 |
| --- | --- |
| I 宿主依赖版本 | 通过：没有依赖变更 |
| II 测试同步 | 偏离：用户要求不新增自动化测试，见 Complexity Tracking |
| III 文档结构 | 通过：机制写入 `docs/how-it-works.md`，风险写入 `docs/known-risks.md`，CHANGELOG 增加条目 |
| IV 质量门禁 | 通过：提交前运行 `pnpm format && pnpm check` 与 `pnpm build` |
| V 公开引用 | 通过：只引用仓库内路径 |

## Complexity Tracking

| 偏离 | 原因 | 影响 | 处理 |
| --- | --- | --- | --- |
| II 测试同步 | 用户明确要求不加测试 | 作用域回退与 `complete` 标记没有自动化回归 | 规格记录风险，合并后由配置页人工确认 |

## 实施设计

1. `src/index.ts`
   - `PluginServices` 增加可选 `get`，用 `ctx.get('agentPresets')` 读取可选服务。
   - 新增 `AgentPresetsService`、`SkillSnapshot` 与 `releasePresetScope`。
   - 新增 `readGlobalSnapshot`：取作用域、读取快照、释放租约；两条回退分支。
   - 路由注册改用 `readGlobalSnapshot`。
2. `docs/how-it-works.md`：路由段说明作用域来源与三种情况的 `complete`。
3. `docs/known-risks.md`：新增「配置页技能列表」一节。
4. `CHANGELOG.md`：`## Unreleased` 增加 Fixed 条目。

## 风险

- `acquireScope` 会挂载默认 preset 的插件组合；宿主自身的 `skills/list` 走同一路径，读取结束后释放租约。
- 宿主缺少 `agentPresets` 或默认 preset 不含 `skill-filesystem` 时，列表仍可能偏少，页面按 `complete` 提示。