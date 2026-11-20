# Feature Specification: 优化插件展示与分组下拉框

**Feature Branch**: `feat/024-polish-meta-readme`

**Created**: 2026-11-20

**Status**: Approved

**Input**: User description: "1. 优化readme 需要面向用户的文本 且加上npm icon 2. 优化配置页面的ui skill切换分组的浮窗很丑 3. 改个icon 4. 改meta数据 title:折叠skill desc: 可视化地对全局skill进行分组折叠，避免会话一次性加载全部skill"

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

#### 探索结论

- 插件当前未声明图标，插件行显示宿主默认图案。
- 宿主平台模块 `@deepseek-ai/dsh-client-ui-primitives` 提供 `Menu` 下拉菜单，支持选中勾选、键盘导航、Esc 与外部点击关闭、portal 渲染。插件已把该模块作为平台模块使用。
- 插件详情页使用 README，绝对地址的图片按原地址加载。
- npm 包 `dsh-plugin-skill-folder` 已发布。

#### 决策

- [D-001] Q: README 加哪些 npm 徽章？ -> A: 只加 npm 版本徽章，链接到 npm 包页。
- [D-002] Q: README 的语言与开发内容如何处理？ -> A: 只写中文，删除开发章节。
- [D-003] Q: 「移动到」浮窗改成什么？ -> A: 复用宿主 `Menu` 组件。
- [D-004] Q: 触发按钮长什么样？ -> A: 显示当前分组名与下拉箭头。
- [D-005] Q: 插件图标画什么？ -> A: 文件夹内叠放技能卡片。
- [D-006] Q: 英文元数据怎么写？ -> A: title「Skill folding」，description「Visually group and fold global skills so a session does not load every skill at once.」
- [D-007] Q: `package.json` 的 description 是否同步？ -> A: 同步为英文描述。

## Review Record

- 2026-11-20 | Decision: Approved | Scope: current full document | Open items: none | Risks: npm 徽章依赖 shields.io 外链

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 在插件列表中认出插件 (Priority: P1)

用户在「插件」页看到本插件，通过标题、描述与图标理解它的用途。

**Why this priority**: 标题、描述与图标是用户决定是否启用的首要信息。

**Independent Test**: 在中英文界面打开插件列表与详情页，检查标题、描述与图标。

**Acceptance Scenarios**:

1. **Given** 宿主语言为中文，**When** 用户查看插件行，**Then** 标题为「折叠skill」，描述为「可视化地对全局skill进行分组折叠，避免会话一次性加载全部skill」。
2. **Given** 宿主语言为英文，**When** 用户查看插件行，**Then** 显示与中文含义一致的英文标题与描述。
3. **Given** 插件已安装，**When** 用户查看插件行与详情页，**Then** 显示本插件专属图标，浅色与深色主题下均清晰。

---

### User Story 2 - 切换技能所属分组 (Priority: P2)

用户在配置页点开技能条目的「移动到」控件，在主题一致的浮窗中选择目标文件夹或「未分组」。

**Why this priority**: 这是每个技能都会用到的高频操作，原生浮窗与宿主风格不协调。

**Independent Test**: 打开配置页，用鼠标与键盘分别把技能移入文件夹和移回未分组。

**Acceptance Scenarios**:

1. **Given** 配置可编辑，**When** 用户点开「移动到」，**Then** 浮窗与宿主主题一致，列出「未分组」与全部文件夹，并标记当前分组。
2. **Given** 浮窗已打开，**When** 用户选择一个选项，**Then** 技能移入该分组，浮窗关闭。
3. **Given** 浮窗已打开，**When** 用户按 Esc 或点击浮窗外部，**Then** 浮窗关闭，分组不变。
4. **Given** 焦点在触发按钮上，**When** 用户只用键盘操作，**Then** 可以打开浮窗、移动高亮并确认选择。

---

### User Story 3 - 阅读 README 了解用法 (Priority: P3)

用户在 npm、GitHub 或插件详情页阅读 README，了解插件能做什么、如何安装和使用。

**Why this priority**: README 是安装前的主要说明，也作为插件详情页内容。

**Independent Test**: 通读 README，检查内容面向插件用户，徽章可点击。

**Acceptance Scenarios**:

1. **Given** 用户打开 README，**When** 查看顶部，**Then** 看到 npm 版本徽章，点击进入 npm 包页。
2. **Given** 用户通读 README，**When** 按说明操作，**Then** 能完成安装、分组与保存，且无需理解内部实现。

### Edge Cases

- 没有任何文件夹时，浮窗只列出「未分组」。
- 文件夹名很长时，浮窗选项与触发按钮省略显示，完整名称可见于悬停提示。
- 配置不可编辑时，触发按钮禁用。
- 浮窗靠近视口底部或右侧时，完整显示在视口内。
- 浮窗打开时开始拖拽或页面滚动，浮窗关闭。
- 插件详情页省略原始 HTML，徽章用 Markdown 图片链接书写；网络不可用时显示替代文字。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 中文元数据 MUST 为 title「折叠skill」与 description「可视化地对全局skill进行分组折叠，避免会话一次性加载全部skill」。
- **FR-002**: 英文元数据 MUST 为 title「Skill folding」与 description「Visually group and fold global skills so a session does not load every skill at once.」
- **FR-002a**: `package.json` 的 description MUST 与英文元数据描述一致。
- **FR-003**: 插件 MUST 提供专属图标，图案为文件夹内叠放技能卡片，在插件行、详情页及浅色与深色主题下可辨认。
- **FR-004**: 「移动到」浮窗 MUST 使用宿主的下拉菜单，外观与宿主其他菜单一致。
- **FR-004a**: 触发按钮 MUST 显示当前分组名与下拉箭头，长名称省略显示。
- **FR-005**: 浮窗 MUST 列出「未分组」与全部文件夹，并标记当前分组。
- **FR-006**: 浮窗 MUST 支持鼠标选择、键盘导航、Esc 关闭与点击外部关闭。
- **FR-007**: 浮窗 MUST 完整显示在视口内，打开时不触发拖拽。
- **FR-008**: README MUST 用中文面向插件用户，覆盖功能、安装、使用与配置，省略实现细节与开发章节。
- **FR-009**: README 顶部 MUST 显示 npm 版本徽章并链接到 npm 包页。
- **FR-010**: 现有拖拽、筛选、折叠、自动分组与保存流程 MUST 保持可用。

### Key Entities

- **插件元数据**：各语言的标题与描述。
- **插件图标**：插件行与详情页显示的图片。
- **分组选项**：「未分组」与各文件夹名，含当前选中状态。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 中英文界面的插件行与详情页显示新标题、新描述与新图标，无回退到包名。
- **SC-002**: 用户能只用键盘完成一次技能分组切换。
- **SC-003**: 浅色、深色主题及 320px 宽视口下，浮窗完整可见且无溢出。
- **SC-004**: README 中安装、分组、保存三项操作均有对应说明，npm 版本徽章可点击。
- **SC-005**: `pnpm check` 全部通过。

## Assumptions

- npm 包名保持 `dsh-plugin-skill-folder`，该包已发布。
- 浮窗只改「移动到」控件，其他输入控件保持现状。
- 标题按用户原文使用「折叠skill」，中英文之间不加空格。
