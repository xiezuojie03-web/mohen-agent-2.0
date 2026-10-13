# D01+D02 离线读懂报告（决策已应用 + 缺口标记）
> run_id `7a88c3d3-41ee-43df-966c-002ac4fa4833` ｜ 离线执行，未连库，零 Truth 写入

## 决策落实
- ① 可读文本优先：纳入 82 个可读源（clans/gj_*/mgts_*/press_*/protection*/方志/诗词/镇志/souyun…）
- ② 视觉 Asset Pending：yutu_probe 142 PDF + 45 PNG、commons 437 张 → 仅登记，不读图
- ③ OCR 质量：对 4 个 OCR 源做乱码率评估，79 条 Observation 已据乱码率定 uncertainty
- ④ derived 排除：30 个文件不当前手
- ⑤ T07：库内未检出近现代测绘/地籍图（T07）源 → 并入 T06 缺口，不补采

## 覆盖
- 可读文本源：82，已被读到：55（67.1%）
- 文本片段总数（可读源）：8536 ｜ Observation：6828 ｜ Mention：6104（resolved 1385）
- 视觉载体（asset_pending）：16 组 ｜ derived 排除：30
- **缺陷/空桩源（库内缺口，已标记不读取）：13**
- 实体写入=0 ｜ 关系写入=0 ｜ 候选写入=0 ｜ Truth Promotion=0

## 缺陷/空桩源明细（库内缺失/损坏，需补采或修复抓取）
| 来源 | 载体 | 缺陷类型 |
|---|---|---|
| gj_14386_entries.json | old_book_fulltext | 缺陷源：empty_entries_stub（不读取，仅登记缺口） |
| gj_3799_entries.json | old_book_fulltext | 缺陷源：empty_entries_stub（不读取，仅登记缺口） |
| gj_6922_entries.json | old_book_fulltext | 缺陷源：empty_entries_stub（不读取，仅登记缺口） |
| gj_works_朱家角.json | old_book_fulltext | 缺陷源：http_error_403（不读取，仅登记缺口） |
| gj_works_朱家角镇志.json | old_book_fulltext | 缺陷源：http_error_403（不读取，仅登记缺口） |
| gj_works_珠里小志.json | old_book_fulltext | 缺陷源：http_error_403（不读取，仅登记缺口） |
| gj_works_青浦.json | old_book_fulltext | 缺陷源：http_error_403（不读取，仅登记缺口） |
| gj_works_青浦县志.json | old_book_fulltext | 缺陷源：http_error_403（不读取，仅登记缺口） |
| jp_familyname_zhu.json | poetry_person | 缺陷源：empty_body(status200,抓取空)（不读取，仅登记缺口） |
| jp_persons_zhu.json | poetry_person | 缺陷源：http_error_403（不读取，仅登记缺口） |
| mgts_87274_entries.json | old_book_fulltext | 缺陷源：empty_entries_stub（不读取，仅登记缺口） |
| mgts_90096_entries.json | old_book_fulltext | 缺陷源：empty_entries_stub（不读取，仅登记缺口） |
| mgts_92309_entries.json | old_book_fulltext | 缺陷源：empty_entries_stub（不读取，仅登记缺口） |

## 逐来源明细（可读文本）
| 来源 | 载体 | 可读性 | 片段 | Observation |
|---|---|---|---|---|
| clan_pdf_index.json | clan_genealogy | catalog_only | 0 | 0 |
| dmz_zhujiajiao.json | town_monograph | readable | 2 | 2 |
| events_linked.json | event_record | readable | 255 | 255 |
| gazetteer_details.json | gazetteer | readable | 81 | 81 |
| genealogy_20260910/scan_by_town.json | clan_genealogy | catalog_only | 22 | 22 |
| geo_placenames_shanghai.json | placename_gazetteer | catalog_only | 0 | 0 |
| gj_14373_toc.json | old_book_fulltext | readable | 1840 | 400 |
| gj_14386_entries.json | old_book_fulltext | defective | 0 | 0 |
| gj_14386_ocr.json | old_book_fulltext(OCR) | readable | 44 | 44 |
| gj_3799_entries.json | old_book_fulltext | defective | 0 | 0 |
| gj_3799_ocr.json | old_book_fulltext(OCR) | readable | 7 | 7 |
| gj_6922_entries.json | old_book_fulltext | defective | 0 | 0 |
| gj_6922_ocr.json | old_book_fulltext(OCR) | readable | 17 | 17 |
| gj_fangzhi.json | old_book_fulltext | catalog_only | 17 | 17 |
| gj_works_朱家角.json | old_book_fulltext | defective | 0 | 0 |
| gj_works_朱家角镇志.json | old_book_fulltext | defective | 0 | 0 |
| gj_works_珠里小志.json | old_book_fulltext | defective | 0 | 0 |
| gj_works_青浦.json | old_book_fulltext | defective | 0 | 0 |
| gj_works_青浦县志.json | old_book_fulltext | defective | 0 | 0 |
| hsly_events.json | event_record | readable | 491 | 400 |
| jinze_evolution_raw_20260830.json | town_monograph | readable | 40 | 40 |
| jp_familyname_zhu.json | poetry_person | defective | 0 | 0 |
| jp_family_town_analysis.json | poetry_person | catalog_only | 0 | 0 |
| jp_family_town_sparql_analysis.json | poetry_person | catalog_only | 0 | 0 |
| jp_persons_zhu.json | poetry_person | defective | 0 | 0 |
| jp_shanghai_family_persons.json | poetry_person | catalog_only | 80 | 80 |
| jp_shanghai_persons_count.json | poetry_person | catalog_only | 0 | 0 |
| jp_shanghai_works.json | poetry_person | catalog_only | 1 | 1 |
| jp_works_all.json | poetry_person | catalog_only | 2 | 2 |
| jp_works_sparql.json | poetry_person | catalog_only | 0 | 0 |
| jp_zhu_deepdive.json | poetry_person | catalog_only | 0 | 0 |
| jp_zhu_persons.json | poetry_person | catalog_only | 80 | 80 |
| mgts_104971_entries.json | old_book_fulltext | readable | 10 | 10 |
| mgts_104971_town_hits.json | old_book_fulltext | readable | 34 | 34 |
| mgts_31278_entries.json | old_book_fulltext | readable | 9 | 9 |
| mgts_31278_town_hits.json | old_book_fulltext | readable | 35 | 35 |
| mgts_4581_entries.json | old_book_fulltext | readable | 67 | 67 |
| mgts_4581_town_hits.json | old_book_fulltext | readable | 10 | 10 |
| mgts_4584_entries.json | old_book_fulltext | readable | 41 | 41 |
| mgts_4584_town_hits.json | old_book_fulltext | readable | 10 | 10 |
| mgts_4590_entries.json | old_book_fulltext | readable | 6 | 6 |
| mgts_4590_town_hits.json | old_book_fulltext | readable | 3 | 3 |
| mgts_87274_entries.json | old_book_fulltext | defective | 0 | 0 |
| mgts_90096_entries.json | old_book_fulltext | defective | 0 | 0 |
| mgts_92309_entries.json | old_book_fulltext | defective | 0 | 0 |
| mgts_92309_ocr.json | old_book_fulltext(OCR) | readable | 11 | 11 |
| narrative_assets.json | narrative_asset | readable | 227 | 227 |
| press_all_20260910/张堰.json | press | readable | 46 | 46 |
| press_all_20260910/练塘.json | press | readable | 29 | 29 |
| press_filtered_20260902/南翔.json | press | readable | 131 | 131 |
| press_filtered_20260902/嘉定.json | press | readable | 52 | 52 |
| press_filtered_20260902/川沙.json | press | readable | 254 | 254 |
| press_filtered_20260902/张堰.json | press | catalog_only | 0 | 0 |
| press_filtered_20260902/新场.json | press | readable | 312 | 312 |
| press_filtered_20260902/朱家角.json | press | readable | 240 | 240 |
| press_filtered_20260902/枫泾.json | press | readable | 376 | 376 |
| press_filtered_20260902/练塘.json | press | catalog_only | 0 | 0 |
| press_filtered_20260902/罗店.json | press | readable | 445 | 400 |
| press_filtered_20260902/金泽.json | press | readable | 532 | 400 |
| press_filtered_20260902/高桥.json | press | readable | 45 | 45 |
| press_raw_20260902/_faulty_archive/张堰_count0_20260910_162006.json | press | catalog_only | 0 | 0 |
| press_raw_20260902/_faulty_archive/张堰_count0_20260910_162213.json | press | readable | 47 | 47 |
| press_raw_20260902/_faulty_archive/练塘_count0_20260910_162006.json | press | catalog_only | 0 | 0 |
| press_raw_20260902/_faulty_archive/练塘_count0_20260910_162213.json | press | readable | 26 | 26 |
| press_raw_20260902/_summary.json | press | catalog_only | 0 | 0 |
| press_raw_20260902/南翔.json | press | readable | 111 | 111 |
| press_raw_20260902/嘉定.json | press | readable | 14 | 14 |
| press_raw_20260902/川沙.json | press | readable | 254 | 254 |
| press_raw_20260902/张堰.json | press | catalog_only | 0 | 0 |
| press_raw_20260902/新场.json | press | readable | 244 | 244 |
| press_raw_20260902/朱家角.json | press | readable | 209 | 209 |
| press_raw_20260902/枫泾.json | press | readable | 292 | 292 |
| press_raw_20260902/练塘.json | press | catalog_only | 0 | 0 |
| press_raw_20260902/罗店.json | press | readable | 396 | 396 |
| press_raw_20260902/金泽.json | press | readable | 331 | 331 |
| press_raw_20260902/高桥.json | press | readable | 45 | 45 |
| protection_index.json | heritage_protection | readable | 1 | 1 |
| sh_protection_index.json | heritage_protection | readable | 1 | 1 |
| souyun_poems_by_person.json | poetry_corpus | readable | 340 | 340 |
| souyun_poems_by_place.json | poetry_corpus | readable | 11 | 11 |
| suzhou_narrative_candidates.json | narrative_candidate | readable | 254 | 254 |
| suzhou_people_shanghai.json | narrative_candidate | readable | 56 | 56 |

> 输出目录：D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0\tasks\results\D01D02-20261005