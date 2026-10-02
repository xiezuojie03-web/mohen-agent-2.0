// pipelines/legacy/unattended-jobs.mjs
// 无人值守作业队列（自 unattended-runner.mjs 抽出 · 2026-10-02 M1.2）
//
// 为什么抽成独立模块：
//   M1.2 要求「未在生产注册表里声明的作业一律不调度」。要**精确**核对队列里每个作业是否已声明，
//   队列定义就必须能被守卫 import；留在 runner 里（runner 有副作用、不能 import）就只能靠正则猜，
//   那正是 `data/fixtures/source-providers.json` 的失败模式（文档写着、代码里没有）。
//
// 匹配规则（见 specs/data-production/production-registry.json）：
//   id 以 `*` 结尾 → 前缀匹配；否则全等。每个作业必须**恰好**命中一个注册表条目。
//
// 本文件是纯数据，无副作用、无 IO。

const SPECIALS = [
  { id: "images-shanghai-verified", kind: "images", file: "shanghai_images_verified_20260905.json" },
  { id: "images-shanghai-census", kind: "images", file: "shanghai_images_census_20260905.json" },
  { id: "images-commons-baoshan", kind: "images", file: "commons_baoshan_chuansha_20260831.json" },
  { id: "images-commons-maps", kind: "images", file: "commons_external_maps_20260831.json" },
  { id: "coords-wikidata", kind: "coords", file: "coords_wikidata.json" },
];

// 旧库（hushang-jingwei）预抓取 JSON 清单。这些作业只做「登记来源 + Raw 快照」，
// 不做抽取、不产生 Claim —— 属协议 §10 的 N01（Source Refresh）。
const SOURCE_FILES = [
  "gazetteer_details.json", "events_linked.json", "hsly_events.json", "narrative_assets.json",
  "cbdb_people.json", "clans.json", "clan_pdf_index.json", "jp_works_all.json", "jp_shanghai_works.json",
  "jp_persons_zhu.json", "jp_shanghai_family_persons.json", "jp_zhu_deepdive.json", "jp_family_town_analysis.json",
  "geo_placenames_shanghai.json", "protection_index.json", "sh_protection_index.json",
  "suzhou_narrative_candidates.json", "suzhou_narrative_review.json", "suzhou_people_shanghai.json",
  "yutu_catalog_final_20260831.json", "yutu_catalog_checked.json", "yutu_plaquettes_checked.json",
  "yutu_verify_coverage.json", "yutu_level3.json", "verify_cbdb_20260831.json", "verify_souyun_20260831.json",
  "verify_song_press_20260831.json", "resource_probe_20260831.json", "resource_probe2_20260831.json",
  "dmz_zhujiajiao.json", "gj_fangzhi.json", "gj_works_青浦.json", "gj_works_青浦县志.json",
  "gj_works_朱家角.json", "gj_works_朱家角镇志.json", "gj_works_珠里小志.json",
  "mgts_104971_entries.json", "mgts_31278_entries.json", "mgts_4581_entries.json", "mgts_4584_entries.json",
  "mgts_4590_entries.json", "mgts_87274_entries.json", "mgts_90096_entries.json", "mgts_92309_entries.json",
  "mgts_31278_town_hits.json", "mgts_4581_town_hits.json", "mgts_4590_town_hits.json", "mgts_104971_town_hits.json",
  "jinze_evolution_raw_20260830.json", "_work_titles.json", "mcp_screenshot_ocr.json",
  "external_mapsource_probe_20260831.json", "commons_oldmaps_raw_20260831.json", "rumsey_maps_raw_20260831.json",
  "commons_cats_drill_20260831.json", "jp_family_town_sparql_analysis.json", "jp_works_sparql.json",
  "jp_shanghai_persons_count.json", "jp_familyname_zhu.json", "jp_zhu_persons.json", "gj_14373_toc.json",
];

/** 返回完整作业队列（5 个专项 + 61 个来源登记 = 66）。 */
export function buildJobs() {
  return SPECIALS.concat(
    SOURCE_FILES.map((f) => ({ id: "src-" + f.replace(/[^\w.-]/g, "_"), kind: "source", file: f }))
  );
}

/** 生产注册表的条目匹配：id 以 `*` 结尾为前缀匹配，否则全等。 */
export function matchEntries(entries, jobId) {
  return entries.filter((e) => (e.id.endsWith("*") ? jobId.startsWith(e.id.slice(0, -1)) : e.id === jobId));
}
