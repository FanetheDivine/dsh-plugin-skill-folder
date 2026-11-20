# Feature Specification: 修复配置页缺失预设提供的全局技能

**Feature Branch**: `fix/025-config-skill-list`

**Created**: 2026-11-21

**Status**: Waived

**Input**: User description: "这个插件安装以后 我本机的skill都不见了。配置页只显示少量技能，我之前的 lark、blueai 两个系列都没了。"

## Open Decisions

- [x] [D-001] 配置页技能列表的数据来源 | Depends on: none | Status: answered
  - 用宿主 `agentPresets` 取得默认 preset 的作用域，再用根注册表读取，与模型目录同源。
- [x] [D-002] preset 作用域不可用时的行为 | Depends on: D-001 | Status: answered
  - 取作用域失败时回退根作用域快照，并标记列表不完整；宿主没有 `agentPresets` 服务时根快照即全部，沿用快照的完整性。
- [x] [D-003] 列表范围如何取舍 | Depends on: D-001 | Status: answered
  - 只列模型可调用的全局技能，项目级技能不进列表。

## Clarifications

### Session 2026-11-21

- [D-000] Q: 「skill 都不见了」是在哪个位置看到的？ -> A: 插件「折叠skill」配置页；列表不是全空，只显示少量技能，原有的 lark、blueai 两个系列不出现。
- [D-000] Q: 重启之后现象是否仍在？ -> A: 尚未重启；插件是在上次重启之后才安装的。
- [D-001] Q: 配置页的技能列表从哪里读？ -> A: 用宿主 `agentPresets` 取默认 preset 作用域后读取。
- [D-002] Q: 宿主没有 `agentPresets` 服务或取作用域失败时怎么办？ -> A: 回退根作用域快照并在页面提示可能不完整。
- [D-003] Q: 配置页列表应包含哪些技能？ -> A: 只列模型可调用的全局技能。
- [D-004] Q: 是否新增自动化测试？ -> A: 不新增；回归由实机验证承担。

探索结论（已实测，宿主 `0.2.2-rc.5`，桌面 profile 安装 `dsh-plugin-skill-folder@0.1.1`）：

- 用户级技能共 62 个，位于 `~/.agents/skills`，文件完好。
- 会话里的模型目录完整，含全部 lark 与 blueai 技能；同一会话的技能摘要可正常生成。
- 配置页数据来自 `GET /api/skill-folder/skills`，路由以 `snapshot({})` 读取注册表。
- `@deepseek-ai/dsh-skill` 的 `collectFresh` 在无 `scope` 时只合并 global 层，读不到后代作用域的 provider。
- `standard` preset 自带 `skill-filesystem`，其 provider 注册在 agent 作用域，因此根层快照看不到 62 个用户级技能。
- 桌面 profile 的根层只有 `@local/local-plugins/claude-skills` 提供的少量技能，配置页因此只剩这些。
- 宿主 `dsh-api-session-controller` 的 `skills/list` 用 `agentPresets.acquireScope(preset)` 取得作用域后调用 `list({ cwd, scope })`，证明无会话时也能按 preset 作用域读取技能。

## Review Record

- 2026-11-21 | Decision: Waived | Scope: current full document | Open items: none | Risks: 不新增自动化测试，回归依赖实机人工确认

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 配置页显示会话可见的全部全局技能 (Priority: P1)

用户打开「插件 → 折叠skill → 配置」，看到自己安装的全部全局技能，能把它们分到文件夹里。

**Why this priority**: 配置页是插件唯一的操作入口；列表缺技能时分组功能整体不可用。

**Independent Test**: 在只启用 `standard` preset 的 profile 上安装插件，打开配置页，比对页面条目与会话目录中的全局技能。

**Acceptance Scenarios**:

1. **Given** 用户级技能 62 个、根层额外提供少量技能，**When** 打开配置页，**Then** 页面列出全部 62 个用户级技能，以及根层的模型可调用技能。
2. **Given** 技能名以 `lark-` 或 `blueai-` 开头，**When** 打开配置页，**Then** 这些条目出现在「未分组的技能」中。
3. **Given** 项目工作目录含 `.dsh/skills`，**When** 打开配置页，**Then** 项目级技能不进入列表。

---

### User Story 2 - 读取异常时不伪装成空列表 (Priority: P2)

宿主组合缺少 preset 服务或技能读取失败时，页面说明情况而不是显示一个空列表。

**Why this priority**: 空列表会让用户误判为技能被删除，正是本次缺陷的观感来源。

**Independent Test**: 让路由在没有 `agentPresets` 服务的宿主组合下返回结果，检查页面提示与列表内容。

**Acceptance Scenarios**:

1. **Given** 宿主没有 `agentPresets` 服务，**When** 打开配置页，**Then** 页面列出根作用域技能并提示列表可能不完整。
2. **Given** 技能读取抛错，**When** 打开配置页，**Then** 页面显示读取失败并可重试，不显示空列表当成成功。

---

### Edge Cases

- 默认 preset 名称缺失或无法获取作用域时，列表回退到根作用域。
- 根层与 preset 层出现同名技能时，列表只保留一个条目。
- 配置页在技能列表加载完成前显示加载状态。
- 会话目录中的同名项目级技能不影响全局列表。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 配置页 MUST 列出默认 agent preset 可见的、模型可调用的全局技能，包括 preset 的 `skill-filesystem` 提供的用户级技能。
- **FR-002**: 列表 MUST 排除项目级技能，保持「只作用于全局 skill」的范围。
- **FR-003**: 宿主提供 `agentPresets` 但取作用域失败时，路由 MUST 回退为根作用域快照，并把列表标记为不完整。
- **FR-004**: 技能读取失败 MUST NOT 以空列表响应，页面 MUST 显示失败状态并提供重试。
- **FR-005**: 目录折叠与 `skill_search` MUST 继续按会话作用域读取技能快照，行为不变。
- **FR-006**: 配置页保存的文件夹配置 MUST 仍作用于全局技能名，与列表来源无关。
- **FR-007**: 宿主没有 `agentPresets` 服务时，路由 MUST 使用根作用域快照，并沿用快照的完整性标记。

### Key Entities

- **全局技能**：来源于用户级技能根或宿主级 provider、可由模型调用的技能。
- **preset 作用域**：agent preset 创建的注册作用域，`skill-filesystem` 等 provider 在其中注册。
- **配置页技能列表**：配置页展示的可分组技能集合，由路由提供。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在只启用 `standard` preset 的桌面 profile 上，配置页条目数等于会话目录中的全局技能数（当前环境为 62）。
- **SC-002**: `lark-` 与 `blueai-` 开头的技能全部出现在配置页列表中。
- **SC-003**: 没有 `agentPresets` 服务的宿主组合下，配置页仍能列出根层技能并显示不完整提示。
- **SC-004**: 技能读取失败时页面出现失败提示，条目区不显示为「没有技能」。

## Assumptions

- 宿主版本为 `0.2.2-rc.5`，Web 与 Desktop 的 `standard` preset 提供 `skill-filesystem`。
- 用户级技能根为 `~/.agents/skills` 与 `~/.dsh/skills`。
- 配置页面向全局技能，项目级技能的折叠不在本次范围。
- 不新增自动化测试；回归由实机配置页人工确认。