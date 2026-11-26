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
- **中英文界面**：跟随 DSH 的语言设置。

## 安装

在 DSH 的「插件」页点「添加插件」，安装 npm 包 `dsh-plugin-skill-folder`。

也可以用命令行安装：

```sh
dsh plugin add dsh-plugin-skill-folder
```

如果已启用其他提供 `skill_search` 的插件，例如 `dsh-skill-search-local`，先停用它：

```sh
dsh plugin disable skill-search-local
```

## 使用

在「插件」页找到「折叠skill」，打开详情，点「配置」进入分组页面。

| 操作 | 方法 |
| --- | --- |
| 新建文件夹 | 点「新建文件夹」，填写名称与简介 |
| 移动 skill | 把 skill 拖到文件夹卡片，或点 skill 右侧的分组按钮选择目标 |
| 移出文件夹 | 拖到「未分组的技能」区域，或在分组菜单中选「未分组」 |
| 按前缀分组 | 点「按前缀自动分组」，例如 `lark-doc`、`lark-sheet` 归入 `lark` |
| 始终分组 | 勾选按钮右侧的「始终分组」并保存，技能变化时自动按前缀分组 |
| 查找 skill | 在筛选框输入名称或描述 |
| 收起文件夹 | 点文件夹标题左侧的箭头，或点文件夹分区的「全部折叠 / 全部展开」 |
| 查看长文件夹 | 卡片最高 500px，成员在卡片内滚动 |
| 删除文件夹 | 点「删除文件夹」，其中的 skill 回到未分组 |

改动先进入草稿。点「保存」后生效，点「放弃修改」恢复。

「始终分组」开启后，插件在每次全局技能变化时按与按钮相同的规则分组并写回配置。分组只追加成员与新建文件夹；已有文件夹的名称、简介与顺序保持不变。

保存后新开的会话使用新的分组。已打开的会话保持原有目录。

## 配置

分组页面底部的「搜索选项」控制 `skill_search` 的返回结果：

| 选项 | 默认值 | 范围 | 说明 |
| --- | --- | --- | --- |
| 默认返回数量 | 5 | 1–20 | 模型未指定数量时返回的条数 |
| 摘要长度上限 | 320 | 40–2000 | 每条 skill 描述的最大字符数，超出部分截断 |

文件夹规则：

- 名称 1–64 个字符，不区分大小写，不能重名。
- 简介最多 500 个字符，可以留空。
- 一个 skill 只能属于一个文件夹。

也可以直接编辑配置：

```yaml
folders:
  - name: lark
    description: 飞书工具
    skills:
      - lark-calendar
      - lark-docs
alwaysGroup: false
defaultLimit: 5
descriptionMaxLength: 320
```

## 模型如何使用

模型目录中的文件夹摘要会提示模型先检索。`skill_search` 的参数：

| 参数 | 说明 |
| --- | --- |
| `query` | 关键词或准确的 skill 名，中英文均可 |
| `folder` | 文件夹名，列出该文件夹的全部 skill |
| `limit` | 返回条数，1–20 |
| `offset` | 跳过的条数，用于翻页 |

你仍可以用 `/技能名` 直接调用任意 skill，折叠只影响模型看到的目录。

## 许可

MIT
