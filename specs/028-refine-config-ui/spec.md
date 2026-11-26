# Feature Specification: 优化配置页视觉与批量浏览交互

**Feature Branch**: `feat/028-refine-config-ui`

**Created**: 2026-11-26

**Status**: Waived

**Input**: User description: "自行优化ui&合并&发版"

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

### Session 2026-11-26

#### 探索结论

- 配置页已具备新建、改名、简介编辑、删除、拖拽、菜单移动、按前缀自动分组、始终分组、筛选、文件夹卡片 500px 限高滚动与保存放弃流程。
- 当 `folders` 为空时，文件夹网格高度为 0，缺少空状态引导。
- 当文件夹较多时，只能逐个点击卡片折叠，缺少分区级的一键「全部折叠 / 全部展开」动作。
- 部分控件使用纯字符符号（`▾`、`⠿`），且筛选输入框缺少搜索图标，按钮与输入框缺少一致的悬浮与聚焦高亮规则。
- `@deepseek-ai/dsh-client-ui-primitives` 是宿主平台模块，已内置 `IconPlusOutlineRegular`、`IconSparkleRegular`、`IconSearchOutlineRegular`、`IconChevronDownOutlineRegular`、`IconDragHandleOutlineRegular`、`IconTrashOutlineRegular`、`IconFolderOpenOutlineRegular` 等图标，无需新增依赖即可直接使用。

#### 自主决策

- [D-001] Q: 本次 UI 优化覆盖哪些能力与视觉细节？ -> A: 聚焦配置页的控件图标化、空文件夹引导、批量展开/折叠与交互悬浮反馈，保留现有分组、拖拽、筛选和保存流程。依据：用户明确指示「自行优化ui&合并&发版」，授权全流程自主决策。
- [D-002] Q: 当存在多个文件夹时如何快速切换全部卡片的展开与折叠？ -> A: 在「文件夹」分区标题行右侧提供「全部折叠 / 全部展开」切换动作；当全部文件夹已折叠时显示「全部展开」，否则显示「全部折叠」。依据：提升多文件夹场景下的浏览效率。
- [D-003] Q: 没有任何文件夹时，文件夹区域如何展示？ -> A: 显示空状态卡片提示文案，引导用户新建文件夹或按前缀自动分组。依据：消除空配置时的视觉断层。
- [D-004] Q: 控件图标与交互反馈如何与宿主保持一致？ -> A: 使用 `@deepseek-ai/dsh-client-ui-primitives` 提供的矢量图标替代纯字符符号，并为按钮、输入框与卡片补充悬浮和聚焦视觉状态。依据：与宿主设计语言保持一致，且不增加打包体积或外部依赖。

## Review Record

- 2026-11-26 | Decision: Waived | Scope: 当前完整文档 | Open items: none | Risks: 用户要求「自行优化ui&合并&发版」，免除人工访谈与审查；视觉与交互质量由自动化测试覆盖

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 清晰的视觉引导与一致的控件反馈 (Priority: P1)

用户打开技能文件夹配置页，通过带有明确图标的工具栏、清晰的输入框与按钮悬浮/聚焦状态，以及空文件夹引导快速理解可执行的操作并完成技能分组。

**Why this priority**: 配置页的视觉清晰度与交互反馈直接决定首次使用和日常整理技能的体验。

**Independent Test**: 打开配置页（含空文件夹配置与非空配置），检查工具栏、卡片头部、技能条目图标及空状态提示，并执行新建、改名、移动与删除。

**Acceptance Scenarios**:

1. **Given** 用户尚未配置任何文件夹，**When** 打开配置页，**Then** 文件夹区域显示空状态引导文案，提示可新建文件夹或按前缀自动分组。
2. **Given** 配置页已加载，**When** 用户浏览工具栏、文件夹卡片和技能条目，**Then** 主要操作、筛选框、折叠按钮、拖拽手柄和删除按钮均呈现清晰的图标与悬浮/聚焦反馈。
3. **Given** 配置可编辑，**When** 用户新建文件夹、编辑名称/简介、移动技能或保存，**Then** 全部既有配置能力保持正常可用。

---

### User Story 2 - 一键批量折叠与展开全部文件夹 (Priority: P2)

当配置页存在文件夹时，用户可在文件夹分区标题行一键折叠全部文件夹以纵览全局，或一键展开全部文件夹查看成员。

**Why this priority**: 文件夹数量增加后，批量折叠/展开能显著减少重复点击。

**Independent Test**: 构造多个文件夹，点击分区标题栏的「全部折叠」与「全部展开」按钮，检查各卡片成员区的显隐状态。

**Acceptance Scenarios**:

1. **Given** 页面存在至少一个展开的文件夹，**When** 用户点击文件夹分区标题行的「全部折叠」，**Then** 所有文件夹成员列表收起，按钮文案切换为「全部展开」。
2. **Given** 页面全部文件夹均处于折叠状态，**When** 用户点击「全部展开」，**Then** 所有文件夹成员列表展开，按钮文案切换为「全部折叠」。
3. **Given** 页面没有任何文件夹，**When** 用户查看文件夹分区标题行，**Then** 不显示批量折叠/展开按钮。

---

### User Story 3 - 保持键盘可访问性与双语一致性 (Priority: P3)

用户在中英文环境下均可看到完整的界面文案，并可通过键盘完成筛选、批量折叠/展开、单卡折叠、技能移动与保存。

**Why this priority**: 插件面向中英文用户并需保证键盘可访问性。

**Independent Test**: 分别以中文和英文渲染配置页，检查新增文案、可访问名称与键盘焦点样式。

**Acceptance Scenarios**:

1. **Given** 界面语言为中文或英文，**When** 渲染配置页，**Then** 空状态引导与批量折叠/展开按钮均显示对应语言的文案。
2. **Given** 用户使用键盘导航，**When** 焦点移动到各按钮、输入框和拖拽手柄，**Then** 控件呈现清晰的焦点环且具备准确的可访问名称。

### Edge Cases

- 筛选激活期间，有匹配成员的折叠文件夹临时展开；清除筛选后恢复批量或单独设置的折叠状态。
- 全部折叠后新建一个文件夹，新文件夹默认展开以便立即输入名称和拖入技能，此时分区按钮显示「全部折叠」。
- 删除最后一个文件夹后，折叠集合清空，文件夹区域切换为空状态提示。
- 窄屏（320px 宽度）下工具栏、分区标题行、卡片头部与技能条目正常折行，不产生横向溢出。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 当文件夹列表为空时，文件夹区域 MUST 显示空状态引导提示。
- **FR-002**: 当存在至少一个文件夹时，文件夹分区标题行 MUST 提供「全部折叠 / 全部展开」切换按钮。
- **FR-003**: 点击「全部折叠」MUST 收起所有文件夹的成员列表；当所有文件夹均已折叠时，点击「全部展开」MUST 展开所有文件夹的成员列表。
- **FR-004**: 工具栏、筛选框、文件夹卡片与技能条目 MUST 使用宿主矢量图标与主题令牌样式，并提供悬停与键盘聚焦反馈。
- **FR-005**: 现有的新建、改名、简介编辑、删除、拖拽、菜单移动、按前缀自动分组、始终分组、筛选、卡片 500px 限高滚动、保存与放弃修改功能 MUST 保持不变。
- **FR-006**: 所有新增用户可见文案 MUST 同时提供中文与英文翻译。
- **FR-007**: 所有交互控件 MUST 保持明确的可访问名称（`aria-label` 或可见文本）与状态属性。

### Key Entities *(include if feature involves data)*

- **文件夹分区视图**：包含分区标题、文件夹总数徽标、批量折叠/展开动作，以及空状态提示或卡片网格。
- **文件夹卡片视图**：展示折叠切换图标、名称与简介输入、成员计数、删除操作及可滚动成员列表。
- **技能条目视图**：展示拖拽手柄图标、技能名称与「移动到」菜单触发器。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可通过 1 次点击完成全部文件夹的折叠或展开切换。
- **SC-002**: 文件夹数量为 0 时，文件夹区域展示可见的空状态说明文案。
- **SC-003**: 页面在 320px 及以上宽度下无横向滚动条，全部既有单元测试与新增交互/渲染测试 100% 通过。
- **SC-004**: 中英文字典键集完全一致且无空值。

## Assumptions

- 本次优化仅涉及客户端配置页视图、样式与字典，不改动插件配置 schema、后端路由、技能检索与目录折叠逻辑。
- 批量折叠/展开与单卡折叠同属前端临时视图状态，不持久化到配置文件。
