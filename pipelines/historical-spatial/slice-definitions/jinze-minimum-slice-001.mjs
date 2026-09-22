// pipelines/historical-spatial/slice-definitions/jinze-minimum-slice-001.mjs
//
// TASK-0010 §2 严格切片边界的**策展定义**（数据，不是逻辑）。
//
// 本文件是人（架构师）对「哪些对象进切片、每条断言属什么级别」的裁定结果的机器可读形式。
// 构建器 build-jinze-historical-spatial-slice.mjs 只负责：解析证据选择器 → 落库 → 出投影。
// 所有断言都必须挂到**已存在的** Evidence 行上；没有 Evidence 的行一律显式降级为
// legacy_only_assertions / unknown，并写入 uncertainties 的 missing_evidence。
//
// §2 边界（不得越界）：
//   P0 = 万安桥 / 普济桥 / 颐浩寺·颐浩寺遗址 / 解释三者所必需的最小水系（金泽塘）
//   P1 = 仅消歧用：金泽镇锚（本切片不建独立特征，由 uncertainties 与 town_level_reference 锚承载）、
//        吕颐浩（仅作「颐浩寺」命名来源的消歧锚，不建空间主张）
//   不纳入：其余金泽古桥、其余寺院、其余河道、其余地图标签、'四十二虹桥' 叠影层。

// 证据选择器：以「来源事实」定位既有 Evidence 行（不硬编码 UUID）。
// expect 为期望命中行数；命中数不符即视为**缺口**（写入 uncertainties/gaps），不静默通过。
const E = (key, sql, expect = 1, optional = false) => ({ key, sql, expect, optional });

// 频繁复用的选择器片段
const AMAP = "spatial_anchor:amap_place_text_v3";
const P625 = "coordinate_provenance:wikidata_p625_town_anchor";

export const FEATURES = [
  {
    feature_key: "jinze-min-001/feature/wananqiao",
    feature_type: "bridge",
    canonical_label: "万安桥",
    historical_labels: [],
    modern_labels: ["万安桥"],
    label_variants_note:
      "未取得任何前现代印刷形态的直接着录（1879 图说 p36 未读出可归因标签 → HR-MAP-01 UNRESOLVED）。§12-13：不以前现代字形替换现代字形，故 historical_labels 留空而非填入猜测字形。",
    entity_selector: { canonical_name: "万安桥", legacy_id: "hushang-jingwei:entity:JZ-BLD-002" },
    geometry_type: "point",
    geometry_note:
      "桥在现实中是线状构筑物，但本 Task 持有的唯一几何是 provider 当前**对象点**；不产生桥体线几何（无测绘来源）。",
    attested_time_start: "1260",
    attested_time_end: "1264",
    attested_time_label: "南宋景定年间（1260–1264）建",
    attested_time_evidence_backed: true,
    legacy_only_assertions: [
      "「旧志载其形制为亭桥（桥上建亭）」—— 该句仅存在于 Legacy 实体描述（且自述「据方志转述」），全库无对应 Evidence 行。",
    ],
    attested_historical_existence: "attested",
    current_survival_or_site: "survives",
    historical_position_status: "historical_relative_position_only",
    current_position_status: "official_or_provider_object_point",
    name_continuity_status: "continuous",
    change_status: "survives",
    historical_source_refs: [
      "上海图书馆《上海文化总库》遗产记录 physicalculturalheritage/chlyrdj3o8ll81k8",
      "Legacy 实体描述（转述方志，含「亭桥」形制——该部分无 Evidence 行）",
      "1879 光绪《青浦县志》图说（Historical Spatial Source = YES；但本图未读出「金泽」标签，故**不能**归因到本对象）",
    ],
    current_source_refs: [
      "AMap place/text B0FFJDP9J9（GCJ-02，当前 POI）",
      "Wikimedia Commons File:Wan'anqiao.jpg（CC BY-SA 3.0，当代实景）",
    ],
    review_status: "candidate",
    uncertainty_note:
      "「亭桥」形制、以及 1879 图上是否绘有本桥，均无证据；不得由当前对象点或图上邻近性推断历史位置。",
    evidence: [
      E("wanan_amap", `extraction_method='${AMAP}' and subject_hint='万安桥'`),
      E("wanan_shl", `extraction_method='legacy_entity_source' and subject_hint='万安桥'`),
      E("wanan_built", `extraction_method='legacy_json_extract' and subject_hint='万安桥' and quote_text like '%景定%'`),
      E("wanan_protected", `extraction_method='legacy_json_extract' and subject_hint='万安桥' and quote_text like '%文物保护单位%'`),
      E("wanan_intact", `extraction_method='legacy_json_extract' and subject_hint='万安桥' and quote_text like '%保存完好%'`),
      E("wanan_p625", `extraction_method='${P625}' and place_hint='万安桥'`),
      E("wanan_caption", `extraction_method='visual_identity_caption_rule' and subject_hint='万安桥'`),
      E("jinzetang_span_wanan", `extraction_method='legacy_description_mining' and quote_text like '%横跨金泽塘%'`),
    ],
  },

  {
    feature_key: "jinze-min-001/feature/pujiqiao",
    feature_type: "bridge",
    canonical_label: "普济桥",
    historical_labels: [],
    modern_labels: ["普济桥", "紫石桥（俗称，仍在镇民口传中使用）"],
    label_variants_note:
      "「紫石桥」是俗称而非异写误录：上图遗产记录明载「'紫石桥'之名仍在镇民口传中使用」。故列入 modern_labels 并在 uncertainty 中记录其年代口径冲突，不做静默归一。",
    entity_selector: { canonical_name: "普济桥", legacy_id: "hushang-jingwei:entity:JZ-BLD-001" },
    geometry_type: "point",
    geometry_note: "同万安桥：仅有 provider 当前对象点，不产生桥体线几何。",
    attested_time_start: "1267",
    attested_time_end: "1267",
    attested_time_label: "南宋咸淳三年（1267）建",
    attested_time_evidence_backed: true,
    legacy_only_assertions: [
      "「位于金泽镇北市，横跨金泽塘」—— 该句仅存在于 Legacy 实体描述，全库**无**对应 Evidence 行（已按 quote/locator/subject/place 全库检索『金泽塘』，仅命中万安桥的 2 行）。",
    ],
    attested_historical_existence: "attested",
    current_survival_or_site: "survives",
    historical_position_status: "historical_relative_position_only",
    current_position_status: "official_or_provider_object_point",
    name_continuity_status: "continuous",
    change_status: "survives",
    historical_source_refs: [
      "上海图书馆《上海文化总库》遗产记录 physicalculturalheritage/arz32mktwndn0e0f",
      "Legacy 实体描述（转述，「横跨金泽塘」部分无 Evidence 行）",
      "1879 光绪《青浦县志》图说（不可归因到本对象）",
    ],
    current_source_refs: [
      "AMap place/text B00155G34B（GCJ-02，当前 POI）",
      "Wikimedia Commons File:Pujiqiao (Jinze).jpg（CC BY-SA 3.0，当代实景；其 caption 年代声明与遗产记录冲突，已留痕）",
    ],
    review_status: "candidate",
    uncertainty_note:
      "年代口径冲突：Commons caption 作「北宋咸淳元年(1265年)」（caption 内部朝代自相矛盾——咸淳为南宋年号），上图遗产记录作「南宋咸淳三年（1267）」。按 §12-13 保留冲突，不静默覆盖。",
    evidence: [
      E("puji_amap", `extraction_method='${AMAP}' and subject_hint='普济桥'`),
      E("puji_shl", `extraction_method='legacy_entity_source' and subject_hint='普济桥'`),
      E("puji_built", `extraction_method='legacy_json_extract' and subject_hint='普济桥' and quote_text like '%咸淳三年%'`),
      E("puji_intact", `extraction_method='legacy_json_extract' and subject_hint='普济桥' and quote_text like '%保存完好%'`),
      E("puji_protected", `extraction_method='legacy_json_extract' and subject_hint='普济桥' and quote_text like '%文物保护单位%'`),
      E("puji_p625", `extraction_method='${P625}' and place_hint='普济桥'`),
      E("puji_caption", `extraction_method='visual_identity_caption_rule' and subject_hint='普济桥'`),
      E("puji_same_waterway", `extraction_method='legacy_description_mining' and quote_text like '%同跨一河%'`, 2),
    ],
  },

  {
    feature_key: "jinze-min-001/feature/yihaosi-site",
    feature_type: "temple_site",
    canonical_label: "颐浩寺遗址",
    historical_labels: ["颐浩寺", "颐浩禅寺"],
    modern_labels: ["颐浩寺遗址", "颐浩禅寺（1992 年原址修复后沿用之名）"],
    label_variants_note:
      "寺名来源有 Evidence（「寺名取自其人」，且「颐浩禅寺…承其名」）；但**前现代印刷形态未获得**，故此处收录的是转述中出现的名称形式，非影印原文着录。另：上图名录原文地址写作「迎样街」，现代地址为「迎祥街」，该异写按 §12-13 记录不归一。",
    entity_selector: { canonical_name: "颐浩寺遗址", legacy_id: "hushang-jingwei:entity:JZ-BLD-008" },
    geometry_type: "area",
    geometry_note:
      "持有的几何是 provider 复合 POI 的**近似对象范围**（经 SHR-01 接受为 approximate_object_area），不是测绘面，也不是历史范围。",
    attested_time_start: "1260",
    attested_time_end: null,
    attested_time_label: "南宋景定元年（1260）就吕颐浩故宅创建（有 Evidence）；「1938 毁于兵燹 → 1992 原址修复」无 Evidence 行",
    attested_time_evidence_backed: false,
    legacy_only_assertions: [
      "「1938 年毁于兵燹」——仅存在于 Legacy 实体描述，无专属 Evidence 行。",
      "「1992 年原址修复开放」——仅存在于 Legacy 实体描述；SHL 行有「当代复建殿宇并置」的**状态**证据，但无年份证据。",
      "「元代鼎盛时『虽杭之灵隐、苏之承天莫匹其伟』（转引自地方志所辑旧记）」——转引之转引，无原件。",
    ],
    attested_historical_existence: "attested",
    current_survival_or_site: "site_only",
    historical_position_status: "unresolved",
    current_position_status: "approximate_object_area",
    name_continuity_status: "continuous",
    change_status: "rebuilt",
    historical_source_refs: [
      "上海图书馆《上海文化总库》遗产记录 physicalculturalheritage/8orxolst3z45ptbc",
      "Legacy 实体描述（转述方志；1938/1992 年代部分无 Evidence 行）",
      "1879 光绪《青浦县志》图说（不可归因到本对象）",
    ],
    current_source_refs: [
      "AMap 复合 POI「普济桥-颐浩禅寺」@ 金泽镇迎祥街 12 号（GCJ-02，经 SHR-01 接受为近似对象范围）",
      "Wikimedia Commons File:Yihaosi Yizhi.jpg（CC BY-SA 3.0，当代实景）",
    ],
    review_status: "human_reviewed",
    uncertainty_note:
      "历史位置状态为 unresolved：SHR-01 明示该复合 POI「非精确对象点、非历史位置证明」；本 Task 不伪造精确历史位置。另「不断云石刻与赵孟頫相关」已由 HR-2 冻结为 legend，不进本切片关系。",
    evidence: [
      E("yihao_amap", `extraction_method='${AMAP}' and place_hint='颐浩寺遗址'`),
      E("yihao_shl", `extraction_method='legacy_entity_source' and subject_hint='颐浩寺遗址'`),
      E("yihao_p625", `extraction_method='${P625}' and place_hint='颐浩寺遗址'`),
      E("yihao_caption", `extraction_method='visual_identity_caption_rule' and subject_hint='颐浩寺遗址'`),
      E("yihao_founded", `extraction_method='legacy_description_mining' and quote_text like '%故宅创建%'`),
      E("yihao_former_home", `extraction_method='legacy_description_mining' and quote_text like '%寺址即其故宅%'`),
    ],
  },

  {
    feature_key: "jinze-min-001/feature/jinzetang",
    feature_type: "waterway",
    canonical_label: "金泽塘",
    historical_labels: [],
    modern_labels: ["金泽塘"],
    label_variants_note: "名称仅见于转述性记载（2 行 Evidence，均属万安桥侧）；前现代着录未获得。",
    entity_selector: null, // entities 中无对应行 —— 本表可承载，这正是 §10 新建特征表的原因之一
    geometry_type: "unknown",
    geometry_note:
      "水系在现实中是线状特征，但本 Task **不产生任何线几何**（无来源测绘、无历史图上可归因河线）：§12-10 禁止 AI 补画古河道。故记为 unknown。",
    attested_time_start: null,
    attested_time_end: null,
    attested_time_label: "无年代证据：仅作为「两桥跨越的对象」被转述性记载提及",
    attested_time_evidence_backed: false,
    legacy_only_assertions: [],
    attested_historical_existence: "unknown",
    current_survival_or_site: "survives",
    historical_position_status: "historical_relative_position_only",
    current_position_status: "unresolved",
    name_continuity_status: "unknown",
    change_status: "unknown",
    historical_source_refs: [
      "转述性记载：「位于金泽镇北，横跨金泽塘，为金泽古桥群中最北一座」（Legacy 描述挖掘，有 Evidence）",
      "上图遗产记录：「金泽塘最北古桥，与普济桥并称『姐妹桥』」（有 Evidence）",
    ],
    current_source_refs: [],
    review_status: "candidate",
    uncertainty_note:
      "无坐标、无走向、无历史图籍着录。identity 可辩护（名称在 2 行独立 Evidence 中出现，且为两桥跨越的对象）；几何与历史存续状态均为 unknown。",
    evidence: [
      E("jinzetang_wanan_shl", `extraction_method='legacy_entity_source' and quote_text like '%金泽塘最北古桥%'`),
      E("jinzetang_wanan_desc", `extraction_method='legacy_description_mining' and quote_text like '%横跨金泽塘%'`),
      E("jinzetang_pair_a", `extraction_method='legacy_description_mining' and quote_text like '%同跨一河、一南一北%'`),
      E("jinzetang_pair_b", `extraction_method='legacy_description_mining' and quote_text like '%一北一南同跨一河%'`),
    ],
  },

  {
    feature_key: "jinze-min-001/feature/lvyihao",
    feature_type: "person_reference",
    canonical_label: "吕颐浩",
    historical_labels: [],
    modern_labels: ["吕颐浩"],
    label_variants_note: "人物，无字形异写问题。",
    entity_selector: { canonical_name: "吕颐浩", legacy_id: "hushang-jingwei:entity:JZ-PPL-001" },
    geometry_type: "unknown",
    geometry_note: "人物非空间对象，本切片不为其建立任何空间主张（§2 P1：仅为消歧/命名来源而收录）。",
    attested_time_start: "1071",
    attested_time_end: "1139",
    attested_time_label: "生卒 1071–1139（南宋名相）",
    attested_time_evidence_backed: true,
    legacy_only_assertions: [],
    attested_historical_existence: "attested",
    current_survival_or_site: "not_applicable",
    historical_position_status: "unresolved",
    current_position_status: "unresolved",
    name_continuity_status: "continuous",
    change_status: "unknown",
    historical_source_refs: ["Wikidata Q10918454（生卒/官职；经 HR-1 采纳为外部身份锚点）"],
    current_source_refs: [],
    review_status: "human_reviewed",
    uncertainty_note:
      "HR-1 明示 relation_to_jinze = unproven（仅确认人物同一性）。本切片只用他来解释「颐浩寺」命名来源，不主张其与金泽的其他关系；其 historial/current position 状态恒为 unresolved。",
    evidence: [
      E("lvyihao_identity", `extraction_method='identity_resolution:wikidata_entity_match' and subject_hint='吕颐浩'`),
      E("lvyihao_shl", `extraction_method='legacy_entity_source' and subject_hint='吕颐浩'`),
      E("lvyihao_p625", `extraction_method='${P625}' and place_hint='吕颐浩'`),
      E("lvyihao_founded", `extraction_method='legacy_description_mining' and quote_text like '%故宅创建%'`),
      E("lvyihao_former_home", `extraction_method='legacy_description_mining' and quote_text like '%寺址即其故宅%'`),
    ],
  },
];

// ---------------------------------------------------------------------------
// 空间锚：每一条带坐标的记录都必须声明 CRS（库层 CHECK 强制）。
// §12-5：来自当前 provider 的锚点永不得声明 historical_position_proof。
// ---------------------------------------------------------------------------
export const ANCHORS = [
  {
    anchor_key: "wananqiao/current_provider_object_point",
    feature_key: "jinze-min-001/feature/wananqiao",
    anchor_kind: "provider_current_object_point",
    spatial_status: "official_or_provider_object_point",
    geometry_type: "point",
    coord_system: "GCJ-02",
    location_raw: "120.919639,31.039508",
    lat: 31.039508,
    lng: 120.919639,
    crs_note:
      "AMap 使用 GCJ-02；无官方 GCJ-02→WGS-84 转换，故**保留原值、零换算**，并禁止与 WGS-84 值同字段混算（§12-6）。",
    precision_scope: "object_point_provider",
    source_label: "AMap /v3/place/text（keywords=万安桥, city=310118, citylimit=true）",
    source_locator: "https://www.amap.com/place/B0FFJDP9J9",
    evidence_key: "wanan_amap",
    exact_object_point: true,
    historical_position_proof: false,
    human_review_code: null,
    note: "**当前** POI，非历史坐标（§12-5）。provider 判定：候选 2 / 名称完全一致 1 / 金泽范围内 1 → 唯一候选。",
  },
  {
    anchor_key: "wananqiao/town_level_reference",
    feature_key: "jinze-min-001/feature/wananqiao",
    anchor_kind: "town_level_reference",
    spatial_status: "unresolved",
    geometry_type: "unknown",
    coord_system: "WGS-84",
    location_raw: "31.03969,120.91644",
    lat: 31.03969,
    lng: 120.91644,
    crs_note:
      "Wikidata P625 为 WGS-84；与上一条 GCJ-02 记录**分列两行**，绝不混算、不同字段合并（§12-6）。",
    precision_scope: "town_level",
    source_label: "Wikidata Q13694319 P625（金泽镇坐标锚点）",
    source_locator: "https://www.wikidata.org/wiki/Q13694319",
    evidence_key: "wanan_p625",
    exact_object_point: false,
    historical_position_proof: false,
    human_review_code: "SHR-02",
    note: "镇级锚点，**不能定位对象** → spatial_status 记 unresolved（§4 的 6 值词表无『镇级』一值，不发明新值）。仅用于登记 CRS 差异。与 AMap 镇点相差约 561 m。",
  },
  {
    anchor_key: "wananqiao/textual_relative_statement",
    feature_key: "jinze-min-001/feature/wananqiao",
    anchor_kind: "textual_relative_statement",
    spatial_status: "historical_relative_position_only",
    geometry_type: "unknown",
    coord_system: null,
    location_raw: null,
    lat: null,
    lng: null,
    crs_note: "无坐标，故无 CRS（库层 CHECK：无坐标则 CRS 必须为空）。",
    precision_scope: "relative_only",
    source_label:
      "转述记载：「位于金泽镇北，横跨金泽塘，为金泽古桥群中最北一座」；「金泽塘最北古桥」",
    source_locator: "legacy-description:万安桥",
    evidence_key: "jinzetang_wanan_desc",
    exact_object_point: false,
    historical_position_proof: false,
    human_review_code: null,
    note: "仅相对/拓扑陈述（在镇北、跨金泽塘、桥群最北）。**不含坐标、不含距离、不含走向**。",
  },
  {
    anchor_key: "pujiqiao/current_provider_object_point",
    feature_key: "jinze-min-001/feature/pujiqiao",
    anchor_kind: "provider_current_object_point",
    spatial_status: "official_or_provider_object_point",
    geometry_type: "point",
    coord_system: "GCJ-02",
    location_raw: "120.920423,31.03394",
    lat: 31.03394,
    lng: 120.920423,
    crs_note: "同万安桥：保留 GCJ-02 原值、零换算。",
    precision_scope: "object_point_provider",
    source_label: "AMap /v3/place/text（keywords=普济桥, city=310118, citylimit=true）",
    source_locator: "https://www.amap.com/place/B00155G34B",
    evidence_key: "puji_amap",
    exact_object_point: true,
    historical_position_proof: false,
    human_review_code: null,
    note: "**当前** POI，非历史坐标。address=迎祥街33号金泽古镇内(南侧)；与镇锚金泽古镇同址字符串（当前同街，非历史证据）。",
  },
  {
    anchor_key: "pujiqiao/town_level_reference",
    feature_key: "jinze-min-001/feature/pujiqiao",
    anchor_kind: "town_level_reference",
    spatial_status: "unresolved",
    geometry_type: "unknown",
    coord_system: "WGS-84",
    location_raw: "31.03969,120.91644",
    lat: 31.03969,
    lng: 120.91644,
    crs_note: "Wikidata P625（WGS-84），与 GCJ-02 记录分列。",
    precision_scope: "town_level",
    source_label: "Wikidata Q13694319 P625（金泽镇坐标锚点）",
    source_locator: "https://www.wikidata.org/wiki/Q13694319",
    evidence_key: "puji_p625",
    exact_object_point: false,
    historical_position_proof: false,
    human_review_code: "SHR-02",
    note: "镇级锚点，不能定位对象 → unresolved。",
  },
  {
    anchor_key: "pujiqiao/textual_relative_statement",
    feature_key: "jinze-min-001/feature/pujiqiao",
    anchor_kind: "textual_relative_statement",
    spatial_status: "historical_relative_position_only",
    geometry_type: "unknown",
    coord_system: null,
    location_raw: null,
    lat: null,
    lng: null,
    crs_note: "无坐标。",
    precision_scope: "relative_only",
    source_label: "转述记载：「与北侧万安桥同跨一河、一南一北」；「与普济桥一北一南同跨一河」",
    source_locator: "legacy-description:普济桥 / 万安桥",
    evidence_key: "puji_same_waterway",
    exact_object_point: false,
    historical_position_proof: false,
    human_review_code: null,
    note: "仅相对/拓扑陈述（在万安桥南、与之同跨一河）。**跨的那条河叫什么，本桥侧无 Evidence 行**（见 E4 关系与缺口）。",
  },
  {
    anchor_key: "yihaosi-site/current_provider_object_area",
    feature_key: "jinze-min-001/feature/yihaosi-site",
    anchor_kind: "provider_current_object_area",
    spatial_status: "approximate_object_area",
    geometry_type: "area",
    coord_system: "GCJ-02",
    location_raw: "120.921872,31.035345",
    lat: 31.035345,
    lng: 120.921872,
    crs_note: "GCJ-02 原值保留；该点为**复合 POI** 的落点，非寺址测绘点。",
    precision_scope: "object_area_approx",
    source_label: "AMap 复合 POI「普济桥-颐浩禅寺」@ 金泽镇迎祥街 12 号（经 SHR-01 接受为近似对象范围）",
    source_locator: "https://restapi.amap.com/v3/place/text?keywords=颐浩寺&city=310118#ambiguous",
    evidence_key: "yihao_amap",
    exact_object_point: false,
    historical_position_proof: false,
    human_review_code: "SHR-01",
    note: "AMap **无**独立「颐浩寺遗址」POI（判定 ambiguous：2 候选、0 个完全同名）→ 不得伪造精确点。本锚仅为近似对象范围，明确 exact_object_point=false、historical_position_proof=false。",
  },
  {
    anchor_key: "yihaosi-site/town_level_reference",
    feature_key: "jinze-min-001/feature/yihaosi-site",
    anchor_kind: "town_level_reference",
    spatial_status: "unresolved",
    geometry_type: "unknown",
    coord_system: "WGS-84",
    location_raw: "31.03969,120.91644",
    lat: 31.03969,
    lng: 120.91644,
    crs_note: "Wikidata P625（WGS-84）。",
    precision_scope: "town_level",
    source_label: "Wikidata Q13694319 P625（金泽镇坐标锚点）",
    source_locator: "https://www.wikidata.org/wiki/Q13694319",
    evidence_key: "yihao_p625",
    exact_object_point: false,
    historical_position_proof: false,
    human_review_code: "SHR-02",
    note: "镇级锚点，不能定位对象 → unresolved。",
  },
  {
    anchor_key: "jinzetang/textual_relative_statement",
    feature_key: "jinze-min-001/feature/jinzetang",
    anchor_kind: "textual_relative_statement",
    spatial_status: "historical_relative_position_only",
    geometry_type: "unknown",
    coord_system: null,
    location_raw: null,
    lat: null,
    lng: null,
    crs_note: "无坐标（且本 Task 不生成任何河道线几何）。",
    precision_scope: "relative_only",
    source_label: "转述记载：「横跨金泽塘，为金泽古桥群中最北一座」；「金泽塘最北古桥」",
    source_locator: "legacy-description:万安桥",
    evidence_key: "jinzetang_wanan_shl",
    exact_object_point: false,
    historical_position_proof: false,
    human_review_code: null,
    note: "该塘的**身份**可辩护（名称出现于 2 行 Evidence，且为万安桥所跨），但其位置只有『相对万安桥』这一点，无坐标、无走向、无几何。",
  },
];

// ---------------------------------------------------------------------------
// 变更记录：§6 的 change_status 是聚合判定；本清单是逐条可追溯的变更断言。
// evidenced 必须真的带 Evidence（库层 CHECK）。
// ---------------------------------------------------------------------------
export const CHANGES = [
  {
    change_key: "wananqiao/survives-to-today",
    feature_key: "jinze-min-001/feature/wananqiao",
    change_status: "survives",
    change_epistemic: "evidenced",
    from_state: "南宋景定年间（1260–1264）创建的石拱桥",
    to_state: "今存桥体，登记为青浦区文物保护单位，为金泽『古桥博物馆』北端节点",
    time_hint: "1260s → 当代",
    evidence_keys: ["wanan_intact", "wanan_protected"],
    legacy_only_parts: [],
    note:
      "§6：**不得**把建造年代当作「现状未变」的证明。本条只主张「桥体存续，且被现行文保体系认定为文物保护单位」，不主张桥体构件、形制、周边环境自宋未变。",
    review_status: "candidate",
  },
  {
    change_key: "wananqiao/tingqiao-form-unknown",
    feature_key: "jinze-min-001/feature/wananqiao",
    change_status: "unknown",
    change_epistemic: "candidate",
    from_state: "旧志载其形制为亭桥（桥上建亭）",
    to_state: "今存桥体未见亭（本 Task 无任何一方证据）",
    time_hint: null,
    evidence_keys: [],
    legacy_only_parts: [
      "「旧志载其形制为亭桥」仅存在于 Legacy 实体描述（自述「据方志转述」），全库无 Evidence 行。",
      "「今无亭」亦无证据 —— 本 Task 不主张亭已消失。",
    ],
    note:
      "记录的是一个**问题**而非断言：形制是否变化、何时变化均无证据 → 按 §6 只能记 unknown。缺证据见 uncertainties[U2]。",
    review_status: "unresolved",
  },
  {
    change_key: "pujiqiao/survives-to-today",
    feature_key: "jinze-min-001/feature/pujiqiao",
    change_status: "survives",
    change_epistemic: "evidenced",
    from_state: "南宋咸淳三年（1267）建的单孔紫石拱桥",
    to_state: "今存桥体，上海市文物保护单位；『紫石桥』俗称仍在镇民口传中使用",
    time_hint: "1267 → 当代",
    evidence_keys: ["puji_intact", "puji_protected"],
    legacy_only_parts: [],
    note: "同万安桥：仅主张「桥体存续 + 文保认定 + 俗称沿用」，不主张形制与环境未变。",
    review_status: "candidate",
  },
  {
    change_key: "yihaosi-site/rebuilt-on-original-site",
    feature_key: "jinze-min-001/feature/yihaosi-site",
    change_status: "rebuilt",
    change_epistemic: "evidenced",
    from_state: "江南巨刹（唐代—元代鼎盛，可居千僧）",
    to_state: "遗址与当代复建殿宇并置：元代遗物（不断云石刻、元碑、古银杏）与复建殿宇共存",
    time_hint: "元代鼎盛 → 当代（具体断代与复建年份无 Evidence）",
    evidence_keys: ["yihao_shl"],
    legacy_only_parts: [
      "「1938 年毁于兵燹」仅存在于 Legacy 实体描述，无 Evidence 行。",
      "「1992 年原址修复开放」仅存在于 Legacy 实体描述，无年份 Evidence 行。",
    ],
    note:
      "有 Evidence 的部分是**状态**（遗址 + 当代复建并置，且元代遗物尚存）；年份链（1938 毁 / 1992 复建）无 Evidence → 已列入 legacy_only_parts 与缺口清单。",
    review_status: "candidate",
  },
  {
    change_key: "jinzetang/history-unknown",
    feature_key: "jinze-min-001/feature/jinzetang",
    change_status: "unknown",
    change_epistemic: "unknown",
    from_state: null,
    to_state: null,
    time_hint: null,
    evidence_keys: [],
    legacy_only_parts: [
      "无任何历史图籍着录：金泽塘的名称连续性、走向、是否改名/改道均无证据。",
    ],
    note: "记录问题而非断言：不主张该河道古今未变，也不主张其曾改道。缺证据见 uncertainties[U7]。",
    review_status: "unresolved",
  },
];

// ---------------------------------------------------------------------------
// 切片关系：§7 的 E1/E2/E3/E4
// ---------------------------------------------------------------------------
export const RELATIONS = [
  {
    relation_key: "pujiqiao--spans_same_waterway--wananqiao",
    subject: "jinze-min-001/feature/pujiqiao",
    predicate: "spans_same_waterway",
    object: "jinze-min-001/feature/wananqiao",
    epistemic_class: "E1",
    support_level: "legacy_transcription",
    existing_relation_selector: {
      predicate: "spans_same_waterway",
      subject_name: "普济桥",
      object_name: "万安桥",
    },
    evidence_keys: ["puji_same_waterway"],
    hr_constraint: [],
    status: "candidate",
    note:
      "直接文献支持：「与北侧万安桥同跨一河」。⚠ 与下一条是同一声明的**双向镜像**（两条 Legacy 实体各自的描述各自产出一条关系），**不是两条独立佐证** —— 计数时不得当作 corroboration。",
  },
  {
    relation_key: "wananqiao--spans_same_waterway--pujiqiao",
    subject: "jinze-min-001/feature/wananqiao",
    predicate: "spans_same_waterway",
    object: "jinze-min-001/feature/pujiqiao",
    epistemic_class: "E1",
    support_level: "legacy_transcription",
    existing_relation_selector: {
      predicate: "spans_same_waterway",
      subject_name: "万安桥",
      object_name: "普济桥",
    },
    evidence_keys: ["jinzetang_pair_b"],
    hr_constraint: [],
    status: "candidate",
    note: "直接文献支持：「与普济桥一北一南同跨一河，形制相仿，并称『姐妹桥』」。与上一条互为镜像（同一源陈述的双写）。",
  },
  {
    relation_key: "yihaosi-site--named_after--lvyihao",
    subject: "jinze-min-001/feature/yihaosi-site",
    predicate: "named_after",
    object: "jinze-min-001/feature/lvyihao",
    epistemic_class: "E1",
    support_level: "legacy_transcription",
    existing_relation_selector: {
      predicate: "named_after",
      subject_name: "颐浩寺遗址",
      object_name: "吕颐浩",
    },
    evidence_keys: ["yihao_founded"],
    hr_constraint: ["HR-4"],
    status: "candidate",
    note:
      "E1 表示**存在文献支持**这一类别，不等于已核验为历史事实：HR-4=B 冻结「据方志记载，取得 S1 原文前不得升为无条件历史事实」，故 status 恒为 candidate，且本关系不得被任何下游当作 verified。",
  },
  {
    relation_key: "yihaosi-site--former_site_of--lvyihao",
    subject: "jinze-min-001/feature/yihaosi-site",
    predicate: "former_site_of",
    object: "jinze-min-001/feature/lvyihao",
    epistemic_class: "E1",
    support_level: "legacy_transcription",
    existing_relation_selector: {
      predicate: "mentioned_in",
      subject_name: "吕颐浩",
      object_name: "颐浩寺遗址",
    },
    evidence_keys: ["yihao_former_home", "yihao_founded"],
    hr_constraint: ["HR-4"],
    status: "candidate",
    note:
      "寺址曾为吕颐浩故宅（「寺址即其故宅」+「就…故宅创建」）。复用既有 mentioned_in 关系的 Evidence 与 disposition；方向与谓词较既有行更具体（既有行是『吕颐浩被提及于颐浩寺遗址』），此处登记其派生来源。同样受 HR-4 约束，恒为 candidate。",
  },
  {
    relation_key: "wananqiao--spans_waterway--jinzetang",
    subject: "jinze-min-001/feature/wananqiao",
    predicate: "spans_waterway",
    object: "jinze-min-001/feature/jinzetang",
    epistemic_class: "E1",
    support_level: "legacy_transcription",
    existing_relation_selector: null,
    evidence_keys: ["jinzetang_wanan_desc", "jinzetang_wanan_shl"],
    hr_constraint: [],
    status: "candidate",
    note:
      "直接文献支持：万安桥横跨金泽塘。金泽塘在既有 relations 中无对应行（entities 中亦无行）→ existing_relation_id 为空；本断言的证据复用既有 relation_evidence（原属 万安桥--mentioned_in-->『四十二虹桥』叠影），不改动 relations 表（§0.4 冻结既有基底）。",
  },
  {
    relation_key: "pujiqiao--spans_waterway--jinzetang",
    subject: "jinze-min-001/feature/pujiqiao",
    predicate: "spans_waterway",
    object: "jinze-min-001/feature/jinzetang",
    epistemic_class: "E4",
    support_level: "none",
    existing_relation_selector: null,
    evidence_keys: ["puji_same_waterway", "jinzetang_pair_b"],
    hr_constraint: [],
    status: "unresolved",
    note:
      "**本切片唯一的 E4，也是 gate 停在 PARTIAL 的直接原因之一。**「普济桥横跨金泽塘」仅存在于 Legacy 实体描述，全库**无**对应 Evidence 行（已按 quote/locator/subject_hint/place_hint 全库检索『金泽塘』，仅命中万安桥侧的 2 行 af39958e / 020b8bcf）。可由「同跨一河」（E1）+「万安桥跨金泽塘」（E1）间接推得，但依 §7 属『合理而证据不足』→ E4。**缺失证据**：一条独立记载「普济桥跨／坐落于金泽塘」的来源行（S1《青浦县志》原文、上图遗产记录、或 1879 等方志原文均可）。为避免把 gate 刷绿，本 Task **不删除**该断言，也不把它伪装成 E1。",
  },
  {
    relation_key: "yihaosi-site--temple_bridge_association--pujiqiao",
    subject: "jinze-min-001/feature/yihaosi-site",
    predicate: "temple_bridge_association",
    object: "jinze-min-001/feature/pujiqiao",
    epistemic_class: "E2",
    support_level: "provider_geometry",
    existing_relation_selector: null,
    evidence_keys: ["yihao_amap", "puji_amap"],
    hr_constraint: ["SHR-01"],
    status: "candidate",
    note:
      "**仅**由当前 provider 几何 + 来源相容身份支持：AMap 把「普济桥-颐浩禅寺」作为**单一复合 POI** 返回（金泽镇迎祥街 12 号）；普济桥 POI 地址为「迎祥街 33 号金泽古镇内(南侧)」= 同一条街（迎祥街）。这只能支持「当前空间相邻/同街」，**未证明历史关联**；SHR-01 已明示该复合 POI 不是精确对象点、也不是历史位置证明。门牌号 12 与 33 **不得**用来推断距离。→ §7 E2。",
  },
  {
    relation_key: "pujiqiao--relative_position_south_of--wananqiao",
    subject: "jinze-min-001/feature/pujiqiao",
    predicate: "relative_position_south_of",
    object: "jinze-min-001/feature/wananqiao",
    epistemic_class: "E3",
    support_level: "legacy_transcription",
    existing_relation_selector: null,
    evidence_keys: ["puji_same_waterway", "jinzetang_pair_b"],
    hr_constraint: [],
    status: "candidate",
    note:
      "历史来源只给出**相对/拓扑**关系（「与北侧万安桥」「一南一北」「一北一南」），**无任何坐标** —— 这正是 §7 E3 的定义。禁止由此生成精确历史坐标；禁止把当前两个 GCJ-02 点的南北次序当作历史次序的证明（当前点序与文献一致只说明「不矛盾」，不是证据）。",
  },
];

// G0–G6 的「冲突」输入（§11）。只登记**已坐实**的冲突；疑点不算冲突。
// 普济桥：年代口径冲突（Commons caption 1265/北宋 vs 上图遗产记录 1267/南宋）→ 记 true，
// 按 §12-13 保留冲突而不是静默归一。
export const FEATURE_CONFLICTS = {
  "jinze-min-001/feature/pujiqiao": true,
};

// ---------------------------------------------------------------------------
// 切片头
// ---------------------------------------------------------------------------
export const SLICE = {
  slice_id: "jinze-minimum-slice-001",
  slice_title: "金泽历史空间最小切片：万安桥 — 普济桥 — 颐浩寺遗址 — 连接水系（金泽塘）",
  focus_question:
    "金泽这三处对象的**历史空间**关系是什么：哪一座桥、哪一处寺址、哪一条水道能被证据支持地定位、定年到什么程度，哪些只能停留在相对陈述，哪些完全未决？",
  time_context:
    "南宋（寺 1260 创建、万安桥 1260–1264 建、普济桥 1267 建，均有 Evidence）→ 元代鼎盛 → 1938 毁（无 Evidence）→ 1992 原址修复（无 Evidence）→ 当代。可用的历史图籍为 1879 光绪《青浦县志》图说（青浦县全域），但其中**未取得可归因于本切片对象的标签**（HR-MAP-01：金泽/蔡浜/枪开河三标签 UNRESOLVED）。",
  spatial_extent_current: {
    semantics: "**当前**锚点的包围盒（含 GCJ-02 与 WGS-84 两组，分列不混算）；不含任何历史几何。",
    // gcj02_bbox / gcj02_span_m / anchor_count / crs_split 由构建器按已落库锚点实测计算，
    // 避免人工维护的包围盒与锚点漂移（本文件不重复声明）。
    wgs84_town_anchor: { lat: 31.03969, lng: 120.91644, scope: "town_level" },
    crs_discipline:
      "GCJ-02 与 WGS-84 分别登记、分别使用；无官方转换关系，故不做任何换算（§12-6）。",
  },
  historical_geometry_status: "absent_no_source",
  uncertainties: [
    {
      key: "U1",
      subject: "颐浩寺遗址的年代链（1938 毁于兵燹 / 1992 原址修复）",
      description:
        "这两个年份只存在于 Legacy 实体描述，全库无对应 Evidence 行；可用的 SHL 行只支持「遗址 + 当代复建殿宇并置」的状态，不含年份。",
      missing_evidence:
        "一条独立记载该寺 1938 年毁圮与 1992 年原址修复的来源行（S1《青浦县志》原文 / 上图遗产记录 / 文保单位公布文本 均可）。",
      proposed_decision:
        "在取得该来源前，维持 attested_time_evidence_backed=false，且 change record 的 legacy_only_parts 保持非空（即：不得把 1938/1992 当作已证事实输出）。",
      severity: "high",
    },
    {
      key: "U2",
      subject: "万安桥「亭桥（桥上建亭）」形制",
      description: "仅存在于 Legacy 实体描述且自述「据方志转述」；无 Evidence 行。今存桥体是否有亭亦无证据。",
      missing_evidence: "记载万安桥为亭桥的方志原文（可核对的卷页）。",
      proposed_decision:
        "要么提供方志原文并将其升级为 E1/evidenced；要么由架构师裁定：该形制声明长期保持 unknown，且界面不得展示「亭桥」为既成事实。",
      severity: "medium",
    },
    {
      key: "U3",
      subject: "普济桥是否横跨金泽塘",
      description: "全库含『金泽塘』的 Evidence 仅 2 行，均属万安桥侧。普济桥侧只能得到「与万安桥同跨一河」。",
      missing_evidence: "一条独立记载「普济桥跨／坐落于金泽塘」的来源行。",
      proposed_decision:
        "补到来源后把 E4 升为 E1（并同步把普济桥的 historical_position_status 维持 relative-only，仍不得生成坐标）；未补到前，**不得**把该关系输出为「已证」。",
      severity: "high",
    },
    {
      key: "U4",
      subject: "普济桥年代口径冲突",
      description:
        "Wikimedia Commons caption 作「北宋咸淳元年(1265年)」（caption 内部朝代自相矛盾，咸淳为南宋年号）；上图遗产记录作「南宋咸淳三年（1267）」。按 §12-13 保留冲突，不静默覆盖。",
      missing_evidence:
        "一条可判定 caption 错误的对照来源（或架构师裁定：维持冲突记录）。注意 caption 的 `creation_date` 是**照片**时点，不建立被描绘年代。",
      proposed_decision:
        "建议维持冲突记录（不静默归一），并裁定：Commons caption 的「咸淳元年」不得进入任何下游展示；权威年代以遗产记录 1267 为准但仍标 candidate。",
      severity: "low",
    },
    {
      key: "U5",
      subject: "颐浩寺—普济桥的历史关联",
      description:
        "目前唯一支持是当前 provider 的复合 POI（同一 POI 名内含桥与寺）+ 同街地址，属 E2，不是历史事实。",
      missing_evidence: "记载寺与桥历史关联（香道、放生、桥庙配套等）的文献原文。",
      proposed_decision:
        "在历史关联无证据期间，E2 关系只允许以「当前同街/复合 POI」措辞出现，禁止表述为「历史上寺桥相邻」；是否补采该文献由架构师决定。",
      severity: "medium",
    },
    {
      key: "U6",
      subject: "1879《青浦县志》图说 p36 的三个印刷标签（金泽／金澤、蔡浜、枪开河／槍開河）",
      description: "HR-MAP-01 冻结为 UNRESOLVED。OCR 只可导航；不得由普通 OCR 输出升级为历史事实（§0.3 / §12-7）。",
      missing_evidence: "上述标签的清晰可读图版，或架构师的人工辨读裁定（须附裁图坐标）。",
      proposed_decision:
        "维持 HR-MAP-01 的 UNRESOLVED（不因 OCR 输出升级）；若需推进，唯一可接受路径是架构师在更高分辨率图版上人工辨读并出具带裁图坐标的裁定。",
      severity: "high",
    },
    {
      key: "U7",
      subject: "金泽塘的历史名称连续性、走向与几何",
      description: "无任何历史图籍着录，无坐标、无走向；本 Task 依 §12-10 不生成任何河道线几何。",
      missing_evidence: "任何历史图籍中可归因于金泽塘的河道线或名称着录。",
      proposed_decision:
        "在无来源期间保持 geometry_type=unknown、不生成任何河道线（§12-10）；是否投入历史水道图专项辨读由架构师决定。",
      severity: "high",
    },
    {
      key: "U8",
      subject: "颐浩寺遗址的历史位置",
      description:
        "仅有现代门牌地址（迎祥街 12 号）与 provider 近似范围；SHR-01 明确该复合 POI 非历史位置证明。历史位置状态 = unresolved。",
      missing_evidence: "能把寺址定位到历史图籍的要素着录或相对位置陈述（例如「在某桥之西/某塘之南」类原文）。",
      proposed_decision:
        "维持 historical_position_status=unresolved、current_position_status=approximate_object_area（SHR-01 不变）；任何下游展示不得把该近似范围当作寺址历史位置。",
      severity: "high",
    },
  ],
  experience_hooks: [
    {
      hook: "show_surviving_bridge",
      semantics_opportunity:
        "呈现两座仍存的宋代石拱桥（万安桥 1260–1264 / 普济桥 1267）及其当前对象点 —— 只作「现存」呈现，界面不得把当前坐标标为历史位置。",
      grounded_on: ["wananqiao/current_provider_object_point", "pujiqiao/current_provider_object_point"],
    },
    {
      hook: "reveal_former_temple_site_relation",
      semantics_opportunity:
        "揭示「寺 ← 人」关系：寺名取自吕颐浩，寺址即其故宅 —— 必须同时显示 HR-4 的『据方志记载（candidate）』约束。",
      grounded_on: ["yihaosi-site--named_after--lvyihao", "yihaosi-site--former_site_of--lvyihao"],
    },
    {
      hook: "compare_current_water_context_with_historical_evidence",
      semantics_opportunity:
        "把文献中的相对陈述（两桥同跨一河、一南一北，E3）与今日金泽塘的空间对照 —— 对照的**对象是陈述**，不是历史几何（本切片无历史几何）。",
      grounded_on: ["pujiqiao--relative_position_south_of--wananqiao", "wananqiao--spans_waterway--jinzetang"],
    },
    {
      hook: "open_source_page",
      semantics_opportunity:
        "打开 1879《青浦县志》图说 p36 原页与二里半方图网格组（p22–42），并显式标注三标签 UNRESOLVED（HR-MAP-01）。",
      grounded_on: ["HR-MAP-01"],
    },
    {
      hook: "temple_site_reconstruction_dual_layer",
      semantics_opportunity:
        "呈现「元代遗物（不断云石刻 / 元碑 / 古银杏）— 遗址 — 当代复建殿宇」的双层时空结构；年份链缺失部分须显示为未决。",
      grounded_on: ["yihaosi-site/rebuilt-on-original-site"],
    },
  ],
};

// 1879 图说相关：进入 static_refs 的既有材料（§5「使用既有已获材料」），
// 但**全部注明不可归因于本切片对象** —— 不得因「图上应该有金泽」就生成历史位置。
export const HISTORICAL_SOURCE_MATERIAL = [
  {
    key: "hs/1879/source_record",
    kind: "source_record",
    sql: `provider='historical-gazetteer' and title like '%1879%青浦县志%'`,
    expect: 1,
    note: "1879 光绪《青浦县志》图说（上海图书馆藏），TASK-0009 A_ACQUIRED。",
  },
  {
    key: "hs/1879/p36",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and place_hint='青浦县西南（吴江界/澱山湖一带）'`,
    expect: 1,
    note: "p36 二里半方图 第三排四號（HR-MAP-01：图幅/网格已确认，三标签 UNRESOLVED）→ **不可归因于本切片任一对象**。",
  },
  {
    key: "hs/1879/grid_group",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and locator='p22-42'`,
    expect: 1,
    note: "二里半方图网格全组（第一排一號…第四排五號）——切片对象所在区域所属的图组。",
  },
  {
    key: "hs/1879/county_full",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and locator='p18'`,
    expect: 1,
    note: "青浦县境全图（p18）—— 县域级语境。",
  },
  {
    key: "hs/1879/sw_waterway",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and place_hint='青浦县西南境'`,
    expect: 1,
    note: "青浦县西南境水道图（p49）—— 水系专项图，属「既有 1879 水系图候选」。",
  },
  {
    key: "hs/1879/ne_waterway",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and place_hint='青浦县东北境'`,
    expect: 1,
    note: "青浦县东北境水道图（p46）—— 水系专项图（东北境，与本切片无归因关系，登记以备查）。",
  },
  {
    key: "hs/1879/dianshanhu",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and place_hint='青浦县西南湖'`,
    expect: 1,
    note: "濮山湖图（澱山湖，p54）—— 区域湖泊语境。",
  },
  {
    key: "hs/1879/lianhu",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and place_hint='青浦县湖'`,
    expect: 1,
    note: "莲湖图（p53）—— 区域湖泊语境。",
  },
  {
    key: "hs/1879/xiangbao",
    kind: "evidence",
    sql: `extraction_method='historical_map_source_acquisition' and place_hint='青浦县各保'`,
    expect: 1,
    note: "鄉保區域圖（保甲图，p43–95）—— 行政区划图组。",
  },
];

// 人审引用（切片要显式列出约束它的决策，不得静默）
export const HUMAN_REVIEW_REFS = [
  "HR-MAP-01",
  "SHR-01",
  "SHR-02",
  "SHR-06",
  "HR-1",
  "HR-2",
  "HR-4",
];
