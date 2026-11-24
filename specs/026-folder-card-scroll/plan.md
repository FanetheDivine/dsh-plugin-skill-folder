# Implementation Plan: 限制文件夹卡片高度并让技能区滚动

**Branch**: `feat/026-folder-card-scroll` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-folder-card-scroll/spec.md`

**Status**: Draft

## Open Decisions

无。规格中的决策已全部确认；实现取舍记录在 [research.md](./research.md)。

## Clarifications

### Session 2026-11-24

- [D-001] Q: 500px 上限作用在卡片整体还是成员区？ -> A: 卡片整体。
- [D-002] Q: 滚动条贴合哪个容器？ -> A: 文件夹卡片内侧边缘。
- [D-003] Q: 未分组区域是否同样限高？ -> A: 不套用，保持自然高度。
- [D-004] Q: 滚动容器是否保留内边距？ -> A: 不保留，条目内缩由容器内层实现。
- [D-005] Q: 500px 是否可配置？ -> A: 固定常量。
- [D-006] Q: 折叠时的高度？ -> A: 只留标题行。
- [D-007] Q: 验证方式？ -> A: 自动化测试覆盖结构与样式常量，实机确认滚动与拖拽。

## Review Record

- 2026-11-24 | Decision: Waived | Scope: current full plan | Open items: none | Risks: 滚动条外观与拖拽自动滚动依赖浏览器与宿主实现，由实机确认 | 用户授权「自行实现合并」

## Summary

配置页的文件夹卡片当前按内容高度展开，一个长文件夹会把同行的其他卡片与「未分组的技能」推出屏幕。

改为：卡片整体上限 500px，成员区在卡片内部纵向滚动。卡片去掉自身内边距，标题行等由内层容器承担内边距；成员区滚动容器不设内边距，条目内缩放在滚动容器的内层，滚动条因此贴住卡片内边缘。

「未分组的技能」区域不改。

## Technical Context

**Language/Version**: TypeScript 6，Node ≥ 24.9，ESM

**Primary Dependencies**: React 18 内联样式；`@dnd-kit/core` 拖拽；宿主主题令牌 `--dsw-alias-*`

**Storage**: 无

**Testing**: vitest（`tests/client.test.ts` 渲染与样式常量断言）

**Target Platform**: DSH 插件配置页（`plugins.row.config` 槽位），Web 与 Desktop profile

**Project Type**: 单包插件（`src/` + `tests/`）

**Constraints**: 配置页只用内联样式与既有 `<style>` 注入；不新增依赖；不改路由与配置存储

**Scale/Scope**: `src/constants.ts`、`src/client/styles.ts`、`src/client/folder-card.tsx`、`src/client/folder-page.tsx`、`tests/client.test.ts`、`README.md`、`CHANGELOG.md`

## Constitution Check

| 原则 | 结论 |
| --- | --- |
| I 宿主依赖版本 | 通过：没有依赖变更 |
| II 测试同步 | 通过：新增 `tests/client.test.ts` 用例覆盖限高、滚动容器与内缩结构 |
| III 文档结构 | 通过：`README.md` 的「使用」表增加卡片限高说明，`CHANGELOG.md` 增加条目，机制写入本 plan 与 `research.md` |
| IV 质量门禁 | 通过：提交前运行 `pnpm format && pnpm check`，合并前运行 `pnpm build` |
| V 公开引用 | 通过：只引用仓库内路径 |

## Complexity Tracking

无偏离。

## Phase 0 研究结论

见 [research.md](./research.md)。要点：

- 卡片用 `max-height` + `overflow: hidden` 限制整体高度，成员区用 flex 收缩承担剩余高度。
- 卡片内边距移到内层容器，成员区滚动容器零内边距，条目内缩放在内层。
- 滚动条用 `::-webkit-scrollbar` 设为 8px 细滚动条，其他引擎由 `@supports not selector(::-webkit-scrollbar)` 补标准属性。
- 折叠沿用现有 `display: none`，卡片回落到标题行高度。

## Phase 1 设计

无数据模型与外部契约变更；`data-model.md` 与 `contracts/` 不适用。验证步骤见 [quickstart.md](./quickstart.md)。

### 改动文件

1. `src/constants.ts`
   - 新增 `FOLDER_CARD_MAX_HEIGHT = 500`。
2. `src/client/styles.ts`
   - 新增 `folderCardStyle`、`folderCardActiveStyle`：`cardStyle` 去内边距，加上限高与 `overflow: hidden`。
   - 新增 `cardBodyStyle`：承载标题行、错误提示与简介的内边距。
   - 新增 `memberScrollStyle`：零内边距滚动容器，纵向滚动，滚动条着色。
   - 新增 `memberBodyStyle`：`chipListStyle` 加 `0 14px 14px` 内边距。
   - 新增 `scrollbarStyleText` 与对应 `<style>` 元素，兜底旧 Chromium 的滚动条样式。
3. `src/client/folder-card.tsx`
   - 卡片改为「内层容器 + 滚动容器」两段结构。
   - 折叠时隐藏滚动容器。
4. `src/client/folder-page.tsx`
   - 注入 `scrollbarStyleText` 的 `<style data-skill-folder-scrollbar-styles>`。
5. `tests/client.test.ts`
   - 断言卡片限高、滚动容器零内边距且纵向滚动、条目内层内缩、未分组区域无滚动。
6. `README.md`、`CHANGELOG.md`：补充用户可见行为。

### 结构

```text
<section data-folder-card>            // 边框、圆角、max-height 500px、overflow hidden、padding 0
  <div cardBody>                      // padding 14, flex column gap 10, flexShrink 0
    header / 名称错误 / 简介输入
  </div>
  <div data-folder-members>           // overflow-y auto, padding 0, flex 0 1 auto, minHeight 0
    <div memberBody>                  // chipListStyle + padding 0 14px 14px
      条目
    </div>
  </div>
</section>
```

## 风险

- `max-height` 与 `overflow: hidden` 依赖 flex 子项收缩；成员区必须 `min-height: 0`，否则不收缩。
- 卡片标题行加错误提示较高时，成员区可用高度相应减少。
- 旧 Chromium 与 Firefox 的滚动条宽度不同，Chromium 为 8px，Firefox 为系统细滚动条。
- 拖拽自动滚动依赖 `@dnd-kit/core` 对可滚动祖先的处理，需实机确认。
