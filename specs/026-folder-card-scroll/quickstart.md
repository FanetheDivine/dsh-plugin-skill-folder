# Quickstart: 验证文件夹卡片限高与成员区滚动

**Created**: 2026-11-24 | **Host**: `@deepseek-ai/dsh` `0.2.2-rc.5`

## 前置

```sh
pnpm i && pnpm build        # 产出 dist，供宿主加载
```

## 自动化检查

```sh
pnpm check
```

预期：`tests/client.test.ts` 中新增用例通过，覆盖：

1. `folderCardStyle` 的 `maxHeight` 等于 500，`padding` 为 0，`overflow` 为 `hidden`。
2. `memberScrollStyle` 的 `overflowY` 为 `auto`，无 `padding`，`minHeight` 为 0。
3. `memberBodyStyle` 的水平内边距为 14px，条目与标题行左对齐。
4. 渲染结果里文件夹卡片带 `max-height:500px`，成员区带 `overflow-y:auto`。
5. 「未分组的技能」区域不带限高与 `overflow-y:auto`。

## 实机验证

```sh
bash .dsh/skills/real-device-test/scripts/setup-env.sh <仓库绝对路径> rdt-026-scroll
```

启动 GUI 后进入「插件 → 折叠skill → 配置」。

| 检查项 | 预期 |
| --- | --- |
| 点「按前缀自动分组」生成成员较多的文件夹 | 卡片高度停在 500px，成员区出现纵向滚动条 |
| 滚动成员区 | 标题、简介、成员计数与删除按钮不动 |
| 滚动条位置 | 紧贴卡片右侧内边缘，条目与滚动条之间保留内缩 |
| 成员数 1–3 的文件夹 | 卡片按内容高度显示，无滚动条 |
| 收起文件夹 | 卡片只剩标题行 |
| 滚动到成员区底部后继续滚轮 | 整页继续滚动，卡片外不出现第二条滚动条 |
| 键盘 Tab 遍历长文件夹成员 | 每个获焦条目滚入视野 |
| 拖拽技能到长文件夹 | 放置高亮可见，成员区可继续滚动 |

## 清理

```sh
# 关闭测试 GUI 后
rm -rf <profile 目录>
```
