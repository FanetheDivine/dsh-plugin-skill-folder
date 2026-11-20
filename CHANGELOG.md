# Changelog

## Unreleased

### Added

- 内置 `skill_search` 工具：按关键词或文件夹名检索可由模型调用的技能，返回摘要、所属文件夹与检索完整性
- 技能文件夹折叠：模型目录用文件夹的名称、简介与数量替代已折叠的成员，未归组的技能继续逐项展示
- 「技能文件夹」配置页：列出全局技能与文件夹，支持拖拽分组、下拉移动、新建、改名、删除与逐字段恢复默认
- 按前缀自动分组：先按文件夹名匹配，其余按 `-` 分段前缀合并，成员不少于 2 个才成组
- `GET /api/skill-folder/skills` 路由：向配置页提供全局技能摘要与检索完整性
- `docs/` 与 README 说明安装、分组、自动分组、搜索与加载流程

### Changed

- 仓库从 DSH 插件模板转化为 `dsh-plugin-skill-folder@0.1.0`，移除模板示例工具、事件日志与示例行
- 宪章标题改为 `dsh-plugin-skill-folder Constitution`，版本升到 2.0.1
- CI 恢复 `publish` job 的 tag 触发条件

### Removed

- 模板示例 `demo_echo` 工具、agent 事件日志示例、输入区示例行与示例配置页
- `docs/template-conversion.md` 与历史 spec、changelog 归档
