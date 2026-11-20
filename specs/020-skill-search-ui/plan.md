# Implementation Plan: Skill 文件夹折叠与可视化分组

**Branch**: `feat/020-skill-search-ui` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-skill-search-ui/spec.md`

**Status**: Approved

## Open Decisions

<!--
Status values:
- Draft: the current full document is not approved or waived.
- Approved: the user approved the current full document.
- Waived: the user waived the review and accepted the recorded risks.
Record each undecided question with a stable id and its dependencies.
-->

- 无。

## Clarifications

### Session 2026-11-20

#### 用户决策

- [P-001] Q: `skill_search` 是否内置中英文同义词表？ -> A: 不内置。中文查询匹配中文元数据，英文查询匹配英文元数据；按文件夹列出保证折叠的 Skill 都可达。
- [P-002] Q: 已有会话在原生目录重发时是否按当前分组折叠？ -> A: 是。分组变更本身不影响已有会话。
- [P-003] Q: 文件夹简介是否必填？ -> A: 可为空，空简介时目录只显示名称与数量。
- [P-004] Q: 拖拽采用什么实现？ -> A: 引入 `@dnd-kit/core`。
- [P-005] Q: 分组页采用什么布局？ -> A: 单列：工具栏、文件夹卡片、未分组列表、搜索选项。
- [P-006] Q: 分组页是否列出仅用户可调用的 Skill？ -> A: 不列出。

#### 探索结论

- 原生目录由 `@deepseek-ai/dsh-tool-skill` 的 `agent/pre-step` 监听生成；`prepend` 注册的监听位于外层，能在 `next()` 后改写目录消息。见 [research.md](./research.md) R-01。
- 不传 `cwd` 调用 `ctx.skills.list` 得到全局 Skill；项目级同名 Skill 在会话快照中覆盖全局 Skill。见 R-03。
- 前端经同源路由读取 Skill 列表，机制与 `dsh-plugin-better-mcp` 相同。见 R-04。
- 配置沿用模板的 `configForms` 与 `SettingsFormModel`，`folders` 以 JSON 草稿文本暂存。见 R-05。
- 模板转化按 [template-conversion.md](../../docs/template-conversion.md) 执行；依赖对齐已在 spec D-005 中确定为保持 `0.2.2-rc.3`。

## Review Record

- 2026-11-20 | Decision: Approved | Scope: current full document | Open items: none | Risks: 与 `dsh-skill-search-local` 的 `skill_search` 冲突；依赖 rc.3 与宿主 rc.5 版本差；`dsh-client-ui-primitives` 接口不稳定；`@dnd-kit` 增大客户端产物

## Summary

把模板改造成 `dsh-plugin-skill-folder`：

- 宿主侧注册 `skill_search` 工具、最外层 `agent/pre-step` 目录改写监听与全局 Skill 列表路由。
- 前端在「插件」页的插件行配置页提供文件夹分组界面，支持拖拽、下拉移动、按前缀自动分组、保存与放弃。
- 移除模板示例，更新宪章、文档、元数据与发布设置。

## Technical Context

**Language/Version**: TypeScript 6，ESM；Node.js ≥ 24.9

**Primary Dependencies**:

- 宿主提供：`@deepseek-ai/cordis`、`@deepseek-ai/schemastery`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-agent` 类型。
- 前端平台模块：`react`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-slots`。
- 新增 `@dnd-kit/core@6.3.1`：放在 `devDependencies`，由前端构建内联进 `dist/client.js`，用户安装插件时无需下载。见 research R-09。

**Storage**: profile 中本插件行的 `config`，经宿主配置表单写入。

**Testing**: vitest，`code` 与 `dist` 两个 project；`tests/helpers.ts` 的模拟 `ctx`。

**Target Platform**: DSH Web GUI 与 Desktop，宿主运行 `0.2.2-rc.5`。

**Project Type**: DSH 插件（宿主 + 浏览器）。

**Performance Goals**:

- 目录改写每次发布只多一次 `skills.snapshot`；原生注册表缓存快照。
- 分组页 200 个 Skill 时拖拽与输入无明显卡顿。

**Constraints**:

- 已写入会话的目录不改写。
- 搜索不读取 Skill 正文。
- 界面文案经 `ctx.locale`，样式只用 `--dsw-alias-*` 令牌。

**Scale/Scope**: 全局 Skill 数十至数百个，文件夹数十个。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查 | 结果 |
| --- | --- | --- |
| I 宿主依赖版本 | `@deepseek-ai/dsh-*` 保持同一确切版本 `0.2.2-rc.3`，`minimumReleaseAgeExclude` 不变；新增的 `@dnd-kit/core` 不属于 `@deepseek-ai/*` | 通过 |
| II 测试同步 | 每个新模块配套测试；删除 demo 测试；package-pack 测试回归进包内容；交付前提醒实机测试 | 通过 |
| III 文档结构 | README 写用户功能；`docs/how-it-works.md`、`known-risks.md`、`development.md` 文件地图更新；AGENTS 删除模板说明；CHANGELOG 按分支规则维护；文件顶部与函数注释齐全 | 通过 |
| IV 质量门禁 | 每阶段运行 `pnpm format && pnpm check`；交付前 `pnpm build` | 通过 |
| V 公开引用 | 文档与测试只用 `<home>`、`<repo>` 占位路径 | 通过 |

设计完成后复核：结果相同，无违规。

## 设计

### 宿主侧

| 模块 | 职责 |
| --- | --- |
| `src/index.ts` | 导出 `name`、`inject`、`Config`、`apply`；组合下列模块 |
| `src/config.ts` | Config schema、默认值、严格校验、实时读取 |
| `src/folders.ts` | 文件夹查找：Skill 名到文件夹、文件夹名到成员 |
| `src/skills.ts` | 全局判定、可由模型调用过滤、全局列表读取 |
| `src/search.ts` | 分词、打分、排序、分页、截断 |
| `src/search-tool.ts` | `skill_search` 定义与参数校验 |
| `src/catalog.ts` | 目录文本生成与 `pre-step` 改写 |
| `src/routes.ts` | `GET /api/skill-folder/skills` |
| `src/constants.ts`、`src/types.ts`、`src/utils.ts` | 共享常量、类型再导出、工具函数 |

- `inject`：`['tools', 'skills', 'workingDirectory']`；`connection` 经 `ctx.inject` 可选。
- 接口细节见 [contracts/](./contracts/)，数据规则见 [data-model.md](./data-model.md)。

### 前端

| 模块 | 职责 |
| --- | --- |
| `src/client/index.ts` | 注册字典与插件行配置页 |
| `src/client/api.ts` | 调用 Skill 列表路由 |
| `src/client/auto-group.ts` | 自动分组纯函数 |
| `src/client/folder-form.ts` | `SettingsFormModel` 封装、`folders` JSON 草稿、文件夹编辑动作 |
| `src/client/folder-page.tsx` | 分组页视图：工具栏、文件夹卡片、未分组列表、搜索选项；`DndContext` 与指针、键盘传感器 |
| `src/client/folder-card.tsx` | 文件夹卡片：名称与简介输入、成员列表、`useDroppable` 放置区 |
| `src/client/skill-chip.tsx` | Skill 条目：`useDraggable` 拖拽源与「移动到」下拉框 |
| `src/client/locales.ts` | 中英文字典 |

### 模板转化

1. 宪章：标题改为 `dsh-plugin-skill-folder Constitution`，PATCH 升到 2.0.1，记录理由。
2. `AGENTS.md`：项目说明改为本插件，删除模板说明节与 `template-conversion.md` 索引。
3. 删除 `docs/template-conversion.md`。
4. 包标识：`package.json` 的 `name`、`version: 0.1.0`、`description`、`keywords`；`cordis.patch.yml` 的行 id；`tsdown.config.ts` 的 `CLIENT_ID`。
5. 元数据：`locale/zh.json`、`locale/en.json`。
6. 发布：恢复 `ci.yml` 的 `publish` 触发条件，删除 `if: false`；交付时提醒绑定 npm Trusted Publisher。
7. 清空 `specs/001-*` 至 `specs/019-*`、`changelogs/` 与 `CHANGELOG.md` 的历史条目。
8. 删除 `src/demo-tool.ts`、`src/events.ts`、`src/client/demo-dock.tsx`、`src/client/config-page.tsx`、`src/client/config-form.ts` 与对应测试。
9. 更新 `.dsh/skills/real-device-test` 中引用模板插件的用例。

## Project Structure

### Documentation (this feature)

```text
specs/020-skill-search-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── skill-search-tool.md
│   ├── skills-route.md
│   └── catalog-message.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── index.ts
├── config.ts
├── constants.ts
├── types.ts
├── utils.ts
├── folders.ts
├── skills.ts
├── search.ts
├── search-tool.ts
├── catalog.ts
├── routes.ts
└── client/
    ├── index.ts
    ├── api.ts
    ├── auto-group.ts
    ├── folder-form.ts
    ├── folder-page.tsx
    ├── folder-card.tsx
    ├── skill-chip.tsx
    └── locales.ts

tests/
├── helpers.ts
├── config.test.ts
├── search.test.ts
├── catalog.test.ts
├── plugin.test.ts
├── auto-group.test.ts
├── folder-form.test.ts
├── client.test.ts
└── （保留的模板机制测试）
```

**Structure Decision**: 沿用模板的单包双入口结构，宿主与前端分别打包为 `dist/index.mjs` 与 `dist/client.js`。

## 风险

- 本插件与 `dsh-skill-search-local` 都注册 `skill_search`，同时启用会冲突。README 要求先停用原插件。
- `@deepseek-ai/dsh-client-ui-primitives` 被宿主文档列为不稳定接口；模板已依赖它并锁定版本，宿主升级后需复核。
- 原生目录格式由 `dsh-tool-skill` 决定。改写只依赖 `source.kind` 与 `source.entries`；原生字段变化时目录保持原样。
- 依赖 rc.3 与宿主 rc.5 存在版本差，由实机测试覆盖。
- `@dnd-kit/core` 内联后客户端产物增大约 50 KB；它使用宿主提供的同一份 React。

## Complexity Tracking

无违规。
