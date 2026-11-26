---

description: "Task list for feature 028-refine-config-ui"
---

# Tasks: 优化配置页视觉与批量浏览交互

**Input**: Design documents from `/specs/028-refine-config-ui/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Included per Constitution II (测试同步).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Shared Icons, Locales & Styles)

**Purpose**: Export host icon primitives for tests, add bilingual locale keys, and define shared styles for icons, search input, empty folder state, and interactive hover/focus states.

- [X] T001 [P] Export `IconPlusOutlineRegular`, `IconSparkleRegular`, `IconSearchOutlineRegular`, `IconDragHandleOutlineRegular`, `IconTrashOutlineRegular`, and `IconFolderOpenOutlineRegular` in `tests/support/primitives.ts`
- [X] T002 [P] Add `folder.collapseAll`, `folder.expandAll`, and `folder.emptyList` keys to `zh` and `en` in `src/client/locales.ts`
- [X] T003 [P] Add `searchBoxStyle`, `emptyFoldersStyle`, `sectionActionsStyle`, icon-aligned button styles, and hover/focus-within rules in `src/client/styles.ts`

**Checkpoint**: Foundation ready - user story implementation can begin.

---

## Phase 2: User Story 1 & 2 - 视觉引导、图标化与批量折叠/展开 (Priority: P1 & P2) 🎯 MVP

**Goal**: Upgrade toolbar, filter input, folder card header, skill chip drag handle with host vector icons; show an empty state when no folders exist; and provide a batch "Collapse all / Expand all" toggle in the folders section header.

**Independent Test**: Render `FolderPage` with empty and non-empty folders, verify icons (`data-icon`), empty folder guidance (`data-folders-empty`), and batch collapse/expand helper functions (`allFoldersCollapsed`, `toggleAllFoldersCollapsed`).

- [ ] T004 [P] [US1] Replace drag handle character with `IconDragHandleOutlineRegular` in `src/client/skill-chip.tsx`
- [ ] T005 [P] [US1] Replace collapse chevron character with `IconChevronDownOutlineRegular` and add `IconTrashOutlineRegular` to the delete button in `src/client/folder-card.tsx`
- [ ] T006 [US1] [US2] Implement `allFoldersCollapsed`, `toggleAllFoldersCollapsed`, empty folders guidance (`data-folders-empty`), batch toggle button (`data-folder-toggle-all`), and toolbar/search icons in `src/client/folder-page.tsx`
- [ ] T007 [US1] [US2] [US3] Add unit tests for `allFoldersCollapsed`, `toggleAllFoldersCollapsed`, empty folder guidance, host icons, and bilingual rendering in `tests/client.test.ts`

**Checkpoint**: User Stories 1, 2, and 3 are functional and verified by `pnpm check`.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Update user documentation, changelog, and run full verification gates.

- [ ] T008 [P] Update usage table in `README.md` with batch collapse/expand description
- [ ] T009 [P] Add change entry in `CHANGELOG.md`
- [ ] T010 Run `pnpm format && pnpm full-check` to validate all code and dist tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies - starts immediately.
- **Phase 2 (User Stories 1–3)**: Depends on Phase 1 completion.
- **Phase 3 (Polish)**: Depends on Phase 2 completion.

### Parallel Opportunities

- T001, T002, and T003 touch different files and can be executed in parallel.
- T004 and T005 touch different component files and can be executed in parallel before T006/T007.
- T008 and T009 touch different documentation files and can be executed in parallel.

## Implementation Strategy

1. Complete Phase 1 and commit.
2. Complete Phase 2, verify with `pnpm format && pnpm check`, and commit.
3. Complete Phase 3, verify with `pnpm format && pnpm full-check`, and commit.
