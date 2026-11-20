# Requirements Checklist: 升级 DSH 宿主依赖到 0.2.2-rc.5

**Purpose**: 核验规格草稿的需求质量：完整、无歧义、可测试。
**Created**: 2026-11-20
**Feature**: [spec.md](../spec.md)

**Review Ownership**: 本清单由审查者维护。仅在审查确认需求质量标准满足时标记 `[x]`。
**Marker Semantics**: `[x]` 表示该需求质量标准已审查通过，不代表实现完成。

## 完整性

- [x] CHK001 全部 `@deepseek-ai/dsh-*` 依赖的目标版本已明确（0.2.2-rc.5）
- [x] CHK002 cordis 系依赖的对齐来源已明确（`@deepseek-ai/dsh@0.2.2-rc.5` 的 `dependencies`）
- [x] CHK003 `minimumReleaseAgeExclude` 的同步要求已写入 FR-003
- [x] CHK004 实机测试提醒已写入 FR-005

## 一致性

- [x] CHK005 版本要求与宪章「宿主依赖版本」原则一致
- [x] CHK006 验收场景与功能需求一一对应

## 可测试性

- [x] CHK007 每条验收场景可通过读取清单或运行命令验证
- [x] CHK008 成功标准可度量（安装成功、检查通过、实机装载）

## Notes

- 无未决需求，Open Decisions 为空。
