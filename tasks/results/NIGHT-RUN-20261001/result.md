# NIGHT-RUN-20261001 · Morning Summary

- 模式：WRITE（MOHEN_ENV=dev）· 截止时间：2026-10-01T22:00:00.000Z · 周期：6 分钟/作业
- 开始：2026-10-01T15:40:37.784Z · 结束：2026-10-01T22:00:00.738Z
- **结论：CUTOFF_REACHED**

## 计数
- 作业总数：66 · 完成：63 · 失败：0
- 落库新增：787
- 未执行（截止时间到/作业耗尽）：3

## 作业明细
| 作业 | 结果 | 新增 | 备注 |
|---|---|---|---|
| images-shanghai-verified | OK | 704 |  |
| images-shanghai-census | OK | 23 | skipped/missing |
| images-commons-baoshan | OK | 0 |  |
| images-commons-maps | OK | 0 |  |
| coords-wikidata | OK | 2 |  |
| src-gazetteer_details.json | OK | 1 |  |
| src-events_linked.json | OK | 1 |  |
| src-hsly_events.json | OK | 1 |  |
| src-narrative_assets.json | OK | 1 |  |
| src-cbdb_people.json | OK | 1 |  |
| src-clans.json | OK | 1 |  |
| src-clan_pdf_index.json | OK | 1 |  |
| src-jp_works_all.json | OK | 1 |  |
| src-jp_shanghai_works.json | OK | 1 |  |
| src-jp_persons_zhu.json | OK | 1 |  |
| src-jp_shanghai_family_persons.json | OK | 1 |  |
| src-jp_zhu_deepdive.json | OK | 1 |  |
| src-jp_family_town_analysis.json | OK | 1 |  |
| src-geo_placenames_shanghai.json | OK | 1 |  |
| src-protection_index.json | OK | 1 |  |
| src-sh_protection_index.json | OK | 1 |  |
| src-suzhou_narrative_candidates.json | OK | 1 |  |
| src-suzhou_narrative_review.json | OK | 1 |  |
| src-suzhou_people_shanghai.json | OK | 1 |  |
| src-yutu_catalog_final_20260831.json | OK | 1 |  |
| src-yutu_catalog_checked.json | OK | 1 |  |
| src-yutu_plaquettes_checked.json | OK | 1 |  |
| src-yutu_verify_coverage.json | OK | 1 |  |
| src-yutu_level3.json | OK | 1 |  |
| src-verify_cbdb_20260831.json | OK | 1 |  |
| src-verify_souyun_20260831.json | OK | 1 |  |
| src-verify_song_press_20260831.json | OK | 1 |  |
| src-resource_probe_20260831.json | OK | 1 |  |
| src-resource_probe2_20260831.json | OK | 1 |  |
| src-dmz_zhujiajiao.json | OK | 1 |  |
| src-gj_fangzhi.json | OK | 1 |  |
| src-gj_works___.json | OK | 1 |  |
| src-gj_works_____.json | OK | 1 |  |
| src-gj_works____.json | OK | 1 |  |
| src-gj_works______.json | OK | 1 |  |
| src-mgts_104971_entries.json | OK | 1 |  |
| src-mgts_31278_entries.json | OK | 1 |  |
| src-mgts_4581_entries.json | OK | 1 |  |
| src-mgts_4584_entries.json | OK | 1 |  |
| src-mgts_4590_entries.json | OK | 1 |  |
| src-mgts_87274_entries.json | OK | 1 |  |
| src-mgts_90096_entries.json | OK | 1 |  |
| src-mgts_92309_entries.json | OK | 1 |  |
| src-mgts_31278_town_hits.json | OK | 1 |  |
| src-mgts_4581_town_hits.json | OK | 1 |  |
| src-mgts_4590_town_hits.json | OK | 1 |  |
| src-mgts_104971_town_hits.json | OK | 1 |  |
| src-jinze_evolution_raw_20260830.json | OK | 1 |  |
| src-_work_titles.json | OK | 1 |  |
| src-mcp_screenshot_ocr.json | OK | 1 |  |
| src-external_mapsource_probe_20260831.json | OK | 1 |  |
| src-commons_oldmaps_raw_20260831.json | OK | 1 |  |
| src-rumsey_maps_raw_20260831.json | OK | 1 |  |
| src-commons_cats_drill_20260831.json | OK | 1 |  |
| src-jp_family_town_sparql_analysis.json | OK | 1 |  |
| src-jp_works_sparql.json | OK | 1 |  |
| src-jp_shanghai_persons_count.json | OK | 1 |  |
| src-jp_familyname_zhu.json | OK | 1 |  |

## 安全
- 零自动晋级：照片/坐标均为 candidate；未写 published/verified，未绕过 Evidence Gate
- 坐标诚实：provider_current_object_point + WGS84 + historical_position_proof=false（库层强制）
- Raw append-only：源材料快照存 D:/MoHen/data/raw/legacy/hushang/
- 幂等：按 legacy_id/checksum 跳过，可重跑
- 停止原因：截止时间到 / 作业完成

> 明细见 progress.json 与 runner.log。凭证不在本文件。
