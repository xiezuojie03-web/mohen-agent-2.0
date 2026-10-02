# 老项目移植 · 合并验收报告（NIGHT-BATCH-003 / 004 / 005 / 006）

- 时段：2026-10-01（项目拥有者 C0 现场授权，非无人值守夜跑；按 T07 安全基线作业）
- 源：老项目 `hushang-jingwei`（沪上经纬旧库）· 目标：本库 `mohen_dev`（本地真源）
- 依据：C3 §9 旧库迁移 + T07 §1 安全基线 + 夜间协议 V1.0
- 写入三道闸：MOHEN_WRITE_ENABLED=true + MOHEN_ENV=dev（每次实跑前均先 DRY_RUN 验证）

## 1. 三批结果

| 批次 | 内容 | 动作 | 数量 | verdict |
|---|---|---|---|---|
| 003 | 实体/证据候选 + 旧库快照 | entities(candidate) + evidence(locator) + source/raw | entities +3308 · evidence +3223 · raw 快照 1 | PASS_WITH_HOLD |
| 004 | 照片 / 诗词 | visual_assets(candidate) + 诗词 Source/Raw（非事实） | visual_assets +519 · poem source +2 | PASS |
| 005 | 334 关系晋级 | relations(candidate) + 结构化 locator 证据（非 AI 叙述） | relations +334 · evidence +334 · 旧 WEAK_LINK HOLD 全清 | PASS |
| 006 | 实体现代坐标落位 | historical_features + historical_feature_anchors（现代对象点 WGS84） | feature +238 · anchor +238（新建切片 SHL-LEGACY-COORDS） | PASS |

## 2. 落库一致性核验（psql 直查）
- `relations`(candidate) = 365（原 31 + 新 334）
- `visual_assets` = 561（原 42 + 新 519）
- `historical_features` = 243（+238）· `historical_feature_anchors` = 247（+238）
- `review_queue` 中 `RELATION_WEAK_LINK_HELD` = 0（旧 HOLD 已清）
- `ingest_runs` = 11（本批 +3）· `legacy_mappings` = 3405（旧→新可追溯）

## 3. 安全核验（T07 §1，逐条）
- ✅ **零自动晋级**：关系/坐标均为 candidate；无 published/verified 写入，未绕过 Evidence Gate
- ✅ **AI 生成文字未当 Evidence**：关系证据用"结构性 locator"（端点 id 机器目录引用），诗词/叙事仅作 Source 留存，未写作事实
- ✅ **坐标诚实（§12 库层强制）**：238 锚点 `anchor_kind=provider_current_object_point` + `coord_system=WGS84` + `historical_position_proof=false`；有坐标必带 CRS；当前 provider 点永不作历史位置证明；未画任何历史几何
- ✅ **Raw 永久 append-only**：旧库快照存 `D:\MoHen\data\raw\legacy\hushang\`，诗词 raw 已备份
- ✅ **幂等**：每批按 legacy_id/feature_key/anchor_key 跳过已导入，可安全重跑
- ✅ **凭证隔离**：S1 Key 仅在本机 `.env.local`（gitignored），未入库/未入码/未入晨报
- ✅ **可回滚**：每批独立 `ingest_run_id`；如需撤销可按 run_id 范围 DELETE

## 4. 关键设计决定（供你确认/追溯）
- **无 `modern_location` 表**：库里本就没有该表；C3 空间模型用 `historical_feature_anchors` 承载现代坐标，反而更合规（§12 约束在库层强制）。故未新建表，直接落 `historical_features`+`anchors`。
- **诗词/叙事=非真相层**：按 C3 §9（Story→story_seed），story_seed 表尚未施工，故诗词作为 **Source/Raw 材料**入库留存，留待 N02/N03 抽取，未当事实。
- **仅 238 实体带坐标**：旧库 3308 实体中仅 238 个带 lat/lng（镇/桥/寺/事件等精确点位），其余（泛化条目）本无坐标，符合预期。

## 5. 仍留作后续（未擅自行动）
- 其它照片层（`shanghai_images_verified_*`、`yutu_*` 等）与更多诗词集可继续补移植；
- 历史几何/因果/跨源冲突/Meaning 自动发布等 HOLD 列表仍按宪法待人工裁决；
- "定时无人值守调度"（cron/任务计划）+ 单入口 runner 骨架尚未建——今夜为现场授权实跑，非自动调度。

> 结论：老项目结构化数据已按本项目数据库要求安全进入本库作为候选供给，三批均 PASS（003 因旧关系先 HOLD 后已晋级清理，实为全 PASS）。明早可直接验收。
