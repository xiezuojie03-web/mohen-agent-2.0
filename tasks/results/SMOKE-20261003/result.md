# SMOKE-20261003 · 无人值守执行报告

- 模式：DRY_RUN（MOHEN_ENV=dev）· 截止时间：2026-10-03T15:13:00.000Z · 周期：0.05 分钟/作业
- 开始：2026-10-03T15:09:13.440Z · 结束：2026-10-03T15:13:00.957Z
- **结论：PASS WITH HOLD**（停止原因：CUTOFF_REACHED）

## Escalation —— 你只需要看这里（最多 3 条）

1. 未执行 58 个作业（截止时间到 / 作业耗尽）

## 本批与叙事缺口（§0.6 / §0.7 第 3 项）

- 瞄准：M2 历史图籍归因（历史地图定位未决）
- 瞄准：（基础设施：来源登记，服务全部叙事缺口）
- 瞄准：M2 历史地图归因
- 瞄准：M1 寺桥文献
- 瞄准：M3 吕颐浩方志原文
- 瞄准：M1/M2/M3/M5 缺口候选供给
- 瞄准：M3 吕颐浩身份锚点
- 瞄准：M1/M4 双桥精确对齐
- 瞄准：M1 寺桥关系簇
- 瞄准：M3/M5 候选关系
- 瞄准：全部缺口的晋级判定收口
- 瞄准：（基础设施：来源登记，服务全部叙事缺口，不直接推进某一格）

以上是本批**声明瞄准**的缺口。**是否真的推进/关闭，本批无法自动判定**——覆盖矩阵回写机制尚未实现（见 T03 与协议 §0.6）。因此本批的『有效性』需有人值守核对，不得由本报告自行宣告。

## 计数

- 队列 106 · 声明允许 106 · 本轮可跑 102
- 完成 44 · 失败 0 · 未执行 58 · 本批落库新增 0

## 开跑前排除（未执行，不是失败；不计入连续失败）

- `[preflight 未就绪]` images-shanghai-verified — 图片源无法唯一确定（hushang_legacy 源 60 条，其中非诗词 58 条）—— 须先为图片批次建立专属 source_record
- `[preflight 未就绪]` images-shanghai-census — 图片源无法唯一确定（hushang_legacy 源 60 条，其中非诗词 58 条）—— 须先为图片批次建立专属 source_record
- `[preflight 未就绪]` images-commons-baoshan — 图片源无法唯一确定（hushang_legacy 源 60 条，其中非诗词 58 条）—— 须先为图片批次建立专属 source_record
- `[preflight 未就绪]` images-commons-maps — 图片源无法唯一确定（hushang_legacy 源 60 条，其中非诗词 58 条）—— 须先为图片批次建立专属 source_record

## 本批事实（**全部由查询得出，不是模板断言**）

> 归因口径：本批＝时间窗 [started_at, now]；自迁移 202610020009 起，本 runner 写入的分诊行均带 ingest_run_id（B-03 run 级归因成立；历史行仍为时间窗口径）。 **本轮为 DRY_RUN：窗口类事实（门禁审计条数 / review_queue 新增）预期为 0。**

| 事实 | 值 | 来源（SQL） |
|---|---|---|
| 本批时间窗内门禁审计条数 | 0 | `select count(*) from evidence_gate_audit where created_at >= :started_at` |
| 本批时间窗内 review_queue 新增 | 0 | `select count(*) from review_queue where created_at >= :started_at` |
| 其中 AUTO 分诊（确定性晋级） | 0 | `select count(*) from review_queue where triage_outcome='auto' and created_at >= :started_at` |
| 其中 HOLD 分诊（隔离区新增） | 0 | `select count(*) from review_queue where triage_outcome='hold' and created_at >= :started_at` |
| 其中 REJECT 分诊（自动拒绝） | 0 | `select count(*) from review_queue where triage_outcome='reject' and created_at >= :started_at` |
| 图片 总数 | 1288 | `select count(*) from visual_assets` |
| 图片 待审 | 0 | `select count(*) from visual_assets where eligibility_tags && array['pending_heritage_review']` |
| 图片 已排除（heritage-primary） | 68 | `select count(*) from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']` |
| 图片缺门禁审计（反连接计数） | 0 | `select count(*) from visual_assets a where not exists (select 1 from evidence_gate_audit g where g.object_type='visual_asset' and g.object_id=a.asset_id::text)` |
| 最近一次图片门禁审计时间（据此判断覆盖是否来自真实门禁流程） | 2026-10-02 17:04:05.431198+08 | `select max(created_at)::text from evidence_gate_audit where object_type='visual_asset'` |
| 真正“有效可用”的图片 | 8 | `select count(*) from effective_visual_assets` |
| published 实体（必须为 0） | 0 | `select count(*) from entities where status='published'` |
| verified 证据（必须为 0） | 0 | `select count(*) from evidence where verification_status='verified'` |
| claim 为历史位置的坐标（必须为 0） | 0 | `select count(*) from historical_feature_anchors where historical_position_proof` |
| 有坐标无 CRS（必须为 0） | 0 | `select count(*) from historical_feature_anchors where lat is not null and coord_system is null` |

## 作业明细

| 作业 | 结果 | 新增 | 备注 |
|---|---|---|---|
| coords-wikidata | OK | 0 |  |
| unattended.source-refresh | OK | 0 |  |
| unattended.evidence-fragment | OK | 0 |  |
| unattended.candidate-extraction | OK | 0 |  |
| unattended.deterministic-resolution | OK | 0 |  |
| unattended.relation-weave | OK | 0 |  |
| unattended.gate-projection | OK | 0 |  |
| src-_work_titles.json | OK | 0 | source_record:_work_titles.json |
| src-cbdb_people.json | OK | 0 | source_record:cbdb_people.json |
| src-clan_pdf_index.json | OK | 0 | source_record:clan_pdf_index.json |
| src-clans.json | OK | 0 | source_record:clans.json |
| src-commons_baoshan_chuansha_20260831.json | OK | 0 | source_record:commons_baoshan_chuansha_20260831.json |
| src-commons_cats_drill_20260831.json | OK | 0 | source_record:commons_cats_drill_20260831.json |
| src-commons_external_maps_20260831.json | OK | 0 | source_record:commons_external_maps_20260831.json |
| src-commons_images.json | OK | 0 | source_record:commons_images.json |
| src-commons_oldmaps_raw_20260831.json | OK | 0 | source_record:commons_oldmaps_raw_20260831.json |
| src-coords_wikidata.json | OK | 0 | source_record:coords_wikidata.json |
| src-dmz_zhujiajiao.json | OK | 0 | source_record:dmz_zhujiajiao.json |
| src-events_linked.json | OK | 0 | source_record:events_linked.json |
| src-external_mapsource_probe_20260831.json | OK | 0 | source_record:external_mapsource_probe_20260831.json |
| src-gazetteer_details.json | OK | 0 | source_record:gazetteer_details.json |
| src-geo_placenames_shanghai.json | OK | 0 | source_record:geo_placenames_shanghai.json |
| src-gj_14373_toc.json | OK | 0 | source_record:gj_14373_toc.json |
| src-gj_14386_entries.json | OK | 0 | source_record:gj_14386_entries.json |
| src-gj_14386_ocr.json | OK | 0 | source_record:gj_14386_ocr.json |
| src-gj_3799_entries.json | OK | 0 | source_record:gj_3799_entries.json |
| src-gj_3799_ocr.json | OK | 0 | source_record:gj_3799_ocr.json |
| src-gj_6922_entries.json | OK | 0 | source_record:gj_6922_entries.json |
| src-gj_6922_ocr.json | OK | 0 | source_record:gj_6922_ocr.json |
| src-gj_fangzhi.json | OK | 0 | source_record:gj_fangzhi.json |
| src-gj_works____.json | OK | 0 | source_record:gj_works_朱家角.json |
| src-gj_works______.json | OK | 0 | source_record:gj_works_朱家角镇志.json |
| src-gj_works_____.json | OK | 0 | source_record:gj_works_青浦县志.json |
| src-gj_works___.json | OK | 0 | source_record:gj_works_青浦.json |
| src-hsly_events.json | OK | 0 | source_record:hsly_events.json |
| src-jinze_evolution_raw_20260830.json | OK | 0 | source_record:jinze_evolution_raw_20260830.json |
| src-jp_family_town_analysis.json | OK | 0 | source_record:jp_family_town_analysis.json |
| src-jp_family_town_sparql_analysis.json | OK | 0 | source_record:jp_family_town_sparql_analysis.json |
| src-jp_familyname_zhu.json | OK | 0 | source_record:jp_familyname_zhu.json |
| src-jp_persons_zhu.json | OK | 0 | source_record:jp_persons_zhu.json |
| src-jp_shanghai_family_persons.json | OK | 0 | source_record:jp_shanghai_family_persons.json |
| src-jp_shanghai_persons_count.json | OK | 0 | source_record:jp_shanghai_persons_count.json |
| src-jp_shanghai_works.json | OK | 0 | source_record:jp_shanghai_works.json |
| src-jp_works_all.json | OK | 0 | source_record:jp_works_all.json |

## 未运行 / 未完成的保证（明确列出，不用断言掩盖）

- **本批是否运行过 Evidence Gate：由报告中“时间窗内门禁审计条数”回答，不由本报告断言。**
- **候选层写入三分（M2 第四条 / 迁移 202610020009）**：每个候选对象出生即在 review_queue 带分诊行（auto/hold/reject）；分诊必带 reason_code，auto 禁 Tier C，分诊结论不可改写，且带 ingest_run_id（run 级归因）。
- **图片默认不可用**：新增图片以 `eligibility_tags = {pending_heritage_review}` 写入，须经复核方可用于 heritage-primary。
- 图片源必须唯一可确定；否则作业在开跑前被 preflight 剔除、不写入（不再取任意 source_record）。
- HTTP 校验 fail-closed：状态未知的链接一律不收。
- 坐标诚实由库层 CHECK 强制：`anchor_coord_requires_crs`、`anchor_current_never_proof`。
- Raw append-only：源材料快照保留在 RAW_STORE/legacy/hushang/。
- 幂等：按 legacy_id + 规范化 file_path 跳过，可重跑。

## 归因口径与已知限制

- **归因口径**：本批事实按时间窗 [started_at, now] 查询；本 runner 写入的分诊行自 202610020009 起带 `ingest_run_id`（B-03 已接线），历史行仍为时间窗口径。
- **有效性未自动成立**：本报告只能列出“声明瞄准的叙事缺口”；是否真的推进/关闭需有人值守核对（协议 §0.6，覆盖矩阵回写未实现）。
- **未声明即不调度**：队列中任何未在生产注册表里唯一声明的作业会让整轮不启动（协议 §12）。

> 明细见 progress.json / report.json / report.html 与 runner.log。凭证不在本报告。
