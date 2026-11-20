# Contract: 折叠后的模型目录

原生目录消息的 `content` 替换为以下文本，`source` 增加 `foldedBy: "dsh-plugin-skill-folder"`，其余字段保持原值。

```text
<system-reminder>
<原生目录首句，按原生首次发布或更新的语义保留>

<available_skills>
- `<未折叠 Skill>`: <描述>
</available_skills>

<skill_folders>
- `<文件夹名>` (<N> skills): <简介>
</skill_folders>

Skills inside a folder are hidden from the list above but remain loadable. When a folder's description matches the task, call `skill_search` with `folder` set to its name, or with keywords, then load the chosen skill with `skill`. Do not search for tasks unrelated to any folder.
<原生加载指引>
</system-reminder>
```

## 规则

- 没有任何条目被折叠时，消息保持原样，不加 `foldedBy`。
- 文件夹按配置顺序展示，只展示至少有一个已折叠成员的文件夹。
- 简介为空时省略 `: <简介>`。
- 当前 Agent 没有本插件的 `skill_search` 或原生 `skill` 工具时，消息保持原样。
- Skill 快照不完整时，只折叠快照中确认的全局 Skill。
