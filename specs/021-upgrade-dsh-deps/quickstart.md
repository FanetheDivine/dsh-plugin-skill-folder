# Quickstart: 升级 DSH 宿主依赖到 0.2.2-rc.5

## 前置条件

- Node >= 24.9.0，启用 corepack 的 pnpm（`packageManager: pnpm@11.7.0`）。
- 分支 `chore/021-upgrade-dsh-deps` 的 worktree。

## 验证步骤

1. `pnpm install` — 安装成功，无 minimumReleaseAge 阻塞，无版本错位报错。
2. `pnpm full-check` — typecheck、lint、`test:code`、构建、`test:dist` 全部通过。
3. `pnpm format && pnpm check` — 质量门禁通过。

## 预期结果

- `package.json` 中 9 个 `@deepseek-ai/dsh-*` 依赖均为 `0.2.2-rc.5`。
- `pnpm-workspace.yaml` 的豁免清单均为 `<包名>@0.2.2-rc.5`。
- 全部检查零失败。

## 实机验证（宪章原则 II）

依赖升级后提醒用户在真实 DSH 宿主上装载插件做端到端验证，说明变更版本：`0.2.2-rc.3 → 0.2.2-rc.5`。
