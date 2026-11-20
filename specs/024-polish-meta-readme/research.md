# Research: 优化插件展示与分组下拉框

## 下拉菜单组件

**Decision**: 使用宿主 `Menu`，`portal` 开启，数据行加 `selectedId`。

**Rationale**: 外观、键盘导航、Esc 与外部点击关闭由宿主统一实现；平台模块不进入插件产物。

**Alternatives Considered**: 自绘菜单需要自行维护主题与焦点逻辑；原生 `<select>` 弹层由系统绘制，无法跟随主题。

## 插件图标

**Decision**: 根目录 `icon.svg`，`package.json` 导出 `./icon` 并列入 `files`。

**Rationale**: 宿主文档规定的 package-root 插件图标路径；插件行与 bundle 行都读同一包。

**Alternatives Considered**: `package.json` 顶层 `icon` 字段同样可用，`./icon` 导出与模板一致。

## npm 徽章

**Decision**: `https://img.shields.io/npm/v/dsh-plugin-skill-folder` 图片，链接 `https://www.npmjs.com/package/dsh-plugin-skill-folder`。

**Rationale**: 详情页对绝对地址的图片按原地址加载；Markdown 图片链接无需原始 HTML。

**Alternatives Considered**: badge.fury.io 同样可用，shields.io 更常见。
