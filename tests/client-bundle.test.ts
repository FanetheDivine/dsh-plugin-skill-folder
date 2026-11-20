// 前端产物契约测试：执行 dist/client.js，断言闭包工厂按包名注册、只请求平台种子、
// 导出 apply 且不声明必需服务，并能注册配置页。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import { makeClientCtx } from './helpers.ts';
import { assertFreshDist } from './support/dist-freshness.ts';

/** 仓库根目录（tests/ 的上一级）。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 前端产物路径。 */
const CLIENT_FILE = path.join(ROOT, 'dist', 'client.js');

/** 浏览器产物注册 id，与 package.json 的 name 一致。 */
const CLIENT_ID = 'dsh-plugin-skill-folder';

/** 宿主冻结模块表提供的平台种子，与 tsdown.config.ts 一致。 */
const PLATFORM_MODULES = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]);

/** 一条产物注册。 */
interface ClientRegistration {
  id: string;
  factory: (require: (id: string) => unknown) => Record<string, unknown>;
}

/** 在桩 window 中执行产物，返回注册列表。 */
function loadRegistrations(): ClientRegistration[] {
  const code = readFileSync(CLIENT_FILE, 'utf8');
  const registrations: ClientRegistration[] = [];
  vm.runInNewContext(code, {
    window: {
      __ModuleLoader__: {
        load: (registration: ClientRegistration) => {
          registrations.push(registration);
        },
      },
    },
  });
  return registrations;
}

/** 平台组件桩：产物在 apply 里只构造表单模型，不渲染组件。 */
const primitivesStub = {
  SettingsFormModel: class {
    bind(project: () => unknown) {
      return { getSnapshot: project, subscribe: () => () => undefined };
    }
    shell() {
      return {
        available: true,
        writable: true,
        dirty: false,
        invalid: false,
        saving: false,
        failed: false,
      };
    }
    field() {
      return { text: '', overridden: false, invalid: false };
    }
    actions() {
      return {
        edit: () => undefined,
        resetField: () => undefined,
        save: () => undefined,
        discard: () => undefined,
      };
    }
    dispose() {}
  },
  SettingsForm: () => null,
};

describe('前端产物（dist/client.js）', () => {
  it('按包名注册闭包工厂，只请求平台种子，导出 apply 且不声明必需服务', () => {
    assertFreshDist();
    const registrations = loadRegistrations();
    expect(registrations).toHaveLength(1);
    const registration = registrations[0];
    expect(registration?.id).toBe(CLIENT_ID);

    const nodeRequire = createRequire(import.meta.url);
    const requested = new Set<string>();
    const exported = registration?.factory((id) => {
      requested.add(id);
      if (!PLATFORM_MODULES.has(id)) throw new Error(`产物请求了平台种子之外的模块：${id}`);
      if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitivesStub;
      return nodeRequire(id);
    });
    if (exported === undefined) throw new Error('产物工厂没有返回导出对象');
    expect(exported).not.toHaveProperty('inject');
    // 拖拽库内联进产物
    expect([...requested].some((id) => id.startsWith('@dnd-kit/'))).toBe(false);

    const ctx = makeClientCtx();
    (exported.apply as (target: unknown) => void)(ctx);
    expect(ctx._slotInjections).toEqual(['plugins.row.config']);
    expect(ctx._slotRegistrations[0]?.options.key).toBe(`${CLIENT_ID}#${CLIENT_ID}`);
  });
});
