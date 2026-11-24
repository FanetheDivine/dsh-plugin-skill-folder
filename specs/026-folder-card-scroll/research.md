# 研究结论：文件夹卡片限高与成员区滚动

**Created**: 2026-11-24 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## R1 卡片整体限高的实现方式

**Decision**: 卡片设 `max-height: 500px` 与 `overflow: hidden`，成员区 `flex: 0 1 auto; min-height: 0; overflow-y: auto`，其余子项 `flex-shrink: 0`。

**Rationale**: 内容少时卡片按内容高度显示，内容多时成员区收缩到剩余高度并滚动。`min-height: 0` 是 flex 子项能够收缩到内容以下的前提。

**Alternatives Considered**:

- `height: 500px` 固定高度：短文件夹留白，违反 SC-002。
- 只在成员区写 `max-height: calc(500px - 标题高度)`：标题高度随错误提示与折行变化，常量会失真。

## R2 滚动条贴住卡片内边缘

**Decision**: 卡片自身 `padding: 0`；标题行、错误提示与简介放进内层容器，内层 `padding: 14px`；成员区滚动容器 `padding: 0`；条目的 14px 内缩由滚动容器内层承担。

**Rationale**: 滚动条绘制在滚动容器的内容盒边缘。滚动容器一旦有内边距，滚动条与卡片边框之间就会出现这段内边距。把内缩下放到内层后，滚动条贴住卡片内边缘，条目与标题行左对齐。

**Alternatives Considered**:

- 保留卡片内边距，用 `margin: 0 -14px` 把滚动容器拉宽：依赖固定内边距数值，卡片改动后容易错位；负边距在窄屏可能产生横向溢出。
- 用 `padding-right` 给滚动条让位：滚动条仍在卡片内边距之内，达不到贴边效果。

## R3 滚动条着色

**Decision**: 用 `scrollbarStyleText` 注入 `::-webkit-scrollbar` 规则，Chromium 显示 8px 圆角滑块、透明轨道，滑块取 `--dsw-alias-label-secondary`；再用 `@supports not selector(::-webkit-scrollbar)` 为其他引擎补 `scrollbar-width: thin` 与 `scrollbar-color`。

**Rationale**: 实机（Windows 11，Chrome）量得：`scrollbar-width` + `scrollbar-color` 得到 10px 带箭头的系统滚动条，`::-webkit-scrollbar` 得到 8px 无箭头的细滚动条。Chrome 对 `selector(::-webkit-scrollbar)` 返回 true，因此标准属性只在 Firefox 等不支持自定义伪元素的引擎生效。内联 `scrollbar-width` 会让 Chromium 改用系统滚动条，所以它只写在 `@supports` 分支里。

**Alternatives Considered**:

- 只用标准属性：Chromium 回退到 10px 带箭头的系统滚动条。
- 只用 `::-webkit-scrollbar`：Firefox 使用未着色的系统滚动条。

## R4 折叠与筛选

**Decision**: 折叠沿用 `display: none` 隐藏成员区；筛选改变成员数量时无需额外逻辑，卡片高度随内容回落。

**Rationale**: 现有折叠实现已隐藏成员区；`max-height` 只在内容溢出时生效。

## R5 未分组区域

**Decision**: 「未分组的技能」继续使用 `cardStyle` 与 `chipListStyle`，不继承限高。

**Rationale**: 用户只要求文件夹卡片限高；未分组区域成员过多时由整页滚动承担。

## R6 测试策略

**Decision**: 在 `tests/client.test.ts` 断言 `folderCardStyle`、`memberScrollStyle`、`memberBodyStyle` 的关键属性，并断言渲染结果中文件夹卡片带限高、成员区带 `overflow-y:auto`、未分组区域不带。

**Rationale**: 静态渲染能验证结构与关键样式，滚动、拖拽与焦点行为交给实机。

**Alternatives Considered**:

- 只用快照：样式改动时噪声大，无法表达验收条件。
- 引入浏览器测试框架：仓库现有测试全部为静态渲染，新增运行环境成本高。

## R7 实机验证

**Decision**: 用 `real-device-test` 的浏览器脚本打开配置页，按前缀自动分组生成成员较多的文件夹，量取卡片高度与滚动容器尺寸并截图。

**Rationale**: 滚动条位置与 flex 收缩只能在真实渲染引擎中确认。
