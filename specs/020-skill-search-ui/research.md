# Research: Skill 文件夹折叠与可视化分组

## R-01 模型目录的生成与改写点

- **Decision**: 插件用 `ctx.on('agent/pre-step', listener, { prepend: true })` 注册最外层 waterfall 监听。监听先 `await next()`，再改写结果中 `source.kind === 'skill-catalog'` 的消息正文，保留 `source.entries` 原样。
- **Rationale**:
  - 原生目录由 `@deepseek-ai/dsh-tool-skill` 在同一事件中生成，先注册的监听位于外层；`prepend` 让本插件位于原生监听之外，`next()` 返回时目录消息已存在。
  - 原生监听用 `source.entries` 计算摘要并判断是否重发目录。保留 entries 让原生摘要稳定，避免目录反复重发。
  - 改写只发生在本步骤将要写入的目录消息上。已写入会话的旧目录保持不变，满足 D-010「只影响新会话」。
- **Alternatives considered**:
  - 改写会话历史中的旧目录：违背 D-010，且需要追加替换事件。
  - `system-prompt/assemble`：会替换整份装配，影响面过大。
  - 关闭原生目录后自行发布：需要复制原生摘要与重发逻辑。

## R-02 已有会话的边界

- **Decision**: 原生目录只在首次发布或 Skill 集合变化时产生新消息。已有会话在 Skill 集合不变时保持原目录；Skill 集合变化引发原生重发时，新目录按当前分组折叠。
- **Rationale**: 改写点只看到本步骤的新目录消息。分组变更本身不触发原生重发。
- **Alternatives considered**: 记录会话创建时的分组快照并沿用。需要额外持久化，收益有限。

## R-03 全局 Skill 的判定

- **Decision**:
  - 分组页列表：`ctx.skills.list({})`，不传 `cwd` 与 `scope`，只保留可由模型调用的 Skill。
  - 折叠判定：目录条目名在某文件夹中，且该条目的获胜摘要满足以下任一条件：
    1. `source` 不以 `project-` 开头。
    2. 与全局列表中同名 Skill 的 `path` 相同。
- **Rationale**:
  - `dsh-skill-filesystem` 只在传入 `cwd` 时扫描 `project-dsh` 与 `project-agents` 根目录，不传 `cwd` 得到全局集合。
  - 注册表按优先级只返回获胜者。项目级同名 Skill 获胜时，全局 Skill 自然不出现在目录与搜索中，满足 D-002。
  - 会话目录为用户主目录时，`~/.agents/skills` 会被标为 `project-agents`。条件 2 让这类 Skill 仍按全局处理。
- **Alternatives considered**: 只按 `source` 判定。主目录会话会误判。

## R-04 前端读取全局 Skill 列表

- **Decision**: 宿主注册同源路由 `GET /api/skill-folder/skills`，经 `ctx.inject(['connection'], …)` 调用 `connection.fetch.register`。前端用 `fetch` 同源读取。
- **Rationale**:
  - 前端没有 `skills` 服务。
  - `dsh-plugin-better-mcp` 使用同一路由机制，已在当前宿主运行。
  - 路由经宿主连接鉴权，只对已登录浏览器开放。
- **Alternatives considered**: typert `@Remote` 需要宿主生成的 schema，插件无法直接接入。

## R-05 配置持久化

- **Decision**: 沿用模板的 `ctx.configForms.get(ROW_ID)` 与 `SettingsFormModel`。
  - `folders` 字段的草稿文本是 JSON 字符串。界面结构化编辑后序列化写回草稿。
  - `parse` 校验 JSON 与文件夹规则，非法时返回 `undefined`，保存按钮随之禁用。
  - `defaultLimit` 与 `descriptionMaxLength` 使用 `settingsNumberField` 加范围校验。
- **Rationale**: 复用宿主的暂存、保存、放弃、恢复默认、覆盖与只读状态，满足 D-009。
- **Alternatives considered**: 自建表单模型并调用 `configEditor`。重复宿主能力。

## R-06 配置热更新

- **Decision**: 三个字段都标记 `.volatile()`。宿主侧每次读取实时值，监听 `loader/volatile-update` 时重新校验，失败则保留上一份有效配置并记录警告。
- **Rationale**: 只有 volatile 字段出现在插件配置页。实时读取让保存后的新会话立即使用新分组。

## R-07 自动分组算法

- **Decision**: 纯函数 `autoGroup(folders, skills)`，只处理未分组 Skill：
  1. 名称等于文件夹名，或以 `文件夹名-` 开头的 Skill 进入匹配名称最长的文件夹。
  2. 剩余 Skill 按第一段（首个 `-` 之前）分桶，成员数 ≥ 2 的桶生成新文件夹。
  3. 新文件夹名取成员按 `-` 分段的最长公共前缀。
  4. 新文件夹名与现有文件夹重名时并入现有文件夹。
  5. 简介按界面语言生成，例如 `lark 系列 Skill`。
- **Rationale**: 与 spec 的 D-007 示例一致，结果可确定、可测试。

## R-08 `skill_search` 匹配

- **Decision**:
  - 查询拆分为英文与数字词，以及中文二字组。
  - 依次在名称、用途、描述中做包含匹配，名称权重最高。
  - 准确名称优先；其次按命中词数、得分、名称排序。
  - `folder` 参数列出该文件夹全部可用成员，按名称排序。
  - 范围：`query` 1–512 字符，`limit` 1–20，`offset` ≥ 0。
- **Rationale**: 独立实现，逻辑简单，可确定排序与分页。
- **Alternatives considered**: 中英文同义词表。用户选择不内置（P-001）。

## R-09 拖拽实现

- **Decision**: 使用 `@dnd-kit/core@6.3.1`（用户选择 P-004）。
  - `DndContext` 配置 `PointerSensor` 与 `KeyboardSensor`，Skill 条目为 `useDraggable`，文件夹卡片与未分组区域为 `useDroppable`。
  - 每个 Skill 另有「移动到」下拉框。
  - 依赖放在 `devDependencies`。前端构建把非平台模块全部内联，`react` 与 `react-dom` 保持平台模块，`@dnd-kit` 使用宿主的 React 实例。
- **Rationale**: 拖拽动画、指针与键盘操作一致；下拉框让不熟悉键盘拖拽的用户也能完成归组，满足 FR-013。
- **Alternatives considered**: 浏览器原生拖放。不新增依赖，但触屏不支持，拖拽反馈有限。

## R-10 依赖与平台

- **Decision**: 依赖保持 `0.2.2-rc.3`（spec D-005）。宿主运行 `0.2.2-rc.5`。
- **Rationale**: 本插件使用的 `skills`、`tools`、`connection.fetch`、`configForms`、`plugins.row.config` 在 rc.5 中均已通过 Inspect 确认。
- **Risk**: rc.3 类型与 rc.5 运行时可能存在细微差异，由实机测试覆盖。
