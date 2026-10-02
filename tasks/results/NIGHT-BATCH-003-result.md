# NIGHT-BATCH-003 · 沪上经纬旧库移植（Candidate Reservoir）

- 批次：night-batch-003 · 启动 2026-10-01T15:13:45.119Z
- 模式：WRITE（MOHEN_ENV=dev）· 写入开关 MOHEN_WRITE_ENABLED=true
- 依据：C3 §9 旧库迁移 + T07 §1 安全基线 + 夜间协议 V1.0
- 决断：项目拥有者授权读取并移植老项目（hushang-jingwei）

## 1. 映射与计数
```json
{
  "entities_total": 3308,
  "entities_to_insert": 3308,
  "entities_skipped_existing": 0,
  "evidence_to_insert": 3223,
  "photos_from_entities": 0,
  "photos_to_insert": 0,
  "relations_total": 334,
  "relations_held": 334,
  "poetry_held": 0,
  "narrative_held": 0
}
```

## 2. 安全核验（T07 §1）
- 全部落 Candidate（status='candidate'），零自动晋级 verified/published：true
- 坐标仅作现代位置（modern_location），未冒充历史几何：SKIPPED_NO_TABLE
- AI 生成文字未当 Evidence（evidence 仅用目录级 source_uri locator）：true
- Raw 永久 append-only：D:\MoHen\data\raw\legacy\hushang\seed-1aab7fc10a58fd8d.json
- relations(334) 全部 HOLD 入 review_queue（默认不猜）
- poetry(0) / narrative(0) 不写作事实，留 Source 待以后抽取

## 3. 结论
verdict = PASS_WITH_HOLD
errors = 无
ingest_run_id = a8e8d0ff-0a00-4feb-9786-9aa443fd178d

> 老项目实际导出 **3308 实体 + 3223 证据候选**已作为 Candidate Reservoir 进入本库（旧库 meta 标注 1977 为早期阶段数，以实际数组 3308 为准）；坐标暂存 raw 快照待 modern_location 表就绪后落位；334 关系（弱镇名关联）与诗词/叙事属弱证据/非事实，HOLD 入 review_queue 待人工裁决与后续 N02/N03 抽取。
