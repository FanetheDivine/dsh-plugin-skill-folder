# Implementation Plan: 优化插件展示与分组下拉框

**Branch**: `feat/024-polish-meta-readme` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/024-polish-meta-readme/spec.md`

**Status**: Waived

## Open Decisions

- 无。

## Clarifications

### Session 2026-11-20

#### 探索结论

- 宿主 `Menu` 与 `MenuItemButton` 由平台模块 `@deepseek-ai/dsh-client-ui-primitives` 导出，构建时保持 external，客户端产物体积不增加。
- `Menu` 的 `portal` 模式把列表渲染到 `document.body`，避免文件夹卡片裁剪；宿主插件管理页用同样写法。
- `Menu` 依赖 CSS Module，测试通过 `tests/support/primitives.ts` 指向源码，vitest 可处理。
- 宿主按 `package.json` 的 `./icon` 导出读取图标，SVG 不超过 256 KiB。
- 已安装插件图标使用 36×36 视口、无底板、蓝青渐变或单色描边。

#### 自主决策

- [D-001] Q: 触发按钮如何避免触发拖拽？ -> A: 触发按钮位于拖拽手柄之外，并在 `pointerdown` 与 `keydown` 上阻止冒泡。依据：沿用现有下拉框的做法。
- [D-002] Q: 菜单项如何标记当前分组？ -> A: 用 `items` 数据行与 `selectedId`，宿主绘制尾部勾选。依据：宿主默认 `selection="check"`。
- [D-003] Q: 未分组选项与文件夹之间是否分隔？ -> A: 加分隔线。依据：区分「移出」与「移入」两类动作。
- [D-004] Q: 图标配色？ -> A: 文件夹用蓝色渐变，技能卡片用青绿渐变，与 `dsh-better-sidebar` 同一色系。
- [D-005] Q: README 的工具与配置细节保留多少？ -> A: 保留配置表与 `skill_search` 参数，删除自动分组算法步骤与开发章节。依据：配置是用户可见行为。

## Review Record

- 2026-11-20 | Decision: Waived | Scope: current full document | Open items: none | Risks: 用户要求后续自行实现、提 PR 并合并，免除计划审查；`Menu` 属于宿主不稳定接口，宿主升级后需复核

## Summary

改中英文元数据与 `package.json` 描述；新增插件图标并导出；把技能条目的原生 `<select>` 换成宿主 `Menu`；重写 README 为面向用户的中文说明并加 npm 版本徽章。

## Technical Context

**Language/Version**: TypeScript 6，React 18

**Primary Dependencies**: `@deepseek-ai/dsh-client-ui-primitives` 0.2.2-rc.5 的 `Menu`、`IconChevronDownOutlineRegular`

**Storage**: N/A

**Testing**: vitest，`renderToStaticMarkup` 渲染断言，`npm pack --dry-run` 打包断言

**Target Platform**: DSH Web 与 Desktop

**Project Type**: DSH 插件

**Performance Goals**: N/A

**Constraints**: 平台模块保持 external；图标为自包含 SVG

**Scale/Scope**: 单个组件、两份 locale、一份图标、README

## Constitution Check

| 原则 | 结论 |
| --- | --- |
| I. 宿主依赖版本 | 通过。不改依赖版本 |
| II. 测试同步 | 通过。更新 `client.test.ts`、`metadata.test.ts`、`package-pack.test.ts`；需实机验证菜单与图标 |
| III. 文档结构 | 通过。README 只写用户内容；`development.md` 文件地图与 `known-risks.md` 同步；CHANGELOG 在 push 时补条目 |
| IV. 质量门禁 | 通过。每次改动后运行 `pnpm format && pnpm check` |
| V. 公开引用 | 通过。徽章使用公网 URL |

设计完成后复核：全部通过。

## Project Structure

### Documentation (this feature)

```text
specs/024-polish-meta-readme/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
icon.svg                     # 新增插件图标
package.json                 # description、exports ./icon、files
locale/zh.json, en.json      # meta
README.md                    # 用户文档
src/client/skill-chip.tsx    # 「移动到」菜单
src/client/styles.ts         # 触发按钮样式
tests/support/primitives.ts  # 导出 Menu 与图标
tests/client.test.ts
tests/metadata.test.ts
tests/package-pack.test.ts
docs/development.md, docs/known-risks.md
```

**Structure Decision**: 沿用现有单包结构。

## Complexity Tracking

无违例。
