# Feature Specification: Skill 文件夹折叠与可视化分组

**Feature Branch**: `feat/020-skill-search-ui`

**Created**: 2026-11-20

**Status**: Approved

**Input**: User description: "此仓库刚从模板创建而来。我希望此插件具有和 dsh-skill-search-local 同等的功能 且加上可视化的配置"；补充："从 skill 折叠这个功能决定即可，不要照搬原来插件的代码。用户配置 folder name 和简介，把所有 skill 通过拖拽的方式进行分组，也可以点击按照前缀自动分组"

**变更类别**: 模板转化

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

- [D-001] 功能基线是 `dsh-skill-search-local@0.2.0` 的 Skill 折叠能力：模型目录只显示折叠摘要，模型通过 `skill_search` 发现被折叠的 Skill，再用原生 `skill` 加载。实现独立设计，不复用原插件代码。
- [D-003] 配置入口是“插件”页的插件行配置页。当前宿主提供 `plugins.row.config` 槽位与配置表单服务。
- 宿主 `skills` 服务提供 Skill 摘要与完整性标记，摘要包含名称、描述、用途、来源、路径与调用权限。

#### 用户决策

- 术语：本规格中的「文件夹」指 Skill 分组，与项目目录无关。
- [D-002] Q: 同名 Skill 来自项目目录也一起折叠吗？ -> A: 项目级 Skill 不折叠，按普通条目逐项展示；同名的全局 Skill 不被模型发现，`skill_search` 与文件夹摘要均不包含它。
- [D-004] Q: 插件的包名与首个版本？ -> A: `dsh-plugin-skill-folder@0.1.0`。
- [D-005] Q: 是否对齐 npm 最新的 `@deepseek-ai/dsh`？ -> A: 保持 `0.2.2-rc.3`。
- [D-006] Q: 分组界面列出哪些 Skill？ -> A: 仅全局 Skill，不含项目级 Skill。
- [D-007] Q: 按前缀自动分组采用什么规则？ -> A: 前缀匹配用户文件夹名称的进入该文件夹；其余按 `-` 分段的首段前缀合并，数量 ≥ 2 才成组；文件夹名称取成员按 `-` 分段的最长公共前缀。例：`lark-doc-a`、`lark-doc-b`、`lark-sheet`、`lark-calendar` 合并为一组 `lark`；只有 `lark-doc-a`、`lark-doc-b` 时组名为 `lark-doc`；只有一个成员的首段前缀保持未分组。
- [D-008] Q: 模型如何发现文件夹内的 Skill？ -> A: `skill_search` 接受关键词，也接受文件夹名以列出其全部成员。
- [D-009] Q: 分组变更何时生效？ -> A: 点击保存后生效，拖拽与自动分组只改草稿。
- [D-010] Q: 保存新分组后已有会话的模型目录如何处理？ -> A: 只影响新会话，已有会话继续使用其原有目录。

## Review Record

- 2026-11-20 | Decision: Approved | Scope: current full document | Open items: none | Risks: 与 `dsh-skill-search-local` 同时启用时 `skill_search` 冲突，文档提示用户先停用原插件

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 用文件夹折叠模型目录（Priority: P1）

用户把 Skill 归入文件夹后，模型目录用文件夹名称与简介替代其中的 Skill，未归组的 Skill 继续逐项展示。

**Why this priority**: 折叠目录减少模型上下文占用，是插件的核心价值。

**Independent Test**: 配置两个文件夹与若干未归组 Skill，新建会话并执行 Agent 步骤，检查模型目录内容。

**Acceptance Scenarios**:

1. **Given** 文件夹包含当前可用的 Skill，**When** 生成模型目录，**Then** 目录展示文件夹名称、简介与 Skill 数量，并隐藏其中各 Skill 的条目。
2. **Given** Skill 未归入任何文件夹，**When** 生成模型目录，**Then** 该 Skill 逐项展示。
3. **Given** 文件夹中的 Skill 当前都不可用，**When** 生成模型目录，**Then** 该文件夹不出现在目录中。
4. **Given** 没有任何文件夹包含当前可用的 Skill，**When** 生成模型目录，**Then** 原生目录保持不变。
5. **Given** 用户显式调用被折叠的 Skill，**When** 执行调用，**Then** 原生加载流程照常完成。
6. **Given** 项目级 Skill 与文件夹中的全局 Skill 同名，**When** 在该项目中生成模型目录，**Then** 项目级 Skill 逐项展示，文件夹摘要的数量不计入该全局 Skill。

---

### User Story 2 - 发现并加载折叠的 Skill（Priority: P1）

Agent 根据文件夹简介判断相关性，通过 `skill_search` 找到文件夹内的 Skill，再通过原生 `skill` 加载完整指令。

**Why this priority**: 折叠后的 Skill 必须仍可被模型找到并使用。

**Independent Test**: 用关键词、准确名称与文件夹执行搜索，再加载结果中的 Skill。

**Acceptance Scenarios**:

1. **Given** Skill 已被折叠，**When** Agent 用中英文关键词或准确名称搜索，**Then** 返回按相关度排序的摘要与所属文件夹。
2. **Given** 模型目录展示了某个文件夹，**When** Agent 用该文件夹名搜索，**Then** 返回该文件夹的全部可用成员。
3. **Given** Agent 选定目标 Skill，**When** Agent 用原生 `skill` 加载，**Then** 返回完整指令。
4. **Given** Skill 只可由用户调用，**When** Agent 搜索，**Then** 该 Skill 不出现在结果中。
5. **Given** Skill 检索不完整，**When** Agent 搜索，**Then** 结果标记为不完整。
6. **Given** 项目级 Skill 与全局 Skill 同名，**When** Agent 在该项目中搜索，**Then** 结果只包含项目级 Skill，且不标记所属文件夹。

---

### User Story 3 - 拖拽分组（Priority: P1）

用户在配置页创建文件夹、填写名称与简介，再把 Skill 拖入文件夹或移回未分组区域。

**Why this priority**: 可视化分组是本插件的主要交互。

**Independent Test**: 在配置页创建、编辑和删除文件夹，拖动 Skill 到文件夹、在文件夹之间移动、移回未分组区域，保存后重新打开核对。

**Acceptance Scenarios**:

1. **Given** 用户打开配置页，**When** 页面加载完成，**Then** 展示未分组 Skill 与全部文件夹，每个 Skill 显示名称与描述。
2. **Given** 用户创建文件夹，**When** 填写名称与简介，**Then** 文件夹出现在分组区域。
3. **Given** Skill 位于任意区域，**When** 用户把它拖入另一个文件夹或未分组区域，**Then** 该 Skill 只属于目标区域。
4. **Given** 用户删除文件夹，**When** 删除完成，**Then** 其中的 Skill 回到未分组区域。
5. **Given** 文件夹名称为空或与其他文件夹重名，**When** 用户查看草稿，**Then** 对应文件夹显示错误且保存不可用。
6. **Given** 用户无法拖拽，**When** 使用键盘或文件夹选择控件，**Then** 也能完成相同的归组操作。

---

### User Story 4 - 按前缀自动分组（Priority: P2）

用户点击自动分组，插件按前缀规则为未分组 Skill 生成或补充文件夹。

**Why this priority**: 自动分组减少大量同系列 Skill 的手工拖拽。

**Independent Test**: 准备多个同前缀与无共同前缀的 Skill，点击自动分组，核对生成结果与已有分组的保留情况。

**Acceptance Scenarios**:

1. **Given** 未分组 Skill 的名称等于某个文件夹名称或以「文件夹名称-」开头，**When** 用户点击自动分组，**Then** 这些 Skill 进入该文件夹。
2. **Given** 一个 Skill 匹配多个文件夹名称，**When** 用户点击自动分组，**Then** 该 Skill 进入名称最长的那个文件夹。
3. **Given** 剩余未分组 Skill 中有两个以上的首段前缀相同，**When** 用户点击自动分组，**Then** 草稿新建一个文件夹放入这些 Skill，名称取成员按 `-` 分段的最长公共前缀，简介自动生成且可编辑。例：`lark-doc-a`、`lark-doc-b`、`lark-sheet`、`lark-calendar` 合并为一组 `lark`；只有 `lark-doc-a`、`lark-doc-b` 时组名为 `lark-doc`。
4. **Given** 某首段前缀只有一个未分组 Skill，**When** 用户点击自动分组，**Then** 该 Skill 保持未分组。
5. **Given** Skill 已在文件夹中，**When** 用户点击自动分组，**Then** 该 Skill 保持原有归属。
6. **Given** 自动分组结果不符合预期，**When** 用户放弃修改，**Then** 页面恢复当前生效配置。

---

### User Story 5 - 保存与恢复配置（Priority: P2）

用户点击保存后，分组与搜索选项持久化并应用于后续新建会话。

**Why this priority**: 可靠保存保证可视化配置能替代手工编辑配置文件。

**Independent Test**: 修改分组与搜索选项，分别验证保存、放弃、恢复默认、保存失败与重新打开后的状态。

**Acceptance Scenarios**:

1. **Given** 用户存在有效草稿，**When** 用户点击保存，**Then** 配置持久化，拖拽与自动分组在保存前不改变生效配置。
2. **Given** 用户存在未保存修改，**When** 用户放弃修改，**Then** 页面恢复当前生效配置。
3. **Given** 配置被更高层覆盖或宿主拒绝保存，**When** 页面收到结果，**Then** 当前有效配置保持不变并展示对应状态。
4. **Given** 用户已保存新分组，**When** 用户新建会话，**Then** 模型目录使用新分组；已有会话保持原有目录。

### Edge Cases

- 文件夹引用的 Skill 当前不存在时，配置页保留该引用并标记为未找到，用户可移除。
- 新安装的全局 Skill 默认位于未分组区域。
- 项目级 Skill 不出现在分组界面，在模型目录中逐项展示；同名全局 Skill 在该项目中对模型不可见。
- 搜索词为空、超过 512 个字符、只有通用搜索词或无匹配时，工具返回明确结果或受控错误。
- `limit`、`offset`、默认返回数量与摘要长度越界或类型错误时，插件拒绝该操作或配置。
- 多个结果相关度相同时按名称稳定排序，分页不会遗漏或重复结果。
- 搜索只读取 Skill 摘要元数据，不读取指令正文。
- Skill 列表加载失败或不完整时，配置页展示状态，已保存的分组保持不变。
- 用户同时启用其他提供 `skill_search` 的插件时，按冲突处理要求提示用户。

## Requirements *(mandatory)*

### Functional Requirements

#### 折叠与发现

- **FR-001**: 插件 MUST 用文件夹折叠模型目录：每个包含可用 Skill 的文件夹展示名称、简介与 Skill 数量，并隐藏其中各 Skill 的条目。
- **FR-002**: 插件 MUST 保持未归组 Skill 逐项展示，并保持原生 `skill` 工具、用户显式调用与原生目录元数据可用。
- **FR-003**: 插件 MUST 只折叠全局 Skill；项目级 Skill 逐项展示，与其同名的全局 Skill 在该项目中不出现在文件夹摘要与搜索结果中。
- **FR-004**: 插件 MUST 提供 `skill_search` 工具，按名称、用途与描述检索可由模型调用的 Skill，支持中英文关键词、准确名称、稳定排序与分页。
- **FR-005**: 搜索结果 MUST 只包含摘要元数据、所属文件夹与匹配类型，并报告检索完整性。
- **FR-006**: `skill_search` MUST 支持以文件夹名列出该文件夹的全部可用成员。
- **FR-007**: Skill 检索不完整或原生加载器不兼容时，插件 MUST 保持原生目录并明确报告搜索状态。
- **FR-008**: 插件 MUST 只对新建会话应用当前分组，已有会话保持其原有目录。

#### 可视化配置

- **FR-009**: 插件 MUST 在“插件”页的插件行详情中提供可视化分组页。
- **FR-010**: 分组页 MUST 只列出全局 Skill，并展示未分组区域与全部文件夹。
- **FR-011**: 用户 MUST 能创建、编辑与删除文件夹，文件夹包含名称与简介。
- **FR-012**: 用户 MUST 能通过拖拽把 Skill 放入文件夹、在文件夹之间移动或移回未分组区域。
- **FR-013**: 用户 MUST 能通过键盘或选择控件完成与拖拽相同的归组操作。
- **FR-014**: 自动分组 MUST 先把名称等于文件夹名称或以「文件夹名称-」开头的未分组 Skill 归入匹配最长名称的文件夹。
- **FR-015**: 自动分组 MUST 再把剩余未分组 Skill 按 `-` 分段的首段前缀合并为文件夹，成员数至少为 2；文件夹名称取成员按 `-` 分段的最长公共前缀，简介自动生成且可编辑。
- **FR-016**: 自动分组 MUST 保留已在文件夹中的 Skill 归属。
- **FR-017**: 分组页 MUST 支持编辑默认返回数量与摘要长度。
- **FR-018**: 分组页 MUST 校验文件夹名称非空且唯一、数值在允许范围内，并定位无效项。
- **FR-019**: 分组页 MUST 支持保存、放弃修改与恢复默认。
- **FR-020**: 配置保存成功后 MUST 持久化；拖拽、自动分组与编辑在保存前只改草稿。
- **FR-021**: 配置保存失败时 MUST 保留当前有效配置与用户草稿，并展示失败状态。

#### 交付

- **FR-022**: 插件面向用户的界面与插件元数据 MUST 提供中文和英文内容。
- **FR-023**: 模板转化 MUST 更新项目宪章、项目说明、包标识、插件清单与用户文档，并移除模板示例能力。
- **FR-024**: 用户文档 MUST 说明安装、分组、自动分组、搜索与加载流程，以及与其他 `skill_search` 提供者的冲突处理。

### Key Entities *(include if feature involves data)*

- **Skill**: 宿主 Skill 注册表中的能力单元，包含名称、描述、用途、提供者、来源、路径与调用权限。
- **文件夹**: 用户定义的 Skill 分组，包含名称、简介与成员 Skill 名称列表。一个 Skill 最多属于一个文件夹。
- **模型目录**: 发送给模型的 Skill 列表，包含未分组 Skill 条目与文件夹摘要。
- **插件配置**: 文件夹列表、默认返回数量与摘要长度，区分生效值与界面草稿。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 对测试 Skill 集合，模型目录中已归组 Skill 的条目 100% 被文件夹摘要替代，未归组 Skill 100% 逐项展示。
- **SC-002**: 被折叠的每个可由模型调用的 Skill 都能通过 `skill_search` 找到，并能用原生 `skill` 加载。
- **SC-003**: 用户可在一次配置页会话中完成文件夹创建、拖拽分组、自动分组与保存，无需手工编辑配置文件。
- **SC-004**: 包含 20 个以上同首段前缀 Skill 的列表，一次自动分组即可合并为一个文件夹。
- **SC-005**: 有效配置保存后重新打开页面，文件夹、成员与选项 100% 一致。
- **SC-006**: 无效配置均被阻止保存并显示可定位到具体文件夹或字段的反馈，当前有效配置保持不变。

## Assumptions

- 文件夹以 Skill 名称记录成员，Skill 名称在宿主内唯一标识一个可加载的 Skill。
- 配置页使用宿主已有的配置持久化能力与 `plugins.row.config` 入口。
- 新插件不自动修改其他插件的启用状态。
- 依赖保持 `@deepseek-ai/dsh` 系 `0.2.2-rc.3`。
