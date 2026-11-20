/**
 * 文件夹卡片：名称与简介输入、成员列表、放置区与删除按钮。
 * 导出 FolderCard、folderDropId 与其 props。
 */

import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { useDroppable } from '@dnd-kit/core';
import { useId } from 'react';

import type { FolderConfig } from '../config.ts';
import { MAX_FOLDER_NAME_LENGTH } from '../constants.ts';
import type { FolderError } from '../folders.ts';
import type { NS } from './locales.ts';
import { SkillChip } from './skill-chip.tsx';
import {
  badgeStyle,
  cardActionsStyle,
  cardActiveStyle,
  cardHeaderStyle,
  cardStyle,
  chipListStyle,
  collapseIconStyle,
  errorStyle,
  folderNameInputStyle,
  hintStyle,
  iconButtonStyle,
  inputStyle,
  invalidInputStyle,
  textButtonStyle,
} from './styles.ts';

/** 文件夹放置区的 id：用下标，名称编辑时保持稳定。 */
export function folderDropId(index: number): string {
  return `folder:${String(index)}`;
}

/** 文件夹卡片 props。 */
export interface FolderCardProps {
  /** 文件夹下标。 */
  index: number;
  /** 文件夹。 */
  folder: FolderConfig;
  /** 当前筛选后可见的成员。 */
  visibleSkills: readonly string[];
  /** 是否折叠成员列表。 */
  collapsed: boolean;
  /** 是否正在筛选。 */
  filterActive: boolean;
  /** 全部文件夹名，用于成员的下拉框。 */
  folderNames: readonly string[];
  /** 技能名到描述的映射，缺失的成员标为未找到。 */
  descriptions: ReadonlyMap<string, string>;
  /** 列表是否已加载，未加载时不标记未找到。 */
  loaded: boolean;
  /** 本文件夹的校验错误。 */
  errors: readonly FolderError[];
  /** 是否禁用编辑。 */
  disabled: boolean;
  /** 字典。 */
  t: TranslateNS<typeof NS>;
  /** 改名。 */
  onRename: (index: number, name: string) => void;
  /** 改简介。 */
  onDescribe: (index: number, description: string) => void;
  /** 删除。 */
  onRemove: (index: number) => void;
  /** 切换成员列表折叠状态。 */
  onToggle: (index: number) => void;
  /** 移动技能。 */
  onMove: (skill: string, target: string | null) => void;
}

/** 名称错误对应的文案。 */
function nameError(errors: readonly FolderError[], t: TranslateNS<typeof NS>): string | undefined {
  for (const error of errors) {
    if (error.code === 'name-empty') return t('folder.nameEmpty');
    if (error.code === 'name-too-long') {
      return t('folder.nameTooLong', { max: String(MAX_FOLDER_NAME_LENGTH) });
    }
    if (error.code === 'name-duplicate') return t('folder.nameDuplicate');
  }
  return undefined;
}

/**
 * 渲染一个文件夹卡片。
 * @param props - 文件夹、技能描述、错误与编辑动作。
 * @returns 可放置技能的卡片。
 */
export function FolderCard(props: FolderCardProps) {
  const { t, folder, index } = props;
  const id = useId();
  const { setNodeRef, isOver } = useDroppable({
    id: folderDropId(index),
    disabled: props.disabled,
  });
  const nameMessage = nameError(props.errors, t);
  return (
    <section
      ref={setNodeRef}
      style={isOver ? cardActiveStyle : cardStyle}
      data-folder-card={folder.name}
      aria-label={folder.name}
    >
      <div style={cardHeaderStyle}>
        <button
          type="button"
          style={iconButtonStyle}
          aria-label={t(props.collapsed ? 'folder.expand' : 'folder.collapse', {
            name: folder.name || t('folder.name'),
          })}
          aria-expanded={!props.collapsed}
          aria-controls={`${id}-members`}
          onClick={() => {
            props.onToggle(index);
          }}
        >
          <span
            aria-hidden="true"
            style={{
              ...collapseIconStyle,
              transform: props.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </span>
        </button>
        <input
          id={`${id}-name`}
          data-folder-name-index={index}
          aria-label={t('folder.name')}
          aria-invalid={nameMessage === undefined ? undefined : true}
          aria-errormessage={nameMessage === undefined ? undefined : `${id}-name-error`}
          placeholder={t('folder.namePlaceholder')}
          style={
            nameMessage === undefined
              ? folderNameInputStyle
              : { ...folderNameInputStyle, ...invalidInputStyle }
          }
          value={folder.name}
          disabled={props.disabled}
          onChange={(event) => {
            props.onRename(index, event.target.value);
          }}
        />
        <div style={cardActionsStyle}>
          <span style={badgeStyle}>
            {props.filterActive
              ? t('folder.visibleMembers', {
                  visible: String(props.visibleSkills.length),
                  total: String(folder.skills.length),
                })
              : t('folder.members', { count: String(folder.skills.length) })}
          </span>
          <button
            type="button"
            style={textButtonStyle}
            disabled={props.disabled}
            onClick={() => {
              props.onRemove(index);
            }}
          >
            {t('folder.delete')}
          </button>
        </div>
      </div>
      {nameMessage === undefined ? null : (
        <p id={`${id}-name-error`} style={errorStyle} role="alert">
          {nameMessage}
        </p>
      )}
      <input
        aria-label={t('folder.description')}
        placeholder={t('folder.descriptionPlaceholder')}
        style={inputStyle}
        value={folder.description}
        disabled={props.disabled}
        onChange={(event) => {
          props.onDescribe(index, event.target.value);
        }}
      />
      <div
        id={`${id}-members`}
        style={chipListStyle}
        data-folder-members={folder.name}
        hidden={props.collapsed}
      >
        {folder.skills.length === 0 ? (
          <span style={hintStyle}>{t('folder.empty')}</span>
        ) : props.visibleSkills.length === 0 ? (
          <span style={hintStyle}>{t('folder.noMatches')}</span>
        ) : (
          props.visibleSkills.map((skill) => (
            <SkillChip
              key={skill}
              name={skill}
              description={props.descriptions.get(skill)}
              folder={folder.name}
              folders={props.folderNames}
              missing={props.loaded && !props.descriptions.has(skill)}
              disabled={props.disabled}
              t={t}
              onMove={props.onMove}
            />
          ))
        )}
      </div>
    </section>
  );
}
