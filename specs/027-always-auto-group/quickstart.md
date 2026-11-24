# Quickstart: 始终分组

## 前置

- Node ≥ 24.9，pnpm 11。
- 在 worktree 根目录执行 `pnpm install`。

## 检查

```sh
pnpm format
pnpm check
pnpm build
```

## 单元验证

```sh
pnpm test:code
```

重点用例：

- `tests/config.test.ts`：`alwaysGroup` 默认 false；布尔值通过；非法值报错。
- `tests/plugin.test.ts`：开关开启时 `skills/change` 写入分组；关闭时不写；无变化不写；写入失败保持原分组；开启瞬间执行一次。
- `tests/folder-form.test.ts`：草稿 `'true'` / `'false'` 的解析与格式化。
- `tests/client.test.ts`：页面渲染勾选框，勾选后草稿更新。

## 实机验证

1. 安装插件并按 [development.md](../../docs/development.md) 的实机流程启动宿主。
2. 打开「插件 → 折叠skill → 配置」，确认「按前缀自动分组」右侧出现「始终分组」。
3. 勾选并保存；现有未分组技能立即归组。
4. 新增两个同前缀技能后重新打开配置页，确认它们进入对应文件夹。
5. 取消勾选并保存；再新增技能，确认不再自动分组。
6. 检查 profile 的 `cordis.patch.yml`：`alwaysGroup: true` 与新的 `folders` 已写入。
