/**
 * 配置页共享样式：只引用 `--dsw-alias-*` 主题令牌。
 * 导出各区域的内联样式常量。
 */
import type { CSSProperties } from 'react';

/** 页面纵向栈。 */
export const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '4px 0',
};

/** 工具栏：按钮与筛选框一行排列，窄屏折行。 */
export const toolbarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
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

/** 错误文字。 */
export const errorStyle: CSSProperties = {
  ...hintStyle,
  color: 'var(--dsw-alias-state-error-primary)',
};

/** 警告文字。 */
export const warnStyle: CSSProperties = {
  ...hintStyle,
  color: 'var(--dsw-alias-state-warn-primary)',
};

/** 次级按钮。 */
export const buttonStyle: CSSProperties = {
  height: 28,
  padding: '0 12px',
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 12,
  cursor: 'pointer',
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
  height: 28,
  minWidth: 0,
  padding: '0 8px',
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-base)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 12,
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
  gap: 8,
  padding: 12,
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 8,
  background: 'var(--dsw-alias-bg-layer-1)',
};

/** 拖拽经过时的放置区高亮。 */
export const cardActiveStyle: CSSProperties = {
  ...cardStyle,
  borderColor: 'var(--dsw-alias-brand-primary)',
  background: 'var(--dsw-alias-bg-layer-2)',
};

/** 卡片标题行：名称、计数与删除按钮。 */
export const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/** 成员列表：技能条目折行排列。 */
export const chipListStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  minHeight: 28,
};

/** 一个技能条目。 */
export const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  maxWidth: '100%',
  height: 26,
  padding: '0 4px 0 8px',
  border: '0.5px solid var(--dsw-alias-border-l1)',
  borderRadius: 13,
  background: 'var(--dsw-alias-bg-layer-2)',
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

/** 「移动到」下拉框。 */
export const selectStyle: CSSProperties = {
  height: 20,
  maxWidth: 96,
  border: 'none',
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 11,
  cursor: 'pointer',
};

/** 区块分隔：0.5px 的 l2 分隔线。 */
export const dividerStyle: CSSProperties = {
  borderTop: '0.5px solid var(--dsw-alias-border-l2)',
};
