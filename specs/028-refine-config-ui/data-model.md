# Data Model: 优化配置页视觉与批量浏览交互

## 视图状态（`FolderPage` 内存状态）

本次变更不修改持久化配置结构（`FolderConfig` 与 `Config` schema 保持不变），仅扩展前端视图派生状态与字典键。

| 状态 / 派生值 | 类型 | 规则 |
| --- | --- | --- |
| `collapsed` | `ReadonlySet<number>` | 存储当前手动折叠的文件夹下标集合 |
| `allCollapsed` | `boolean` | `folders.length > 0` 且 `0..folders.length - 1` 均在 `collapsed` 中时为 `true` |
| `effectiveCollapsed` | `boolean` | 单卡满足 `collapsed.has(index) && (!filterActive \|\| visibleCount === 0)` 时折叠 |

## 状态转换

1. **点击「全部折叠」**（当 `allCollapsed === false` 且 `folders.length > 0`）：
   - `collapsed` 更新为 `new Set([0, 1, ..., folders.length - 1])`。
2. **点击「全部展开」**（当 `allCollapsed === true`）：
   - `collapsed` 更新为 `new Set()`。
3. **新建文件夹**：
   - 新文件夹追加在末尾（下标 `folders.length`），不在 `collapsed` 中，默认展开；此时 `allCollapsed` 变为 `false`。
4. **删除文件夹**：
   - `collapsedAfterRemoval(collapsed, index)` 移除被删下标并将后续下标减 1。

## 新增字典键（`src/client/locales.ts`）

| 键名 | 中文 (`zh`) | 英文 (`en`) |
| --- | --- | --- |
| `folder.collapseAll` | `全部折叠` | `Collapse all` |
| `folder.expandAll` | `全部展开` | `Expand all` |
| `folder.emptyList` | `还没有文件夹。点击上方「新建文件夹」或「按前缀自动分组」开始整理技能。` | `No folders yet. Click "New folder" or "Group by prefix" above to organize your skills.` |
