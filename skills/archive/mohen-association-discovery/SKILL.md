# mohen-association-discovery

Purpose: 在 Observation Graph 上系统地产生关联候选
Trigger: 有可关联的 Observation / Mention / Source Dependency 时

## 实体化档案（C2 §2.1 · C0 §11 R26）
- **Entry**：`pipelines/research/research-pipeline.mjs`
- **Registry 作业**：`research.mention-dependency`(D03)、`research.association-scan`(D04)
- **Reuse Source**：Mention / Dependency 结构化与关联扫描复用本 Entry；不得新建平行的关联生成脚本。
- **Merge / Deprecate**：重复实现并入本 Entry；被替代时按 R14 归档并写迁移说明。
- **模式**：Discovery（`truth_write_ceiling = 0`，0 自动 Truth Promotion）

## Preconditions
先执行 `mohen-research-intake`；确认 Observation 均带 `locator`。

## Steps
1. 结构化：保留 Mention、Action/Event、Time/Place Scope、Source Dependency、Multimodal Observation。
2. 依赖登记：转引 / 同源登记为 dependency，不计独立来源。
3. 关联扫描：按《宽进与广联》G-LINK-1～5 生成 Signal 与 Association Candidate——内容基础、非平凡性、可解释生成、独立性、研究价值。
4. 记录可回放的生成方法与反噪声 / AVS 分量。

## Outputs
- Signal 与 Association Candidate（含生成方法可回放记录）；
- 反噪声度量与 AVS 分量；
- 供 `mohen-humanistic-selection` 分诊的候选池。

## Hard Rules
- **0 个 Association Candidate 自动晋级 Runtime Truth**。
- near / same_source / mentioned_in / title-only / embedding-only 不得单独形成高优先候选。
- 不得把 unresolved mention 写成 Entity。
- 候选即终点：Discovery 不写 Truth。

## Acceptance
候选池可被 `mohen-humanistic-selection` 直接消费；生成方法可回放、可去重。

## Failure / Recovery
失败时保留 Signal 与候选中间结果，停止；修复后从最近稳定状态重跑，不创建平行真源。
