# Research: 始终分组

## 技能变化信号

- 结论：订阅宿主 `skills/change` 事件（`@deepseek-ai/dsh-skill` 中 `@mode emit`，provider 注册、目录失效与运行时技能变更都会发出）。
- 理由：通知不带参数，消费者自行按作用域重新读取；插件入口与技能注册表在同一 profile 根层，能收到该事件。
- 备选：在每个 `agent/pre-step` 比较快照。代价是只在会话中检测，且按会话作用域读取，与「全局技能」范围不一致。

## 全局技能集合

- 结论：复用配置页路由的 `readGlobalSnapshot`：默认 preset 作用域快照，缺少 `agentPresets` 时退回根作用域。
- 理由：与配置页列表同源，保证自动分组与页面看到的一致。

## 配置写入

- 结论：`ctx.fiber.entry` + `ctx.get('configEditor').edit(entry, current => ({ ...current, folders }))`。
- 理由：宿主提供的配置编辑入口，校验、串行与热更新都由宿主负责；`folders` 已声明 `.volatile()`，写入后原地生效。
- 风险：`configEditor` 缺失或更高层覆盖时写入被拒绝；实现只记录警告并保持现有分组。

## 立即生效时机

- 结论：在 `loader/volatile-update` 中记录旧的 `alwaysGroup`，由 false 变 true 时执行一次。
- 理由：勾选只改草稿，保存才写入配置；该事件是保存完成后的唯一可靠信号。
- 备选：勾选时在前端直接分组草稿。会绕过宿主侧的统一逻辑，且保存前不生效。

## 幂等与并发

- 结论：用逐字段比较判断文件夹是否有变化；执行串行化，执行期间的通知合并为一次后续执行。
- 理由：`skills/change` 可能连续触发；无变化的写入会制造热更新与界面抖动。

## 客户端控件

- 结论：`SettingsFormModel` 增加 `alwaysGroup` 文本字段，草稿 `'true'` / `'false'`，清空表示恢复默认；控件用 `Checkbox`，右侧紧跟按钮。
- 理由：与现有表单「暂存后保存」语义一致；`Checkbox` 由 `dsh-client-ui-primitives` 提供，无需新依赖。

## 模块位置

- 结论：`src/client/auto-group.ts` 移到 `src/auto-group.ts`。
- 理由：宿主侧需要同一份规则；该文件只依赖 `config.ts` 与 `folders.ts`，无浏览器依赖。
