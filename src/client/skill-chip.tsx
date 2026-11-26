/**
 * 技能条目：可拖拽，并提供「移动到」菜单作为键盘与非拖拽操作的替代。
 * 导出 SkillChip、其 props 与菜单项构造函数 moveMenuEntries。
 */

import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives';
import {
  IconChevronDownOutlineRegular,
  IconDragHandleOutlineRegular,
  Menu,
} from '@deepseek-ai/dsh-client-ui-primitives';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import type { NS } from './locales.ts';
import {
  chipNameStyle,
  chipStyle,
  dragHandleStyle,
  dragIconStyle,
  missingChipStyle,
  moveTriggerLabelStyle,
  moveTriggerStyle,
} from './styles.ts';

/** 菜单中「未分组」项的 id。 */
export const UNGROUPED_ID = 'ungrouped';

/** 文件夹菜单项 id 的前缀，后接文件夹下标，避免与任意文件夹名冲突。 */
const FOLDER_ID_PREFIX = 'folder:';

/**
 * 构造「移动到」菜单项：标题、未分组、分隔线与全部文件夹。
 * @param folders - 全部文件夹名。
 * @param t - 字典。
 * @returns 菜单数据行。
 */
export function moveMenuEntries(
  folders: readonly string[],
  t: TranslateNS<typeof NS>,
): MenuEntry[] {
  const entries: MenuEntry[] = [
    { type: 'label', id: 'move-label', text: t('skill.move') },
    { id: UNGROUPED_ID, label: t('skill.moveToUngrouped') },
  ];
  if (folders.length > 0) entries.push({ type: 'separator', id: 'move-separator' });
  folders.forEach((folder, index) => {
    entries.push({
      id: `${FOLDER_ID_PREFIX}${String(index)}`,
      label: folder === '' ? t('skill.untitledFolder') : folder,
    });
  });
  return entries;
}

/**
 * 把菜单项 id 还原为目标文件夹。
 * @param id - 被选中的菜单项 id。
 * @param folders - 全部文件夹名。
 * @returns 文件夹名，未分组为 null，无法识别时为 undefined。
 */
export function moveTargetOf(id: string, folders: readonly string[]): string | null | undefined {
  if (id === UNGROUPED_ID) return null;
  if (!id.startsWith(FOLDER_ID_PREFIX)) return undefined;
  return folders[Number(id.slice(FOLDER_ID_PREFIX.length))];
}

/**
 * 计算当前归属对应的菜单项 id。
 * @param folder - 当前所属文件夹名，未分组为 null。
 * @param folders - 全部文件夹名。
 * @returns 菜单项 id。
 */
export function moveSelectedId(folder: string | null, folders: readonly string[]): string {
  const index = folder === null ? -1 : folders.indexOf(folder);
  return index < 0 ? UNGROUPED_ID : `${FOLDER_ID_PREFIX}${String(index)}`;
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: props.name,
      disabled: props.disabled || props.missing === true,
      data: { folder: props.folder },
    });
  const currentLabel =
    props.folder === null
      ? props.t('skill.moveToUngrouped')
      : props.folder === ''
        ? props.t('skill.untitledFolder')
        : props.folder;
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
          <IconDragHandleOutlineRegular size={12} />
        </span>
        <span style={{ ...chipNameStyle, minWidth: 0 }}>{props.name}</span>
      </button>
      <Menu
        open={menuOpen && !props.disabled}
        portal
        autoFocus
        dense
        align="end"
        items={moveMenuEntries(props.folders, props.t)}
        selectedId={moveSelectedId(props.folder, props.folders)}
        onClose={() => {
          setMenuOpen(false);
        }}
        onSelect={(id) => {
          setMenuOpen(false);
          const target = moveTargetOf(id, props.folders);
          if (target !== undefined && target !== props.folder) props.onMove(props.name, target);
        }}
        anchor={
          <button
            type="button"
            style={moveTriggerStyle}
            aria-label={`${props.t('skill.move')} ${props.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={currentLabel}
            data-skill-move={props.name}
            disabled={props.disabled}
            // 菜单交互时不触发拖拽
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (!menuOpen && event.key === 'ArrowDown') {
                event.preventDefault();
                setMenuOpen(true);
              }
            }}
          >
            <span style={moveTriggerLabelStyle}>{currentLabel}</span>
            <IconChevronDownOutlineRegular size={12} />
          </button>
        }
      />
    </span>
  );
}
