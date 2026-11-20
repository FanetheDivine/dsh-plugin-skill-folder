/**
 * 插件行配置页：`summary` 一行描述；`page` 渲染工具栏、文件夹卡片与未分组列表，
 * 支持拖拽与「移动到」下拉框归组。
 * 导出 FolderPage、FolderPageProps 与 FolderPageInjectedWithLoader。
 */

// Type-only：拉取 plugins.row.config 槽位声明。
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives';
import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import type { FolderConfig } from '../config.ts';
import { UNGROUPED_ID } from '../constants.ts';
import { ungroupedOf, validateFolders } from '../folders.ts';
import type { SkillItem, SkillsPayload } from './api.ts';
import { autoGroup } from './auto-group.ts';
import { FolderCard, folderDropId } from './folder-card.tsx';
import { coerceFolders, type FolderPageInjected } from './folder-form.ts';
import type { NS } from './locales.ts';
import { SkillChip } from './skill-chip.tsx';
import {
  buttonStyle,
  cardActiveStyle,
  cardStyle,
  chipListStyle,
  dividerStyle,
  errorStyle,
  hintStyle,
  inputStyle,
  pageStyle,
  sectionTitleStyle,
  toolbarStyle,
  warnStyle,
} from './styles.ts';

/** 配置页注入值：表单动作加技能列表读取。 */
export interface FolderPageInjectedWithLoader extends FolderPageInjected {
  /** 读取全局技能列表。 */
  loadSkills: (signal?: AbortSignal) => Promise<SkillsPayload>;
}

/** 配置页组件 props：行配置页运行时值、字典与注入面。 */
export type FolderPageProps = PropsRuntime<'plugins.row.config'> &
  PropsLocale<typeof NS> &
  InjectFace<FolderPageInjectedWithLoader>;

/** 技能列表的读取状态。 */
type SkillsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; skills: SkillItem[]; complete: boolean };

/** 表单框架文案。 */
function formLabels(t: FolderPageProps['t']): SettingsFormLabels {
  return {
    unavailable: t('page.unavailable'),
    readOnly: t('page.readOnly'),
    saveFailed: t('page.saveFailed'),
    save: t('page.save'),
    saving: t('page.saving'),
  };
}

/** 读取全局技能列表，返回状态与重新读取函数。 */
function useSkills(load: FolderPageInjectedWithLoader['loadSkills']) {
  const [state, setState] = useState<SkillsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // attempt 变化时重新读取
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 是重试计数
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (payload) => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', skills: payload.skills, complete: payload.complete });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [load, attempt]);
  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);
  return { state, retry };
}

/** 按名称或描述筛选技能名。 */
function matchesFilter(name: string, description: string, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return true;
  return name.toLowerCase().includes(needle) || description.toLowerCase().includes(needle);
}

/** 未分组区域：也是一个放置区。 */
function UngroupedArea(props: {
  names: readonly string[];
  descriptions: ReadonlyMap<string, string>;
  folderNames: readonly string[];
  disabled: boolean;
  emptyText: string;
  t: FolderPageProps['t'];
  onMove: (skill: string, target: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNGROUPED_ID, disabled: props.disabled });
  return (
    <section
      ref={setNodeRef}
      style={isOver ? cardActiveStyle : cardStyle}
      data-ungrouped
      aria-label={props.t('ungrouped.title')}
    >
      <h3 style={sectionTitleStyle}>
        {props.t('ungrouped.title')}
        <span style={{ ...hintStyle, marginLeft: 8 }}>{String(props.names.length)}</span>
      </h3>
      <div style={chipListStyle}>
        {props.names.length === 0 ? (
          <span style={hintStyle}>{props.emptyText}</span>
        ) : (
          props.names.map((name) => (
            <SkillChip
              key={name}
              name={name}
              description={props.descriptions.get(name)}
              folder={null}
              folders={props.folderNames}
              disabled={props.disabled}
              t={props.t}
              onMove={props.onMove}
            />
          ))
        )}
      </div>
    </section>
  );
}

/**
 * 渲染技能文件夹配置。
 * @param props - 视图名、已暂存的表单、技能读取，以及编辑、保存与放弃动作。
 * @returns `page` 渲染分组界面，`summary` 渲染一行描述。
 */
export function FolderPage(props: FolderPageProps) {
  const { t } = props;
  const id = useId();
  const form = props.useConfigForm((value) => value);
  const { state: skillsState, retry } = useSkills(props.loadSkills);
  const [filter, setFilter] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const folders = useMemo<FolderConfig[]>(() => {
    try {
      return coerceFolders(JSON.parse(form.folders.text === '' ? '[]' : form.folders.text));
    } catch {
      return [];
    }
  }, [form.folders.text]);
  const errors = useMemo(() => validateFolders(folders), [folders]);
  const skills = skillsState.status === 'ready' ? skillsState.skills : [];
  const descriptions = useMemo(
    () => new Map(skills.map((skill) => [skill.name, skill.description])),
    [skills],
  );
  const folderNames = useMemo(
    () => folders.map((folder) => folder.name).filter((name) => name.trim() !== ''),
    [folders],
  );
  const ungrouped = useMemo(
    () =>
      ungroupedOf(
        folders,
        skills.map((skill) => skill.name),
      ).filter((name) => matchesFilter(name, descriptions.get(name) ?? '', filter)),
    [folders, skills, descriptions, filter],
  );

  const { moveSkill } = props;
  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const over = event.over?.id;
      if (over === undefined) return;
      const skill = String(event.active.id);
      if (over === UNGROUPED_ID) {
        moveSkill(skill, null);
        return;
      }
      const index = Number(String(over).slice('folder:'.length));
      const target = folders[index];
      if (target !== undefined) moveSkill(skill, target.name);
    },
    [folders, moveSkill],
  );

  if (props.view === 'summary') return t('page.summary');
  const disabled = !form.writable || form.saving;

  return (
    <SettingsForm labels={formLabels(t)} state={form} onSave={props.save} onDiscard={props.discard}>
      <div style={pageStyle} data-skill-folder-page>
        <div style={toolbarStyle}>
          <button
            type="button"
            style={buttonStyle}
            disabled={disabled}
            onClick={() => {
              props.addFolder('');
            }}
          >
            {t('folder.create')}
          </button>
          <button
            type="button"
            style={buttonStyle}
            disabled={disabled || skillsState.status !== 'ready'}
            onClick={() => {
              props.replaceFolders(
                autoGroup(
                  folders,
                  skills.map((skill) => skill.name),
                  (prefix) => t('autoGroup.description', { prefix }),
                ),
              );
            }}
          >
            {t('autoGroup.label')}
          </button>
          <input
            aria-label={t('filter.label')}
            placeholder={t('filter.placeholder')}
            style={{ ...inputStyle, flex: '1 1 160px' }}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
            }}
          />
          {form.dirty ? (
            <button
              type="button"
              style={buttonStyle}
              disabled={form.saving}
              onClick={props.discard}
            >
              {t('page.discard')}
            </button>
          ) : null}
        </div>

        {skillsState.status === 'loading' ? <p style={hintStyle}>{t('page.loading')}</p> : null}
        {skillsState.status === 'error' ? (
          <p style={errorStyle} role="alert">
            {t('page.loadFailed', { message: skillsState.message })}{' '}
            <button type="button" style={buttonStyle} onClick={retry}>
              {t('page.retry')}
            </button>
          </p>
        ) : null}
        {skillsState.status === 'ready' && !skillsState.complete ? (
          <p style={warnStyle} role="status">
            {t('page.incomplete')}
          </p>
        ) : null}
        {errors.length > 0 ? (
          <p style={errorStyle} role="alert">
            {t('folder.invalid')}
          </p>
        ) : null}

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          {folders.map((folder, index) => (
            <FolderCard
              // 下标稳定：名称编辑时卡片不重建，输入框保持焦点
              // biome-ignore lint/suspicious/noArrayIndexKey: 文件夹以下标定位
              key={folderDropId(index)}
              index={index}
              folder={folder}
              folderNames={folderNames}
              descriptions={descriptions}
              loaded={skillsState.status === 'ready'}
              errors={errors.filter((error) => error.index === index)}
              disabled={disabled}
              t={t}
              onRename={props.renameFolder}
              onDescribe={props.describeFolder}
              onRemove={props.removeFolder}
              onMove={props.moveSkill}
            />
          ))}
          <UngroupedArea
            names={ungrouped}
            descriptions={descriptions}
            folderNames={folderNames}
            disabled={disabled}
            emptyText={filter.trim() === '' ? t('ungrouped.empty') : t('filter.empty')}
            t={t}
            onMove={props.moveSkill}
          />
        </DndContext>

        <div style={{ ...dividerStyle, paddingTop: 12 }} data-skill-folder-options>
          <h3 style={sectionTitleStyle}>{t('options.title')}</h3>
          <SettingsValueField
            id={`${id}-default-limit`}
            label={t('options.defaultLimit')}
            hint={t('options.defaultLimitHint')}
            invalidLabel={t('options.defaultLimitHint')}
            overriddenLabel={t('page.overridden')}
            resetLabel={t('page.reset')}
            text={form.defaultLimit.text}
            overridden={form.defaultLimit.overridden}
            invalid={form.defaultLimit.invalid}
            disabled={disabled}
            numeric
            onEdit={(text) => {
              props.edit('defaultLimit', text);
            }}
            onReset={() => {
              props.resetField('defaultLimit');
            }}
          />
          <SettingsValueField
            id={`${id}-description-max`}
            label={t('options.descriptionMaxLength')}
            hint={t('options.descriptionMaxLengthHint')}
            invalidLabel={t('options.descriptionMaxLengthHint')}
            overriddenLabel={t('page.overridden')}
            resetLabel={t('page.reset')}
            text={form.descriptionMaxLength.text}
            overridden={form.descriptionMaxLength.overridden}
            invalid={form.descriptionMaxLength.invalid}
            disabled={disabled}
            numeric
            onEdit={(text) => {
              props.edit('descriptionMaxLength', text);
            }}
            onReset={() => {
              props.resetField('descriptionMaxLength');
            }}
          />
        </div>
      </div>
    </SettingsForm>
  );
}
