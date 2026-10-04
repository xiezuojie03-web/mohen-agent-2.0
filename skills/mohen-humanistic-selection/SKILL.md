# mohen-humanistic-selection

Purpose: 判断"哪些值得继续追"，而不是"哪些像真的"
Trigger: 关联候选池就绪，需要分诊时

## 实体化档案（C2 §2.1 · C0 §11 R26）
- **Entry**：`pipelines/research/research-pipeline.mjs`
- **Registry 作业**：`research.humanistic-selection`(D05)
- **Reuse Source**：精选与分诊复用本 Entry；不得新建平行的精选 / 分诊脚本。
- **Merge / Deprecate**：重复实现并入本 Entry；被替代时按 R14 归档并写迁移说明。
- **模式**：Discovery（`truth_write_ceiling = 0`，0 自动 Truth Promotion）

## Preconditions
先执行 `mohen-association-discovery`；候选池含可回放的生成方法与反噪声度量。

## Steps
1. 评估：按《宽进与广联》G-LINK-6～10——人审效率、新发现率、跨模态质量、人工债务、Truth 隔离。
2. 分档：分为 Top Priority / Long Tail。
3. 出线：Top Priority 生成 Directed Research Task / Research Question，进入 N01–N06 严证线。
4. 造债：仅 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 创建 `review_queue`；研究长尾由机器处置。

## Outputs
- Top Priority / Long Tail 分档结果；
- Directed Research Task / Research Question；
- `review_queue` 债务行（仅四类关键项）。

## Hard Rules
- **不判断"像真的"，只判断"值得继续追"**。
- 不得自动晋级任何 Runtime Truth。
- Long Tail 机器处置，不制造人工债务。
- Truth 隔离：研究结论不直接写入可信世界。

## Acceptance
Top Priority 可直接进入 Directed 严证线；Long Tail 有可追溯的机器处置记录。

## Failure / Recovery
失败时保留分档中间结果，停止；修复后从最近稳定状态重跑，不创建平行真源。
