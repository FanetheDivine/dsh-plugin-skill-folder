# Implementation Plan: 修复实机测试脚本的 preset 会话配置

**Branch**: `fix/022-skill-catalog-missing` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/022-skill-catalog-missing/spec.md`

**Status**: Approved

## Open Decisions

- [x] [D-101] 新用例的编号与位置 | Depends on: none | Status: answered
- [x] [D-102] 是否为实机脚本增加单元测试 | Depends on: none | Status: answered
- [x] [D-103] 宿主缺少 `agentPresets` 服务时驱动的行为 | Depends on: none | Status: answered
- [x] [D-104] 驱动会话是否同时安装 modelSelection | Depends on: none | Status: answered
- [x] [D-105] 文档落点 | Depends on: none | Status: answered
- [x] [D-106] profile 底本 | Depends on: none | Status: answered

## Clarifications

### Session 2026-11-20

- 规格阶段结论：根作用域 `tool-skill` 与 `standard` preset 冲突会让 preset 会话丢失技能目录消息；驱动会话未挂 preset 所以用例全绿。
- 原型验证：`app.get('agentPresets').resolve('standard')` + `agents.create({ setup })` 挂载后，会话有目录消息；配置文件夹后 `foldedBy` 为 `dsh-plugin-skill-folder`。
- [D-101] 新增 `B0`，在 A1 之后、B1 之前执行；断言请求携带 preset 提供的 `skill` 工具、会话存在 `skill-catalog` 消息、请求含 `<available_skills>`。
- [D-102] 新增 `tests/rdt-scripts.test.ts`，静态校验脚本不覆写技能插件、驱动挂 preset、用例表含 `B0`。
- [D-103] 找不到 `agentPresets` 服务时报错终止，提示宿主版本不匹配。
- [D-104] 驱动会话先 `installModelSelection` 再 `presets.mount`，与宿主 `composeAgent` 一致。
- [D-105] 三处都写：`docs/known-risks.md`、skill 的 `pitfalls.md`、`SKILL.md`。
- [D-106] 以宿主官方 web 默认 profile 为底本（`--from-default-profile web`），不覆写任何技能插件，在其上以链接方式安装插件并叠加 mock、会话目录与 HMR 隔离项。

## Review Record

- 2026-11-20 | Decision: Approved | Scope: current full document | Open items: none | Risks: 官方 web 模板升级后 preset 名称或默认技能来源可能变化；静态守卫测试依赖脚本文本

## Summary

实机脚本搭出的 profile 在根作用域启用了 `tool-skill`，与 GUI 会话使用的 `standard` preset 冲突，导致 preset 会话没有任何技能目录消息；驱动会话不挂 preset，所以既有用例全绿。改动让脚本以官方 web 默认 profile 为底本、不再覆写技能插件，驱动会话挂 `standard` preset，并新增 `B0` 用例守住该形态。插件代码不变。

## Technical Context

**Language/Version**: Node.js 24 ESM（`run-test.mjs`）、bash（`setup-env.sh`）

**Primary Dependencies**: 宿主 `@deepseek-ai/dsh` `0.2.2-rc.5` 的 `runProfile`、`agentPresets`、`agents.create({ setup })`、`@deepseek-ai/dsh-agent` 的 `installModelSelection`

**Storage**: profile 目录，会话落盘 `test-sessions`

**Testing**: 实机后端用例 `node run-test.mjs`；仓库门禁 `pnpm format && pnpm check`

**Target Platform**: 开发机 Windows + 全局 `dsh 0.2.2-rc.5`

**Project Type**: 插件仓库内的实机测试脚本

**Constraints**: 脚本不进发布包；只引用仓库内路径与占位符（宪章原则 V）

**Scale/Scope**: 2 个脚本、3 处文档、1 个测试文件

## Constitution Check

| 原则 | 结论 | 依据 |
| --- | --- | --- |
| I. 宿主依赖版本 | PASS | 不改依赖；宿主版本由 `package.json` 的 `dsh-agent` 决定 |
| II. 测试同步 | PASS | 新增 `B0` 实机用例与 `tests/rdt-scripts.test.ts` 静态守卫 |
| III. 文档结构 | PASS | 风险归 `known-risks.md`，诊断归 `pitfalls.md`，流程归 `SKILL.md`，互不复述 |
| IV. 质量门禁 | PASS | 提交前运行 `pnpm format && pnpm check` |
| V. 公开引用 | PASS | 不新增本机绝对路径；profile 路径由参数与 `$HOME` 推导 |

复审结论：设计未引入新偏离，五条原则全部通过。

## Project Structure

### Documentation (this feature)

```text
specs/022-skill-catalog-missing/
├── plan.md
├── research.md
├── quickstart.md
└── spec.md
```

### Source (repository root)

```text
.dsh/skills/real-device-test/
├── SKILL.md                        # 阶段 1 说明与用例表
├── references/pitfalls.md          # 症状与处理
└── scripts/
    ├── setup-env.sh                # 去掉技能插件覆写
    └── run-test.mjs                # preset 会话 + B0 用例
docs/known-risks.md                 # preset 冲突风险
tests/rdt-scripts.test.ts           # 脚本静态守卫
```

## Phases

| 阶段 | 内容 | 提交 |
| --- | --- | --- |
| 1 | `setup-env.sh` 以官方 web 默认 profile 为底本，去掉 `tool-skill`/`skill-filesystem` 覆写 | 1 |
| 2 | `run-test.mjs` 挂 `standard` preset，新增 `B0` 用例 | 1 |
| 3 | 文档三处与静态守卫测试 | 1 |

## Complexity Tracking

无偏离宪章的复杂度。
