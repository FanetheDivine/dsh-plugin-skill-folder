---

description: "Task list for 024-polish-meta-readme"

---

# Tasks: 优化插件展示与分组下拉框

**Input**: Design documents from `specs/024-polish-meta-readme/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Phase 1: User Story 1 - 在插件列表中认出插件 (Priority: P1)

**Goal**: 新标题、新描述与专属图标。

**Independent Test**: `pnpm vitest run tests/metadata.test.ts` 通过；插件行显示新元数据与图标。

- [X] T001 [P] [US1] 把 `locale/zh.json` 的 meta 改为 title「折叠skill」、description「可视化地对全局skill进行分组折叠，避免会话一次性加载全部skill」
- [X] T002 [P] [US1] 把 `locale/en.json` 的 meta 改为 title「Skill folding」、description「Visually group and fold global skills so a session does not load every skill at once.」，`package.json` 的 description 同步
- [X] T003 [P] [US1] 新建 `icon.svg`：36×36 视口，文件夹内叠放技能卡片，自包含，无 `<text>`、`<style>`、脚本
- [X] T004 [US1] `package.json` 增加 `exports["./icon"]` 与 `files` 的 `icon.svg`
- [X] T005 [US1] `tests/metadata.test.ts` 断言新标题、`./icon` 导出、图标为合法自包含 SVG 且小于 256 KiB；`tests/package-pack.test.ts` 断言包含 `icon.svg`

## Phase 2: User Story 2 - 切换技能所属分组 (Priority: P2)

**Goal**: 「移动到」使用宿主 `Menu`。

**Independent Test**: `pnpm vitest run tests/client.test.ts` 通过；实机键盘与鼠标均可切换分组。

- [ ] T006 [US2] `tests/support/primitives.ts` 导出 `Menu`、`MenuItemButton` 与 `IconChevronDownOutlineRegular`
- [ ] T007 [US2] `src/client/skill-chip.tsx` 用 `Menu` 替换 `<select>`：触发按钮显示当前分组名与下拉箭头，`portal`，`selectedId` 标记当前分组，未分组项后加分隔线，选中后关闭，阻止 `pointerdown` 与 `keydown` 冒泡
- [ ] T008 [US2] `src/client/styles.ts` 增加触发按钮样式，长名称省略
- [ ] T009 [US2] 更新 `tests/client.test.ts` 的「移动到」断言为菜单触发按钮语义
- [ ] T010 [US2] 同步 `docs/development.md` 文件地图与 `docs/known-risks.md` 的下拉框描述

## Phase 3: User Story 3 - 阅读 README 了解用法 (Priority: P3)

**Goal**: 面向用户的中文 README。

**Independent Test**: 通读 README，顶部有 npm 版本徽章，无开发章节。

- [ ] T011 [US3] 重写 `README.md`：npm 版本徽章、功能、安装、使用、配置、工具；删除开发章节与算法细节

## Phase 4: Polish

- [ ] T012 运行 `pnpm format && pnpm check` 与 `pnpm build`
- [ ] T013 实机验证插件行、图标、菜单与详情页，记录结果到 `specs/024-polish-meta-readme/quickstart.md`
- [ ] T014 `CHANGELOG.md` 增加本次变更条目

## Dependencies

- 三个故事相互独立；T004 依赖 T003；T005 依赖 T001–T004；T009 依赖 T007。
- Phase 4 依赖全部故事。

## Implementation Strategy

按 P1 → P2 → P3 顺序实现，每阶段一个 commit。
