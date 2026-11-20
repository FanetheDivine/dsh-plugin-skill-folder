# Feature Specification: 升级 DSH 宿主依赖到 0.2.2-rc.5

**Feature Branch**: `chore/021-upgrade-dsh-deps`

**Created**: 2026-11-20

**Status**: Approved

**Input**: User description: "插件的 dsh 版本升级到最新版本"

## Open Decisions

- 无

## Clarifications

### Session 2026-11-20

探索结论（代码库与文档可确认，未形成提问）：

- 当前运行宿主为 Desktop `0.2.2-rc.5`；其 `dependencies` 声明 `@deepseek-ai/cordis ~4.1.0`、`@deepseek-ai/cordis-plugin-loader ~1.1.0`、`@deepseek-ai/schemastery ~3.19.0`，与插件现有声明一致，cordis 系依赖无需改动。
- 全部 9 个 `@deepseek-ai/dsh-*` 依赖的 `0.2.2-rc.5` 已发布于 npm `next` 标签。
- 升级指南 `v0.2.2-rc.4` 仅一条（DeepSeek 模型网页搜索默认改用旧版 Messages 搜索），不涉及本插件使用的接口；`rc.4 → rc.5` 无指南。预计无代码改动。
- 现有 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 列出 9 个 `@0.2.2-rc.3` 条目，需同步替换为 `@0.2.2-rc.5`。

## Review Record

- 2026-11-20 | Decision: Approved | Scope: current full document | Open items: none | Risks: rc.4/rc.5 可能存在未记录的接口变化，由 `pnpm full-check` 回归暴露## User Scenarios & Testing *(mandatory)*

### User Story 1 - 插件与最新宿主版本对齐 (Priority: P1)

维护者把插件的全部 `@deepseek-ai/dsh-*` 开发依赖从 `0.2.2-rc.3` 升级到当前最新的 `0.2.2-rc.5`，使插件与最新发布的 DSH 宿主使用同一份接口与实例。

**Why this priority**: 宿主依赖错位是插件运行异常的直接来源，版本对齐是本次变更的全部价值。

**Independent Test**: 读取 `package.json` 与 `pnpm-workspace.yaml`，确认版本一致且通过 `pnpm install` 与 `pnpm full-check`。

**Acceptance Scenarios**:

1. **Given** 仓库检出，**When** 查看 `package.json` 的 `devDependencies`，**Then** 全部 `@deepseek-ai/dsh-*` 依赖锁定为 `0.2.2-rc.5`。
2. **Given** 干净环境，**When** 运行 `pnpm install`，**Then** 安装成功，无版本错位报错。
3. **Given** 依赖安装完成，**When** 运行 `pnpm full-check`，**Then** 类型检查、lint、测试与构建全部通过。

### User Story 2 - 版本对齐合规 (Priority: P1)

`pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 同步列出每个新版本依赖，满足宪章「宿主依赖版本」原则，`pnpm install` 不被最小发布年龄限制阻塞。

**Why this priority**: 缺失该清单时依赖无法安装，升级实际失败。

**Independent Test**: 检查 `pnpm-workspace.yaml` 条目与 `package.json` 依赖一一对应。

**Acceptance Scenarios**:

1. **Given** 更新后的 `pnpm-workspace.yaml`，**When** 对照 `package.json` 的 `@deepseek-ai/dsh-*` 依赖，**Then** 每个 `<包名>@0.2.2-rc.5` 都有对应条目。
2. **Given** cordis 系依赖声明，**When** 对照 `@deepseek-ai/dsh@0.2.2-rc.5` 的 `dependencies`，**Then** `@deepseek-ai/cordis`、`@deepseek-ai/cordis-plugin-loader`、`@deepseek-ai/schemastery` 的版本与宿主声明一致。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `package.json` 的全部 `@deepseek-ai/dsh-*` 依赖 MUST 固定到 `0.2.2-rc.5`。
- **FR-002**: cordis 系依赖的版本范围 MUST 与 `@deepseek-ai/dsh@0.2.2-rc.5` 的 `dependencies` 声明一致。
- **FR-003**: `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` MUST 列出每个 `<dsh 包名>@0.2.2-rc.5`。
- **FR-004**: 升级后 MUST 通过 `pnpm install`、`pnpm full-check`。
- **FR-005**: `dsh` 版本变更后 MUST 提醒用户在真实宿主上执行实机测试，并说明变更的版本号。
- **FR-006**: 锁文件 MUST 与新的依赖声明一致。

### Key Entities

- **依赖清单**：`package.json` 的 `devDependencies`，决定插件编译与测试使用的宿主接口版本。
- **豁免清单**：`pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`，放行 rc 版本安装。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm install` 在新声明下成功完成。
- **SC-002**: `pnpm full-check` 零失败。
- **SC-003**: 插件能在 `0.2.2-rc.5` 宿主上装载运行（实机测试）。

## Assumptions

- 「最新版本」指 npm `latest` 标签指向的 `0.2.2-rc.5`。
- `0.2.2-rc.3` 到 `0.2.2-rc.5` 的升级指南不涉及本插件使用的接口，预计无代码改动。
- 本次只升级依赖，不改插件功能。
