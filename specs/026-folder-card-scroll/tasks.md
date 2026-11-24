# Tasks: 限制文件夹卡片高度并让技能区滚动

**Input**: Design documents from `/specs/026-folder-card-scroll/`

**Prerequisites**: [plan.md](./plan.md)、[spec.md](./spec.md)、[research.md](./research.md)、[quickstart.md](./quickstart.md)

**Tests**: 规格要求自动化测试覆盖样式常量与渲染结构，见 [research.md](./research.md) R6。

**Organization**: 每个阶段对应一个 commit。

## Phase 1: 常量与样式（T001–T004）

覆盖 US1 的限高与滚动，同时为 US2、US3 提供基础。

- [ ] T001 在 `src/constants.ts` 增加 `FOLDER_CARD_MAX_HEIGHT = 500`，并加一句用途注释
- [ ] T002 在 `src/client/styles.ts` 增加 `folderCardStyle`、`folderCardActiveStyle`：基于 `cardStyle`，`padding` 为 0，`maxHeight` 取常量，`overflow: 'hidden'`
- [ ] T003 在 `src/client/styles.ts` 增加 `cardBodyStyle`（`padding: 14`、`display: flex`、`flexDirection: column`、`gap: 10`、`flexShrink: 0`）、`memberScrollStyle`（`padding` 不设、`overflowY: 'auto'`、`flex: '0 1 auto'`、`minHeight: 0`、`scrollbarWidth: 'thin'`、`scrollbarColor` 用主题令牌）、`memberBodyStyle`（`chipListStyle` 加 `padding: '0 14px 14px'`）
- [ ] T004 在 `src/client/styles.ts` 增加 `scrollbarStyleText`：为 `[data-skill-folder-page] [data-folder-members]` 的 `::-webkit-scrollbar`、`::-webkit-scrollbar-thumb`、`::-webkit-scrollbar-track` 设置宽度、滑块与透明轨道

**验收**：`pnpm typecheck` 与 `pnpm lint` 通过；样式常量包含限高、零内边距与内层内缩三组值。

**Commit**：`feat(config): 增加文件夹卡片限高与滚动样式`

## Phase 2: 卡片结构（T005–T006）

- [ ] T005 改 `src/client/folder-card.tsx`：卡片内层容器承载标题行、名称错误与简介；成员区改为滚动容器，其中再放一层 `memberBodyStyle` 容器包住条目、空状态与筛选无结果提示；折叠时隐藏滚动容器
- [ ] T006 改 `src/client/folder-page.tsx`：注入 `<style data-skill-folder-scrollbar-styles>` 输出 `scrollbarStyleText`；`UngroupedArea` 保持 `cardStyle` 与 `chipListStyle` 不变

**验收**：`pnpm check` 通过；静态渲染中文件夹卡片带 `max-height:500px`，成员区带 `overflow-y:auto`。

**Commit**：`feat(config): 文件夹卡片改为内层滚动结构`

## Phase 3: 测试（T007–T009）

- [ ] T007 在 `tests/client.test.ts` 断言 `folderCardStyle.maxHeight` 等于 `FOLDER_CARD_MAX_HEIGHT`、`padding` 为 0、`overflow` 为 `hidden`
- [ ] T008 在 `tests/client.test.ts` 断言 `memberScrollStyle` 无 `padding`、`overflowY` 为 `auto`、`minHeight` 为 0，`memberBodyStyle.padding` 为 `'0 14px 14px'`
- [ ] T009 在 `tests/client.test.ts` 渲染断言：文件夹卡片含 `max-height:500px` 与 `overflow-y:auto`，未分组区域不含这两项；折叠时成员区带 `display:none`

**验收**：`pnpm test:code` 通过。

**Commit**：`test(config): 覆盖卡片限高与成员区滚动结构`

## Phase 4: 文档与实机验证（T010–T012）

- [ ] T010 `README.md` 的「使用」表增加一行：长文件夹在卡片内滚动，卡片最高 500px
- [ ] T011 `CHANGELOG.md` 的 `## Unreleased` 增加 `### Changed` 条目
- [ ] T012 按 [quickstart.md](./quickstart.md) 做实机验证，记录卡片高度、滚动条位置与键盘/拖拽结果

**验收**：`pnpm format && pnpm full-check` 通过；实机检查表全部符合预期。

**Commit**：`docs(config): 说明文件夹卡片限高与滚动`

## Dependencies

- Phase 1 完成后才能开始 Phase 2。
- Phase 2 完成后才能开始 Phase 3。
- Phase 4 的实机验证（T012）依赖 Phase 2 的构建产物。

## Parallel Opportunities

- T002、T003 同在 `src/client/styles.ts`，串行执行。
- T007、T008、T009 同在 `tests/client.test.ts`，串行执行。
- T010、T011 可并行。

## Implementation Strategy

先完成 Phase 1 与 Phase 2，跑通 `pnpm check` 后再补测试与文档。US1 是 MVP；US2 由 `max-height` 本身满足，US3 的键盘与拖拽行为沿用现有实现，由 T009 的渲染断言与 T012 的实机检查覆盖。
