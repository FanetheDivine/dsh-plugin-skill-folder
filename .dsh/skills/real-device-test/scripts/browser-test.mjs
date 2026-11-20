// 实机测试浏览器驱动：用 Playwright 驱动无头 Chrome 打开 GUI，执行插件页与技能文件夹配置页流程。
// 用法：在仓库目录运行 node browser-test.mjs；RDT_REPO 必填，RDT_GUI_URL 由 gui-up.sh 导出。
// env：RDT_HEADLESS=0 显示浏览器；RDT_SHOTS 截图目录，默认 profile 目录下的 shots。
// 结果写入 browser-results.json，全部通过时退出码为 0。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = process.env.RDT_PROFILE_DIR ?? dirname(fileURLToPath(import.meta.url));
const url = process.env.RDT_GUI_URL;
if (!url) throw new Error('RDT_GUI_URL 必填：先 eval $(bash gui-up.sh <profile名>)');
const REPO = process.env.RDT_REPO;
if (!REPO) throw new Error('RDT_REPO 必填：插件仓库绝对路径');
const PLUGIN = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).name;
/** 插件在界面上的显示名：宿主优先显示元数据标题，缺失时回落包名。 */
const DISPLAY_NAMES = [
  ...new Set([
    ...['zh', 'en'].flatMap((lang) => {
      try {
        const meta = JSON.parse(readFileSync(join(REPO, 'locale', `${lang}.json`), 'utf8')).meta;
        return typeof meta?.title === 'string' ? [meta.title] : [];
      } catch {
        return [];
      }
    }),
    PLUGIN,
  ]),
];
/** 为每个显示名拼出带前缀的按钮标签，如「查看 技能文件夹」。 */
const withNames = (prefixes) =>
  prefixes.flatMap((prefix) => DISPLAY_NAMES.map((name) => `${prefix} ${name}`));
const shots = process.env.RDT_SHOTS ?? join(root, 'shots');
mkdirSync(shots, { recursive: true });

/** GUI 的中英文标签，按顺序尝试，取第一个存在的。 */
const LABELS = {
  welcome: ['继续', 'Continue'],
  plugins: ['插件', 'Plugins'],
  installed: ['已安装插件', 'Installed plugins'],
  view: ['查看', 'View'],
  configure: ['配置', 'Configure'],
  createFolder: ['新建文件夹', 'New folder'],
  folderName: ['文件夹名称', 'Folder name'],
  ungrouped: ['未分组的技能', 'Ungrouped skills'],
  defaultLimit: ['默认返回数量', 'Default result count'],
  descriptionMaxLength: ['摘要长度上限', 'Summary length limit'],
};

const results = [];

/** 运行一条用例并记录结果。 */
async function check(label, fn) {
  try {
    const detail = await fn();
    results.push({ label, status: 'PASS', detail });
    console.log('PASS', label, JSON.stringify(detail ?? {}));
  } catch (e) {
    results.push({ label, status: 'FAIL', error: e?.stack ?? String(e) });
    console.error('FAIL', label, e?.stack ?? e);
  }
}

/** 关闭可能出现的欢迎弹窗。 */
async function dismissWelcome(page) {
  for (const name of LABELS.welcome) {
    const btn = page.getByRole('button', { name, exact: true });
    if (await btn.count()) {
      await btn.first().click();
      await page.waitForTimeout(1200);
      return true;
    }
  }
  return false;
}

/** 按中英文标签依次尝试点击一个按钮。 */
async function clickLabel(page, names, exact = true) {
  for (const name of names) {
    const btn = page.getByRole('button', { name, exact });
    if (await btn.count()) {
      await btn.first().click();
      return true;
    }
  }
  return false;
}

/** 打开插件页。 */
async function openPluginsPage(page) {
  if (!(await clickLabel(page, LABELS.plugins))) throw new Error('找不到插件页入口');
  await page.waitForTimeout(1500);
}

/** 打开被测插件的行配置页：插件页 → 包详情 → 行配置。 */
async function openRowConfig(page) {
  await openPluginsPage(page);
  const card = page.locator(`[data-plugin-package="${PLUGIN}"]`);
  await card.waitFor({ state: 'visible', timeout: 60000 });
  if (!(await clickLabel(page, withNames(LABELS.view)))) {
    throw new Error(`找不到 ${PLUGIN} 的详情入口`);
  }
  if (!(await clickLabel(page, withNames(LABELS.configure)))) {
    throw new Error(`找不到 ${PLUGIN} 行的配置入口`);
  }
  await page.locator('[data-plugin-config]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('[data-skill-folder-page]').waitFor({ state: 'visible', timeout: 30000 });
}

/** 在配置页里按标签找一个输入框。 */
async function fieldByLabel(page, names) {
  for (const name of names) {
    const field = page.getByLabel(name, { exact: true });
    if (await field.count()) return field.first();
  }
  throw new Error(`找不到输入框：${names.join(' / ')}`);
}

/** 配置页里按标签找一个按钮。 */
async function buttonByLabel(page, names) {
  for (const name of names) {
    const button = page.getByRole('button', { name, exact: true });
    if (await button.count()) return button.first();
  }
  throw new Error(`找不到按钮：${names.join(' / ')}`);
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: process.env.RDT_HEADLESS !== '0',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);

try {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (resp?.status() !== 200) throw new Error(`打开 GUI 失败：HTTP ${resp?.status()}`);
  await page.waitForTimeout(5000);
  const dismissed = await dismissWelcome(page);
  console.log('GUI 已加载', JSON.stringify({ welcome: dismissed }));

  await check('C1 插件页：被测插件已安装且启用', async () => {
    await openPluginsPage(page);
    // 插件清单首次加载要读取整个宿主包树，可能超过 10 秒；等到已安装区出现再断言
    await page.getByText(LABELS.installed[0], { exact: false }).first().waitFor({ timeout: 60000 });
    // 插件卡片以包名标记，显示名随语言与元数据变化
    const card = page.locator(`[data-plugin-package="${PLUGIN}"]`);
    await card.waitFor({ state: 'visible', timeout: 60000 });
    // 宿主用 role=switch 的控件承载启用状态，aria-label 为「启用 <显示名>」
    const toggle = card.getByRole('switch');
    if (!(await toggle.count())) throw new Error(`${PLUGIN} 没有启用开关`);
    const enabled = (await toggle.first().getAttribute('aria-checked')) === 'true';
    await page.screenshot({ path: join(shots, 'c1-plugins.png'), fullPage: true });
    if (!enabled) throw new Error(`${PLUGIN} 的启用开关为关闭状态`);
    return { plugin: PLUGIN, listed: true, enabled };
  });

  await check('C2 配置页：渲染技能文件夹设置', async () => {
    await openRowConfig(page);
    const pageRoot = page.locator('[data-skill-folder-page]');
    const create = await buttonByLabel(page, LABELS.createFolder);
    if (!(await create.isVisible())) throw new Error('「新建文件夹」按钮不可见');
    // 未分组区域是放置区，同时承载全部未归组技能
    const ungrouped = page.locator('[data-ungrouped]');
    await ungrouped.waitFor({ state: 'visible', timeout: 30000 });
    await page.screenshot({ path: join(shots, 'c2-page.png'), fullPage: true });
    return {
      page: await pageRoot.count(),
      createButton: LABELS.createFolder[0],
      ungrouped: await ungrouped.getAttribute('aria-label'),
    };
  });

  await check('C3 新建文件夹并输入名称', async () => {
    const create = await buttonByLabel(page, LABELS.createFolder);
    await create.click();
    const card = page.locator('[data-folder-card]').first();
    await card.waitFor({ state: 'visible', timeout: 10000 });
    const name = `rdt-${Date.now().toString(36).slice(-5)}`;
    const input = await fieldByLabel(page, LABELS.folderName);
    await input.click();
    await input.fill(name);
    await page.waitForTimeout(500);
    const value = await input.inputValue();
    if (value !== name) throw new Error(`名称输入框内容为 ${value}，期望 ${name}`);
    // 卡片用文件夹名标记自身，改名后标记随之变化
    const renamed = page.locator(`[data-folder-card="${name}"]`);
    await renamed.waitFor({ state: 'visible', timeout: 10000 });
    await page.screenshot({ path: join(shots, 'c3-folder.png'), fullPage: true });
    return { folders: await page.locator('[data-folder-card]').count(), name };
  });

  await check('C4 配置页：数值字段存在且带默认值', async () => {
    const options = page.locator('[data-skill-folder-options]');
    await options.waitFor({ state: 'visible', timeout: 30000 });
    const limit = await fieldByLabel(page, LABELS.defaultLimit);
    const maxLength = await fieldByLabel(page, LABELS.descriptionMaxLength);
    const values = {
      defaultLimit: await limit.inputValue(),
      descriptionMaxLength: await maxLength.inputValue(),
    };
    if (!/^\d+$/.test(values.defaultLimit))
      throw new Error(`默认返回数量不是整数：${values.defaultLimit}`);
    if (!/^\d+$/.test(values.descriptionMaxLength)) {
      throw new Error(`摘要长度上限不是整数：${values.descriptionMaxLength}`);
    }
    // 两个字段都是数值输入
    for (const [label, field] of [
      ['默认返回数量', limit],
      ['摘要长度上限', maxLength],
    ]) {
      if ((await field.getAttribute('inputmode')) !== 'numeric') {
        throw new Error(`${label} 不是数值输入`);
      }
    }
    await page.screenshot({ path: join(shots, 'c4-options.png'), fullPage: true });
    return values;
  });

  await check('C5 未分组技能来自技能列表路由', async () => {
    const ungrouped = page.locator('[data-ungrouped]');
    await ungrouped.waitFor({ state: 'visible', timeout: 30000 });
    // 页面加载技能失败时此行是 role=alert 的错误提示
    if (await page.locator('[data-skill-folder-page] [role="alert"]').count()) {
      const text = await page
        .locator('[data-skill-folder-page] [role="alert"]')
        .first()
        .innerText();
      throw new Error(`配置页报告错误：${text}`);
    }
    const chips = ungrouped.locator('[data-skill-chip]');
    await chips.first().waitFor({ state: 'visible', timeout: 30000 });
    const count = await chips.count();
    if (count === 0) throw new Error('未分组区域没有技能条目');
    const first = await chips.first().getAttribute('data-skill-chip');
    await page.screenshot({ path: join(shots, 'c5-chips.png'), fullPage: true });
    return { chips: count, first };
  });
} catch (e) {
  console.error(e);
  results.push({ label: 'FATAL', status: 'FAIL', error: e?.stack ?? String(e) });
} finally {
  writeFileSync(join(root, 'browser-results.json'), JSON.stringify(results, null, 2));
  await context.close();
  await browser.close();
}

const fail = results.filter((r) => r.status === 'FAIL').length;
console.log('RDT_BROWSER_DONE', JSON.stringify({ pass: results.length - fail, fail }));
process.exit(fail ? 1 : 0);
