# 已知风险

## 宿主版本

- `@deepseek-ai/dsh-*` 处于 rc 阶段，接口可能在版本间变化。
- 插件依赖的 `dsh-*` 版本应与运行它的 DSH 版本一致。
- 实机测试按 `@deepseek-ai/dsh-agent` 的版本选择宿主，版本不一致时安装到 `~/.dsh-local/dsh-<版本>`，全局安装保持不变。

## 安装 rc 依赖

pnpm 的 minimum release age 策略会拒绝发布时间过短的包。

- `@deepseek-ai/dsh-*` 依赖未列入 `minimumReleaseAgeExclude` 时，`pnpm install` 失败。
- 列入规则见[宪章](../.specify/memory/constitution.md)原则 I。

## 共享宿主实例

插件运行时使用宿主提供的 cordis 与 schemastery。

- 这些包被打进 bundle 时会产生第二份实例，类型判断和服务注入随之失效。
- 保持 external 的规则见 [how-it-works.md](./how-it-works.md#依赖归属)。

## 与 skill-search-local 冲突

两个插件都注册 `skill_search`，工具名只有一个。

- 先注册的一方保留工具名，后注册的一方失效。
- 文件夹配置只作用于本插件的工具与目录改写。
- 安装前停用 `dsh-skill-search-local`，见 README 的「安装」。

## 原生目录格式

目录改写依赖 `dsh-tool-skill` 的消息结构。

- 只依赖 `source.kind === 'skill-catalog'` 与 `source.entries`；两者缺失或变形时目录保持原样，不报错。
- 原生首句与加载指引的措辞会变化；本插件替换为正则无关的固定文本，不解析原生措辞。
- `skill-catalog` 来源类型变化时，目录不再折叠，`skill_search` 仍可用。

## 根作用域技能插件与 agent preset 冲突

GUI 会话使用 agent preset，preset 自带 `tool-skill` 与 `skill-filesystem` 实例。

- 在根作用域再启用 `tool-skill` 时，根实例判断本 Agent 的 `skill` 工具与自己的不同实例，按「没有技能」处理并删除 preset 已加入的目录消息。
- 现象：会话没有 `<available_skills>`，`skill` 与 `skill_search` 仍在工具列表中，插件停用后同样缺失。
- 副本 profile 只需停用根作用域的 `tool-skill`；技能工具与技能来源由 preset 提供。
- 实机脚本以官方 web 默认 profile 为底本，不覆写这两个插件，用例 `B0` 守住该形态。

## 配置页技能列表

配置页按默认 preset 的作用域读取全局技能。

- 宿主没有 `agentPresets` 服务时只能读根作用域，根层之外的技能不出现。
- 默认 preset 不挂 `skill-filesystem` 时，用户级技能不出现。
- 取作用域失败时退回根作用域，页面显示「技能列表可能不完整」。

## 触屏与拖拽

- `@dnd-kit/core` 的指针传感器按鼠标与触控笔设计；触屏可长按拖动，也可能被页面滚动打断。
- 「移动到」菜单不依赖拖拽，任何输入方式都可用。

## 前端产物

前端产物使用宿主约定的闭包工厂格式。

- 格式变化时插件加载失败，表现为示例行不出现。
- `PLATFORM_MODULES` 是宿主冻结模块表的副本；宿主升级后需要核对，缺失的模块在运行时请求失败。
- 客户端依赖版本与宿主不一致时，槽位或 locale 服务可能不可用。
- 前端没有独立页面入口，直接执行 `dist/client.js` 不会渲染。
- 前端服务可选：缺失服务对应的功能静默跳过，不报错也不提示。`slots` 缺失时插件启用但没有可见效果。
- `ctx.inject` 回调在服务变化时重跑；回调内未经 `ctx.effect` 登记的资源不会清理，会重复注册。
- 示例行依赖 `conversation.composer.dock` 槽位；宿主调整 UI 后槽位名或位置可能变化。

## 配置面板

- 只有标记 `.volatile()` 的字段出现在“插件”面板的配置页。
- 配置被更高层覆盖时，宿主拒绝保存，表单保留草稿并提示未接受。
- 表单命名空间是插件行在 profile 里的 id；`plugins.row.config` 的键是 `<包名>#<行 id>`。行 id 与包名不同时两处都要改。
- 配置页依赖 `dsh-client-ui-plugin-manager` 与 `dsh-client-ui-settings` 的客户端包；宿主未加载这两个包时配置页不出现。

## 严格配置

配置中出现未知键或非法值时，插件加载失败。

- 用户在 `cordis.patch.yml` 写错键名会导致插件停用。
- 用 `dsh --profile <profile> --dump-config` 检查最终配置。

## 国际化

- 宿主在注册时捕获的文案（如命令描述）保持注册时的语言，切换语言后仍显示旧语言；槽位渲染的文案随切换更新。
- locale 服务只负责选择、持久化、语言匹配、键回退与 `<html lang>`，复数规则与双向布局由语言包自理。
- 元数据或字典缺当前语言时按回退链取值；缺 `meta.title` 与 `meta.description` 时回落 `package.json` 的字段，可能显示英文包名。
- 规范见 [i18n.md](./i18n.md)。

## Windows 长路径

`node_modules` 嵌套很深，路径可能超过 Windows 的 260 字符上限。

- `git worktree remove` 此时报错 `Filename too long`。
- `finish-worktree.sh` 遇到该错误时用 Node.js `rmSync` 删除目录，再运行 `git worktree prune`。
