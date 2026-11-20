# Tasks: 优化技能文件夹配置 UI

**Input**: Design documents from `/specs/023-polish-config-ui/`

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、quickstart.md

**Tests**: 规格要求自动化行为测试，各故事先写失败测试再实现。

**Organization**: 按用户故事组织，每个阶段完成后提交一个 commit。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 固定范围、设计决策和验收方式

- [x] T001 完成并复核 Spec Kit 产物 `specs/023-polish-config-ui/spec.md`、`plan.md`、`research.md`、`data-model.md`、`quickstart.md`、`tasks.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立各故事共用的主题样式与双语文案

- [x] T002 在 `src/client/styles.ts` 建立页面、操作区、响应式网格、状态 badge、控件焦点和选项网格样式，仅使用 `--dsw-alias-*` 令牌
- [x] T003 在 `src/client/locales.ts` 添加页面说明、筛选计数与清除、折叠、空状态和区域标题的中英文案

**Checkpoint**: 共用样式和完整字典可供所有故事使用

---

## Phase 3: User Story 1 - 快速浏览并整理技能 (Priority: P1) 🎯 MVP

**Goal**: 让用户通过清晰层级和一致控件完成现有分组流程

**Independent Test**: 渲染多文件夹配置页，核对标题、操作区、卡片网格、未分组区和搜索选项，并执行新建与移动

### Tests for User Story 1

- [ ] T004 [US1] 在 `tests/client.test.ts` 添加页面层级、响应式容器和现有操作保持可用的失败测试

### Implementation for User Story 1

- [ ] T005 [US1] 在 `src/client/folder-page.tsx` 实现标题说明、主要操作区、文件夹网格、状态区与搜索选项的清晰层级
- [ ] T006 [P] [US1] 在 `src/client/folder-card.tsx` 优化名称、简介、计数、删除和成员区域的卡片布局
- [ ] T007 [P] [US1] 在 `src/client/skill-chip.tsx` 优化技能条目与移动控件的密度、长名称和交互样式

**Checkpoint**: 页面主要流程保持可用，视觉层级可独立验收

---

## Phase 4: User Story 2 - 在长列表中定位技能 (Priority: P2)

**Goal**: 用统一筛选、结果计数和独立折叠提高浏览效率

**Independent Test**: 跨文件夹筛选名称与描述，清除筛选，折叠成员并删除前列文件夹核对状态

### Tests for User Story 2

- [ ] T008 [US2] 在 `tests/client.test.ts` 添加全区域筛选、结果计数、清除、折叠标记和删除后下标调整的失败测试

### Implementation for User Story 2

- [ ] T009 [US2] 在 `src/client/folder-page.tsx` 集中计算文件夹可见成员、未分组可见成员、结果计数与清除动作
- [ ] T010 [US2] 在 `src/client/folder-card.tsx` 添加带 `aria-expanded` 的折叠按钮，折叠时只隐藏成员区域并保留放置区

**Checkpoint**: 任意技能可由统一筛选定位，折叠不修改配置草稿

---

## Phase 5: User Story 3 - 理解状态并完成键盘操作 (Priority: P3)

**Goal**: 提供清晰状态反馈和完整可访问名称

**Independent Test**: 检查加载、错误、空结果、只读状态，并通过键盘和可访问名称操作主要控件

### Tests for User Story 3

- [ ] T011 [US3] 在 `tests/client.test.ts` 添加状态区域、控件可访问名称、焦点样式和中英文案回归测试

### Implementation for User Story 3

- [ ] T012 [US3] 在 `src/client/folder-page.tsx`、`src/client/folder-card.tsx` 与 `src/client/skill-chip.tsx` 完善状态展示、标签、键盘操作和禁用状态

**Checkpoint**: 三个故事均具备独立可测试的行为和反馈

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档、真实布局和完整质量门禁

- [ ] T013 [P] 在 `README.md` 说明统一筛选与文件夹折叠，在 `CHANGELOG.md` 记录本次 UI 优化
- [ ] T014 按 `specs/023-polish-config-ui/quickstart.md` 运行 `pnpm format && pnpm check` 与 `pnpm build`
- [ ] T015 用 Playwright 检查桌面与 320px 窄屏布局、筛选和折叠交互，确认无横向溢出并保存验证截图到 `specs/023-polish-config-ui/`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6。
- 每个阶段对应一个 commit。
- US2 复用 US1 的卡片结构，US3 复核前两个故事的交互。

### Parallel Opportunities

- T006 与 T007 修改不同组件，可并行。
- T013 的文档编辑可与测试执行准备并行，但提交前统一复核。

## Parallel Example: User Story 1

```text
Task: T006 优化文件夹卡片布局
Task: T007 优化技能条目布局
```

## Implementation Strategy

1. 先提交规格、计划和任务，固定自主决策。
2. 建立共用样式与字典。
3. 交付 US1 作为视觉与主要流程 MVP。
4. 增加 US2 的统一筛选与折叠。
5. 完成 US3 的状态和键盘验收。
6. 更新文档，运行完整门禁和浏览器验证后交付。

## Notes

- 筛选和折叠只使用临时状态。
- 保持配置模型、外部接口与依赖版本不变。
