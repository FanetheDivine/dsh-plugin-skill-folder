# Data Model: 优化插件展示与分组下拉框

不新增配置或持久化数据。

| 实体 | 字段 | 规则 |
| --- | --- | --- |
| 插件元数据 | `meta.title`、`meta.description` | 中英文各一份，键集一致 |
| 分组菜单项 | `id`、`label` | `id` 为空串表示未分组，其余为文件夹名；`selectedId` 为当前分组 |
| 插件图标 | `icon.svg` | 36×36 视口，自包含，无 `<text>`、`<style>`、脚本 |
