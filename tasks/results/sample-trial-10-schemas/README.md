# SAMPLE-TRIAL-10 JSON Schema 索引（严格输出契约）

> 日期：2026-10-17
> 性质：静态 schema 文件，供第一层真实闭环接入时强制输出；不接 LLM、不写库。
> 用途：模型输出必须 100% 符合对应 schema，不合规即拒（SAMPLE-TRIAL-08 §三 D02/D03 JSON schema 合规率 100%）。

## Schema 清单

| 文件 | 阶段/层 | 方法 | 对齐字段 | 版本 |
|---|---|---|---|---|
| `schema-d01-reading-unit.v1.json` | D01/L1 | C01 | reading_unit | 1.0 |
| `schema-d02-material-observation.v1.json` | D02/L2 | H05/H04 | reading_units / classification_decisions / material_mentions（人/时/地/物/数）/ material_evidence（assertion_kind / voice_basis） | 1.0 |
| `schema-d03-world-claim-revision.v1.json` | D03/L3 | W01/W02/W05/W09 | world.claim_revisions / conflicts / identity_decisions / event_participations / provenance_assessments / world_decision_events | 1.0 |
| `schema-d04-humanistic-finding.v1.json` | D04/L4 | A01/A10 | humanistic_finding | 1.0 |
| `schema-d05-publication.v1.json` | D05/L5 | P01–P07 | selection_manifest / world_projections / story_seeds / evidence_pointers / consumer_facet | 1.0 |

## 版本与缓存指纹

- 每个 schema 根节点含 `version` 与 `$id`（含版本号）；`schema_version` 以 `const` 硬约束，用于缓存指纹与拒绝不合规输出。
- 缓存键：`sha256(input_fingerprint + prompt_version + schema_version + model_version)`。
- 改 schema 须升级 `version` 与 `$id`，并登记 `changelog`（见各 schema 根 `description`）。

## 硬约束（对齐已落地 L2/L3 物理字段）

- `material_mentions.mention_kind` ∈ person/time/place/thing/number（人/时/地/物/数）；禁止写 `world.entity_id`。
- `material_evidence.assertion_kind` ∈ record/norm/wish/hearsay/argument/fiction/hypothesis（记述/规范/愿望/传闻/论辩/虚构/假说）。
- `material_evidence.voice_basis` ∈ direct_witness/transcription/reported/advert/hearsay/unknown（亲历/转录/转述/广告/传闻/未知）。
- `conflicts.resolution_status` ∈ open/resolved/preserved_open/rejected；并列保留用 `preserved_open`。
- `provenance_assessments.independence_state` ∈ UNKNOWN/POSSIBLY_SHARED/INDEPENDENT/DERIVED（物理 CHECK 已落地）。
- `identity_decisions.decision` ∈ SAME/DIFFERENT/UNRESOLVED。
- W09 认识状态（`material_report / candidate / supported_with_limits / contested / unresolved / withdrawn`）承载于 `claim_revision.assertion_payload_json`，与 G3 资格状态严格区分。

## 未覆盖

- 第二层视觉（C02/C03/C04、H18/H25/H09、W03、A07）的 schema 留待第一层闭环后再补，不在本批产出。
