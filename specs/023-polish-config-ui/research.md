# Research: 优化技能文件夹配置 UI

## 布局与视觉层级

- **Decision**: 使用页面标题与说明、独立操作区、响应式文件夹网格、未分组区和搜索选项区。
- **Rationale**: 现有页面只有工具栏与纵向卡片，主要任务和设置层级不够清晰。
- **Alternatives Considered**: 引入宿主新组件或第三方 UI 库。当前依赖已能满足需求，保持现有依赖更稳妥。

## 统一筛选

- **Decision**: 在 `FolderPage` 计算每个文件夹的可见成员和未分组可见成员，共用名称、描述匹配函数。
- **Rationale**: 同一份筛选词可覆盖所有区域，计数可直接从可见集合得出。
- **Alternatives Considered**: 每张卡片独立筛选。页面集中计算能保持结果计数和空状态一致。

## 文件夹折叠

- **Decision**: 页面保存折叠下标集合，卡片用按钮控制 `aria-expanded` 与成员区域的可见性。
- **Rationale**: 卡片始终挂载，拖放目标和编辑字段保持可用；成员列表是唯一隐藏区域。
- **Alternatives Considered**: 卸载整张卡片或把折叠状态写入配置。前者影响拖放，后者会把临时视图状态持久化。

## 删除后的折叠状态

- **Decision**: 删除文件夹时移除对应下标，并把后继折叠下标减一。
- **Rationale**: 文件夹使用下标定位，同步调整可避免折叠状态落到相邻文件夹。
- **Alternatives Considered**: 新增持久化 id。配置结构无需为临时视图状态扩展。

## 验证

- **Decision**: 使用 Vitest 验证筛选纯函数、折叠状态调整、DOM 结构和双语，再用 Playwright 验证桌面与 320px 窄屏布局。
- **Rationale**: 单元测试覆盖行为，浏览器检查覆盖实际布局与交互。
- **Alternatives Considered**: 只做静态渲染。它无法发现横向溢出和真实折叠交互问题。

## 依赖与兼容

- **Decision**: 保持 DSH、React 与拖拽依赖版本不变，只使用 CSS 主题令牌和标准 React 状态。
- **Rationale**: UI 优化不需要新接口或依赖。
- **Alternatives Considered**: 升级宿主依赖或增加图标库。二者都扩大交付风险。
