# Implementation Plan: 优化技能文件夹配置 UI

**Branch**: `feat/023-polish-config-ui` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-polish-config-ui/spec.md`

**Status**: Waived

## Open Decisions

- 无。

## Clarifications

### Session 2026-11-20

#### 技术探索

- 页面、文件夹卡片、技能条目和共享样式已分层，优化可限制在 `src/client/` 与前端测试。
- `FolderPage` 已集中管理筛选词和技能数据，可在此计算各文件夹的可见成员与结果计数。
- 文件夹使用下标作为 React key 与拖放 id。折叠状态由页面按下标管理，删除时同步调整后继下标。
- 现有测试使用静态渲染验证结构与字典，可扩展筛选纯函数、折叠标记、可访问名称和中英文案测试。
- 项目已有 Playwright 依赖，可通过静态预览页执行窄屏与桌面布局检查。

#### 自主决策

- [D-001] Q: 视图状态放在哪里？ -> A: 筛选词与折叠下标由 `FolderPage` 管理，不进入配置草稿。
- [D-002] Q: 如何复用筛选逻辑？ -> A: 文件夹与未分组区域共用名称、描述匹配函数，文件夹接收筛选后的成员数组。
- [D-003] Q: 如何实现折叠与拖放兼容？ -> A: 卡片主体始终渲染为放置区，折叠只隐藏成员列表，并保留标题、简介、计数和删除操作。
- [D-004] Q: 如何呈现改进后的布局？ -> A: 使用主题令牌、响应式网格、分区标题、状态 badge 和一致的控件尺寸，不引入新运行时依赖。
- [D-005] Q: 如何验证响应式与交互？ -> A: 扩展 Vitest 行为测试，并用 Playwright 对本地静态预览执行桌面与 320px 窄屏检查。

## Review Record

- 2026-11-20 | Decision: Waived | Scope: current full document | Open items: none | Risks: 用户要求不交互，免除实现访谈与完整计划审查；视觉取舍由自动化测试和浏览器截图检查验证

## Summary

优化插件行配置页的信息层级、浏览密度与反馈。保留全部分组和保存能力，在页面层统一筛选全部技能，为文件夹增加独立折叠，并用响应式网格与主题样式提升桌面和窄屏体验。

## Technical Context

**Language/Version**: TypeScript 6、React 18、TSX

**Primary Dependencies**: DSH 客户端 UI primitives、`@dnd-kit/core`、React

**Storage**: 沿用宿主配置表单；筛选与折叠仅使用组件内存状态

**Testing**: Vitest、React 静态渲染、Playwright、Biome、TypeScript

**Target Platform**: DSH Web/Desktop 的插件行配置页

**Project Type**: DSH 插件的前端配置 UI

**Performance Goals**: 常规技能列表的筛选与折叠保持即时响应，不增加网络请求

**Constraints**: 仅使用宿主主题令牌；保持双语；不修改配置结构、路由、检索与目录折叠行为

**Scale/Scope**: 1 个配置页、3 个现有展示组件、共享样式、字典、前端测试与用户文档

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I 宿主依赖版本：通过。保持全部依赖版本不变。
- II 测试同步：通过。筛选、折叠、双语、响应式与现有行为均有测试或浏览器验收。
- III 文档结构：通过。用户可见行为更新 README，界面机制归属开发文档，CHANGELOG 随分支交付维护。
- IV 质量门禁：通过。文件变更后运行 `pnpm format && pnpm check`，合并前再次通过。
- V 公开引用：通过。全部提交内容只使用仓库内路径与公网 URL。

设计后复核：五项全部通过，无 Complexity Tracking 条目。

## Project Structure

### Documentation (this feature)

```text
specs/023-polish-config-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/client/
├── folder-page.tsx      # 页面层级、统一筛选、折叠状态与结果计数
├── folder-card.tsx      # 卡片头部、折叠控件与成员区域
├── skill-chip.tsx       # 技能条目与移动控件样式
├── styles.ts            # 响应式网格、控件与状态样式
└── locales.ts           # 中英文界面文案
tests/
└── client.test.ts       # 页面行为、字典与可访问性回归
README.md                # 用户可见的筛选与折叠操作
CHANGELOG.md             # 本分支交付条目
```

**Structure Decision**: 沿用现有客户端组件边界，不新增外部接口或持久化数据结构。

## Complexity Tracking

无偏离。
