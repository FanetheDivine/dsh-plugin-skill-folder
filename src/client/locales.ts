/**
 * 前端字典与命名空间。
 * 导出 NS、FolderKey、zh、en；中文字典是键集事实源。
 */
import { PLUGIN_ID } from '../constants.ts';

/** 前端使用的字典命名空间，与插件名一致。 */
export const NS = PLUGIN_ID;

/** 中文字典。 */
export const zh = {
  'page.summary': '把全局技能归入文件夹，模型目录只显示文件夹摘要',
  'page.title': '技能文件夹',
  'page.loading': '正在读取技能…',
  'page.loadFailed': '读取技能失败：{message}',
  'page.incomplete': '技能列表可能不完整，稍后重试读取。',
  'page.retry': '重新读取',
  'page.unavailable': '技能文件夹配置不可用。',
  'page.readOnly': '此部署以只读方式保存设置。',
  'page.saveFailed': '此部署未接受这些值，已保留以便修改。',
  'page.save': '保存',
  'page.saving': '保存中…',
  'page.discard': '放弃修改',
  'page.overridden': '已覆盖',
  'page.reset': '恢复默认',
  'folder.create': '新建文件夹',
  'folder.name': '文件夹名称',
  'folder.namePlaceholder': '例如 lark',
  'folder.description': '简介',
  'folder.descriptionPlaceholder': '这个文件夹里的技能用来做什么',
  'folder.delete': '删除文件夹',
  'folder.members': '{count} 个技能',
  'folder.empty': '把技能拖到这里',
  'folder.missing': '未找到',
  'folder.removeMember': '移出文件夹',
  'folder.nameEmpty': '文件夹名称不能为空。',
  'folder.nameTooLong': '文件夹名称最多 {max} 个字符。',
  'folder.nameDuplicate': '已有同名文件夹。',
  'folder.invalid': '文件夹配置有误，修正后才能保存。',
  'ungrouped.title': '未分组的技能',
  'ungrouped.empty': '全部技能都已分组。',
  'ungrouped.drop': '拖到这里移出文件夹',
  'skill.move': '移动到',
  'skill.moveToUngrouped': '未分组',
  'autoGroup.label': '按前缀自动分组',
  'autoGroup.hint': '先按文件夹名匹配，其余按 - 分段最长公共前缀合并，成员不少于 2 个才成组。',
  'autoGroup.description': '{prefix} 系列技能',
  'filter.label': '筛选技能',
  'filter.placeholder': '按名称或描述筛选',
  'filter.empty': '没有匹配的技能。',
  'options.title': '搜索选项',
  'options.defaultLimit': '默认返回数量',
  'options.defaultLimitHint': '1–20，模型未指定数量时使用。',
  'options.descriptionMaxLength': '摘要长度上限',
  'options.descriptionMaxLengthHint': '40–2000 字符，超出部分用省略号截断。',
} as const;

/** 英文字典，键集与中文一致。 */
export const en: Record<FolderKey, string> = {
  'page.summary': 'Group global skills into folders so the model catalog lists folder summaries',
  'page.title': 'Skill folders',
  'page.loading': 'Loading skills…',
  'page.loadFailed': 'Could not load skills: {message}',
  'page.incomplete': 'The skill list may be incomplete; reload to retry.',
  'page.retry': 'Reload',
  'page.unavailable': 'Skill folder settings are unavailable.',
  'page.readOnly': 'This deployment stores settings read-only.',
  'page.saveFailed':
    'The deployment did not accept these values; they were left for you to correct.',
  'page.save': 'Save',
  'page.saving': 'Saving…',
  'page.discard': 'Discard changes',
  'page.overridden': 'Overridden',
  'page.reset': 'Restore default',
  'folder.create': 'New folder',
  'folder.name': 'Folder name',
  'folder.namePlaceholder': 'for example lark',
  'folder.description': 'Description',
  'folder.descriptionPlaceholder': 'What the skills in this folder are for',
  'folder.delete': 'Delete folder',
  'folder.members': '{count} skills',
  'folder.empty': 'Drop skills here',
  'folder.missing': 'Not found',
  'folder.removeMember': 'Remove from folder',
  'folder.nameEmpty': 'A folder name is required.',
  'folder.nameTooLong': 'A folder name holds at most {max} characters.',
  'folder.nameDuplicate': 'Another folder already uses this name.',
  'folder.invalid': 'Fix the folder settings before saving.',
  'ungrouped.title': 'Ungrouped skills',
  'ungrouped.empty': 'Every skill is grouped.',
  'ungrouped.drop': 'Drop here to remove from a folder',
  'skill.move': 'Move to',
  'skill.moveToUngrouped': 'Ungrouped',
  'autoGroup.label': 'Group by prefix',
  'autoGroup.hint':
    'Matches folder names first, then merges the rest by their longest shared - segment prefix; a group needs at least 2 members.',
  'autoGroup.description': 'Skills in the {prefix} family',
  'filter.label': 'Filter skills',
  'filter.placeholder': 'Filter by name or description',
  'filter.empty': 'No skill matches this filter.',
  'options.title': 'Search options',
  'options.defaultLimit': 'Default result count',
  'options.defaultLimitHint': '1–20, used when the model omits a count.',
  'options.descriptionMaxLength': 'Summary length limit',
  'options.descriptionMaxLengthHint': '40–2000 characters; longer text is cut with an ellipsis.',
};

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 技能文件夹前端文案，键集取自中文字典。 */
    'dsh-plugin-skill-folder': FolderKey;
  }
}

/** 技能文件夹前端可用的字典键。 */
export type FolderKey = keyof typeof zh;
