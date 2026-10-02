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

## 时间
必须区分：事件发生时间、对象有效时间、图像创作时间、图像描绘时期、出版/著录时间、采集时间。

## 空间
坐标/几何必须记录来源与精度。历史重建 geometry 必须标 `reconstruction_status`，不得伪装为测量事实。

## Provenance
Published 的 Claim / Relation / Place / HistoricalFeature 至少可回溯一个 Evidence；Evidence 必须回溯 Source。

## Legacy
保留 `legacy_id`，通过 mapping 导入 staging；不得把旧 JSON 直接视为新库 verified 真源。
