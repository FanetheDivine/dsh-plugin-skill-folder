/**
 * 配置页共享样式：只引用 `--dsw-alias-*` 主题令牌。
 * 导出各区域的内联样式常量。
 */
import type { CSSProperties } from 'react';

import { FOLDER_CARD_MAX_HEIGHT } from '../constants.ts';

/** 页面纵向栈，限制内容宽度并允许窄屏收缩。 */
export const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  width: '100%',
  maxWidth: 1200,
  minWidth: 0,
  margin: '0 auto',
  padding: '8px 0',
  boxSizing: 'border-box',
};

/** 页面标题与用途说明。 */
export const pageHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

/** 页面主标题。 */
export const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 1.4,
  color: 'var(--dsw-alias-label-primary)',
};

/** 页面用途说明。 */
export const pageDescriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: 720,
  fontSize: 13,
  lineHeight: '20px',
  color: 'var(--dsw-alias-label-secondary)',
};

/** 分组操作与筛选所在的工具面板。 */
export const toolbarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 10,
  background: 'var(--dsw-alias-bg-layer-1)',
};

/** 工具栏内的主要操作组。 */
export const toolbarActionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
};

/** 筛选输入与结果计数的容器。 */
export const filterGroupStyle: CSSProperties = {
  display: 'flex',
  flex: '1 1 240px',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  minWidth: 0,
};

/** 自适应文件夹卡片网格。 */
export const folderGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
  gap: 12,
  alignItems: 'start',
};

/** 文件夹与未分组区域的共同容器。 */
export const folderSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minWidth: 0,
};

/** 区块标题行。 */
export const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

/** 区域计数与状态 badge。 */
export const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 20,
  padding: '0 7px',
  borderRadius: 10,
  background: 'var(--dsw-alias-bg-layer-2)',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 11,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
};

/** 加载、错误与警告状态的统一容器。 */
export const statusStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  margin: 0,
  padding: '8px 10px',
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 8,
  background: 'var(--dsw-alias-bg-layer-1)',
};

/** 区块标题。 */
export const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
};

/** 次级说明文字。 */
export const hintStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-secondary)',
};

/** 错误状态容器与文字。 */
export const errorStyle: CSSProperties = {
  ...statusStyle,
  ...hintStyle,
  borderColor: 'var(--dsw-alias-state-error-primary)',
  color: 'var(--dsw-alias-state-error-primary)',
};

/** 警告状态容器与文字。 */
export const warnStyle: CSSProperties = {
  ...statusStyle,
  ...hintStyle,
  borderColor: 'var(--dsw-alias-state-warn-primary)',
  color: 'var(--dsw-alias-state-warn-primary)',
};

/** 次级按钮。 */
export const buttonStyle: CSSProperties = {
  minHeight: 30,
  padding: '0 12px',
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-layer-2)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

/** 主要操作按钮。 */
export const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: 'var(--dsw-alias-brand-primary)',
  background: 'var(--dsw-alias-brand-primary)',
  color: 'var(--dsw-alias-bg-base)',
};

/** 折叠等紧凑图标按钮。 */
export const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  flex: '0 0 28px',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  padding: 0,
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary)',
  cursor: 'pointer',
  fontSize: 16,
};

/** 文字按钮，用于删除等低强调操作。 */
export const textButtonStyle: CSSProperties = {
  height: 24,
  padding: '0 6px',
  border: 'none',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  cursor: 'pointer',
};

/** 单行输入框。 */
export const inputStyle: CSSProperties = {
  height: 30,
  minWidth: 0,
  padding: '0 9px',
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-base)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 12,
  boxSizing: 'border-box',
};

/** 文件夹名称输入框。 */
export const folderNameInputStyle: CSSProperties = {
  ...inputStyle,
  flex: '1 1 160px',
  fontWeight: 600,
};

/** 筛选输入框。 */
export const filterInputStyle: CSSProperties = {
  ...inputStyle,
  flex: '1 1 140px',
  width: '100%',
};

/** 非法输入框。 */
export const invalidInputStyle: CSSProperties = {
  ...inputStyle,
  borderColor: 'var(--dsw-alias-state-error-primary)',
};

/** 文件夹卡片与未分组区域的外框。 */
export const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minWidth: 0,
  padding: 14,
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 10,
  background: 'var(--dsw-alias-bg-layer-1)',
  boxSizing: 'border-box',
};

/** 拖拽经过时的放置区高亮。 */
export const cardActiveStyle: CSSProperties = {
  ...cardStyle,
  borderColor: 'var(--dsw-alias-brand-primary)',
  background: 'var(--dsw-alias-bg-layer-2)',
};

/** 文件夹卡片外框：内边距交给内层，滚动条才能贴住卡片内边缘。 */
export const folderCardStyle: CSSProperties = {
  ...cardStyle,
  gap: 0,
  padding: 0,
  maxHeight: FOLDER_CARD_MAX_HEIGHT,
  overflow: 'hidden',
};

/** 文件夹卡片被拖拽经过时的放置区高亮。 */
export const folderCardActiveStyle: CSSProperties = {
  ...folderCardStyle,
  borderColor: 'var(--dsw-alias-brand-primary)',
  background: 'var(--dsw-alias-bg-layer-2)',
};

/** 卡片内层：承载标题行、名称错误与简介的内边距。 */
export const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: 10,
  padding: 14,
};

/** 成员区滚动容器：零内边距，滚动条贴住卡片内边缘。 */
export const memberScrollStyle: CSSProperties = {
  flex: '0 1 auto',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
};

/** 卡片标题行：名称、计数与删除按钮。 */
export const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
};

/** 卡片右侧计数与操作。 */
export const cardActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginLeft: 'auto',
};

/** 折叠箭头。 */
export const collapseIconStyle: CSSProperties = {
  display: 'inline-block',
  lineHeight: 1,
  transition: 'transform 120ms ease',
};

/** 成员列表：技能条目折行排列。 */
export const chipListStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  minHeight: 30,
  minWidth: 0,
};

/** 滚动容器内层：条目相对卡片边缘的内缩放在这里。 */
export const memberBodyStyle: CSSProperties = {
  ...chipListStyle,
  padding: '0 14px 14px',
};

/** 一个技能条目。 */
export const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  maxWidth: '100%',
  minHeight: 28,
  padding: '2px 4px 2px 8px',
  border: '0.5px solid var(--dsw-alias-border-l1)',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-layer-2)',
  boxSizing: 'border-box',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 12,
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
};

/** 未找到的成员。 */
export const missingChipStyle: CSSProperties = {
  ...chipStyle,
  color: 'var(--dsw-alias-state-warn-primary)',
  borderStyle: 'dashed',
  cursor: 'default',
};

/** 条目名称：超长时省略。 */
export const chipNameStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 独立拖拽手柄与技能名称。 */
export const dragHandleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
  padding: 0,
  border: 0,
  borderRadius: 4,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  cursor: 'grab',
  touchAction: 'none',
};

/** 拖拽手柄图标。 */
export const dragIconStyle: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  letterSpacing: -2,
};

/** 仅供读屏播报的实时状态。 */
export const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** 「移动到」菜单的触发按钮：显示当前分组与下拉箭头。 */
export const moveTriggerStyle: CSSProperties = {
  display: 'inline-flex',
  flexShrink: 0,
  alignItems: 'center',
  gap: 2,
  height: 20,
  maxWidth: 112,
  padding: '0 4px 0 6px',
  border: 'none',
  borderRadius: 4,
  background: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-secondary)',
  font: 'inherit',
  fontSize: 11,
  cursor: 'pointer',
};

/** 触发按钮内的分组名：超长时省略。 */
export const moveTriggerLabelStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 区块分隔：0.5px 的 l2 分隔线。 */
export const dividerStyle: CSSProperties = {
  borderTop: '0.5px solid var(--dsw-alias-border-l2)',
};

/** 搜索选项的自适应两列布局。 */
export const optionsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
  gap: 12,
  paddingTop: 4,
};

/** 页面内控件的键盘焦点样式。 */
export const focusStyleText = `
  [data-skill-folder-page] button:focus-visible,
  [data-skill-folder-page] input:focus-visible,
  [data-skill-folder-page] [data-skill-drag-handle]:focus-visible {
    outline: 2px solid var(--dsw-alias-brand-primary);
    outline-offset: 2px;
  }
  [data-skill-folder-page] button:disabled,
  [data-skill-folder-page] input:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  [data-skill-folder-page] [data-skill-move]:not(:disabled):hover,
  [data-skill-folder-page] [data-skill-move][aria-expanded='true'] {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-primary);
  }
`;

/** 成员区滚动条：Chromium 用 8px 细滚动条，其他引擎退回标准滚动条属性。 */
export const scrollbarStyleText = `
  [data-skill-folder-page] [data-folder-members]::-webkit-scrollbar {
    width: 8px;
  }
  [data-skill-folder-page] [data-folder-members]::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: var(--dsw-alias-label-secondary);
  }
  [data-skill-folder-page] [data-folder-members]::-webkit-scrollbar-track {
    background: transparent;
  }
  @supports not selector(::-webkit-scrollbar) {
    [data-skill-folder-page] [data-folder-members] {
      scrollbar-width: thin;
      scrollbar-color: var(--dsw-alias-label-secondary) transparent;
    }
  }
`;
