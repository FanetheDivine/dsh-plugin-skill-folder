---

description: "Task list for Skill 文件夹折叠与可视化分组"
---

# Tasks: Skill 文件夹折叠与可视化分组

**Input**: Design documents from `/specs/020-skill-search-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 按宪章原则 II，代码变更同步新增或更新 `tests/`。每个阶段先写测试。

**Organization**: 按用户故事分阶段，每个阶段是一个可独立验证的增量。每个阶段对应一个 commit。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件，无未完成依赖）
- **[Story]**: 所属用户故事

## Path Conventions

单包双入口：宿主 `src/`，前端 `src/client/`，测试 `tests/`。

---

## Phase 1: Setup

**Purpose**: 模板转化与基础结构

- [X] T001 更新 `package.json`：`name` 改为 `dsh-plugin-skill-folder`，`version` 改为 `0.1.0`，`keywords` 与 `description` 改为本插件；新增 `devDependencies` 的 `@dnd-kit/core@6.3.1`，运行 `pnpm install`
- [X] T002 [P] 更新 `cordis.patch.yml` 的行 id 与模块名为 `dsh-plugin-skill-folder`
- [X] T003 [P] 更新 `tsdown.config.ts` 的 `CLIENT_ID` 与两组构建名称为 `dsh-plugin-skill-folder`
- [X] T004 [P] 更新 `locale/zh.json` 与 `locale/en.json` 的 `meta.title`、`meta.description`
- [X] T005 [P] 宪章 `.specify/memory/constitution.md`：标题改为 `dsh-plugin-skill-folder Constitution`，版本 PATCH 升到 2.0.1 并写修订理由
- [X] T006 [P] `AGENTS.md`：项目说明改为本插件，删除「模板说明」节与 `template-conversion.md` 索引条目
- [X] T007 [P] 删除 `docs/template-conversion.md`，同步删除其他地方对它的索引引用
- [X] T008 [P] 删除模板示例：`src/demo-tool.ts`、`src/events.ts`、`src/client/demo-dock.tsx`、`src/client/config-page.tsx`、`src/client/config-form.ts` 及其测试 `tests/config-form.test.ts`
- [X] T009 [P] 清空 `specs/001-*` 至 `specs/019-*`、`changelogs/` 内容与 `CHANGELOG.md` 历史条目，保留 `CHANGELOG.md` 的 `## Unreleased` 骨架
- [X] T010 [P] `.github/workflows/ci.yml`：恢复 `publish` job 的 `if: startsWith(github.ref, 'refs/tags/')`，删除 `if: false` 与注释说明
- [X] T011 更新 `tests/metadata.test.ts` 与 `tests/package-pack.test.ts` 的包名与期望值，运行 `pnpm check` 通过

**Checkpoint**: 包标识与文档完成转化，模板示例已移除

---

## Phase 2: Foundational

**Purpose**: 全部用户故事共用的配置、文件夹规则与 Skill 判定

**⚠️ CRITICAL**: 本阶段完成前不进入用户故事

- [X] T012 [P] 写 `tests/config.test.ts`：覆盖默认值、`folders`/`defaultLimit`/`descriptionMaxLength` 校验、未知键报错、热重载读取
- [X] T013 实现 `src/config.ts`：`Config` schema（三字段均 `.volatile()`，`defaultLimit` 1–20 默认 5，`descriptionMaxLength` 40–2000 默认 320）、`DEFAULT_CONFIG`、`resolveConfig`、`readConfig`
- [X] T014 [P] 写 `tests/folders.test.ts`：覆盖名称 1–64 字符、忽略大小写唯一、成员跨文件夹唯一、按名查文件夹、按文件夹查成员
- [X] T015 实现 `src/folders.ts`：`resolveFolders`、`folderOf(name)`、`membersOf(folder)`、`ungroupedOf(skills)`
- [X] T016 [P] 写 `tests/skills.test.ts`：覆盖 `modelInvocable` 过滤、`project-` 来源判定、路径前缀判定、全局列表读取
- [X] T017 实现 `src/skills.ts`：`isModelInvocable`、`loadGlobalSkills`、`isGlobalSummary`
- [X] T018 [P] 更新 `src/constants.ts`、`src/types.ts`、`src/utils.ts` 为插件常量与类型
- [X] T019 更新 `tests/helpers.ts`：补充 `skills`、`connection.fetch`、`workingDirectory` 与 `pre-step` 决策的模拟

**Checkpoint**: 配置、文件夹与 Skill 判定可用，用户故事可并行开始

---

## Phase 3: User Story 1 - 用文件夹折叠模型目录 (Priority: P1) 🎯 MVP

**Goal**: 模型目录用文件夹摘要替代已归组的 Skill

**Independent Test**: 构造含已归组与未归组 Skill 的目录消息，执行 `apply` 的 `pre-step` 监听，核对输出文本与 `source`

- [X] T020 [P] [US1] 写 `tests/catalog.test.ts`：覆盖折叠、未归组逐项展示、空文件夹不展示、无匹配保持原样、缺 `skill_search` 保持原样、`source.entries` 不变
- [X] T021 [US1] 实现 `src/catalog.ts`：`foldCatalog(messages, summaries, folders, options)` 生成 `<skill_folders>` 文本并加 `foldedBy`
- [X] T022 [US1] 实现 `src/index.ts` 的 `pre-step` 监听：`prepend: true`，`next()` 后调用 `foldCatalog`，检索不完整时只折叠已确认项
- [X] T023 [US1] `src/index.ts` 导出 `name`、`inject`（`['tools','skills','workingDirectory']`）、`Config`、`apply`
- [X] T024 [US1] 写 `tests/plugin.test.ts`：覆盖导出契约、工具注册、监听顺序与 `prepend`、拒绝决策直通、卸载清理

**Checkpoint**: 目录折叠可用并独立验证

---

## Phase 4: User Story 2 - 发现并加载折叠的 Skill (Priority: P1)

**Goal**: `skill_search` 按关键词或文件夹返回摘要，模型随后用原生 `skill` 加载

**Independent Test**: 用固定 Skill 集合与查询参数调用工具，核对结果、排序、分页、错误与文件夹列出

- [X] T025 [P] [US2] 写 `tests/search.test.ts`：覆盖分词（英文词、中文二字组、停用词）、权重排序、准确名称优先、分页、摘要截断、文件夹内搜索、`complete` 透传
- [X] T026 [US2] 实现 `src/search.ts`：`queryTerms`、`rankSkills`、`shorten`，按 [contracts/skill-search-tool.md](contracts/skill-search-tool.md) 返回
- [X] T027 [US2] 实现 `src/search-tool.ts`：`skill_search` 参数与输出 schema、参数校验、`folder` 解析、原生 `skill` 存在性检查、`presentCall` 与 `isConcurrencySafe`
- [X] T028 [US2] 在 `src/index.ts` 注册 `skill_search`，按配置 `defaultLimit`、`descriptionMaxLength`、文件夹构造工具
- [X] T029 [US2] 扩展 `tests/plugin.test.ts`：覆盖工具注册参数、未知文件夹、越界参数、缺失加载器、项目级同名 Skill 的 `folder` 为 `null`

**Checkpoint**: 折叠的 Skill 可被模型发现并加载

---

## Phase 5: User Story 3 - 拖拽分组 (Priority: P1)

**Goal**: 配置页列出全局 Skill 与文件夹，支持拖拽、下拉移动、增删改文件夹与保存

**Independent Test**: 在配置页创建文件夹、拖动 Skill、改名、删除文件夹、保存与放弃，核对草稿与写回内容

- [X] T030 [P] [US3] 定义 `src/client/api.ts` 的 `SkillItem` 与 `fetchSkills()`，读取 `GET /api/skill-folder/skills`
- [X] T031 [P] [US3] 实现 `src/routes.ts`：`GET /api/skill-folder/skills` 经 `ctx.inject(['connection'])` 注册，按 [contracts/skills-route.md](contracts/skills-route.md) 返回
- [X] T032 [US3] 写 `tests/folder-form.test.ts`：覆盖 `folders` JSON 草稿格式化与解析、非法 JSON 阻止保存、添加/改名/删除文件夹、移动成员、保存写回、放弃恢复
- [X] T033 [US3] 实现 `src/client/folder-form.ts`：`FolderForm` 封装 `SettingsFormModel`，`folders` 字段的 `format`/`parse`（成员跨文件夹唯一、名称 1–64 字符忽略大小写唯一）、`moveSkill`、`addFolder`、`renameFolder`、`removeFolder`、`dispose`
- [X] T034 [US3] 实现 `src/client/skill-chip.tsx`：`useDraggable` 条目与「移动到」下拉框
- [X] T035 [US3] 实现 `src/client/folder-card.tsx`：名称与简介输入、`useDroppable` 放置区、成员列表、删除按钮、未找到成员标注
- [X] T036 [US3] 实现 `src/client/folder-page.tsx`：单列布局（工具栏 → 文件夹卡片 → 未分组列表 → 搜索选项），`DndContext` 的指针与键盘传感器，加载态、错误态与只读态
- [X] T037 [US3] 实现 `src/client/locales.ts`：`zh` 与 `en` 同键集字典，含文件夹、移动、保存、放弃、恢复默认、错误与空态文案
- [X] T038 [US3] 更新 `src/client/index.ts`：注册字典，在 `plugins.row.config` 以 `dsh-plugin-skill-folder#dsh-plugin-skill-folder` 注册配置页
- [X] T039 [US3] 写 `tests/client.test.ts`：覆盖服务分组、字典键集、`plugins.row.config` 注册参数、中英文渲染、只读与不可用态

**Checkpoint**: 用户可完成分组并保存

---

## Phase 6: User Story 4 - 按前缀自动分组 (Priority: P2)

**Goal**: 一键为未分组 Skill 生成或补充文件夹

**Independent Test**: 对固定 Skill 与文件夹集合调用自动分组，核对新增文件夹、名称、成员与既有归属

- [X] T040 [P] [US4] 写 `tests/auto-group.test.ts`：覆盖文件夹名匹配（等于或以 `名称-` 开头）、多匹配取最长名称、首段前缀合并、成员数 < 2 不建组、组名取分段最长公共前缀（含 spec 的 `lark` 与 `lark-doc` 两个示例）、同名文件夹并入、已分组保持不变
- [X] T041 [US4] 实现 `src/client/auto-group.ts`：`autoGroup(folders, skills, describe)` 纯函数返回新文件夹列表
- [X] T042 [US4] 在 `src/client/folder-page.tsx` 工具栏接入「按前缀自动分组」，结果写入草稿，简介按当前语言生成
- [X] T043 [US4] 扩展 `tests/client.test.ts`：覆盖自动分组按钮渲染、点击后草稿变化、放弃后恢复

**Checkpoint**: 自动分组可用且可放弃

---

## Phase 7: User Story 5 - 保存与恢复配置 (Priority: P2)

**Goal**: 保存后持久化并作用于后续模型目录与搜索；失败时保留草稿

**Independent Test**: 修改分组与搜索选项，验证保存、放弃、恢复默认、保存失败与重新载入

- [X] T044 [US5] 扩展 `tests/folder-form.test.ts`：覆盖 `defaultLimit`/`descriptionMaxLength` 范围校验、恢复默认、保存失败后保留草稿与 `failed` 状态、只读时禁用
- [X] T045 [US5] 在 `src/client/folder-page.tsx` 接入搜索选项字段与 `SettingsForm` 的保存、放弃、恢复默认控件
- [X] T046 [US5] `src/index.ts` 监听 `loader/volatile-update` 重新校验配置，失败时保留上一份有效值并 `logger.warn`
- [X] T047 [US5] 扩展 `tests/plugin.test.ts` 与 `tests/config.test.ts`：覆盖热更新后新配置生效、非法更新被忽略

**Checkpoint**: 配置闭环完成

---

## Phase 8: Polish & 交付

**Purpose**: 文档、元数据与验收

- [X] T048 [P] 重写 `README.md`：功能、安装（含停用 `dsh-skill-search-local` 的提示）、配置项、分组与自动分组规则、`skill_search` 用法与限制
- [X] T049 [P] 重写 `docs/how-it-works.md`：目录改写点、全局判定、配置暂存、前端分组页、依赖归属（含 `@dnd-kit` 内联）
- [X] T050 [P] 更新 `docs/known-risks.md`：`skill_search` 冲突、原生目录格式、rc 版本差、`dsh-client-ui-primitives` 稳定性
- [X] T051 [P] 更新 `docs/development.md`：文件地图、测试清单、`real-device-test` 用例
- [X] T052 [P] 更新 `.dsh/skills/real-device-test` 中引用模板插件的用例为本插件
- [X] T053 `CHANGELOG.md` 写入本次变更条目
- [X] T054 运行 `pnpm format && pnpm check && pnpm build`，全部通过
- [X] T055 按 [quickstart.md](quickstart.md) 在真实宿主执行实机验证，记录结果与未验证项

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖
- **Foundational (Phase 2)**: 依赖 Phase 1，阻塞全部用户故事
- **US1 (Phase 3)**: 依赖 Phase 2
- **US2 (Phase 4)**: 依赖 Phase 2 与 US1 的 `src/index.ts` 接线
- **US3 (Phase 5)**: 依赖 Phase 2 与 T031 路由供前端读取列表
- **US4 (Phase 6)**: 依赖 US3 的草稿模型与页面
- **US5 (Phase 7)**: 依赖 US3 的表单接线
- **Polish (Phase 8)**: 依赖全部用户故事

### User Story Dependencies

- **US1 (P1)**: 独立可交付（模型目录折叠）
- **US2 (P1)**: 独立可验证；与 US1 共享配置与文件夹规则
- **US3 (P1)**: 独立可验证；前端依赖 T031 路由
- **US4 (P2)**: 依赖 US3
- **US5 (P2)**: 依赖 US3

### Parallel Opportunities

- Phase 1 的 T002–T010 可并行
- Phase 2 的 T012/T014/T016/T018 可并行
- Phase 3 的 T020 与 Phase 2 收尾可并行
- Phase 5 的 T030/T031 可并行；T034/T035 可并行
- Phase 8 的 T048–T052 可并行

---

## Parallel Example: Phase 2

```bash
# 配置、文件夹、Skill 判定三组测试并行
Task: "写 tests/config.test.ts"
Task: "写 tests/folders.test.ts"
Task: "写 tests/skills.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "定义 src/client/api.ts 的 SkillItem 与 fetchSkills()"
Task: "实现 src/routes.ts 的 GET /api/skill-folder/skills"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1 → 独立验证目录折叠
4. Phase 4 US2 → 独立验证发现与加载
5. Phase 5 US3 → 独立验证分组保存

MVP 是 US1 + US2 + US3，配置页才能真正替代手工编辑。

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. US1 → 目录折叠生效
3. US2 → 折叠的 Skill 可发现
4. US3 → 可视化分组
5. US4 → 一键自动分组
6. US5 → 配置闭环
7. Polish → 文档与实机验收

---

## Notes

- 每阶段结束运行 `pnpm format && pnpm check`，并提交一个 commit
- 测试先写并确认失败，再实现
- 断言真实行为，不复述默认值或文案
- 实机测试后恢复被改动的用户状态
