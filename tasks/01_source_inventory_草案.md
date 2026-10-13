# 01_source_inventory（D01 草案 · 库内资料盘点分类）

> **性质**：D01 草案（读前设计），供项目拥有者确认分类口径与"可读性"判定。未落库、未执行任何数据生产。
> **材料源**：`D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched`（沪上经纬 Legacy Reservoir，只读）。
> **分类法**：T01–T14（宽进与广联 §5）。**可读性四档**：`readable`（有可读正文/条目）· `catalog_only`（仅书目/元数据/注记，无正文）· `visual_carrier`（图像/PDF 字节需"读图"层）· `derived`（AI 派生/复核，非一手，仅辅助）。

---

## 0. 总览（按可读性四档）

| 档 | 含义 | 处理的 D02 姿态 |
|---|---|---|
| readable | 有可切条目的正文/结构化文本 | 做条目级/字段级 Observation |
| catalog_only | 书目、元数据、注记片段，无正文 | 仅登记 Source Lead；**不得冒充"已读懂"** |
| visual_carrier | 图/PDF 字节在本地或外部 URL | 需"读图/读画面"层；无此能力则停留 Asset Pending |
| derived | AI 抽取/复核/OCR 中间产物 | 不当前手来源读，仅作对照/回填线索 |

> ⚠️ **最重要结论**：当前库里**多数"方志/舆图"是 catalog_only，不是可读正文**。真正可读正文在 `gj_*_entries` / `mgts_*_entries` / `gj_*_ocr`；真正可读舆图在 `yutu_probe/`（142 PDF + 45 PNG）。D02 必须严格区分，否则会重演"把书名当内容"。

---

## 1. T01 方志 / 地方文献

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `gazetteer_details.json` | 方志书目元数据 | catalog_only | `gazetteers[]`：title/towns/work_uri/creator，无正文 |
| `gj_fangzhi.json` | 方志书目+注记 | catalog_only | `hasAnnotation[].hasBody` 有"《青浦县志》四十卷。（王昶撰。）"等片段 |
| `gj_14386_entries.json` `gj_3799_entries.json` `gj_6922_entries.json` | 古籍方志正文条目 | readable | 待抽样验证条目结构 |
| `gj_14386_ocr.json` `gj_3799_ocr.json` `gj_6922_ocr.json` | 方志 OCR 全文 | readable | **需 OCR 质量评估**，差则降级 uncertain |
| `gj_14373_toc.json` `gj_14373_toc.md` | 目录 | catalog_only | 仅卷目 |
| `gj_works_青浦.json` `gj_works_青浦县志.json` `gj_works_朱家角.json` `gj_works_朱家角镇志.json` `gj_works_珠里小志.json` | 方志 works 书目/注记 | catalog_only | 含 hasBody 片段 |
| `dmz_zhujiajiao.json` | 镇志 | readable? | 需抽样验证（镇志正文/条目） |
| `geo_placenames_shanghai.json` | 地名志 | readable | 地名条目 |
| `jinze_evolution_raw_20260830.json` | 金泽沿革 | readable | 沿革文本 |
| `mgts_104971_entries.json` `mgts_31278_entries.json` `mgts_4581_entries.json` `mgts_4584_entries.json` `mgts_4590_entries.json` `mgts_87274_entries.json` `mgts_90096_entries.json` `mgts_92309_entries.json` | 扫描本古籍条目 | readable | 扫描本条目 |
| `mgts_104971_town_hits.json` `mgts_31278_town_hits.json` `mgts_4581_town_hits.json` `mgts_4590_town_hits.json` | 扫描本命中条目 | readable | 镇域命中 |
| `mgts_92309_ocr.json` | 扫描本 OCR | readable | 需 OCR 评估 |

## 2. T02 古籍 / 诗文 / 笔记

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `souyun_poems_by_person.json` | 诗词 by 人物 | readable | 诗词本体；需标作者/时代/作品语境 |
| `souyun_poems_by_place.json` | 诗词 by 地名 | catalog/待核 | `corroborate` 结构，原文标"三重过滤后仍为『待核』，不得当确证"→ 仅 Lead |
| `jp_family_town_analysis.json` `jp_family_town_sparql_analysis.json` `jp_familyname_zhu.json` `jp_persons_zhu.json` `jp_shanghai_family_persons.json` `jp_shanghai_persons_count.json` `jp_shanghai_works.json` `jp_works_all.json` `jp_works_sparql.json` `jp_zhu_deepdive.json` `jp_zhu_persons.json` | 诗词人物/作品/家族分析 | readable | 含作品与人物网络 |
| `suzhou_people_shanghai.json` | 人物 | readable? | 需抽样 |

## 3. T03 档案 / 契约 / 族谱 / 碑刻

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `clans.json` | 家谱知识库 | readable | **高价值**：`families[].works[].description` 含迁徙叙事（始遷祖…自…遷…） |
| `clan_pdf_index.json` | 族谱 PDF 索引 | catalog_only | 仅索引 |
| `genealogy_20260910/`（10 PDF + 1 json） | 族谱扫描本 | visual_carrier | 扫描 PDF，需 OCR/读图 |

## 4. T04 报刊 / 近现代文献

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `press_raw_20260902/`（16 json） | 报刊原文 | readable | 一手报刊 |
| `press_filtered_20260902/`（11 json） | 筛选后报刊 | readable | |
| `press_all_20260910/` | 报刊合集 | readable | 需抽样 |
| `press_8town_review_*.txt`（×6） `press_filter_run_20260902.txt` `press_sample_review_20260902.txt` | AI 复核笔记 | derived | 仅参考，非一手 |
| `probe_s0_press*.json` `probe_press_pagination_20260902.json` | 探针 | derived | |

## 5. T05 现代研究 / 文保

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `protection_index.json` | 文保条目 | readable | 作者解释 vs 被引原始需拆分 |
| `sh_protection_index.json` | 上海文保 | readable | 同上 |

## 6. T06 古代舆图（重点：catalog 与真实图像分离）

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `yutu_catalog.json` `yutu_catalog_checked.json` `yutu_catalog_final_20260831.json` | 舆图书目元数据 | catalog_only | 1133 条；disclaimer 明示"仅书目元数据，无影像" |
| `yutu_level3.json` `yutu_meta_probe.json` `yutu_plaquettes.json` `yutu_plaquettes_checked.json` `yutu_sparql_schema.json` `yutu_triples_cache.json` `yutu_verify_coverage.json` | 元数据/缓存 | catalog_only/derived | |
| `commons_oldmaps_raw_20260831.json` `commons_external_maps_20260831.json` `rumsey_maps_raw_20260831.json` | 旧图/外部图元数据 | catalog_only | 无影像 |
| `external_mapsource_probe_20260831.json` | 探针 | derived | |
| `yutu_api/` | API 响应 | derived | |
| **`yutu_probe/`（142 PDF + 45 PNG）** | **舆图真实图像** | **visual_carrier** | **★ D02「读图」的真正对象**：绘本/石印/参谋本部测绘等；需图面语义/拓扑读取 |

## 7. T07 近现代测绘 / 地籍图

> **缺口**：本轮 reservoir 中**未识别到明确的 T07 文件**（测绘/地籍/航运图）。如需此载体，需确认是否补采或归入 `yutu_probe` 中的近现代测绘制图。报请拥有者裁定。

## 8. T08 历史照片 / 明信片 / 影像

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `commons_images.json`（437） | Commons 图像目录 | visual_carrier(catalog) | 含 title/description/towns/artist/license/date，但**图像字节在外部 URL**，读画面需取图 |
| `commons_baoshan_chuansha_20260831.json` `commons_cats_drill_20260831.json` | 图像目录/探针 | visual_carrier(catalog) | |
| `shanghai_images_census_20260905.json` `shanghai_images_verified_20260905.json` | 上海图像目录（含 verified） | visual_carrier(catalog) | verified 仅指元数据核对 |
| `p1a_attach_images_report_20260831_130954.json` | 图像报告 | derived | |
| `probe_s0_image_match.json` `probe_s0_photos.json` `mcp_screenshot_boxed.png` `mcp_screenshot_ocr.json` | 探针 | derived | |

## 9. T12 结构化库 / 目录 / 来源账本

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `cbdb_people.json` `cbdb_extract/` | 人物传记库 | readable | 结构化人物 |
| `coords_wikidata.json` | 坐标 | readable | 仅几何/ID |
| `events_linked.json` `hsly_events.json` | 事件记录 | readable | |
| `sources_ledger.json` `sources_ledger_volume_probe.json` | 来源账本 | catalog/structured | |
| `resource_probe_20260831.json` `resource_probe2_20260831.json` | 访问探针 | derived | |
| `verify_cbdb_20260831.json` `verify_song_press_20260831.json` `verify_souyun_20260831.json` `verify_souyun_legacy30_20260831.json` | 验证探针 | derived | |
| `probe_s0_b_bk.json` `probe_s0_yutu.json` | 探针 | derived | |
| `dig/`（12 json + 1 md） | 数字人文抽取 | derived? | 需抽样确认是否一手 |
| `ocr/` | OCR 输出 | derived | |
| `_chatgpt_extract_v2/` `_chatgpt_extract/` | AI 派生抽取 | derived | **非一手，仅辅助** |
| `_pdf_extract_api_2026.txt` `_pdf_extract_press.txt` `_pdf_extract_song.txt` `_pdf_extract_souyun.txt` | 抽取文本 | derived | |
| `_work_titles.json` | 著作标题索引 | catalog | |

## 10. T14 旧叙事资产

| 文件 | 子类型 | 可读性 | 备注 |
|---|---|---|---|
| `narrative_assets.json` | 旧故事/资产 | readable | **作 Research Lead**，追不到源保持待查 |
| `suzhou_narrative_candidates.json` | 叙事候选 | readable | Lead |
| `suzhou_narrative_review.json` | 复核 | derived | |

---

## 11. 待拥有者确认的判定（四档之外的事项）

1. **catalog_only 占比偏高**：方志/舆图大量为书目元数据。是否接受"先读可读条目源（`gj_*_entries`/`mgts_*_entries`/`gj_*_ocr`/`clans`/`press_*`），catalog 仅作 Lead"？
2. **视觉载体读取能力**：`yutu_probe/`（本地图）与 `commons_*`（外部 URL）的"读图/读画面"是否需要引入视觉模型？当前 D02 体无此能力。
3. **T07 缺口**：是否补采近现代测绘/地籍图，或将其并入 T06 处理？
4. **derived 文件**：`_chatgpt_extract*/` `ocr/` `dig/` `_pdf_extract_*.txt` `press_*_review*.txt` 是否一律不当前手来源，仅作对照/回填？
5. **权利状态**：当前 d01 默认 `rights_status=unclear`；commons 系列有明确 license，上图开放数据有竞赛许可，是否逐源补标？
