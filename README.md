# 折叠skill

[![npm version](https://img.shields.io/npm/v/dsh-plugin-skill-folder)](https://www.npmjs.com/package/dsh-plugin-skill-folder)

可视化地对全局 skill 进行分组折叠，避免会话一次性加载全部 skill。

全局 skill 越装越多时，每个会话的技能目录都会变长。本插件把 skill 收进文件夹：模型只看到文件夹的名称、简介与成员数，需要时再检索并加载具体的 skill。

## 功能

- **折叠目录**：已归入文件夹的 skill 在模型目录中合并为一行文件夹摘要。未分组的 skill 照常逐项列出。
- **按需检索**：模型用 `skill_search` 按关键词或文件夹名找到折叠的 skill，再用 `skill` 加载。
- **可视化分组**：在插件配置页拖拽或用菜单整理 skill，支持按前缀一键分组。
- **始终分组**：开启后，全局技能变化时自动按前缀分组一次并写回配置。
- **只作用于全局 skill**：项目级 skill 保持原样。