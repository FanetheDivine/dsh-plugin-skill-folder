# Research: 优化配置页视觉与批量浏览交互

## 1. 宿主图标的引入与测试兼容

- **Decision**: 从 `@deepseek-ai/dsh-client-ui-primitives` 引入 `IconPlusOutlineRegular`、`IconSparkleRegular`、`IconSearchOutlineRegular`、`IconChevronDownOutlineRegular`、`IconDragHandleOutlineRegular`、`IconTrashOutlineRegular`、`IconFolderOpenOutlineRegular`，并在 `tests/support/primitives.ts` 中补充导出。
- **Rationale**: `@deepseek-ai/dsh-client-ui-primitives` 在 `tsdown.config.ts` 中屬於 `PLATFORM_MODULES`（保持 external），不会增加 `dist/client.js` 的体积。`vitest.config.ts` 将该包映射到 `tests/support/primitives.ts`，补充导出后源码测试可直接渲染 `<svg data-icon="...">` 节点。
- **Alternatives Considered**:
  - 继续使用纯 Unicode 字符（`▾`、`⠿`）：不同系统字体下字号与垂直对齐存在偏差，且工具栏与搜索框缺乏直观图标。
  - 内联自定义 SVG 路径：重复维护宿主已有图标，增加代码体积。

## 2. 批量折叠与展开状态管理

- **Decision**: 在 `FolderPage` 中导出纯函数 `allFoldersCollapsed(folderCount: number, collapsed: ReadonlySet<number>): boolean` 与 `toggleAllFoldersCollapsed(folderCount: number, collapsed: ReadonlySet<number>): Set<number>`。当 `folderCount > 0` 且 `0..folderCount - 1` 均在 `collapsed` 中时判定为全部已折叠，点击切换为空集合（全部展开）；否则切换为包含 `0..folderCount - 1` 的集合（全部折叠）。
- **Rationale**: 复用现有的 `collapsed: ReadonlySet<number>` 状态，与单卡折叠、删除下标调整（`collapsedAfterRemoval`）以及筛选临时展开（`effectiveFolderCollapsed`）完全兼容。
- **Alternatives Considered**:
  - 单独维护一个 `allCollapsed` 布尔状态：与单卡折叠状态产生双数据源同步问题。

## 3. 空文件夹状态呈现

- **Decision**: 当 `folders.length === 0` 时，在文件夹分区内渲染带 `data-folders-empty` 标记的空状态引导容器（包含 `IconFolderOpenOutlineRegular` 图标与 `t('folder.emptyList')` 说明文案），替代空的 `folderGridStyle` 容器。
- **Rationale**: 首次使用或清空文件夹后，给用户提供清晰的操作引导（点击「新建文件夹」或「按前缀自动分组」），避免「文件夹」标题行下方直接紧贴「未分组的技能」造成视觉断层。
- **Alternatives Considered**:
  - 隐藏整个「文件夹」分区：用户无法直观感知文件夹分区的存在与当前数量 `0`。

## 4. 筛选框与控件交互样式

- **Decision**:
  - 筛选框使用带搜索图标的组合容器（`searchBoxStyle`），内部 input 使用无边框透明样式，聚焦时通过 CSS `:focus-within` 高亮外框边框。
  - 在 `focusStyleText` 中补充按钮、删除按钮、折叠按钮与输入框的 `:hover` 及 `:focus-visible` 规则，全部引用 `--dsw-alias-*` 主题令牌。
- **Rationale**: 保持纯内联样式 + `<style>` 标签的轻量架构，不引入 CSS Modules 构建负担，同时在浅色与深色主题下提供一致的交互反馈。
- **Alternatives Considered**:
  - 引入外部样式表文件：插件前端产物约定为单文件 `dist/client.js` 闭包工厂，内联 `<style>` 最简单可靠。
