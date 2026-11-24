# Data Model: 始终分组

## 配置字段

| 字段 | 类型 | 默认 | 声明 | 说明 |
| --- | --- | --- | --- | --- |
| `alwaysGroup` | `boolean` | `false` | `.volatile()` | 开启后每次全局技能集合变化执行一次自动分组 |

- 校验：只接受布尔值；其他类型使配置解析失败，与现有严格校验一致。
- 未知键仍然报错，`alwaysGroup` 加入合法键集合。
- 客户端表单字段 `alwaysGroup`：草稿 `'true'` 写入 `true`，`'false'` 清除该键并回落到默认值。

## 现有实体

| 实体 | 结构 | 本功能的关系 |
| --- | --- | --- |
| `FolderConfig` | `name`、`description`、`skills[]` | 只追加成员与新建文件夹；不变更已有字段 |
| `SkillSummary` | `name`、`description` 等 | 只取 `name` 作为分组输入 |
| 配置表单 | `folders`、`defaultLimit`、`descriptionMaxLength`、`alwaysGroup` | 新增 `alwaysGroup` 控件 |

## 触发与状态

| 输入 | 条件 | 结果 |
| --- | --- | --- |
| `skills/change` | `alwaysGroup` 为 true | 读取全局技能，分组，结果不同则写 `folders` |
| `loader/volatile-update` | `alwaysGroup` 由 false 变 true | 同上，执行一次 |
| 任意触发 | `alwaysGroup` 为 false | 不读取技能、不写配置 |
| 任意触发 | 技能读取失败或 `configEditor` 缺失 | 保持现有分组，记录日志 |
| 任意触发 | 分组结果与现有文件夹一致 | 不写配置 |

## 状态转换

| 当前 | 事件 | 下一状态 |
| --- | --- | --- |
| 关闭 | 勾选并保存 | 开启；立即分组一次 |
| 开启 | 技能新增/移除 | 开启；按需写入分组 |
| 开启 | 取消勾选并保存 | 关闭；不再响应技能变化 |
