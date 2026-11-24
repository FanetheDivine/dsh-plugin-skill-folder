# 工作机制

## 插件的组成

DSH 插件是一个 npm 包。宿主按约定的入口加载它。

| 文件 | 作用 |
| --- | --- |
| `package.json` | 包元数据、`dsh.bundle` 与 `dsh.client` 声明、发布内容 `files` |
| `cordis.patch.yml` | 插件行，`dsh plugin add` 时插入 profile |
| `src/index.ts` | 宿主入口，打包为 `dist/index.mjs` |
| `src/client/index.ts` | 浏览器入口，打包为 `dist/client.js` |
| `tsdown.config.ts` | 两组打包配置 |

## 入口契约

宿主 loader 只识别 `src/index.ts` 导出的四个符号。

| 导出 | 含义 |
| --- | --- |
| `name` | 插件标识 `dsh-plugin-skill-folder`，与 `cordis.patch.yml` 的 `id` 一致 |
| `inject` | `['tools', 'skills', 'workingDirectory']` |
| `apply(ctx, config)` | 插件启用时调用，`config` 来自插件行的 `config` 字段 |
| `Config` | 配置 schema，宿主据此校验配置并提供热重载与面板表单 |

- `inject` 列出 `apply` 用到的全部宿主服务。`connection` 与 `skills` 在浏览器侧按功能可选。
- 三个 `Config` 字段都用 `.volatile()` 标记，改动不重启插件。
- 宿主类型经 `src/types.ts` 以 type-only 方式导入。

## 模块划分

| 模块 | 职责 |
| --- | --- |
| `src/config.ts` | `Config` schema、默认值、严格校验与实时读取 |
| `src/folders.ts` | 文件夹查找、成员集合、未分组集合与校验 |
| `src/skills.ts` | 模型可调用过滤、全局来源判定、全局列表读取 |
| `src/search.ts` | 查询分词、相关度排序、分页与摘要截断 |
| `src/search-tool.ts` | `skill_search` 的参数与输出 schema、参数校验 |
| `src/catalog.ts` | 把原生技能目录改写为「未归组条目 + 文件夹摘要」 |
| `src/routes.ts` | `GET /api/skill-folder/skills` |
| `src/client/folder-form.ts` | 配置页草稿模型 |
| `src/auto-group.ts` | 按前缀自动分组（宿主与配置页共用） |
| `src/client/folder-page.tsx` | 配置页视图与拖拽上下文 |

## 运行流程

`apply` 依次完成五件事：

1. `readConfig` 读取配置当前值，非法值让插件加载失败。
2. 注册 `skill_search`，工具闭包读取当前配置。
3. 用 `prepend: true` 注册 `agent/pre-step` 监听，改写本次步骤的技能目录。
4. 经 `ctx.inject(['connection'])` 注册全局技能列表路由；路由按默认 preset 的作用域读取技能。
5. 订阅 `skills/change`；「始终分组」开启时按变化重算文件夹并写回配置。

### 目录改写

原生目录由 `@deepseek-ai/dsh-tool-skill` 在 `agent/pre-step` 中生成。本插件用 `prepend: true` 注册，位于原生监听之外：`next()` 返回时目录消息已经存在。

改写规则：

1. 决策为 `reject` 时原样返回。
2. 本 Agent 看不到 `skill_search` 时原样返回，受限作用域保持原生行为。
3. 消息列表中没有 `source.kind === 'skill-catalog'` 时原样返回，不读取技能快照。
4. 读取技能快照失败时记录警告并原样返回，下一轮再试。
5. 没有条目被折叠时返回原消息对象，原生目录逐字节不变。
6. 有条目被折叠时替换正文，`source` 追加 `foldedBy: "dsh-plugin-skill-folder"`。

`source.entries` 保持原值。原生监听用它与历史摘要比较，据此决定是否重发目录；改写它会让目录反复重发。

### 折叠范围

| 情况 | 处理 |
| --- | --- |
| 全局技能在文件夹中 | 由文件夹摘要替代 |
| 未归组技能 | 逐项展示 |
| 项目级技能 | 逐项展示，不进入文件夹计数 |
| 项目级技能与全局技能同名 | 注册表只返回获胜者，全局版本不出现在目录与检索中 |
| 文件夹成员当前都不存在 | 该文件夹不展示 |
| 没有条目被折叠 | 目录保持原样 |

全局判定见 `isGlobalSummary`：来源不以 `project-` 开头即全局。来源为 `project-` 但与全局列表中的同名技能路径相同时也算全局，这样会话根目录位于用户主目录时，`~/.agents/skills` 被标成项目来源仍能正确折叠。

### 检索

`skill_search` 只读取摘要，不读取指令正文：

1. 校验参数：`query` 与 `folder` 至少给一个，`query` 最多 512 字符，`limit` 1–20，`offset` 非负。
2. 校验本 Agent 能看到原生 `skill` 加载器。
3. 用 `cwd` 与 `scope` 读取技能快照。
4. 分词、评分、排序、分页，输出摘要与所属文件夹。

分词把英文与数字按词切分并丢弃通用词，中文按二字组切分。名称命中权重最高，准确名称命中额外加权。

### 配置暂存

配置页复用宿主的配置表单：

- `folders` 字段的草稿文本是 JSON。界面结构化编辑后序列化写回。
- `parse` 校验 JSON 与文件夹规则，非法时返回 `undefined`，保存按钮随之禁用。
- `defaultLimit` 与 `descriptionMaxLength` 用整数字段，越界时标记字段非法。
- `alwaysGroup` 是布尔开关：勾选写入 `true`，取消勾选清除该键并回落到默认值。
- 保存、放弃、恢复默认与只读状态都由宿主提供。

### 卡片限高与滚动

文件夹卡片整体上限 `FOLDER_CARD_MAX_HEIGHT`（500px）：

- 卡片外框不设内边距，标题行、名称错误与简介放进 `cardBodyStyle` 内层。
- 成员区滚动容器 `memberScrollStyle` 零内边距，条目内缩由 `memberBodyStyle` 承担，滚动条因此贴住卡片内边缘。
- 成员区用 `flex: 0 1 auto` 与 `min-height: 0` 收缩到卡片剩余高度。
- 滚动条样式由 `scrollbarStyleText` 注入：Chromium 用 `::-webkit-scrollbar` 得到 8px 细滚动条，其他引擎在 `@supports not selector(::-webkit-scrollbar)` 下用标准滚动条属性。
- 「未分组的技能」区域保持自然高度，不套用限高。

### 自动分组

`autoGroup` 是纯函数，只处理未分组技能，两步完成：先按文件夹名匹配，再按首段前缀合并。规则见 README 的「分组」节。`sameFolders` 逐项比较结果，用于跳过无变化的写入。

### 始终分组

`alwaysGroup` 开启时，插件在 `skills/change` 后重新读取全局技能，按上述规则分组；结果与当前配置不同时经 `configEditor.edit` 写回 `folders`。`loader/volatile-update` 中 `alwaysGroup` 由 false 变 true 时立即执行一次。执行串行，期间的触发合并为一次；技能读取或配置写入失败只记录警告，保持现有分组。

### 路由

`GET /api/skill-folder/skills` 使用 `connection.fetch.register`。请求经过宿主的连接鉴权，只对已登录浏览器开放。

路由先用 `agentPresets.acquireScope()` 取默认 preset 的作用域，再按该作用域读取快照：`dsh-skill-filesystem` 注册在 agent preset 内，根作用域快照看不到它提供的用户级技能。读取结束后释放作用域租约。

| 情况 | 读取方式 | `complete` |
| --- | --- | --- |
| 正常 | `snapshot({ scope })` | 取自快照 |
| 取作用域失败 | 退回 `snapshot({})` | `false` |
| 宿主没有 `agentPresets` | `snapshot({})` | 取自快照 |

不传 `cwd`，项目根目录因此不参与。返回按名称排序的、可由模型调用的全局技能与 `complete` 标记。

## 依赖归属

| 依赖 | 归属 |
| --- | --- |
| `@deepseek-ai/cordis`、`@deepseek-ai/schemastery` | `dependencies` 由宿主提供实例，构建保持 external |
| `@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-agent` | 仅类型，编译后不留运行时依赖 |
| `react`、`react-dom`、`@deepseek-ai/dsh-client-ui-primitives` | 平台种子，前端产物保持 external |
| `@dnd-kit/core` | `devDependencies`，前端构建内联进 `dist/client.js` |

前端产物的平台种子清单见 `tsdown.config.ts` 的 `PLATFORM_MODULES`。清单之外的模块一律内联，宿主模块表里没有的 `require` 会在运行时抛错。

`@dnd-kit/core` 的 CJS 产物按 `process.env.NODE_ENV` 选择实现，浏览器没有 `process`，所以前端构建用 `define` 把它替换为 `"production"`。

## 严格配置

`resolveConfig` 在 schema 之后做语义校验：

| 检查 | 失败方式 |
| --- | --- |
| 未知键 | 抛错，带插件标识 |
| 文件夹名称为空或超过 64 字符 | 抛错 |
| 文件夹名称忽略大小写重复 | 抛错 |
| 同一技能出现在两个文件夹 | 抛错 |
| 简介超过 500 字符 | 抛错 |
| 数值越界或非整数 | 抛错 |
| 非对象输入 | 抛错 |

schema 不拒绝未知键，严格校验集中在 `resolveConfig`，错误消息统一带 `dsh-plugin-skill-folder` 前缀，便于在宿主日志中定位。
