# Implementation Plan: 优化配置页视觉与批量浏览交互

**Branch**: `feat/028-refine-config-ui` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-refine-config-ui/spec.md`

**Status**: Waived

## Open Decisions

- 无。

## Clarifications

### Session 2026-11-26

#### 技术探索

- `@deepseek-ai/dsh-client-ui-primitives` 在浏览器构建中位于 `PLATFORM_MODULES`（保持 external），其图标组件渲染引用宿主 sprite 的 `<svg data-icon="...">`，无额外包体积开销。
- `vitest.config.ts` 将 `@deepseek-ai/dsh-client-ui-primitives` 映射到 `tests/support/primitives.ts`，只需在该文件补齐所用图标导出即可在单元测试中直接渲染。
- `FolderPage` 已用 `collapsed: ReadonlySet<number>` 管理折叠下标，批量折叠/展开可直接基于该集合实现纯函数转换。

#### 自主决策

- [P-001] Q: 如何实现批量折叠与展开？ -> A: 在 `src/client/folder-page.tsx` 中导出纯函数 `allFoldersCollapsed` 与 `toggleAllFoldersCollapsed`，并在文件夹分区标题行右侧渲染 `data-folder-toggle-all` 按钮。
- [P-002] Q: 如何呈现空文件夹列表？ -> A: 当 `folders.length === 0` 时，在文件夹分区渲染 `data-folders-empty` 空状态卡片（含文件夹图标与引导文案）。
- [P-003] Q: 如何升级控件图标与交互反馈？ -> A: 引入宿主图标替换纯字符符号，筛选框升级为带搜索图标的输入容器，并在 `focusStyleText` 中补充悬浮与 `:focus-within` 样式。

## Review Record

- 2026-11-26 | Decision: Waived | Scope: 当前完整计划 | Open items: none | Risks: 用户要求「自行优化ui&合并&发版」，免除人工计划审查；全部改动由 `pnpm check` 与 `pnpm build` 验证

## Summary

优化技能文件夹配置页的视觉细节与多文件夹浏览交互：引入宿主矢量图标升级工具栏、筛选框、卡片头部与技能条目；为文件夹分区补充空状态引导与一键「全部折叠 / 全部展开」动作；完善按钮、输入框与卡片的悬浮和聚焦样式。

## Technical Context

**Language/Version**: TypeScript 6、React 18、Node.js ≥ 24.9

**Primary Dependencies**: `@deepseek-ai/dsh-client-ui-primitives`、`@dnd-kit/core`、React 18

**Storage**: 沿用宿主配置表单；折叠与筛选仅使用组件内存状态

**Testing**: Vitest（`test:code` 与 `test:dist`）、Biome、TypeScript

**Target Platform**: DSH Web/Desktop 插件行配置页（`plugins.row.config`）

**Project Type**: 单包 DSH 插件

**Performance Goals**: 筛选与批量折叠即时响应，不增加额外网络请求与产物外部依赖

**Constraints**: 仅使用 `--dsw-alias-*` 主题令牌；保持中英双语一致；不改动服务端路由与配置 schema

**Scale/Scope**: `src/client/` 下 4 个文件、`tests/` 下 2 个文件、`README.md` 与 `CHANGELOG.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 |
| --- | --- |
| I. 宿主依赖版本 | 通过：不新增或修改任何依赖版本 |
| II. 测试同步 | 通过：同步更新 `tests/support/primitives.ts` 与 `tests/client.test.ts`，覆盖批量折叠纯函数、空文件夹状态、图标渲染与双语字典 |
| III. 文档结构 | 通过：更新 `README.md` 的使用表与 `CHANGELOG.md` |
| IV. 质量门禁 | 通过：每个阶段运行 `pnpm format && pnpm check`，合并前通过 `pnpm full-check` |
| V. 公开引用 | 通过：全部文档与代码只使用仓库内相对路径或公开 URL |

设计后复核：五项全部通过，无违规项。

## Project Structure

### Documentation (this feature)

```text
specs/028-refine-config-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/client/
├── folder-page.tsx      # 批量折叠/展开、空文件夹引导、带图标工具栏与筛选框
├── folder-card.tsx      # 卡片头部折叠图标与删除按钮图标
├── skill-chip.tsx       # 技能条目拖拽手柄矢量图标
├── styles.ts            # 筛选框容器、空状态容器、按钮图标布局与悬浮/聚焦样式
└── locales.ts           # 新增全部折叠/展开与空文件夹引导的中英文文案
tests/
├── client.test.ts       # 批量折叠纯函数、空文件夹状态、图标与双语渲染测试
└── support/
    └── primitives.ts    # 补充导出测试所需的宿主图标组件
README.md                # 更新配置页操作说明
CHANGELOG.md             # 记录本次优化条目
```

**Structure Decision**: 保持现有 `src/client/` 组件划分，不新增源文件或外部依赖。

## Complexity Tracking

无偏离。
