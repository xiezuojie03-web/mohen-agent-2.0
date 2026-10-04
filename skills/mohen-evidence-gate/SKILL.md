# mohen-evidence-gate

Purpose: 证据门禁  
Trigger: Candidate 要晋级知识库

## 实体化档案（C2 §2.1 · C0 §11 R26）
- **Entry**：`pipelines/legacy/unattended-runner.mjs`
- **Registry 作业**：`unattended.evidence-fragment`、`unattended.candidate-extraction`、`unattended.deterministic-resolution`
- **Reuse Source**：证据门禁 / 候选抽取 / 确定性对齐复用本 Entry；不得为同类判定另写脚本。
- **Merge / Deprecate**：重复实现并入本 Entry；被替代时按 R14 归档并写迁移说明。

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. G0 来源完整。
2. G1 对象身份/同名异地。
3. G2 时间语义分离。
4. G3 空间来源/重建状态。
5. G4 claim/relation 的 Evidence 支持。
6. G5 冲突检测。
7. 按 A/B/C 风险决定自动、双检或人工审核。
8. 输出审计日志与状态。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
无 Evidence 不发布；C 级不得自动通过。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
