# Research: 升级 DSH 宿主依赖到 0.2.2-rc.5

## R-001 目标版本

**Decision**: 全部 `@deepseek-ai/dsh-*` 依赖固定 `0.2.2-rc.5`。

**Rationale**: npm 上 `@deepseek-ai/dsh` 的 `latest` 与 `next` 标签均为 `0.2.2-rc.5`；当前运行的 Desktop 宿主即 `0.2.2-rc.5`。9 个子包（dsh-agent、dsh-client-locale、dsh-client-store、dsh-client-ui-plugin-manager、dsh-client-ui-primitives、dsh-client-ui-renderer、dsh-client-ui-settings、dsh-client-ui-slots、dsh-tools）的 `0.2.2-rc.5` 均已发布于 `next` 标签。

**Alternatives Considered**: 保留 `0.2.2-rc.3`（与运行宿主错位，违反宪章原则 I）。

## R-002 cordis 系依赖

**Decision**: 不改动。

**Rationale**: 宿主 `@deepseek-ai/dsh@0.2.2-rc.5` 的 `dependencies` 声明 `@deepseek-ai/cordis ~4.1.0`、`@deepseek-ai/cordis-plugin-loader ~1.1.0`、`@deepseek-ai/schemastery ~3.19.0`，与插件现有声明完全一致。

## R-003 升级指南

**Decision**: 无需迁移代码。

**Rationale**: 已安装版本的 `docs/upgrade-guide` 索引中，`v0.2.2-rc.4` 仅一条指南（DeepSeek 模型网页搜索默认改用旧版 Messages 搜索），不影响本插件使用的任何接口；`v0.2.2-rc.5` 无指南条目，即 rc.4 → rc.5 无破坏。

## R-004 最小发布年龄豁免

**Decision**: `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 逐包替换为 `<包名>@0.2.2-rc.5`。

**Rationale**: 宪章原则 I 要求每个 `dsh-*` 依赖按 `<包名>@<版本>` 列入豁免清单，否则 `pnpm install` 因 rc 版本发布年龄被阻塞。

## R-005 验证方式

**Decision**: `pnpm install` 后运行 `pnpm full-check`（typecheck + lint + test:code + build + test:dist）；完成后按宪章原则 II 提醒用户实机测试。

**Alternatives Considered**: 仅 `pnpm install`（不验证类型与构建，不充分）。
