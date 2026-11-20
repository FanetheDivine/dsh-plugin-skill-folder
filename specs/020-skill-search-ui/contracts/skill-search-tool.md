# Contract: `skill_search` 工具

## 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | string | 与 `folder` 至少一个 | 能力关键词或准确 Skill 名，1–512 字符 |
| `folder` | string | 与 `query` 至少一个 | 文件夹名，忽略大小写 |
| `limit` | integer | 否 | 1–20，默认取配置 `defaultLimit` |
| `offset` | integer | 否 | ≥ 0，默认 0 |

`query` 与 `folder` 同时提供时，只在该文件夹成员中按关键词搜索。

## 返回

```json
{
  "query": "lark 日历",
  "folder": null,
  "total": 3,
  "offset": 0,
  "more": false,
  "complete": true,
  "results": [
    {
      "name": "lark-calendar",
      "description": "…",
      "whenToUse": "…",
      "folder": "lark",
      "match": "exact"
    }
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `folder` | 请求的文件夹名，未提供时为 `null` |
| `total` | 命中总数 |
| `more` | 后续仍有结果 |
| `complete` | Skill 检索是否完整 |
| `results[].folder` | 所属文件夹名；未归组或项目级 Skill 为 `null` |
| `results[].match` | `exact`：准确名称或命中全部查询词；`partial`：命中部分查询词；`folder`：按文件夹列出 |

`description` 与 `whenToUse` 按配置 `descriptionMaxLength` 截断。

## 错误

| 条件 | 错误信息前缀 |
| --- | --- |
| `query` 与 `folder` 都缺失或为空 | `skill_search: provide query or folder` |
| `query` 超过 512 字符 | `skill_search: query must contain 1–512 characters` |
| `query` 只包含通用词 | `skill_search: use specific capability keywords` |
| `folder` 不存在 | `skill_search: unknown folder` |
| `limit` 或 `offset` 越界 | `skill_search: limit must be …` / `offset must be …` |
| 当前 Agent 没有原生 `skill` 工具 | `skill_search: skill loader is not available` |

## 范围

- 只包含 `invocation.modelInvocable === true` 的 Skill。
- 使用当前 Agent 的工作目录与作用域读取 Skill 快照，项目级同名 Skill 覆盖全局 Skill。
- 只读取摘要，不读取指令正文。
