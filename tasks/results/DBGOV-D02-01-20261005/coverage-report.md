# DBGOV-D02-01 · 来源材料内容解读覆盖率报告（D02 内容解读层）

> 模式 **WRITE** ｜ run_id `7a525999-ce78-41ee-8694-ac0d4a421ddd` ｜ 阶段 = 数据库治理第一阶段 · 只读内容观察（D02）+ 只读 Mention（D03）
> 唯一入口 `research-pipeline.mjs` 的 `research.content-observation` 作业。**0 实体 / 0 关系 / 0 候选 / 0 Truth Promotion。**

## 0. 一句话结论（以覆盖率为准，不以条数论英雄）

- **来源级覆盖**：可读文本来源 39/41 已被内容解读（**95.1%**）。
- **片段级覆盖（配额内）**：3389 条 Observation 覆盖了 3389 个可抽样文本片段中的 **100.0%**（每源上限 500）。
- **片段级覆盖（全量）**：占全量文本片段 4729 的 **71.7%**（超出配额的源未全读，见 §4）。
- **未读来源 56 个**（见 §4 名单与原因）—— 这是本阶段真正要补的缺口，不是"新增条数"。

## 1. 来源可读取总览

| 指标 | 值 |
|---|---|
| 来源总数 | 95 |
| 可读（readable） | 55 |
| └ 其中可读文本源（D02 实际覆盖对象） | 41 |
| └ 其中视觉载体（无正文段落，本轮不覆盖） | 14 |
| 仅目录/结构（catalog_only） | 40 |
| 不可解析（unreadable） | 0 |
| 文本片段总数（可读文本源） | 4729 |

## 2. 覆盖率（核心指标）

| 覆盖率口径 | 分子 | 分母 | 覆盖 % |
|---|---|---|---|
| 来源级（可读文本源被读到） | 39 | 41 | **95.1%** |
| 片段级（配额内可抽样） | 3389 | 3389 | **100.0%** |
| 片段级（全量文本片段） | 3389 | 4729 | 71.7% |

> 说明：为防字母序靠后的来源被饿死（首轮缺陷），采用轮转配额（每源上限 500）。超出配额的大源按此口径为"未全读"，不计入分母失真。

## 3. 按载体类型的覆盖率

| 载体类型 | 来源数 | 可读 | 文本片段 | Observation | 覆盖%（配额内） |
|---|---|---|---|---|---|
| unknown | 19 | 13 | 984 | 984 | 100.0% |
| biography_db | 1 | 0 | 0 | 0 | 0.0% |
| clan_genealogy | 1 | 0 | 0 | 0 | 0.0% |
| image_catalog | 7 | 6 | 0 | 0 | 0.0% |
| town_monograph | 2 | 2 | 41 | 41 | 100.0% |
| event_record | 2 | 2 | 746 | 746 | 100.0% |
| gazetteer | 1 | 1 | 1 | 1 | 100.0% |
| placename_gazetteer | 1 | 0 | 0 | 0 | 0.0% |
| old_book_fulltext | 27 | 15 | 2138 | 798 | 37.3% |
| poetry_person | 11 | 0 | 0 | 0 | 0.0% |
| narrative_asset | 1 | 1 | 227 | 227 | 100.0% |
| heritage_protection | 2 | 2 | 2 | 2 | 100.0% |
| access_probe | 2 | 1 | 3 | 3 | 100.0% |
| narrative_candidate | 3 | 3 | 564 | 564 | 100.0% |
| verification_probe | 4 | 1 | 23 | 23 | 100.0% |
| historical_map | 11 | 8 | 0 | 0 | 0.0% |

## 4. 未读来源名单（本阶段要补的缺口）

共 **56** 个来源未被内容解读：

| 来源 | 载体 | 可读性 | 原因 |
|---|---|---|---|
| _work_titles.json | unknown | catalog_only | catalog_only（仅结构/目录，无正文） |
| cbdb_people.json | biography_db | catalog_only | catalog_only（仅结构/目录，无正文） |
| clan_pdf_index.json | clan_genealogy | catalog_only | catalog_only（仅结构/目录，无正文） |
| commons_baoshan_chuansha_20260831.json | image_catalog | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| commons_cats_drill_20260831.json | image_catalog | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| commons_external_maps_20260831.json | image_catalog | catalog_only | catalog_only（仅结构/目录，无正文） |
| commons_images.json | image_catalog | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| commons_oldmaps_raw_20260831.json | image_catalog | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| coords_wikidata.json | unknown | readable | no_text_content（可读但无正文片段，如纯坐标/ID 数据） |
| geo_placenames_shanghai.json | placename_gazetteer | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_14386_entries.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_3799_entries.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_6922_entries.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_fangzhi.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_works_朱家角.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_works_朱家角镇志.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_works_珠里小志.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_works_青浦.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| gj_works_青浦县志.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_family_town_analysis.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_family_town_sparql_analysis.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_familyname_zhu.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_persons_zhu.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_shanghai_family_persons.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_shanghai_persons_count.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_shanghai_works.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_works_all.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_works_sparql.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_zhu_deepdive.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| jp_zhu_persons.json | poetry_person | catalog_only | catalog_only（仅结构/目录，无正文） |
| mgts_87274_entries.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| mgts_90096_entries.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| mgts_92309_entries.json | old_book_fulltext | catalog_only | catalog_only（仅结构/目录，无正文） |
| p1a_attach_images_report_20260831_130954.json | unknown | catalog_only | catalog_only（仅结构/目录，无正文） |
| probe_press_pagination_20260902.json | unknown | catalog_only | catalog_only（仅结构/目录，无正文） |
| probe_s0_b_bk.json | unknown | catalog_only | catalog_only（仅结构/目录，无正文） |
| probe_s0_press_diag.json | unknown | catalog_only | catalog_only（仅结构/目录，无正文） |
| probe_s0_press_diag2.json | unknown | catalog_only | catalog_only（仅结构/目录，无正文） |
| resource_probe_20260831.json | access_probe | catalog_only | catalog_only（仅结构/目录，无正文） |
| shanghai_images_census_20260905.json | image_catalog | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| shanghai_images_verified_20260905.json | image_catalog | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| sources_ledger_volume_probe.json | unknown | readable | no_text_content（可读但无正文片段，如纯坐标/ID 数据） |
| verify_cbdb_20260831.json | verification_probe | catalog_only | catalog_only（仅结构/目录，无正文） |
| verify_song_press_20260831.json | verification_probe | catalog_only | catalog_only（仅结构/目录，无正文） |
| verify_souyun_legacy30_20260831.json | verification_probe | catalog_only | catalog_only（仅结构/目录，无正文） |
| yutu_catalog.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| yutu_catalog_20260831.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| yutu_catalog_checked.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| yutu_catalog_final_20260831.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| yutu_level3.json | historical_map | catalog_only | catalog_only（仅结构/目录，无正文） |
| yutu_meta_probe.json | historical_map | catalog_only | catalog_only（仅结构/目录，无正文） |
| yutu_plaquettes.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| yutu_plaquettes_checked.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| yutu_sparql_schema.json | historical_map | catalog_only | catalog_only（仅结构/目录，无正文） |
| yutu_triples_cache.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |
| yutu_verify_coverage.json | historical_map | readable | visual_carrier（无正文段落，需图读层，本轮不覆盖） |

## 5. Observation 质量（每条必须 locator/region/uncertainty）

| 校验项 | 满足数 / 总数 |
|---|---|
| 带 locator | 3389/3389 |
| 带 region | 3389/3389 |
| 带 uncertainty | 3389/3389 |

modality 分布：{"text":3389}

association_readiness 分布：{"ready":3389}

## 6. 只读不抽 · 安全确认

- Observation：3389（已落库=true）
- Mention：9373（resolved=7679，unresolved=1694，**未制造任何 Entity**）
- 来源依赖登记（转引/同源）：519
- **实体写入 = 0 ｜ 关系写入 = 0 ｜ 候选写入 = 0 ｜ Truth Promotion = 0**

## 7. 逐来源明细

| 来源 | 载体 | 可读性 | 文本片段 | Observation | 覆盖%（配额内） |
|---|---|---|---|---|---|
| _work_titles.json | unknown | catalog_only | 0 | 0 | —（非文本可读源） |
| cbdb_people.json | biography_db | catalog_only | 0 | 0 | —（非文本可读源） |
| clan_pdf_index.json | clan_genealogy | catalog_only | 0 | 0 | —（非文本可读源） |
| clans.json | unknown | readable | 148 | 148 | 100.0% |
| commons_baoshan_chuansha_20260831.json | image_catalog | readable | 0 | 0 | —（非文本可读源） |
| commons_cats_drill_20260831.json | image_catalog | readable | 0 | 0 | —（非文本可读源） |
| commons_external_maps_20260831.json | image_catalog | catalog_only | 0 | 0 | —（非文本可读源） |
| commons_images.json | image_catalog | readable | 0 | 0 | —（非文本可读源） |
| commons_oldmaps_raw_20260831.json | image_catalog | readable | 0 | 0 | —（非文本可读源） |
| coords_wikidata.json | unknown | readable | 0 | 0 | 0.0% |
| dmz_zhujiajiao.json | town_monograph | readable | 1 | 1 | 100.0% |
| events_linked.json | event_record | readable | 255 | 255 | 100.0% |
| external_mapsource_probe_20260831.json | unknown | readable | 1 | 1 | 100.0% |
| gazetteer_details.json | gazetteer | readable | 1 | 1 | 100.0% |
| geo_placenames_shanghai.json | placename_gazetteer | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_14373_toc.json | old_book_fulltext | readable | 1840 | 500 | 100.0% |
| gj_14386_entries.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_14386_ocr.json | old_book_fulltext | readable | 44 | 44 | 100.0% |
| gj_3799_entries.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_3799_ocr.json | old_book_fulltext | readable | 7 | 7 | 100.0% |
| gj_6922_entries.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_6922_ocr.json | old_book_fulltext | readable | 17 | 17 | 100.0% |
| gj_fangzhi.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_works_朱家角.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_works_朱家角镇志.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_works_珠里小志.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_works_青浦.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| gj_works_青浦县志.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| hsly_events.json | event_record | readable | 491 | 491 | 100.0% |
| jinze_evolution_raw_20260830.json | town_monograph | readable | 40 | 40 | 100.0% |
| jp_family_town_analysis.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_family_town_sparql_analysis.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_familyname_zhu.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_persons_zhu.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_shanghai_family_persons.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_shanghai_persons_count.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_shanghai_works.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_works_all.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_works_sparql.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_zhu_deepdive.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| jp_zhu_persons.json | poetry_person | catalog_only | 0 | 0 | —（非文本可读源） |
| mcp_screenshot_ocr.json | unknown | readable | 38 | 38 | 100.0% |
| mgts_104971_entries.json | old_book_fulltext | readable | 10 | 10 | 100.0% |
| mgts_104971_town_hits.json | old_book_fulltext | readable | 34 | 34 | 100.0% |
| mgts_31278_entries.json | old_book_fulltext | readable | 9 | 9 | 100.0% |
| mgts_31278_town_hits.json | old_book_fulltext | readable | 35 | 35 | 100.0% |
| mgts_4581_entries.json | old_book_fulltext | readable | 67 | 67 | 100.0% |
| mgts_4581_town_hits.json | old_book_fulltext | readable | 10 | 10 | 100.0% |
| mgts_4584_entries.json | old_book_fulltext | readable | 41 | 41 | 100.0% |
| mgts_4584_town_hits.json | old_book_fulltext | readable | 10 | 10 | 100.0% |
| mgts_4590_entries.json | old_book_fulltext | readable | 2 | 2 | 100.0% |
| mgts_4590_town_hits.json | old_book_fulltext | readable | 1 | 1 | 100.0% |
| mgts_87274_entries.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| mgts_90096_entries.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| mgts_92309_entries.json | old_book_fulltext | catalog_only | 0 | 0 | —（非文本可读源） |
| mgts_92309_ocr.json | old_book_fulltext | readable | 11 | 11 | 100.0% |
| narrative_assets.json | narrative_asset | readable | 227 | 227 | 100.0% |
| p1a_attach_images_report_20260831_130954.json | unknown | catalog_only | 0 | 0 | —（非文本可读源） |
| probe_press_pagination_20260902.json | unknown | catalog_only | 0 | 0 | —（非文本可读源） |
| probe_s0_b_bk.json | unknown | catalog_only | 0 | 0 | —（非文本可读源） |
| probe_s0_image_match.json | unknown | readable | 2 | 2 | 100.0% |
| probe_s0_photos.json | unknown | readable | 11 | 11 | 100.0% |
| probe_s0_press.json | unknown | readable | 408 | 408 | 100.0% |
| probe_s0_press_diag.json | unknown | catalog_only | 0 | 0 | —（非文本可读源） |
| probe_s0_press_diag2.json | unknown | catalog_only | 0 | 0 | —（非文本可读源） |
| probe_s0_yutu.json | unknown | readable | 23 | 23 | 100.0% |
| protection_index.json | heritage_protection | readable | 1 | 1 | 100.0% |
| resource_probe2_20260831.json | access_probe | readable | 3 | 3 | 100.0% |
| resource_probe_20260831.json | access_probe | catalog_only | 0 | 0 | —（非文本可读源） |
| rumsey_maps_raw_20260831.json | unknown | readable | 1 | 1 | 100.0% |
| sh_protection_index.json | heritage_protection | readable | 1 | 1 | 100.0% |
| shanghai_images_census_20260905.json | image_catalog | readable | 0 | 0 | —（非文本可读源） |
| shanghai_images_verified_20260905.json | image_catalog | readable | 0 | 0 | —（非文本可读源） |
| sources_ledger.json | unknown | readable | 1 | 1 | 100.0% |
| sources_ledger_volume_probe.json | unknown | readable | 0 | 0 | 0.0% |
| souyun_poems_by_person.json | unknown | readable | 340 | 340 | 100.0% |
| souyun_poems_by_place.json | unknown | readable | 11 | 11 | 100.0% |
| suzhou_narrative_candidates.json | narrative_candidate | readable | 254 | 254 | 100.0% |
| suzhou_narrative_review.json | narrative_candidate | readable | 254 | 254 | 100.0% |
| suzhou_people_shanghai.json | narrative_candidate | readable | 56 | 56 | 100.0% |
| verify_cbdb_20260831.json | verification_probe | catalog_only | 0 | 0 | —（非文本可读源） |
| verify_song_press_20260831.json | verification_probe | catalog_only | 0 | 0 | —（非文本可读源） |
| verify_souyun_20260831.json | verification_probe | readable | 23 | 23 | 100.0% |
| verify_souyun_legacy30_20260831.json | verification_probe | catalog_only | 0 | 0 | —（非文本可读源） |
| yutu_catalog.json | historical_map | readable | 0 | 0 | —（非文本可读源） |
| yutu_catalog_20260831.json | historical_map | readable | 0 | 0 | —（非文本可读源） |
| yutu_catalog_checked.json | historical_map | readable | 0 | 0 | —（非文本可读源） |
| yutu_catalog_final_20260831.json | historical_map | readable | 0 | 0 | —（非文本可读源） |
| yutu_level3.json | historical_map | catalog_only | 0 | 0 | —（非文本可读源） |
| yutu_meta_probe.json | historical_map | catalog_only | 0 | 0 | —（非文本可读源） |
| yutu_plaquettes.json | historical_map | readable | 0 | 0 | —（非文本可读源） |
| yutu_plaquettes_checked.json | historical_map | readable | 0 | 0 | —（非文本可读源） |
| yutu_sparql_schema.json | historical_map | catalog_only | 0 | 0 | —（非文本可读源） |
| yutu_triples_cache.json | historical_map | readable | 0 | 0 | —（非文本可读源） |
| yutu_verify_coverage.json | historical_map | readable | 0 | 0 | —（非文本可读源） |

> 生成于 2026-10-05T10:17:12.925Z，耗时 4.5s。