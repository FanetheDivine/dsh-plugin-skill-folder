# Quickstart: 验证实机脚本修复

**Created**: 2026-11-20 | **Host**: `@deepseek-ai/dsh` `0.2.2-rc.5`

## 前置

```sh
pnpm i && pnpm check          # 构建 dist，质量门禁通过
bash .dsh/skills/real-device-test/scripts/setup-env.sh <仓库绝对路径> rdt-022-verify
```

`setup-env.sh` 生成的 profile 补丁必须满足：

- 根作用域 `tool-skill` 为停用。
- 根作用域 `skill-filesystem` 为启用。
- 插件行存在，`folders` 为空。

## 后端用例

```sh
export RDT_PROFILE=rdt-022-verify RDT_PROFILE_DIR=<profile 目录> RDT_REPO=<仓库绝对路径>
cd <profile 目录> && node run-test.mjs
```

预期：

1. `A1` 插件激活，dist 哈希与仓库一致。
2. 新增的 preset 目录用例通过，断言会话挂 `standard` preset 且存在 `skill-catalog` 消息。
3. `B1`–`B8` 全部通过。
4. `results.json` 无 `FAIL`。

## 回退验证

把 profile 补丁改回根作用域 `tool-skill: disabled: false`，重跑用例：

- preset 目录用例必须失败，错误信息指出会话没有目录消息。
- 其余用例可继续通过或不通过，不作为判据。

改回停用后再次运行，用例恢复通过。

## GUI 验证

```sh
eval $(bash .dsh/skills/real-device-test/scripts/gui-up.sh rdt-022-verify)
```

1. 打开 `RDT_GUI_URL`，新建会话发送消息。
2. 「轨迹」里能看到 `<available_skills>`；插件页新建文件夹后，再发消息能看到 `<skill_folders>`。

## 清理

```sh
netstat -ano | grep -F ":<端口>" | grep LISTENING   # 取 PID
taskkill //F //T //PID <pid>
rm -rf <profile 目录>
```
