---
name: real-device-test
description: 在真实 DSH 宿主上端到端测试本插件，验证插件在 DSH 中的实际表现时使用。
---

# real-device-test

单元测试使用模拟的 `ctx`。本 skill 在真实宿主中验证四类问题：

| 类别 | 验证内容 |
| --- | --- |
| A 宿主装载 | profile 创建、插件安装、插件激活、已安装 dist 与仓库一致 |
| B 后端链路 | mock 模型驱动真实对话，工具调用、配置热更新、配置错误 |
| C 前端展示 | 在 GUI 中发消息、查看工具卡片、插件详情页 |
| D 宿主漂移 | 宿主接口或行为与插件假设不一致 |

用例随功能变化。每轮按 [cases.md](references/cases.md) 的方法推导，`scripts/` 是可直接运行的参考实现，按需扩展。

全程只读插件代码。发现缺陷写入报告，另开分支修复。

## 阶段 0：准备

1. 在仓库运行 `pnpm i && pnpm check`，确保 `dist/` 对应当前代码。构建是迭代动作，后续改代码只需再跑一次 `pnpm build`。
2. 确认 `playwright` 已安装。脚本用 `channel: 'chrome'` 启动本机 Chrome，无需下载浏览器。

## 阶段 1：搭建环境（A）

```sh
bash .dsh/skills/real-device-test/scripts/setup-env.sh <仓库绝对路径> [profile名]
```

脚本依次完成：

1. 对齐宿主版本：
   - 期望版本取 `package.json` 中 `@deepseek-ai/dsh-agent` 的版本，`RDT_DSH_VERSION` 可覆盖。
   - 全局 `dsh` 版本一致时直接使用。
   - 版本不一致时安装到 `~/.dsh-local/dsh-<版本>`，全局安装保持不变。
2. 创建 profile，默认名为 `rdt-<日期>`。底本为宿主官方 web 默认 profile（`--from-default-profile web`），不覆写技能插件：技能工具与来源由该底本的 `standard` agent preset 提供。
3. 用 `dsh plugin add` 以链接方式安装当前检出，`node_modules` 指向仓库。
4. 写隔离配置 `cordis.patch.yml`：
   - 停用真实模型，加载 mock provider。
   - 会话、存储、凭据写入 profile 目录。
   - 跳过宿主的欢迎弹窗。
   - 启用 HMR 并监听仓库 `dist`，构建后自动替换插件。
5. 复制 `mock-provider.mjs` 与 `run-test.mjs` 到 profile 目录。
6. 注册测试工作区。

脚本结尾打印后续命令。使用本地宿主时，先执行其中的 `export PATH=... RDT_DSH_PKG=...`。

## 阶段 2：后端用例（A、B）

```sh
cd <profile目录>
node run-test.mjs
```

- 驱动用宿主的 `runProfile` 启动 profile，以会话落盘事件作为断言依据。
- 驱动创建的会话挂 `standard` preset，形态与 GUI 会话一致。
- 结果写入 `results.json`。全部通过时退出码为 0。
- 首个用例检查装载。装载失败时中止后续用例。

当前用例：

| 用例 | 断言 |
| --- | --- |
| A1 装载 | 插件已激活，加载的版本和 dist 哈希与仓库一致 |
| B0 会话形态 | 请求携带 preset 提供的 `skill` 工具，会话存在技能目录消息，请求含 `<available_skills>` |
| B1 工具定义 | 首个模型请求携带 `skill_search`，参数含 `query`、`folder`、`limit`、`offset` |
| B2 关键词检索 | 按准确技能名查询时首位即该技能，`match` 为 `exact`，结果回显查询词 |
| B3 文件夹检索 | `folder` 列出该文件夹全部成员，每条 `match` 为 `folder` |
| B4 缺少参数 | 既无 `query` 也无 `folder` 时工具报错 `provide query or folder` |
| B5 数量越界 | `limit: 99` 时工具报错 `limit must be an integer from 1 to 20` |
| B6 目录折叠 | 配置文件夹后请求出现 `<skill_folders>`，折叠成员不在 `<available_skills>` 中 |
| B7 空配置 | `folders: []` 时请求没有 `<skill_folders>`，技能逐项列出 |
| B8 技能列表路由 | `GET /api/skill-folder/skills` 返回带 `complete` 与 `skills` 数组的 JSON |

B2、B3、B6、B8 使用的技能名在运行时从真实全局技能里挑：取 `<available_skills>` 列出的名称与 `skills.snapshot({})` 的交集。没有全局技能时这些用例记为 SKIP 并写明原因，不计失败。

mock provider 的约定：

- 用户消息含 `SEARCH_CASE:<JSON 参数>` 时，模型以该参数调用 `skill_search`，再把工具结果作为回复。
- 其他消息回复「mock：已收到」。
- 每个请求追加到 `requests.jsonl`，用于核对请求内容。

## 迭代：重建后在运行实例中查看效果（A、B）

搭建后实例保持运行。改完插件代码，构建一次即可让同一实例加载新代码：

```sh
pnpm build        # 或 pnpm dev，持续监听 src
```

- 宿主监听仓库 `dist`，构建完成即替换后端插件；前端产物由宿主轮询后自动替换，页面无需刷新。
- 不重装插件，不重启宿主；启动脚本只在轮次开始时执行一次。
- 替换会重建插件实例，同一轮内重跑用例时按新实例断言。

验证一次热更新：

1. 记录 GUI 进程号：`netstat -ano | grep ":<端口> " | grep LISTENING`。
2. 修改 `src/search-tool.ts` 里 `presentCall` 的卡片标题文本。
3. 运行 `pnpm build`，等宿主替换完成。
4. 在 GUI 里发送 `SEARCH_CASE:{"query":"skill"}`，展开工具卡片。
5. 预期卡片标题为新文本，进程号不变。

构建失败或替换失败的处理见 [pitfalls.md](references/pitfalls.md)。

## 阶段 3：浏览器用例（C）

1. 启动 GUI：

   ```sh
   eval $(bash .dsh/skills/real-device-test/scripts/gui-up.sh <profile名>)
   ```

2. 在仓库内运行浏览器驱动，它用无头 Chrome 打开 `$RDT_GUI_URL`：

   ```sh
   node .dsh/skills/real-device-test/scripts/browser-test.mjs
   ```

   - 结果写入 `<profile目录>/browser-results.json`，全部通过时退出码为 0。
   - 截图写入 `<profile目录>/shots/`。
   - `RDT_HEADLESS=0` 时显示浏览器，便于观察失败现场。

3. 当前用例：

| 用例 | 操作 | 断言 |
| --- | --- | --- |
| C1 插件页 | 打开插件页 | 已安装插件列出被测插件，启用开关为开，卡片显示解码成功的图标 |
| C2 配置页 | 插件页 → 包详情 → 行“配置” | `[data-skill-folder-page]` 可见，「新建文件夹」按钮与「未分组的技能」区域渲染出来 |
| C3 新建文件夹 | 点「新建文件夹」，在「文件夹名称」输入框填名称 | 新卡片出现，输入框取值与 `data-folder-card` 都等于输入的名称 |
| C4 搜索选项 | 查看页面底部的「搜索选项」 | 默认返回数量与摘要长度上限存在，取值为整数，输入 `inputMode` 为数值 |
| C5 技能条目 | 查看「未分组的技能」区域 | 技能条目来自全局技能列表路由，页面没有错误提示 |
| C6 移动菜单键盘 | 聚焦分组按钮，Enter 打开，方向键选中文件夹，Enter 确认 | 菜单列出未分组与文件夹，技能移入文件夹，按钮显示文件夹名 |
| C7 移动菜单鼠标 | 点分组按钮，Esc 关闭；再点开选「未分组」 | Esc 不改变分组，选择后技能回到未分组区域 |

新增流程时在 `browser-test.mjs` 中加一个 `check('<编号> <名称>', fn)`。界面标签的定位依据见 [pitfalls.md](references/pitfalls.md)。

4. 每个流程后脚本自动截图到 `shots/`。

## 阶段 4：宿主漂移（D）

- 写断言前先读宿主源码确认事实：`<宿主目录>/node_modules/@deepseek-ai/*/lib/`。
- 断言失败时先区分两种原因：
  - 插件缺陷。
  - 驱动的假设已过时。查看会话 jsonl 与 `requests.jsonl` 的真实内容。
- 宿主升级后先跑 A1，再跑其余用例。
- 已知漂移点见 [pitfalls.md](references/pitfalls.md)。

## 阶段 5：报告与清理

1. 按 [cases.md](references/cases.md) 末尾的结构写报告，保存截图与结果文件。
2. 结束 GUI 进程：用 `netstat -ano` 找到 GUI 端口的 PID，再 `taskkill //F //T //PID <pid>`。
3. 浏览器驱动会自行关闭浏览器，无需清理页面。
4. 删除 profile：`rm -rf <profile目录>`。下一轮重新搭建。

## 环境变量

所有变量都可省略。

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `RDT_REPO` | 无，`run-test.mjs` 与 `browser-test.mjs` 必填 | 插件仓库绝对路径 |
| `RDT_PROFILE_DIR` | 脚本所在目录 | profile 目录 |
| `RDT_PROFILE` | profile 目录名 | profile 名 |
| `RDT_DSH_PKG` | 全局宿主 | 宿主 `package.json` 路径 |
| `RDT_DSH_VERSION` | `dsh-agent` 的版本 | 指定宿主版本 |
| `RDT_GUI_PORT` | `3210` | GUI 端口 |
| `RDT_GUI_WAIT` | `90` | 等待 GUI 启动的秒数 |
| `RDT_GUI_URL` | 无，`browser-test.mjs` 必填 | `gui-up.sh` 导出的带 token 地址 |
| `RDT_SHOTS` | `<profile目录>/shots` | 截图目录 |
| `RDT_HEADLESS` | 无头 | 设为 `0` 时显示浏览器 |
| `RDT_KEEPALIVE` | 无 | 设为 `1` 时驱动结束后保留运行时 |
| `RDT_PATCHED_DIST` | 无 | 设为 `1` 时跳过 A1 的 dist 哈希比对，用于在已安装副本上打临时补丁、隔离插件缺陷的影响面 |
