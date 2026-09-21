# DATA CONTRACT

## 五层
L0 Raw Source → L1 Source Record → L2 Evidence → L3 Humanistic Knowledge → L4 Experience。

## 状态
`RAW → EXTRACTED → CANDIDATE → EVIDENCE_LINKED → VERIFIED | REJECTED | PENDING → PUBLISHED`

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
