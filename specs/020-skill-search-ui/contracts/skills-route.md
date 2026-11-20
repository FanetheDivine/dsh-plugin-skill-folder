# Contract: 全局 Skill 列表路由

## `GET /api/skill-folder/skills`

宿主经 `connection.fetch.register` 注册，同源访问，宿主连接负责鉴权。

### 响应 200

```json
{
  "complete": true,
  "skills": [
    {
      "name": "lark-calendar",
      "description": "…",
      "whenToUse": "…",
      "source": "user-agents",
      "path": "<home>/.agents/skills/lark-calendar/SKILL.md"
    }
  ]
}
```

- `skills` 按名称排序，只包含可由模型调用的全局 Skill。
- `complete` 为 `false` 时，前端提示列表可能不完整。

### 响应 500

```json
{ "error": "<message>" }
```

前端展示错误并保留已保存的分组。
