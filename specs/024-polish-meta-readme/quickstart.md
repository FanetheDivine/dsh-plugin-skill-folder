# Quickstart: 优化插件展示与分组下拉框

## 自动校验

```sh
pnpm format && pnpm check
pnpm build
```

预期：全部通过，打包列表含 `icon.svg`。

## 实机验证

1. 构建后在 DSH 中刷新「插件」页。
2. 中文界面插件行显示「折叠skill」、新描述与新图标；切换英文显示「Skill folding」。
3. 打开本插件配置页，点技能条目右侧的分组按钮，菜单与宿主风格一致，当前分组带勾选。
4. 用方向键与 Enter 选择另一个文件夹，技能移动且菜单关闭；Esc 与点击外部关闭菜单。
5. 详情页 README 顶部显示 npm 版本徽章。
