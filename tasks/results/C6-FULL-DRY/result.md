# C6-FULL-DRY · 无人值守执行报告

- 模式：DRY_RUN（MOHEN_ENV=dev）· 截止时间：2026-10-05T15:55:00.000Z · 周期：0 分钟/作业
- 开始：2026-10-05T01:22:49.910Z · 结束：2026-10-05T01:25:55.333Z
- **结论：PASS WITH HOLD**（停止原因：STOPPED_BY_STOP_FILE）

## Escalation —— 你只需要看这里（最多 3 条）

1. 未执行 1 个作业（截止时间到 / 作业耗尽）

## 本批与叙事缺口（§0.6 / §0.7 第 3 项）

- 瞄准：M2 历史视觉证据（当前 = 0）
- 瞄准：M5 遗址—复建双层的视觉对照
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
- 瞄准：M2 历史视觉证据（当前 = 0，本作业提供图-实体链接候选）
- 瞄准：M1 寺桥文献（外部权威身份锚点，供后续定向取回原文）
- 瞄准：M3 人物与交接（同一对象的外部身份锚点，人物线待 C6 处理）
- 瞄准：M5 遗址—复建（外部新增对象候选，含 P1435 遗产认定项）
- 瞄准：M2 历史视觉证据（当前 = 0，本作业补外部可用图像候选）
- 瞄准：（基础设施：标识符归一，服务全部叙事缺口的实体消歧）
- 瞄准：（基础设施：来源登记，服务全部叙事缺口，不直接推进某一格）

以上是本批**声明瞄准**的缺口。**是否真的推进/关闭，本批无法自动判定**——覆盖矩阵回写机制尚未实现（见 T03 与协议 §0.6）。因此本批的『有效性』需有人值守核对，不得由本报告自行宣告。

## 计数

- 队列 110 · 声明允许 110 · 本轮可跑 110
- 完成 109 · 失败 0 · 未执行 1 · 本批落库新增 0

## 开跑前排除（未执行，不是失败；不计入连续失败）

无。

## 本批事实（**全部由查询得出，不是模板断言**）

> 归因口径：本批＝时间窗 [started_at, now]；自迁移 202610020009 起，本 runner 写入的分诊行均带 ingest_run_id（B-03 run 级归因成立；历史行仍为时间窗口径）。 **本轮为 DRY_RUN：窗口类事实（门禁审计条数 / review_queue 新增）预期为 0。**

| 事实 | 值 | 来源（SQL） |
|---|---|---|
| 本批时间窗内门禁审计条数 | 0 | `select count(*) from evidence_gate_audit where created_at >= :started_at` |
| 本批时间窗内 review_queue 新增 | 0 | `select count(*) from review_queue where created_at >= :started_at` |
| 其中 AUTO 分诊（确定性晋级） | 0 | `select count(*) from review_queue where triage_outcome='auto' and created_at >= :started_at` |
| 其中 HOLD 分诊（隔离区新增） | 0 | `select count(*) from review_queue where triage_outcome='hold' and created_at >= :started_at` |
| 其中 REJECT 分诊（自动拒绝） | 0 | `select count(*) from review_queue where triage_outcome='reject' and created_at >= :started_at` |
| 图片 总数 | 1465 | `select count(*) from visual_assets` |
| 图片 待审 | 177 | `select count(*) from visual_assets where eligibility_tags && array['pending_heritage_review']` |
| 图片 已排除（heritage-primary） | 68 | `select count(*) from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']` |
| 图片缺门禁审计（反连接计数） | 37 | `select count(*) from visual_assets a where not exists (select 1 from evidence_gate_audit g where g.object_type='visual_asset' and g.object_id=a.asset_id::text)` |
| 最近一次图片门禁审计时间（据此判断覆盖是否来自真实门禁流程） | 2026-10-05 06:36:29.869149+08 | `select max(created_at)::text from evidence_gate_audit where object_type='visual_asset'` |
| 真正“有效可用”的图片 | 8 | `select count(*) from effective_visual_assets` |
| published 实体（必须为 0） | 0 | `select count(*) from entities where status='published'` |
| verified 证据（必须为 0） | 0 | `select count(*) from evidence where verification_status='verified'` |
| claim 为历史位置的坐标（必须为 0） | 0 | `select count(*) from historical_feature_anchors where historical_position_proof` |
| 有坐标无 CRS（必须为 0） | 0 | `select count(*) from historical_feature_anchors where lat is not null and coord_system is null` |

## 作业明细

| 作业 | 结果 | 新增 | 备注 |
|---|---|---|---|
| images-shanghai-verified | OK | 0 |  |
| images-shanghai-census | OK | 0 |  |
| images-commons-baoshan | OK | 0 |  |
| images-commons-maps | OK | 0 |  |
| coords-wikidata | OK | 0 |  |
| unattended.source-refresh | OK | 0 |  |
| unattended.evidence-fragment | OK | 0 |  |
| unattended.candidate-extraction | OK | 0 |  |
| unattended.deterministic-resolution | OK | 0 |  |
| unattended.relation-weave | OK | 0 |  |
| unattended.gate-projection | OK | 0 |  |
| unattended.image-link | OK | 0 |  |
| unattended.external-identity | OK | 0 |  |
| unattended.external-visual | OK | 0 |  |
| unattended.name-resolution | OK | 0 |  |
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
| src-jp_works_sparql.json | OK | 0 | source_record:jp_works_sparql.json |
| src-jp_zhu_deepdive.json | OK | 0 | source_record:jp_zhu_deepdive.json |
| src-jp_zhu_persons.json | OK | 0 | source_record:jp_zhu_persons.json |
| src-mcp_screenshot_ocr.json | OK | 0 | source_record:mcp_screenshot_ocr.json |
| src-mgts_104971_entries.json | OK | 0 | source_record:mgts_104971_entries.json |
| src-mgts_104971_town_hits.json | OK | 0 | source_record:mgts_104971_town_hits.json |
| src-mgts_31278_entries.json | OK | 0 | source_record:mgts_31278_entries.json |
| src-mgts_31278_town_hits.json | OK | 0 | source_record:mgts_31278_town_hits.json |
| src-mgts_4581_entries.json | OK | 0 | source_record:mgts_4581_entries.json |
| src-mgts_4581_town_hits.json | OK | 0 | source_record:mgts_4581_town_hits.json |
| src-mgts_4584_entries.json | OK | 0 | source_record:mgts_4584_entries.json |
| src-mgts_4584_town_hits.json | OK | 0 | source_record:mgts_4584_town_hits.json |
| src-mgts_4590_entries.json | OK | 0 | source_record:mgts_4590_entries.json |
| src-mgts_4590_town_hits.json | OK | 0 | source_record:mgts_4590_town_hits.json |
| src-mgts_87274_entries.json | OK | 0 | source_record:mgts_87274_entries.json |
| src-mgts_90096_entries.json | OK | 0 | source_record:mgts_90096_entries.json |
| src-mgts_92309_entries.json | OK | 0 | source_record:mgts_92309_entries.json |
| src-mgts_92309_ocr.json | OK | 0 | source_record:mgts_92309_ocr.json |
| src-narrative_assets.json | OK | 0 | source_record:narrative_assets.json |
| src-p1a_attach_images_report_20260831_130954.json | OK | 0 | source_record:p1a_attach_images_report_20260831_130954.json |
| src-probe_press_pagination_20260902.json | OK | 0 | source_record:probe_press_pagination_20260902.json |
| src-probe_s0_b_bk.json | OK | 0 | source_record:probe_s0_b_bk.json |
| src-probe_s0_image_match.json | OK | 0 | source_record:probe_s0_image_match.json |
| src-probe_s0_photos.json | OK | 0 | source_record:probe_s0_photos.json |
| src-probe_s0_press.json | OK | 0 | source_record:probe_s0_press.json |
| src-probe_s0_press_diag.json | OK | 0 | source_record:probe_s0_press_diag.json |
| src-probe_s0_press_diag2.json | OK | 0 | source_record:probe_s0_press_diag2.json |
| src-probe_s0_yutu.json | OK | 0 | source_record:probe_s0_yutu.json |
| src-protection_index.json | OK | 0 | source_record:protection_index.json |
| src-resource_probe2_20260831.json | OK | 0 | source_record:resource_probe2_20260831.json |
| src-resource_probe_20260831.json | OK | 0 | source_record:resource_probe_20260831.json |
| src-rumsey_maps_raw_20260831.json | OK | 0 | source_record:rumsey_maps_raw_20260831.json |
| src-sh_protection_index.json | OK | 0 | source_record:sh_protection_index.json |
| src-shanghai_images_census_20260905.json | OK | 0 | source_record:shanghai_images_census_20260905.json |
| src-shanghai_images_verified_20260905.json | OK | 0 | source_record:shanghai_images_verified_20260905.json |
| src-sources_ledger.json | OK | 0 | source_record:sources_ledger.json |
| src-sources_ledger_volume_probe.json | OK | 0 | source_record:sources_ledger_volume_probe.json |
| src-souyun_poems_by_person.json | OK | 0 | source_record:souyun_poems_by_person.json |
| src-souyun_poems_by_place.json | OK | 0 | source_record:souyun_poems_by_place.json |
| src-suzhou_narrative_candidates.json | OK | 0 | source_record:suzhou_narrative_candidates.json |
| src-suzhou_narrative_review.json | OK | 0 | source_record:suzhou_narrative_review.json |
| src-suzhou_people_shanghai.json | OK | 0 | source_record:suzhou_people_shanghai.json |
| src-verify_cbdb_20260831.json | OK | 0 | source_record:verify_cbdb_20260831.json |
| src-verify_song_press_20260831.json | OK | 0 | source_record:verify_song_press_20260831.json |
| src-verify_souyun_20260831.json | OK | 0 | source_record:verify_souyun_20260831.json |
| src-verify_souyun_legacy30_20260831.json | OK | 0 | source_record:verify_souyun_legacy30_20260831.json |
| src-yutu_catalog.json | OK | 0 | source_record:yutu_catalog.json |
| src-yutu_catalog_20260831.json | OK | 0 | source_record:yutu_catalog_20260831.json |
| src-yutu_catalog_checked.json | OK | 0 | source_record:yutu_catalog_checked.json |
| src-yutu_catalog_final_20260831.json | OK | 0 | source_record:yutu_catalog_final_20260831.json |
| src-yutu_level3.json | OK | 0 | source_record:yutu_level3.json |
| src-yutu_meta_probe.json | OK | 0 | source_record:yutu_meta_probe.json |
| src-yutu_plaquettes.json | OK | 0 | source_record:yutu_plaquettes.json |
| src-yutu_plaquettes_checked.json | OK | 0 | source_record:yutu_plaquettes_checked.json |
| src-yutu_sparql_schema.json | OK | 0 | source_record:yutu_sparql_schema.json |
| src-yutu_triples_cache.json | OK | 0 | source_record:yutu_triples_cache.json |
| src-yutu_verify_coverage.json | OK | 0 | source_record:yutu_verify_coverage.json |

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
