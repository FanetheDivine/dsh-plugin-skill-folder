# Quickstart: Skill 文件夹折叠与可视化分组

## 前提

- Node.js ≥ 24.9，pnpm 11。
- 已安装 DSH，且停用 `dsh-skill-search-local`。
- 用户全局 Skill 目录中有多个 `lark-*` 与其他前缀的 Skill。

## 自动验证

```sh
pnpm install
pnpm format && pnpm check
pnpm build
```

| 测试文件 | 覆盖 |
| --- | --- |
| `tests/config.test.ts` | 配置默认值、文件夹规则、严格校验、热更新 |
| `tests/folders.test.ts` | 文件夹名称规则、成员唯一、查找与未分组集合 |
| `tests/skills.test.ts` | 可由模型调用过滤、全局来源与路径判定、全局列表读取 |
| `tests/search.test.ts` | 分词、排序、分页、截断、文件夹列出、错误 |
| `tests/catalog.test.ts` | 目录折叠、项目级覆盖、主目录会话、原样保留 |
| `tests/plugin.test.ts` | `apply` 接线、工具注册、`pre-step` 改写、路由 |
| `tests/auto-group.test.ts` | 两步自动分组与示例 |
| `tests/folder-form.test.ts` | 草稿编辑、移动、校验、保存、放弃 |
| `tests/client.test.ts` | 前端注册、页面渲染、双语文案 |
| `tests/package-pack.test.ts` 等 | 产物与发布内容 |

## 实机验证

1. 用 `real-device-test` skill 安装本地构建。
2. 打开「插件」页本插件行的配置页：
   - 页面列出全局 Skill，未分组区域可见。
   - 新建文件夹 `lark`，拖入一个 `lark-*` Skill。
   - 点击「按前缀自动分组」，其余 `lark-*` 进入 `lark`，其他同首段前缀的 Skill 生成新文件夹。
   - 清空文件夹名，保存按钮禁用并标出错误。
   - 放弃修改，页面恢复。
   - 保存后刷新页面，分组一致。
3. 新建会话，询问「有哪些 Skill」：
   - 模型目录只显示 `lark` 文件夹摘要，`lark-*` 条目不出现。
   - 未分组 Skill 逐项显示。
4. 让 Agent 处理飞书日历任务：
   - Agent 调用 `skill_search`，参数含 `folder: "lark"` 或相关关键词。
   - Agent 用 `skill` 加载 `lark-calendar` 并获得完整指令。
5. 在一个含 `.agents/skills/lark-calendar` 的项目中新建会话：
   - 目录逐项显示项目级 `lark-calendar`。
   - `skill_search` 结果中的 `lark-calendar` 的 `folder` 为 `null`。
6. 已有会话在保存新分组后继续使用原目录。
