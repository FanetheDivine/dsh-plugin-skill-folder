# Feature Specification: 修复实机测试脚本的 preset 会话配置

**Feature Branch**: `fix/022-skill-catalog-missing`

**Created**: 2026-11-20

**Status**: Approved

**Input**: User description: "此插件会导致skill块完全没注入会话消息中"

## Open Decisions

- [x] [D-001] 缺陷的复现条件 | Depends on: none | Status: answered
- [x] [D-002] 「skill 块」指哪一块 | Depends on: none | Status: answered
- [x] [D-003] 原生目录缺失时插件的职责 | Depends on: D-001, D-002 | Status: answered
- [x] [D-004] 已发布目录的既有会话是否补写 | Depends on: D-002 | Status: answered
- [x] [D-005] 从旧插件迁移的会话与配置 | Depends on: D-003 | Status: answered
- [x] [D-006] 实机驱动会话是否统一挂 `standard` preset | Depends on: none | Status: answered
- [x] [D-007] 是否在插件内检测并警告 profile 配置冲突 | Depends on: D-003 | Status: answered

## Clarifications

### Session 2026-11-20

- [D-001] Q: 在哪个环境观察到缺失，缺失出现在哪些会话？ -> A: 实机测试的 web profile，所有新会话。
- [D-002] Q: 缺的是哪一块？ -> A: GUI「轨迹」里完全没有技能目录说明；停用插件后全局技能同样看不到。
- [D-003] Q: 原生目录缺失时插件应该怎么做？ -> A: 维持现状，插件不自造目录；通过文档与警告说明依赖。
- [D-004] Q: 既有会话是否补写折叠目录？ -> A: 不处理，历史会话保持原样。
- [D-005] Q: 迁移场景如何兼容？ -> A: 不处理，迁移不在本次范围。
- [D-006] Q: 实机驱动会话是否统一挂 `standard` preset？ -> A: 是，驱动会话形态与真实 GUI 会话一致。
- [D-008] Q: profile 以什么为底本？ -> A: 宿主官方的 web 默认 profile，不带任何用户配置；在其上安装插件。
- [D-007] Q: 是否在插件内检测并警告 profile 配置冲突？ -> A: 否，插件不承担 profile 配置检查。

探索结论（已实测，宿主 `0.2.2-rc.5`）：

- GUI 会话使用 `standard` agent preset，preset 自带 `tool-skill` 与 `skill-filesystem` 实例。
- 根作用域同时启用 `tool-skill` 时，根实例的目录监听把 agent 的 `skill` 工具与自己的工具对象比较，判断为不同实例，得出「本 Agent 没有技能」，并删除 preset 实例刚加入的目录消息。会话因此没有 `source.kind === 'skill-catalog'` 消息。
- 用同一 profile 实测：根 `tool-skill` 启用 + preset → 无目录消息；根 `tool-skill` 停用 + preset → 有目录消息；再配置文件夹 → `<skill_folders>` 出现且 `source.foldedBy` 为 `dsh-plugin-skill-folder`。
- 无 preset 的驱动会话（`app.agents.create`）不受影响，所以既有后端用例全绿，掩盖了该冲突。
- web 模板默认停用根 `tool-skill`，正是为了由 preset 提供技能工具；实机脚本把它打开才触发冲突。

## Review Record

- 2026-11-20 | Decision: Approved | Scope: current full document | Open items: none | Risks: 宿主 preset 实现变化时新增用例的定位可能失效
- 2026-11-20 | Decision: Approved | Scope: FR-002 改为以官方 web 默认 profile 为底本（用户要求） | Open items: none | Risks: 官方模板升级后 preset 名称或默认技能来源可能变化

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 实机 GUI 会话保留技能目录 (Priority: P1)

维护者用实机脚本搭建 profile 并在 GUI 里对话，会话「轨迹」能看到技能目录，插件按现有规则折叠。

**Why this priority**: 实机环境与真实用户环境一致才能发现宿主配置冲突；当前脚本搭出的 GUI 会话必然没有目录。

**Independent Test**: 用脚本搭建 profile、启动 GUI、新建会话发一条消息，检查请求里含 `<available_skills>`。

**Acceptance Scenarios**:

1. **Given** 实机脚本搭建的 profile，**When** 在 GUI 新建会话并发送消息，**Then** 请求含 `<available_skills>`。
2. **Given** 同一 profile 配置了文件夹，**When** 发送消息，**Then** 请求含 `<skill_folders>`，折叠成员不在 `<available_skills>` 中。

---

### User Story 2 - 驱动会话与真实会话同形 (Priority: P1)

后端用例创建的会话挂 `standard` preset，技能工具、技能来源与目录消息都由 preset 提供，与 GUI 会话一致。

**Why this priority**: 驱动会话的形态偏差是本次缺陷漏检的直接原因。

**Independent Test**: 运行后端用例，全部通过，且用例中断言了目录消息存在。

**Acceptance Scenarios**:

1. **Given** 驱动脚本，**When** 创建会话，**Then** 会话挂 `standard` preset，`skill` 工具来自 preset。
2. **Given** 驱动会话，**When** 发送消息，**Then** 会话事件中存在 `source.kind === 'skill-catalog'` 的消息。

---

### User Story 3 - 冲突不再复发 (Priority: P2)

新增用例守住「preset 会话必须有目录消息」，并在文档记录该宿主行为。

**Why this priority**: 同类配置错误只要脚本改回去就会重现，需要断言与文档双保险。

**Independent Test**: 把根作用域 `tool-skill` 重新启用后运行用例，新用例必须失败。

**Acceptance Scenarios**:

1. **Given** 实机脚本生成的 profile，**When** 运行后端用例，**Then** 存在一条断言 preset 会话带目录消息的用例。
2. **Given** 文档，**When** 查阅已知风险，**Then** 能找到根作用域技能插件与 agent preset 冲突的说明与处理方式。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 实机脚本创建的 profile MUST 不在根作用域启用 `tool-skill`。
- **FR-002**: 实机脚本 MUST 用宿主官方的 web 默认 profile 作为底本，不覆写技能相关插件；技能工具与技能来源由该底本的 agent preset 提供。
- **FR-003**: 后端驱动创建会话时 MUST 挂 `standard` preset，与 GUI 会话同形。
- **FR-004**: 后端用例 MUST 断言 preset 会话的请求或会话事件包含目录消息。
- **FR-005**: 用例 MUST 在根作用域启用 `tool-skill` 时失败，以暴露配置回退。
- **FR-006**: `docs/known-risks.md` MUST 记录该冲突的现象、原因与处理方式。
- **FR-007**: 用例说明文档 MUST 与新增用例一致。

### Key Entities

- **实机 profile**：`setup-env.sh` 生成的隔离 profile，含补丁配置、驱动脚本与测试工作区。
- **agent preset**：`standard` preset 提供的 Agent 插件组合，含技能工具与技能来源。
- **技能目录消息**：`source.kind === 'skill-catalog'` 的会话消息。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 脚本搭建的 profile 上，GUI 首轮请求含目录消息。
- **SC-002**: 后端用例全部通过，且包含一条 preset 目录断言用例。
- **SC-003**: 把根 `tool-skill` 改回启用后，该用例失败。
- **SC-004**: 已知风险文档新增一条冲突说明。

## Assumptions

- 宿主版本为 `0.2.2-rc.5`，web 模板默认停用根 `tool-skill`。
- 实机脚本只服务本仓库维护者，不进入发布包。
