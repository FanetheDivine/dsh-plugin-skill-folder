# Changelog

## Unreleased

### Fixed

- 「技能文件夹」配置页按默认 agent preset 的作用域读取全局技能：宿主把 `skill-filesystem` 挂在 preset 上，根作用域快照只含少量技能，用户级技能因此从列表消失；取不到作用域时退回根作用域并把列表标记为不完整
