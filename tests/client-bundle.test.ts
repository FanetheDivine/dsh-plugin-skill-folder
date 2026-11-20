// 前端产物契约测试：执行 dist/client.js，断言闭包工厂按包名注册并导出 apply，不声明必需服务。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import { assertFreshDist } from './support/dist-freshness.ts';

/** 仓库根目录（tests/ 的上一级）。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 前端产物路径。 */
const CLIENT_FILE = path.join(ROOT, 'dist', 'client.js');

/** 浏览器产物注册 id，与 package.json 的 name 一致。 */
const CLIENT_ID = 'dsh-plugin-skill-folder';

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

describe('前端产物（dist/client.js）', () => {
  it('按包名注册闭包工厂，导出 apply 且不声明必需服务', () => {
    assertFreshDist();
    const registrations = loadRegistrations();
    expect(registrations).toHaveLength(1);
    const registration = registrations[0];
    expect(registration?.id).toBe(CLIENT_ID);

    const exported = registration?.factory((id) => {
      throw new Error(`产物请求了平台种子之外的模块：${id}`);
    });

    expect(exported).not.toHaveProperty('inject');
    expect(typeof exported?.apply).toBe('function');
  });
});
