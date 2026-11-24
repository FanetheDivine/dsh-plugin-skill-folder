# Tasks: 始终分组

**Input**: Design documents from `/specs/027-always-auto-group/`

**Prerequisites**: plan.md、research.md、data-model.md、quickstart.md、spec.md

**Tests**: 每个阶段包含与代码同步的测试；阶段完成即一个 commit。

## Phase 1: 配置字段与共用分组模块

- [x] T001 把 `src/client/auto-group.ts` 移到 `src/auto-group.ts`，更新 `src/client/folder-page.tsx`、`tests/auto-group.test.ts`、`tests/client.test.ts` 的引用与 `docs/development.md`、`docs/how-it-works.md` 的文件地图
- [x] T002 [P] `src/config.ts` 增加 `alwaysGroup`：schema 默认 false 并 volatile、`PluginConfig`、`DEFAULT_CONFIG`、`CONFIG_KEYS` 与布尔校验
- [x] T003 [P] `src/auto-group.ts` 增加 `sameFolders`：按名称、简介、成员逐项比较
- [x] T004 `tests/config.test.ts` 覆盖默认值、布尔通过、非法值报错；`tests/auto-group.test.ts` 覆盖 `sameFolders`

## Phase 2: 宿主侧自动分组

- [x] T005 扩展 `tests/support/plugin-ctx.ts`：`fiber.entry`、`get('configEditor')` 与等待监听返回的 `_emit`
- [x] T006 `src/index.ts`：订阅 `skills/change`；`alwaysGroup` 由 false 变 true 时执行一次；串行执行并把执行期间的通知合并；结果有变化才调用 `configEditor.edit` 写 `folders`；读取或写入失败记录警告并保持原分组
- [x] T007 `tests/plugin.test.ts` 覆盖：开启时变化写入、关闭时不写、无变化不写、失败保持原分组、开启瞬间执行、监听注册

## Phase 3: 配置页开关

- [x] T008 `src/client/folder-form.ts`：`FolderFields` 与 `FolderFormState` 增加 `alwaysGroup`，字段草稿 `'true'` / `'false'`，`'false'` 清除
- [x] T009 `src/client/folder-page.tsx`：按钮右侧渲染 `Checkbox`，标签与说明取自字典；`src/client/locales.ts` 增加中英文案
- [x] T010 `tests/folder-form.test.ts` 与 `tests/client.test.ts` 覆盖字段解析、页面渲染与勾选写入

## Phase 4: 文档与门禁

- [x] T011 更新 `README.md`、`docs/how-it-works.md`、`docs/known-risks.md`、`docs/development.md` 与 `CHANGELOG.md`
- [x] T012 运行 `pnpm format && pnpm check && pnpm build`

## Dependencies

- Phase 1 完成后进入 Phase 2、Phase 3。
- T005 先于 T006、T007；T008 先于 T009、T010。

## Parallel

- T002 与 T003 可并行。
- Phase 3 可在 Phase 2 进行时并行，二者只共享 Phase 1 的产物。
