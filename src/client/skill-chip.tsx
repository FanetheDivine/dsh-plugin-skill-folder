/**
 * 技能条目：可拖拽，并提供「移动到」下拉框作为键盘与非拖拽操作的替代。
 * 导出 SkillChip 与其 props。
 */

import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { useDraggable } from '@dnd-kit/core';
import type { NS } from './locales.ts';
import {
  chipNameStyle,
  chipStyle,
  dragHandleStyle,
  dragIconStyle,
  missingChipStyle,
  selectStyle,
} from './styles.ts';

/** 下拉框中「未分组」选项的值。 */
const UNGROUPED_VALUE = '';

/** 技能条目 props。 */
export interface SkillChipProps {
  /** 技能名。 */
  name: string;
  /** 描述，作为悬停提示。 */
  description?: string | undefined;
  /** 当前所属文件夹名，未分组时为 null。 */
  folder: string | null;
  /** 全部文件夹名，用于下拉框。 */
  folders: readonly string[];
  /** 技能当前是否不存在。 */
  missing?: boolean | undefined;
  /** 是否禁用编辑。 */
  disabled: boolean;
  /** 字典。 */
  t: TranslateNS<typeof NS>;
  /** 移动技能。 */
  onMove: (skill: string, target: string | null) => void;
}

/**
 * 渲染一个技能条目。
 * @param props - 技能、归属、可选文件夹与移动动作。
 * @returns 可拖拽的条目。
 */
export function SkillChip(props: SkillChipProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: props.name,
      disabled: props.disabled || props.missing === true,
      data: { folder: props.folder },
    });
  const style = {
    ...(props.missing === true ? missingChipStyle : chipStyle),
    ...(transform === null
      ? {}
      : { transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)` }),
    ...(isDragging ? { opacity: 0.6, zIndex: 1, position: 'relative' as const } : {}),
  };
  return (
    <span
      ref={setNodeRef}
      style={style}
      title={props.missing === true ? props.t('folder.missing') : props.description}
      data-skill-chip={props.name}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        style={dragHandleStyle}
        data-skill-drag-handle={props.name}
        aria-label={props.t('skill.drag', { name: props.name })}
        {...listeners}
        {...attributes}
      >
        <span aria-hidden="true" style={dragIconStyle}>
          ⠿
        </span>
        <span style={{ ...chipNameStyle, minWidth: 0 }}>{props.name}</span>
      </button>
      <select
        aria-label={`${props.t('skill.move')} ${props.name}`}
        data-skill-move={props.name}
        style={{ ...selectStyle, flexShrink: 0 }}
        value={props.folder ?? UNGROUPED_VALUE}
        disabled={props.disabled}
        // 下拉框交互时不触发拖拽
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        onChange={(event) => {
          const value = event.target.value;
          props.onMove(props.name, value === UNGROUPED_VALUE ? null : value);
        }}
      >
        <option value={UNGROUPED_VALUE}>{props.t('skill.moveToUngrouped')}</option>
        {props.folders.map((folder) => (
          <option key={folder} value={folder}>
            {folder}
          </option>
        ))}
      </select>
    </span>
  );
}
