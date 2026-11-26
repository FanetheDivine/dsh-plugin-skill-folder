# Quickstart: 验证折叠目录重复注入修复

**Feature**: `fix/029-catalog-dedup` | **Date**: 2026-11-26

## 前置

- 在 worktree `worktrees/029-catalog-dedup`（分支 `fix/029-catalog-dedup`）内操作。
- `pnpm install` 已完成。

## 1. 单元测试

```sh
pnpm test:code --reporter=minimal --silent=passed-only
```

预期：

- `tests/catalog.test.ts` 新用例通过：正文相同丢弃、正文变化注入、原生最后一条按首次注入、已呈现缺失按首次注入、没有条目被折叠时不介入。
- `tests/plugin.test.ts` 新用例通过：pre-step 在 `presented` 相同时把目录消息移出列表、读取失败时照常注入并记 warn。
- 既有用例不变。

## 2. 静态检查与构建

```sh
pnpm format && pnpm check && pnpm build
```

预期：零错误；`dist/index.mjs` 更新；`pnpm test:dist` 通过。

## 3. 实机连续多轮

按 `.dsh/skills/real-device-test/SKILL.md` 搭建隔离 profile，并注册一个测试专用的「抖动技能 provider」：其 `list()` 交替返回完整与不完整观测，使宿主目录指纹在轮次之间变化（等价于本次会话观察到的现象）。

驱动连续 5 轮以上对话后，从会话落盘记录与请求记录断言：

| 断言 | 期望 | 依据 |
| --- | --- | --- |
| `skill-catalog` 事件条数 | 1 | 会话 `snapshotEvents()` 过滤 `source.kind` |
| 模型请求里的折叠目录块 | 1 | 请求消息列表 |
| `The available skill catalog changed.` 出现次数 | 0 | 折叠文本首句 |
| 目录真变化后（新增技能） | 出现 1 次更新，其后不再重复 | 同上 |

修复前的对照：同一驱动脚本下每轮新增 1 条目录事件，多轮后事件条数等于轮数。

## 4. 回归确认

- 未配置文件夹的会话：目录保持原生文本，无 `foldedBy`。
- 本 Agent 看不到 `skill_search` 的会话：目录保持原生。
- 模板：`docs/how-it-works.md` 的目录改写规则与 `docs/known-risks.md` 的新条目已更新。

## 相关文件

| 文件 | 作用 |
| --- | --- |
| `src/catalog.ts` | 正文渲染与判定 |
| `src/index.ts` | pre-step 读取会话可见记录 |
| `tests/support/plugin-ctx.ts` | ctx 模拟提供「已呈现正文」 |
| `docs/how-it-works.md` | 目录改写规则 |
| `docs/known-risks.md` | 宿主内部面与目录抖动 |
