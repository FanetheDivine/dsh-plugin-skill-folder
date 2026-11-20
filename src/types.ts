/**
 * 共享类型：再导出宿主类型与插件配置类型。
 * 全部为 type-only 导入，编译后不留运行时依赖。
 */

import type { Context, Events, Volatile } from '@deepseek-ai/cordis';
// Type-only：拉取 loader/volatile-update 事件声明。
import type {} from '@deepseek-ai/cordis-plugin-loader';

/** 宿主类型。插件内统一从这里导入。 */
export type { Context, Events, Volatile };
