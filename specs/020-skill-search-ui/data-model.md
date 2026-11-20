# Data Model: Skill 文件夹折叠与可视化分组

## 插件配置 `Config`

| 字段 | 类型 | 默认值 | 规则 |
| --- | --- | --- | --- |
| `folders` | `Folder[]` | `[]` | 见下方文件夹规则 |
| `defaultLimit` | integer | `5` | 1–20 |
| `descriptionMaxLength` | integer | `320` | 40–2000 |

三个字段都标记 `.volatile()`。未知键与非法值在加载时报错。

## 文件夹 `Folder`

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `name` | string | 去首尾空白后 1–64 字符；忽略大小写后在全部文件夹中唯一 |
| `description` | string | 0–500 字符，可为空 |
| `skills` | string[] | Skill 名称；同一名称在全部文件夹中最多出现一次 |

- 成员保存名称，不保存来源与路径。
- 当前不存在的成员保留在配置中，界面标记为未找到。

## Skill 摘要 `SkillItem`

宿主路由返回的全局 Skill：

| 字段 | 来源 |
| --- | --- |
| `name` | `SkillSummary.name` |
| `description` | `SkillSummary.description` |
| `whenToUse` | `SkillSummary.whenToUse`，可缺省 |
| `source` | `SkillSummary.source` |
| `path` | `SkillSummary.path`，可缺省 |

只包含 `invocation.modelInvocable === true` 的 Skill。

## 分组页草稿 `FolderDraft`

| 字段 | 说明 |
| --- | --- |
| `folders` | 正在编辑的文件夹列表 |
| `skills` | 路由返回的全局 Skill |
| `ungrouped` | `skills` 中不属于任何文件夹的成员，按名称排序 |
| `missing` | 文件夹成员中不在 `skills` 内的名称 |
| `errors` | 按文件夹索引定位的校验错误 |

状态流转：

```text
载入 → 编辑（拖拽 / 选择 / 自动分组 / 改名改简介） → 保存 → 载入
                                     ↘ 放弃 → 载入
```

## 模型目录 `FoldedCatalog`

由原生目录消息与当前配置计算：

| 部分 | 内容 |
| --- | --- |
| 可见条目 | 原生条目中未折叠的 Skill |
| 文件夹摘要 | 每个至少有一个已折叠成员的文件夹：名称、简介、成员数 |
| 指引 | 调用 `skill_search`，再用 `skill` 加载 |

`source.entries` 保持原生值。
