# Tasks: 折叠目录重复注入修复

**Input**: Design documents from `specs/029-catalog-dedup/`

**Prerequisites**: plan.md（Approved）、spec.md（Approved）、research.md、data-model.md、contracts/catalog-dedup.md、quickstart.md

**Tests**: 需要。宪章原则 II 要求代码变更同步更新 `tests/`。

**Organization**: 按用户故事分阶段，每个阶段对应一个 commit。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 对应 spec.md 的用户故事
- 每条任务都带确切文件路径

## Phase 1: Setup

**Purpose**: 确认基线与分支状态

- [X] T001 在 `worktrees/029-catalog-dedup` 确认 `pnpm test:code` 基线全绿（18 文件 290 用例）
- [X] T002 确认 `docs/how-it-works.md` 的「目录改写」小节与 `docs/known-risks.md` 的「原生目录格式」小节位置，作为文档改动落点

---

## Phase 2: Foundational

**Purpose**: 抽出可复用的渲染与正文解析，供 US1~US3 共用

- [X] T003 [P] 在 `src/catalog.ts` 把 `renderCatalog` 拆成首句与正文两段，输出逐字节不变
- [X] T004 [P] 在 `src/catalog.ts` 导出 `catalogBody(text: string): string | undefined`，从任意目录文本里截取 `<available_skills>` 起的正文
- [X] T005 在 `tests/catalog.test.ts` 补两条：折叠文本整体逐字节断言、`catalogBody` 对折叠文本与原生文本的截取结果

**Checkpoint**: `pnpm test:code` 全绿，折叠文本未变

---

## Phase 3: User Story 1 - 目录不变时只出现一份 (Priority: P1) 🎯 MVP

**Goal**: 折叠正文与本会话已呈现的那份相同时，丢弃这条重发；模型只看到 1 份目录

**Independent Test**: 构造「宿主重发同一份正文」的两步消息，断言目录消息被移出列表且其余消息不变

- [X] T006 [P] [US1] 在 `tests/catalog.test.ts` 补用例：正文相同丢弃、正文不同保留、已呈现未知保留、没有条目被折叠时保留原对象
- [X] T007 [US1] 在 `src/catalog.ts` 扩展 `FoldContext` 的 `presented`，把 `foldedMessage` 改为返回「保留 / 丢弃」的判定结果
- [X] T008 [US1] 在 `src/catalog.ts` 让 `foldCatalog` 过滤掉判定为丢弃的目录消息，其余消息保持原对象与顺序
- [X] T009 [P] [US1] 在 `tests/plugin.test.ts` 补接线用例：pre-step 在正文相同时移除目录消息、正文不同时注入折叠目录
- [X] T010 [US1] 在 `src/index.ts` 新增 `presentedCatalogBody(agent)`，用 `agent.session.deriveMessages()` 从后向前找目录消息并取正文
- [X] T011 [US1] 在 `src/index.ts` 的 pre-step 里接入 `presented`，读取整段用 `try/catch` 包裹，失败记 warn 并返回未知

**Checkpoint**: US1 独立可验；`pnpm test:code` 全绿

---

## Phase 4: User Story 2 - 目录真的变化时更新一次 (Priority: P2)

**Goal**: 正文变化时注入一次新目录，变化后再次稳定则不再重复

**Independent Test**: 连续三步：A、B、B，断言列表分别得到 A、B、无新增

- [X] T012 [P] [US2] 在 `tests/catalog.test.ts` 补用例：文件夹摘要变化视为正文变化、变化后重复的相同正文被丢弃
- [X] T013 [P] [US2] 在 `tests/plugin.test.ts` 补用例：pre-step 在三步序列下的结果（注入、注入、丢弃），并断言更新首句只在变化那步出现

**Checkpoint**: US1 与 US2 同时可用

---

## Phase 5: User Story 3 - 原生行为与既有边界保持 (Priority: P3)

**Goal**: 读取失败安全退化；不介入的场景保持原样

**Independent Test**: 模拟 `deriveMessages` 抛错、无 `session`、最后一条是原生目录、看不到检索工具

- [X] T014 [P] [US3] 在 `tests/plugin.test.ts` 补用例：`deriveMessages` 抛错时仍注入折叠目录并记 warn
- [X] T015 [P] [US3] 在 `tests/plugin.test.ts` 补用例：`agent` 没有 `session` 时按首次注入
- [X] T016 [P] [US3] 在 `tests/catalog.test.ts` 补用例：已呈现正文是原生目录文本时注入折叠版
- [X] T017 [US3] 复核 `src/index.ts` 的既有短路（reject、看不到 `skill_search`、没有目录消息、快照失败）在新判定下仍然成立

**Checkpoint**: 三个用户故事都能独立验证

---

## Phase 6: 文档与 CHANGELOG

- [X] T018 [P] 在 `docs/how-it-works.md` 的目录改写小节补判定来源与丢弃规则
- [X] T019 [P] 在 `docs/known-risks.md` 新增「目录重复注入与判定来源」小节：宿主完整标记抖动、依赖 `Session.deriveMessages()`、读取失败退化
- [X] T020 [P] 在 `README.md` 折叠小节补一句：目录只在变化时出现一次
- [X] T021 在 `CHANGELOG.md` 加 `## Unreleased` 与 `### Fixed` 条目

---

## Phase 7: 实机验证

- [X] T022 在 `.dsh/skills/real-device-test/scripts/run-test.mjs` 增加抖动 provider 用例：`ctx.skills.registerProvider` 交替返回不完整观测，驱动连续多轮
- [X] T023 运行实机：断言折叠目录块 1 份、`skill-catalog` 事件 1 条、changed 首句 0 次；记录 `results.json`
- [X] T024 在 `specs/029-catalog-dedup/quickstart.md` 记录实测数值

---

## Phase 8: 发布与清理

- [X] T025 `pnpm format && pnpm check && pnpm build` 全绿
- [X] T026 创建 PR，等 CI 通过，合并到 `main`
- [X] T027 走仓库 release 流程发布新版本
- [X] T028 删除 worktree 与分支，同步 `main`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（渲染拆分是所有判定的前提）→ Phase 3（MVP）→ Phase 4、Phase 5 可并行 → Phase 6 → Phase 7 → Phase 8
- T005 依赖 T003、T004；T007、T008 依赖 T003、T004；T010、T011 依赖 T004、T007
- US2、US3 的用例依赖 US1 的 `presented` 上下文，实现不再改动

## Implementation Strategy

1. Phase 2 完成即跑 `pnpm test:code`，确认折叠文本没变。
2. Phase 3 结束后先单独验证 US1（最小可交付）。
3. Phase 4、Phase 5 补齐边界后再进文档与实机。
4. 每个阶段一次提交，提交前跑 `pnpm format` 与相关测试。
