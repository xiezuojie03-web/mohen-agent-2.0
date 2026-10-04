# DATA CONTRACT

> **Authority**：本契约是 `specs/` 下的专业域 Contract，**受 C2 / C3 统领**（仲裁 C0 ≥ C1 > C2/C3/C4）。
> **层级模型与状态枚举不在此自定义**，一律以 **C3 §2.1–§2.8（八层 L0–L7）** 与 **C3 §4.1（Evidence Gate 与数据晋级）** 为准。
> 本节此前使用的"五层 L0–L4"与自制状态机已**废止**（2026-10-02），以免与 C2/C3 形成平行真源（原有问题：同一活跃仓内出现五层 / 八层两套模型）。

## 层级（见 C3）
数据分层以 **C3 §2.1–§2.8** 为准：L0 Cultural Sources / L1 Evidence & Provenance / L2 Cultural World / L3 Meaning & Present Connection / L4 Discovery / Agent Read Model / L5 Experience Runtime / L6 Participation / L7 Living Culture。

## 状态（见 C3）
对象状态机与晋级路径以 **C3 §4.1**（配合 §4.2 Evidence Gate G0–G6 的数据库落点）为准。本契约不再重复枚举。

## L1 Source Record
最少字段：`source_id, provider, title, source_uri, content_type, retrieved_at, checksum, raw_path, license_code, metadata_json`。

## L2 Evidence
最少字段：`evidence_id, source_id, evidence_type, locator, quote_text/region_json, time_hint, place_hint, extraction_method, confidence, verification_status`。

## L3 稳定对象
- Entity：人、桥、寺、建筑、典籍等。
- Place：几何、精度、坐标来源、有效时间。
- Event：时间变化。
- Relation：subject-predicate-object + 时间 + evidence。
- Claim：AI/人工提出的可审核事实。
- VisualAsset / VisualCorrespondence。
- HistoricalMap / MapAnchor / HistoricalFeature。
- StorySeed / DiscoveryCandidate。

## L4
Route、RouteStop、ExperiencePreset 等可重算体验对象。L4 不得反向污染 L0-L3。

## Discovery 命名（2026-10-03 澄清 · 依 C2 §4.4 / C3 §2.5）
本契约中的 `DiscoveryCandidate` 一律指 **Runtime Discovery Candidate**（Agent-side、严证之后、L4 派生对象）。
**Research Discovery Candidate**（Developer-side、严证之前）**不在本契约定义**，其逻辑对象与边界以 **C3 §2.9 Research Workspace** 为准——**本契约不复制、不自定义研究层**，以免形成平行真源。

## Research Workspace（2026-10-03 澄清）
研究态对象（`research_observation` / `research_mention` / `research_signal` / `research_association_candidate` 等）的语义、状态与边界一律见 **C3 §2.9**，本契约不重复枚举。两条硬约束：**0 自动 Truth Promotion**；**研究态禁止使用 `usable` / `published` / `verified` 等 Truth 资格词**。

## 时间
必须区分：事件发生时间、对象有效时间、图像创作时间、图像描绘时期、出版/著录时间、采集时间。

## 空间
坐标/几何必须记录来源与精度。历史重建 geometry 必须标 `reconstruction_status`，不得伪装为测量事实。

## Provenance
Published 的 Claim / Relation / Place / HistoricalFeature 至少可回溯一个 Evidence；Evidence 必须回溯 Source。

## Legacy
保留 `legacy_id`，通过 mapping 导入 staging；不得把旧 JSON 直接视为新库 verified 真源。

## 概念名 ↔ 物理名映射（RECON-02 方案 A · 2026-10-04）

**设计决定**：宪法里的「概念名」（单数简写，如 `entity` / `visual_asset`）与真库里的「物理名」（实际表名，如 `entities` / `visual_assets`）**故意不同**，这是固定下来的设计，不是要消灭的分叉。宪法正文一律写概念名；物理表名以真库为准，集中登记在 **`specs/data-production/naming-map.json`**（机器可读唯一映射），并由 **`guard:naming`** 校验：真库每张表必须被登记、映射里的物理名必须真实存在；不改任何表名、不迁移、不动数据。

**概念名 → 物理名（甲/乙/丙类：仅命名差）**

| 概念名（宪法） | 物理名（真库） |
| --- | --- |
| `entity` | `entities` |
| `event` | `cultural_events` |
| `change` | `historical_change_records` |
| `meaning_candidate` | `cultural_meaning_candidates` |
| `present_connection` | `cultural_present_connections` |
| `relation_claim` | `cultural_relation_claims` |
| `human_review` | `human_review_decisions` |
| `claim_evidence_link` | `claim_evidence` |
| `visual_asset` | `visual_assets` |
| `source_record` | `source_records` |

**丁类（结构分裂，非改名）**：`historical_space_claim` 在真库拆为 `historical_features` / `historical_feature_anchors` / `historical_spatial_relations` / `historical_spatial_slices`；改名解决不了，按 RECON-02 丁类处理，不在本映射改名。

**真库有、宪法未逐条列的对象**：`claims` / `evidence` / `evidence_fragments` / `relation_evidence` / `evidence_gate_audit` / `review_queue` / `knowledge_paths` / `knowledge_path_steps` / `legacy_mappings` / `cultural_conflicts` / `discovery_candidates` / `ingest_runs` / `visual_entity_links` / `relations`（ESC-02 遗留重复，待并线）/ 以及 `research_*`（C3 §2.9 Research Workspace）——均已登记于 `naming-map.json`，不得视为"未登记"。
