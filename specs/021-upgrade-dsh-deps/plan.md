# Implementation Plan: 升级 DSH 宿主依赖到 0.2.2-rc.5

**Branch**: `chore/021-upgrade-dsh-deps` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-upgrade-dsh-deps/spec.md`

**Status**: Approved

## Open Decisions

- 无

## Clarifications

### Session 2026-11-20

- 全部实现事实由探索解决，未形成提问（见 research.md）。

## Review Record

- 2026-11-20 | Decision: Approved | Scope: current full document | Open items: none | Risks: rc.4/rc.5 未记录接口变化由 `full-check` 回归暴露

## Summary

把 9 个 `@deepseek-ai/dsh-*` 开发依赖从 `0.2.2-rc.3` 固定到 `0.2.2-rc.5`，同步替换 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`，重新生成锁文件，用 `pnpm install` 与 `pnpm full-check` 验收。预计无代码与文档改动。

## Technical Context

**Language/Version**: TypeScript 5.x（宿主依赖 `0.2.2-rc.5`，Node >= 24.9.0）

**Primary Dependencies**: `@deepseek-ai/dsh-*` 9 个包、`@deepseek-ai/cordis ~4.1.0`、`@deepseek-ai/cordis-plugin-loader ~1.1.0`、`@deepseek-ai/schemastery ~3.19.0`

**Storage**: N/A

**Testing**: vitest（`test:code`、`test:dist`）+ biome + `tsc --noEmit`

**Target Platform**: DSH 宿主插件（desktop/web）

**Performance Goals**: N/A

**Constraints**: 全部 `dsh-*` 依赖同版本固定；cordis 系版本范围与宿主声明一致

**Scale/Scope**: 改动 2 个文件（`package.json`、`pnpm-workspace.yaml`）+ 锁文件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 |
| --- | --- |
| I. 宿主依赖版本 | 通过：9 个 `dsh-*` 依赖统一固定 `0.2.2-rc.5`；cordis 系与宿主 `0.2.2-rc.5` 的 `dependencies` 声明一致（无需改动）；`minimumReleaseAgeExclude` 逐包更新 |
| II. 测试同步 | 通过：无代码变更，现有测试随 `full-check` 回归；完成后提醒用户实机测试并说明版本号 |
| III. 文档结构 | 通过：无用户可见行为、机制或流程变化，文档不改；CHANGELOG 按 push/merge 规则在收尾阶段增加 |
| IV. 质量门禁 | 通过：阶段完成后运行 `pnpm format && pnpm check` |
| V. 公开引用 | 通过：不新增任何路径或 URL |

## Project Structure

### Documentation (this feature)

```text
specs/021-upgrade-dsh-deps/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
package.json            # devDependencies 版本固定
pnpm-workspace.yaml     # minimumReleaseAgeExclude 版本替换
pnpm-lock.yaml          # pnpm install 重新生成
```

**Structure Decision**: 纯配置变更，无新增目录。`data-model.md` 与 `contracts/` 不适用，跳过。

## Complexity Tracking

> 无偏离。
