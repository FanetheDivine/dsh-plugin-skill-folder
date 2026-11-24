/** 共享常量：插件标识、工具名、配置默认值与路由路径。 */

/** 插件标识，同时是包名、字典命名空间与 cordis.patch.yml 的行 id。 */
export const PLUGIN_ID = 'dsh-plugin-skill-folder';

/** 错误消息使用的插件标识。 */
export const PLUGIN_LABEL = PLUGIN_ID;

/** 检索工具名。 */
export const TOOL_NAME = 'skill_search';

/** 全局技能列表路由。 */
export const ROUTE_PATH = '/api/skill-folder/skills';

/** 折叠标记，写入目录消息的 source。 */
export const FOLDED_BY = PLUGIN_ID;

/** 搜索默认返回数量。 */
export const DEFAULT_LIMIT = 5;

/** 摘要默认字符上限。 */
export const DEFAULT_DESCRIPTION_MAX_LENGTH = 320;

/** 搜索返回数量上限。 */
export const MAX_LIMIT = 20;

/** 摘要字符上限范围。 */
export const DESCRIPTION_MAX_LENGTH_RANGE = { min: 40, max: 2000 } as const;

/** 查询词字符上限。 */
export const MAX_QUERY_LENGTH = 512;

/** 文件夹名称字符上限。 */
export const MAX_FOLDER_NAME_LENGTH = 64;

/** 文件夹简介字符上限。 */
export const MAX_FOLDER_DESCRIPTION_LENGTH = 500;

/** 文件夹卡片高度上限（px），超出的成员在卡片内滚动。 */
export const FOLDER_CARD_MAX_HEIGHT = 500;

/** 未分组区域在界面与拖放中的标识。 */
export const UNGROUPED_ID = '__ungrouped__';
