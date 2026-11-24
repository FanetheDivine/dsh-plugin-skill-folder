# Implementation Plan: 始终分组

**Branch**: `feat/027-always-auto-group` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-always-auto-group/spec.md`

**Status**: Draft

## Open Decisions

- [x] [P-001] 自动分组纯函数放在哪里？ | Depends on: none | Status: answered
  - 结论：从 `src/client/auto-group.ts` 移到 `src/auto-group.ts`，前端与插件入口共用。
  - 理由：宿主侧分组需要同一份规则，避免两套实现。
- [x] [P-002] 技能变化的触发源？ | Depends on: none | Status: answered
  - 结论：订阅宿主 `skills/change` 事件；插件启用时不执行。
  - 理由：宿主在 provider 注册与目录失效时发出该通知；启用时执行会归组用户有意保留的未分组技能。
- [x] [P-003] 开关打开时如何立刻生效？ | Depends on: none | Status: answered
  - 结论：`loader/volatile-update` 中检测 `alwaysGroup` 由 false 变 true，执行一次。
  - 理由：与「勾选并保存后立即分组一次」一致；其他配置更新不触发。
- [x] [P-004] 结果如何写回配置？ | Depends on: none | Status: answered
  - 结论：`ctx.fiber.entry` + `ctx.get('configEditor').edit()`，只写 `folders`。
  - 理由：宿主提供的配置编辑入口，保留其他键与注释；`folders` 是 volatile 字段，原地生效。
- [x] [P-005] 新配置字段叫什么、默认值？ | Depends on: none | Status: answered
  - 结论：`alwaysGroup`，布尔，默认 `false`，volatile。
- [x] [P-006] 何时跳过写入？ | Depends on: none | Status: answered
  - 结论：分组结果与当前文件夹完全相同时不写；技能读取失败或未开启时跳过。
- [x] [P-007] 并发触发如何处理？ | Depends on: none | Status: answered
  - 结论：串行执行；执行期间再收到通知时排队一次，合并为下一次执行。
- [x] [P-008] 测试如何覆盖？ | Depends on: none | Status: answered
  - 结论：扩展 `tests/support/plugin-ctx.ts` 提供 `fiber.entry`、`get('configEditor')` 与 `_emit` 等待；覆盖开关、事件、幂等、失败路径与配置校验。

## Clarifications

### Session 2026-11-24

- [P-001..P-008] Q: 实现细节由谁决定？ -> A: 用户委托「后续自行实现」，按建议执行。

## Review Record

- 2026-11-24 | Decision: Approved | Scope: 当前完整计划 | Open items: none | Risks: 后台写配置依赖 `configEditor`，缺失时仅记录日志

## Summary

在配置页「按前缀自动分组」右侧增加「始终分组」勾选项。开启后，插件在每次技能集合变化时按与按钮相同的规则分组一次，并把结果写入插件配置；勾选并保存时立即执行一次。默认关闭，已有分组只追加成员。

## Technical Context

**Language/Version**: TypeScript 6，ESM，Node ≥ 24.9

**Primary Dependencies**: `@deepseek-ai/cordis`、`@deepseek-ai/schemastery`、`@deepseek-ai/dsh-client-ui-primitives`、React 18

**Storage**: 插件配置（profile 的 `cordis.patch.yml`，由宿主 `configEditor` 写入）

**Testing**: vitest（`test:code`、`test:dist`），biome 检查

**Target Platform**: DSH 宿主 0.2.2-rc.5，桌面与 Web

**Project Type**: 单包插件（宿主入口 + 浏览器入口）

**Performance Goals**: 每次技能变化最多一次分组与一次配置写入

**Constraints**: 只处理全局技能；配置写入失败不得破坏现有分组

**Scale/Scope**: 单个配置页、单个开关、一个后台任务

## Constitution Check

| 原则 | 结论 |
| --- | --- |
| I. 宿主依赖版本 | 通过：不新增或升级依赖 |
| II. 测试同步 | 通过：新增配置、触发、幂等、客户端渲染与表单字段测试 |
| III. 文档结构 | 通过：更新 README、how-it-works、known-risks、development 文件地图与 CHANGELOG |
| IV. 质量门禁 | 通过：实现后运行 `pnpm format && pnpm check` 与构建 |
| V. 公开引用 | 通过：文档只引用仓库内路径 |

## Project Structure

### Documentation (this feature)

```text
specs/027-always-auto-group/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── index.ts              # 触发、快照读取与配置写入
├── auto-group.ts         # 自动分组纯函数（服务端与前端共用）
├── config.ts             # alwaysGroup 配置字段
└── client/
    ├── auto-group.ts     # 删除，改为引用 ../auto-group.ts
    ├── folder-form.ts    # alwaysGroup 字段草稿
    ├── folder-page.tsx   # 勾选框与保存
    └── locales.ts        # 中英文案

tests/
├── auto-group.test.ts
├── plugin.test.ts
├── config.test.ts
├── folder-form.test.ts
├── client.test.ts
└── support/plugin-ctx.ts
```

**Structure Decision**: 沿用现有单包结构；自动分组纯函数提升到 `src/` 供两端共用。

## Complexity Tracking

无违规。
