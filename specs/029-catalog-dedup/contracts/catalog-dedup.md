# Contract: 折叠目录去重

**Feature**: `fix/029-catalog-dedup` | **Date**: 2026-11-26

针对 `source.kind === 'skill-catalog'` 的会话消息，在折叠之外增加一条判定。

## 输入

| 输入 | 来源 | 缺失时 |
| --- | --- | --- |
| 本条目录消息 | 本步骤消息列表里宿主刚发布的那条 | 不介入，整步原样返回 |
| 本轮技能快照 | 宿主 `skills.snapshot()` | 保持原生目录，记 warn |
| 生效的文件夹 | 插件配置 | 按空文件夹处理（现状） |
| 已呈现正文 | `agent.session.deriveMessages()` | 记为未知，按首次注入处理 |

## 判定

```text
foldedBody = 渲染本轮未折叠条目 + 文件夹摘要
presentedBody = 本会话当前可见的最后一份目录正文（可能未知）

presentedBody 未知        -> 注入
foldedBody == presented   -> 丢弃
否则                      -> 注入
```

正文比较是全等比较，不做去除空白、不忽略顺序、不比较首句。

## 输出

| 结果 | 本步骤消息列表 |
| --- | --- |
| 注入 | 该目录消息替换为折叠文本，`source.foldedBy = "dsh-plugin-skill-folder"` |
| 丢弃 | 该目录消息从列表移除，其余消息对象与顺序不变 |
| 不介入 | 列表原样返回 |

## 首句规则

| 宿主 `source.update` | 首句 |
| --- | --- |
| 未设置 | `The following skills are available in this session. Folders group their members.` |
| `true` | `The available skill catalog changed. Folders below replace their members; the skills listed above stay available.` |

正文相同的重发已被丢弃，因此 `true` 首句只出现在正文确实变化的目录上。

## 保持不变

- 折叠文本的其余部分逐字节不变，见 `specs/020-skill-search-ui/contracts/catalog-message.md`。
- 没有条目被折叠时返回原消息对象，不加 `foldedBy`。
- `source.entries`、`source.update`、`source.incomplete` 保持宿主原值。
- 其他来源的消息对象与顺序不变。

## 失败处理

| 失败 | 行为 |
| --- | --- |
| 读取已呈现正文抛错 | 记 warn，按未知处理，注入一条折叠目录 |
| 宿主没有 `session` 或 `deriveMessages` | 同上 |
| 消息结构不符合预期 | 同上 |
| 技能快照读取失败 | 保持原生目录，下一轮再试（现状） |
