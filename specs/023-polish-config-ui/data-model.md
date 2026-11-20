# Data Model: 配置页临时视图状态

## FolderPageViewState

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `filter` | `string` | 去除首尾空白后匹配名称或描述，忽略大小写 |
| `collapsed` | `Set<number>` | 保存当前折叠的文件夹下标 |
| `skillsState` | 现有读取状态 | 沿用加载、错误、就绪与完整性标记 |

- 状态仅在当前组件生命周期内存在。
- 筛选与折叠不修改 `folders` 草稿，也不触发表单 dirty。
- 删除下标 `i` 时，从 `collapsed` 删除 `i`，并把大于 `i` 的值减一。

## FolderView

| 字段 | 来源 | 展示规则 |
| --- | --- | --- |
| `folder` | 配置草稿 | 名称、简介与全部成员保持原有编辑语义 |
| `visibleSkills` | `folder.skills` 与筛选词 | 只包含匹配成员；无筛选时等于全部成员 |
| `collapsed` | 页面临时状态 | 为 true 时隐藏成员区域 |
| `memberCount` | `folder.skills.length` | 始终显示实际成员数 |
| `visibleCount` | `visibleSkills.length` | 筛选时与实际成员数共同展示 |

## FilterResult

| 字段 | 规则 |
| --- | --- |
| `visible` | 所有文件夹可见成员数与未分组可见成员数之和 |
| `total` | 所有文件夹成员数与未分组成员数之和 |
| `active` | 筛选词去首尾空白后非空 |

- `active` 为 false 时显示技能总数。
- `active` 为 true 时显示 `visible / total`。
- 清除筛选只重置 `filter`，不改变折叠状态。
