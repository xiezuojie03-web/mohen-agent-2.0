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
    attested_time_label: "南宋景定年间（1260–1264）建；元至正二年（1342）桥上加建廊亭（均有 Evidence）",
    attested_time_evidence_backed: true,
    // TASK-0011 §7：A2 原为 legacy_only_assertion（「叠经兵燹」式的『旧志载其形制为亭桥』）。
    // 本轮由 S1-C 官方来源（青浦区政府 2025 / 2023、青浦博物馆、上海市地方志办公室）与
    // S1-A 上图地名库（「又名万安亭桥」）**关闭** → 移出 active assertion set 并升级为 evidenced。
    legacy_only_assertions: [],
    attested_historical_existence: "attested",
    current_survival_or_site: "survives",
    historical_position_status: "historical_relative_position_only",
    current_position_status: "official_or_provider_object_point",
    name_continuity_status: "continuous",
    change_status: "survives",
    historical_source_refs: [
      "上海图书馆《上海市不可移动文物名录》文化遗产记录 physicalculturalheritage/chlyrdj3o8ll81k8（金泽镇金溪居委会；区级文物保护单位）— **本轮直接取回**，此前仅经 Legacy 转抄",
      "上海市青浦区人民政府｜遗珠拾粹——探访青浦多种形式的古桥（2025-01-16）：「又称『万安亭桥』…元至正二年（1342年）桥上加建廊亭」",
      "上海市青浦区人民政府｜万安桥（2023-07-06）：「又称『万安亭桥』…」并内嵌《金泽小志》引文「亭建如穿廊，数间飞出…」",
      "上海青浦博物馆｜万安桥（2019-03-04）：「又称万安亭桥…元至正二年(1342)桥上加建廊亭，桥下有佛阁，后废」",
      "上海市地方志办公室｜上海桥乡:金泽：据《金泽小志》「万安亭桥，跨市北。亭建如穿廊，数间飞出…」",
      "上海图书馆开放数据·地名库｜万安桥：「又名万安亭桥。位于青浦县金泽镇北市梢…」",
      "【已退休为研究线索，不再作为 active assertion】Legacy 实体描述：「旧志载其形制为亭桥（桥上建亭）」——该句本身已由上述四类独立来源证实；Legacy 自述的『据方志转述』链仍未取得方志原件（见 U11）",
      "1879 光绪《青浦县志》图说（Historical Spatial Source = YES；但本图未读出「金泽」标签，故**不能**归因到本对象）",
    ],
    current_source_refs: [
      "AMap place/text B0FFJDP9J9（GCJ-02，当前 POI）",
      "Wikimedia Commons File:Wan'anqiao.jpg（CC BY-SA 3.0，当代实景）",
    ],
    review_status: "candidate",
    uncertainty_note:
      "A2 已关闭（亭桥形制有 4 类独立来源：青浦区政府 ×2、青浦博物馆、上海市地方志办公室＋上图地名库）。**仍未解决**：(1)「亭、阁已废」有官方依据（青浦区政府 2025：「如今，亭、阁已废，而石栏板上还留有当年亭柱的榫口」），但**废于何时**无证据；(2) 上图地名库本条记作「跨**秀州塘**」，与青浦区官方来源的「跨金泽塘／跨市河」冲突 → 见 T11-C2 与 U13；(3) 1879 图上是否绘有本桥仍无证据；不得由当前对象点或图上邻近性推断历史位置。",
    evidence: [
      E("wanan_amap", `extraction_method='${AMAP}' and subject_hint='万安桥'`),
      E("wanan_shl", `extraction_method='legacy_entity_source' and subject_hint='万安桥'`),
      E("wanan_built", `extraction_method='legacy_json_extract' and subject_hint='万安桥' and quote_text like '%景定%'`),
      E("wanan_protected", `extraction_method='legacy_json_extract' and subject_hint='万安桥' and quote_text like '%文物保护单位%'`),
      E("wanan_intact", `extraction_method='legacy_json_extract' and subject_hint='万安桥' and quote_text like '%保存完好%'`),
      E("wanan_p625", `extraction_method='${P625}' and place_hint='万安桥'`),
      E("wanan_caption", `extraction_method='visual_identity_caption_rule' and subject_hint='万安桥'`),
      E("jinzetang_span_wanan", `extraction_method='legacy_description_mining' and quote_text like '%横跨金泽塘%'`),
      // ---- TASK-0011 新增（A2 关闭）----
      E("wanan_heritage_registry", `extraction_method='t11_s1a_shl_heritage' and locator like '%chlyrdj3o8ll81k8%'`),
      E("wanan_geonames_tingqiao", `extraction_method='t11_s1a_shl_geonames' and subject_hint='万安桥'`),
      // 注意：2025 政府页原文在「桥上加建廊亭」后有策展省略号（……），
      // 不能把「明嘉靖」拼进同一 LIKE 串；改用「东西向跨金泽塘，俗称」（无逗号变体，
      // 唯一标识该页）+ 语义锚「桥上加建廊亭」双条件，实测命中恰 1 行。
      E("wanan_gov_2025_tingqiao", `extraction_method='t11_s1c_official_source' and subject_hint='万安桥' and quote_text like '%东西向跨金泽塘，俗称%' and quote_text like '%桥上加建廊亭%'`),
      E("wanan_gov_2023_tingqiao", `extraction_method='t11_s1c_official_source' and subject_hint='万安桥' and quote_text like '%亭建如穿廊%'`),
      E("wanan_museum_tingqiao", `extraction_method='t11_s1c_official_source' and subject_hint='万安桥' and quote_text like '%桥下有佛阁，后废%'`),
      E("wanan_shtong_xiaozhi", `extraction_method='t11_s1c_local_chronicles' and subject_hint='万安桥'`),
      E("wanan_ting_lost", `extraction_method='t11_s1c_official_source' and subject_hint='万安桥' and quote_text like '%亭、阁已废%'`),
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
    // TASK-0011 §7：A1 原为 legacy_only_assertion。本轮拆分处理：
    //   · 「横跨金泽塘」→ 由青浦区政府档案页（2025）等官方来源**关闭**，升级为 evidenced；
    //   · 「位于金泽镇北市」→ 与四份独立来源（南市／中部／金泽古镇）**冲突**（T11-C1），
    //     按 §1 CONFLICT 移出 active assertion set、**保留双方**、阻断静默解决。
    // 两者均已移出 legacy_only_assertions；原文保留于 historical_source_refs 与 uncertainty_note。
    legacy_only_assertions: [],
    attested_historical_existence: "attested",
    current_survival_or_site: "survives",
    historical_position_status: "historical_relative_position_only",
    current_position_status: "official_or_provider_object_point",
    name_continuity_status: "continuous",
    change_status: "survives",
    historical_source_refs: [
      "上海图书馆《上海市不可移动文物名录》文化遗产记录 physicalculturalheritage/arz32mktwndn0e0f（金泽镇金溪居委会；**上海市**文物保护单位）— **本轮直接取回**，此前仅经 Legacy 转抄",
      "上海市青浦区人民政府｜遗珠拾粹——探访青浦多种形式的古桥（2025-01-16）：「普济桥 位于金泽古镇，**东西向跨金泽塘**…宋咸淳三年（1267年）建…1962 年，被列为上海市文物保护单位」",
      "上海青浦博物馆｜普济桥（2019-03-04）：「位于金泽镇**南市**…东西向，**跨市河**。宋咸淳三年(1267)建…1962年10月被公布为上海市文物保护单位」",
      "上海市地方志办公室｜上海桥乡:金泽：「普济桥在金泽镇**南市**…宋咸淳三年，即1267年建」",
      "江南古桥文化研究会｜普济桥：「位于金泽镇**中部**，东西向，**跨金泽塘**」",
      "上海图书馆开放数据·老照片库｜普济桥：「青浦县金泽镇的普济桥建于宋咸淳三年（1267年），桥为单孔石拱」",
      "上海图书馆开放数据·地名库｜金泽镇：「现存古桥21座，其中有建于宋代的万安桥、普济桥…」",
      "【已退休为研究线索】Legacy 实体描述原文：「位于金泽镇北市，横跨金泽塘」——「横跨金泽塘」已证；「位于金泽镇**北市**」与四份独立来源冲突（T11-C1），不得再作为 active historical assertion",
      "1879 光绪《青浦县志》图说（不可归因到本对象）",
    ],
    current_source_refs: [
      "AMap place/text B00155G34B（GCJ-02，当前 POI）",
      "Wikimedia Commons File:Pujiqiao (Jinze).jpg（CC BY-SA 3.0，当代实景；其 caption 年代声明与遗产记录冲突，已留痕）",
    ],
    review_status: "candidate",
    uncertainty_note:
      "A1 已拆分关闭：「横跨金泽塘」有官方证据（青浦区政府 2025、江南古桥研究会；水道名「金泽塘」另有上图地名库迎祥桥条目独立着录）；「位于金泽镇北市」与青浦博物馆／上海市地方志办公室（南市）、江南古桥研究会（中部）、青浦区政府（金泽古镇）**冲突** → T11-C1，保留双方、不裁决。年代口径冲突（U4）仍然存在：Commons caption 作「北宋咸淳元年(1265年)」（caption 内部朝代自相矛盾——咸淳为南宋年号），上图遗产记录与官方来源均作「南宋咸淳三年（1267）」。另：普济桥所跨水道，青浦博物馆／上海市地方志办公室作「市河」，青浦区政府／江南古桥研究会作「金泽塘」，见 T11-C2 与 U13。",
    evidence: [
      E("puji_amap", `extraction_method='${AMAP}' and subject_hint='普济桥'`),
      E("puji_shl", `extraction_method='legacy_entity_source' and subject_hint='普济桥'`),
      E("puji_built", `extraction_method='legacy_json_extract' and subject_hint='普济桥' and quote_text like '%咸淳三年%'`),
      E("puji_intact", `extraction_method='legacy_json_extract' and subject_hint='普济桥' and quote_text like '%保存完好%'`),
      E("puji_protected", `extraction_method='legacy_json_extract' and subject_hint='普济桥' and quote_text like '%文物保护单位%'`),
      E("puji_p625", `extraction_method='${P625}' and place_hint='普济桥'`),
      E("puji_caption", `extraction_method='visual_identity_caption_rule' and subject_hint='普济桥'`),
      E("puji_same_waterway", `extraction_method='legacy_description_mining' and quote_text like '%同跨一河%'`, 2),
      // ---- TASK-0011 新增（A1 关闭）----
      E("puji_heritage_registry", `extraction_method='t11_s1a_shl_heritage' and locator like '%arz32mktwndn0e0f%'`),
      E("puji_photo_shl", `extraction_method='t11_s1a_shl_photo' and subject_hint='普济桥'`),
      E("puji_gov_2025_spans", `extraction_method='t11_s1c_official_source' and subject_hint='普济桥' and quote_text like '%东西向跨金泽塘%'`),
      E("puji_museum_south", `extraction_method='t11_s1c_official_source' and subject_hint='普济桥' and quote_text like '%位于金泽镇南市%'`),
      E("puji_shtong_south", `extraction_method='t11_s1c_local_chronicles' and subject_hint='普济桥'`),
      E("puji_ancbridge_spans", `extraction_method='t11_s1c_association_web' and subject_hint='普济桥'`),
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
    attested_time_end: "1992",
    attested_time_label:
      "南宋景定元年（1260）就吕颐浩故宅创建；元至正/元贞年间（1288 建殿、1295 升院为寺）；民国二十七年（1938）大部分建筑毁于日军轰炸；**1992 年在原址重建寺院** —— 以上四段**均有 Evidence**（TASK-0011 新增 S1-C 官方来源）。「1992 年经政府批准开放为佛教活动场所」仅有非权威转载、无官方文号 → 见 U10（不计入本时间链）",
    attested_time_evidence_backed: true,
    // TASK-0011 §7：A3 / A4a 由 S1-C 官方来源**关闭**（evidenced）；A4b（「开放」）与 A5（引文）为
    // CANDIDATE_WITH_EVIDENCE_LIMIT（有部分/间接证据、措辞受限）——两者均**不再**是无证据的
    // legacy-only 文本，故一并移出 active assertion set，原文与限制分别保留于
    // historical_source_refs / uncertainty_note / U10 / U11 与关闭矩阵 CSV。
    legacy_only_assertions: [],
    attested_historical_existence: "attested",
    current_survival_or_site: "site_only",
    historical_position_status: "unresolved",
    current_position_status: "approximate_object_area",
    name_continuity_status: "continuous",
    change_status: "rebuilt",
    historical_source_refs: [
      "上海图书馆《上海市不可移动文物名录》文化遗产记录 physicalculturalheritage/8orxolst3z45ptbc（金泽镇金溪居委会迎样街12号；区级文物保护单位）— **本轮直接取回**，此前仅经 Legacy 转抄",
      "上海青浦博物馆｜颐浩禅寺（2019-03-04）：「…清光绪三十二年（1906）又重修，**民国二十七年（1938）大部分建筑毁于日军轰炸**。…今由当地众信**在原址内**再建一小殿宇，并请赵朴初先生题额『颐浩禅寺』。…1959年3月公布为青浦县文物保护单位」",
      "人民日报客户端·绿色青浦（上海市青浦区人民政府新闻办公室）｜青浦文物·颐浩寺遗址（2020-10-28）：「…规模宏大，『**虽杭之灵隐，苏之承天，莫匹其伟**。』后历代多次修葺，**1938年大部分建筑毁于轰炸**。…现为青浦区级文物保护单位」",
      "青浦文明网（中共上海市青浦区委宣传部）｜《品读金泽》之金泽古韵（2025-04-14）：「据《松江府志》记载：金泽颐浩寺『虽杭之灵隐，苏之承天，莫匹其伟。』…**1992年，在颐浩寺中心原址重建寺院**，建造了大雄宝殿、观音殿、地藏王殿及两套偏殿，还造了山门」",
      "新民晚报｜金泽古镇 静谧水乡（2021-11-02，旁证）：「《松江府志》称『虽杭之灵隐，苏之承天，莫匹其伟』。1938年，该寺大部毁于日军炮火。…1992年，颐浩禅寺修复。」",
      "【已退休为研究线索】Legacy 实体描述原文三句：「1938 年毁于兵燹」/「1992 年原址修复开放」/「元代鼎盛时『虽杭之灵隐、苏之承天莫匹其伟』（转引自地方志所辑旧记）」——前两句已由官方来源证实（措辞须收紧为「大部分建筑毁于轰炸」「在原址重建」）；第三句仍为转引之转引（见 U11）",
      "1879 光绪《青浦县志》图说（不可归因到本对象）",
    ],
    current_source_refs: [
      "AMap 复合 POI「普济桥-颐浩禅寺」@ 金泽镇迎祥街 12 号（GCJ-02，经 SHR-01 接受为近似对象范围）",
      "Wikimedia Commons File:Yihaosi Yizhi.jpg（CC BY-SA 3.0，当代实景）",
    ],
    review_status: "human_reviewed",
    uncertainty_note:
      "A3（1938）与 A4a（1992 原址重建）已关闭：前者有两份 .gov.cn 来源（青浦博物馆、青浦区政府新闻办），后者有青浦文明网明确「1992年，在颐浩寺中心**原址重建**寺院」。**未关闭/受限**：A4b「1992 年经政府批准开放为佛教活动场所」仅在非权威转载中出现（见 U10）；A5 引文仍为「引文之引文」——两份 .gov.cn 来源均把它归给《松江府志》，但**本轮未取得《松江府志》原文**（见 U11）。另：历史位置状态仍为 unresolved（SHR-01：「非精确对象点、非历史位置证明」）；「不断云石刻与赵孟頫相关」已由 HR-2 冻结为 legend，不进本切片关系。",
    evidence: [
      E("yihao_amap", `extraction_method='${AMAP}' and place_hint='颐浩寺遗址'`),
      E("yihao_shl", `extraction_method='legacy_entity_source' and subject_hint='颐浩寺遗址'`),
      E("yihao_p625", `extraction_method='${P625}' and place_hint='颐浩寺遗址'`),
      E("yihao_caption", `extraction_method='visual_identity_caption_rule' and subject_hint='颐浩寺遗址'`),
      E("yihao_founded", `extraction_method='legacy_description_mining' and quote_text like '%故宅创建%'`),
      E("yihao_former_home", `extraction_method='legacy_description_mining' and quote_text like '%寺址即其故宅%'`),
      // ---- TASK-0011 新增（A3 / A4 / A5）----
      E("yihao_heritage_registry", `extraction_method='t11_s1a_shl_heritage' and locator like '%8orxolst3z45ptbc%'`),
      E("yihao_1938_museum", `extraction_method='t11_s1c_official_source' and subject_hint='颐浩寺遗址' and quote_text like '%民国二十七年（1938）大部分建筑毁于日军轰炸%'`),
      E("yihao_1938_green", `extraction_method='t11_s1c_official_source' and subject_hint='颐浩寺遗址' and quote_text like '%1938年大部分建筑毁于轰炸%'`),
      E("yihao_rebuild_1992", `extraction_method='t11_s1c_official_source' and subject_hint='颐浩寺遗址' and quote_text like '%1992年，在颐浩寺中心原址重建寺院%'`),
      E("yihao_original_site", `extraction_method='t11_s1c_official_source' and subject_hint='颐浩寺遗址' and quote_text like '%在原址内再建一小殿宇%'`),
      // A5「引文之引文」：青浦文明网同一页登记两行（长上下文行 + 专门引文行），
      // 两行都是 .gov.cn 逐字原文 → expect=2，全部挂到断言（诚实口径，不挑一行）。
      E("yihao_a5_songjiangfu_civ", `extraction_method='t11_s1c_official_source' and subject_hint='颐浩寺遗址' and quote_text like '%据《松江府志》记载%'`, 2),
      E("yihao_a5_green", `extraction_method='t11_s1c_official_source' and subject_hint='颐浩寺遗址' and quote_text like '%位于金泽镇金溪居委会迎祥街12号%'`),
      E("yihao_1992_media", `extraction_method='t11_s1c_media_report' and subject_hint='颐浩寺遗址'`),
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
    // TASK-0011 口径更正（**须架构师复核**，见 U12）：
    // 原值 label=「无年代证据…」+ flag=false，把「**不作**年代主张」误编码成「有未获证据支撑的年代主张」。
    // 本切片对该水道**不作任何时间断言** → label 归 null；flag 置 true 的含义是
    // 「切片内不再存在无 Evidence 支撑的时间断言」，**不是**「已证明该水道的年代/形成时间」。
    // 论据侧另有实质进展：名称「金泽塘」本轮首次取得**独立于 Legacy** 的着录（上图地名库 + 青浦区政府 ×2）。
    attested_time_label: null,
    attested_time_evidence_backed: true,
    legacy_only_assertions: [],
    attested_historical_existence: "unknown",
    current_survival_or_site: "survives",
    historical_position_status: "historical_relative_position_only",
    current_position_status: "unresolved",
    name_continuity_status: "unknown",
    change_status: "unknown",
    historical_source_refs: [
      "上海图书馆开放数据·地名库｜迎祥桥：「位于青浦县金泽镇南市梢，**跨金泽塘**」— **本轮首次直接取回**（此前「金泽塘」仅见于 Legacy 转述）",
      "上海市青浦区人民政府｜遗珠拾粹——探访青浦多种形式的古桥（2025-01-16）：「普济桥…**东西向跨金泽塘**」「万安桥…**东西向跨金泽塘**」",
      "上海市青浦区人民政府｜万安桥（2023-07-06）：「位于金泽镇北市，东西向，**跨金泽塘**」",
      "转述性记载：「位于金泽镇北，横跨金泽塘，为金泽古桥群中最北一座」（Legacy 描述挖掘，有 Evidence）",
      "【冲突方，保留】上海图书馆开放数据·地名库｜万安桥：「位于青浦县金泽镇北市梢，**跨秀州塘**」→ 见 T11-C2",
      "【异称，保留】上海青浦博物馆、上海市地方志办公室对同一水道作「**市河**」→ 见 U13",
    ],
    current_source_refs: [],
    review_status: "candidate",
    uncertainty_note:
      "身份可辩护性**本轮增强**：「金泽塘」作为水道名首次取得独立于 Legacy 的着录（上图地名库迎祥桥条目 + 青浦区政府档案页两处），且与两座宋桥的跨越关系一致。**仍未解决**：(1) 无坐标、无走向、无任何线几何（§12-7 禁止 AI 补画古河道）→ geometry_type 恒为 unknown，historical_position_status 恒为 relative-only；(2) **跨水道名冲突**：上图地名库万安桥条作「跨秀州塘」，而青浦区官方来源作「跨金泽塘／跨市河」；且上海市地名志道路库显示「秀州塘＋万安桥」的组合确实存在于**金山朱泾镇** → 疑为跨镇误配，但本 Task 不代为裁决（T11-C2）；(3) 名称的历史连续性、是否改名/改道均无证据（U7 保留）；(4) 本特征**不作时间断言**，见 U12 的口径更正说明。",
    evidence: [
      E("jinzetang_wanan_shl", `extraction_method='legacy_entity_source' and quote_text like '%金泽塘最北古桥%'`),
      E("jinzetang_wanan_desc", `extraction_method='legacy_description_mining' and quote_text like '%横跨金泽塘%'`),
      E("jinzetang_pair_a", `extraction_method='legacy_description_mining' and quote_text like '%同跨一河、一南一北%'`),
      E("jinzetang_pair_b", `extraction_method='legacy_description_mining' and quote_text like '%一北一南同跨一河%'`),
      // ---- TASK-0011 新增（水道名首次取得独立着录）----
      E("jinzetang_geonames_yingxiang", `extraction_method='t11_s1a_shl_geonames' and subject_hint='金泽塘'`),
      E("jinzetang_gov_puji", `extraction_method='t11_s1c_official_source' and subject_hint='普济桥' and quote_text like '%东西向跨金泽塘%'`),
      E("jinzetang_gov_wanan", `extraction_method='t11_s1c_official_source' and subject_hint='万安桥' and quote_text like '%东西向，跨金泽塘%'`),
      E("jinzetang_waterway_conflict", `extraction_method='t11_s1a_shl_geonames' and subject_hint='万安桥'`),
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
    historical_source_refs: [
      "Wikidata Q10918454（生卒/官职；经 HR-1 采纳为外部身份锚点）",
      "【TASK-0011 对齐发现，不改变本切片主张】上海图书馆开放数据·家谱人物库（gen/person）中有 **3 个名为「吕颐浩」的家族祖先实体**（jp/entity/person/am63uncfc… 等；roleOfFamily=始迁祖/始祖/一世祖，temporalValue 含「明」）→ **同名异人**，与南宋吕颐浩**身份不可合并**，仅登记以备消歧。",
    ],
    current_source_refs: [],
    review_status: "human_reviewed",
    uncertainty_note:
      "HR-1 明示 relation_to_jinze = unproven（仅确认人物同一性）。本切片只用他来解释「颐浩寺」命名来源，不主张其与金泽的其他关系；其 historial/current position 状态恒为 unresolved。⚠ 命名变体警示：家谱库中另有 3 个同名「吕颐浩」的**家族祖先**实体（其中一条 temporalValue 作「明」），**不得**与南宋吕颐浩合并为同一实体；古籍书目中另有《吕忠穆公（颐浩）年谱》，指吕颐浩其人（不是颐浩寺）。",
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
    change_status: "survives",
    change_epistemic: "evidenced",
    from_state: "宋景定年间（1260–1264）始建的石拱桥；元至正二年（1342）桥上加建廊亭，遂名「万安亭桥」（桥上建亭，亭建如穿廊、数间飞出，亭下连阁）",
    to_state: "桥体存续至今（区级文物保护单位）；**亭、阁已废**，石栏板上仍留有当年亭柱的榫口",
    time_hint: "1260–1264 始建 → 1342 加建廊亭 → 亭阁废（年份无证据）→ 当代",
    evidence_keys: ["wanan_gov_2025_tingqiao", "wanan_museum_tingqiao", "wanan_shtong_xiaozhi", "wanan_ting_lost"],
    legacy_only_parts: [],
    note:
      "TASK-0011 关闭：本条原为「记录一个问题」（change_epistemic=candidate、change_status=unknown、legacy_only_parts 非空）。本轮取得两端状态证据 —— 加建端：青浦区政府 2025/2023、青浦博物馆、上海市地方志办公室（《金泽小志》引文）；废圮端：青浦区政府 2025「亭、阁已废，而石栏板上还留有当年亭柱的榫口」。change_status 取 survives（**桥体**存续，文保单位在册）；**不主张**亭阁废于何时（无证据）。⚠ 变更 `change_key` 沿用 TASK-0010 的 slug（`…form-unknown`）以免制造孤立行；其语义已不再是 unknown，已在 note 显式说明。",
    review_status: "candidate",
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
    from_state: "南宋景定元年（1260）创建的江南巨刹，元贞元年（1295）升院为寺、可居千僧；民国二十七年（1938）大部分建筑毁于日军轰炸",
    to_state: "1992 年**在原址重建**寺院（大雄宝殿、观音殿、地藏王殿、两套偏殿与山门），与元代遗物（松江府颐浩寺碑记、不断云石刻、大殿柱础、古银杏）并置",
    time_hint: "1260 创建 → 1938 大部分被毁 → 1992 原址重建",
    evidence_keys: ["yihao_shl", "yihao_1938_museum", "yihao_1938_green", "yihao_rebuild_1992", "yihao_original_site"],
    legacy_only_parts: [],
    note:
      "TASK-0011 关闭：年份链（1938 毁 / 1992 原址重建）本轮由 S1-C 官方来源补足 —— 1938 见青浦博物馆与青浦区政府新闻办（均 .gov.cn）；1992「在颐浩寺中心**原址重建**」见青浦文明网（中共青浦区委宣传部，.gov.cn），「原址」另有青浦博物馆「在原址内再建一小殿宇」独立支撑。措辞纪律：**不得**合并成「1938 全毁 → 1992 修复开放」——(a) 1938 是「**大部分**建筑毁于轰炸」，非全毁；(b)「**开放**为佛教活动场所」缺官方来源 → 不计入本条（见 U10）。",
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
    evidence_keys: ["jinzetang_geonames_yingxiang"],
    legacy_only_parts: [
      "历史图籍着录仍为零：无任何前现代图籍标示该水道的走向、宽度或是否改名/改道（**当代**独立着录已取得，见 historical_source_refs）。",
    ],
    note: "记录问题而非断言：不主张该河道古今未变，也不主张其曾改道。TASK-0011 变化：名称身份获得独立着录（上图地名库 + 青浦区政府），但几何/走向/历史连续性仍无证据（见 U7）；本特征**不作时间断言**（见 U12）。",
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
    evidence_keys: ["jinzetang_wanan_desc", "jinzetang_wanan_shl", "wanan_gov_2025_tingqiao", "jinzetang_gov_wanan"],
    hr_constraint: [],
    status: "candidate",
    note:
      "直接文献支持：万安桥横跨金泽塘（Legacy 转述 + TASK-0011 新增的青浦区政府 2025／2023 两份官方来源）。金泽塘在既有 relations 中无对应行（entities 中亦无行）→ existing_relation_id 为空。⚠ 上图地名库万安桥条作「跨**秀州塘**」→ 属 T11-C2 冲突，**已并入本关系 note**，不得静默择一。",
  },
  {
    relation_key: "pujiqiao--spans_waterway--jinzetang",
    subject: "jinze-min-001/feature/pujiqiao",
    predicate: "spans_waterway",
    object: "jinze-min-001/feature/jinzetang",
    epistemic_class: "E1",
    support_level: "secondary_transcription",
    existing_relation_selector: null,
    evidence_keys: ["puji_same_waterway", "jinzetang_pair_b", "puji_gov_2025_spans", "puji_ancbridge_spans"],
    hr_constraint: [],
    status: "candidate",
    note:
      "**TASK-0011：由 E4 升为 E1**（原为「本切片唯一的 E4，也是 gate 停在 PARTIAL 的直接原因之一」）。升级依据：上海市青浦区人民政府档案页（2025-01-16）原文「普济桥 位于金泽古镇，**东西向跨金泽塘**」，另有江南古桥文化研究会同一表述；水道名「金泽塘」由上图地名库（迎祥桥条目）与青浦区政府两处独立着录。support_level 取 secondary_transcription（来源是官方转录页，非亲见方志原件）。**限制不变**：仍不得由本关系生成任何坐标或几何；historical_position_status 维持 relative-only。",
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
      "历史来源只给出**相对/拓扑**关系（「与北侧万安桥」「一南一北」「一北一南」），**无任何坐标** —— 这正是 §7 E3 的定义。禁止由此生成精确历史坐标；禁止把当前两个 GCJ-02 点的南北次序当作历史次序的证明（当前点序与文献一致只说明「不矛盾」，不是证据）。⚠ TASK-0011 补充：本关系说「普济桥在万安桥**之南**」，而 T11-C1 暴露普济桥的**绝对方位**（北市/南市）存在冲突 —— 二者不矛盾（相对关系由「一南一北」直接支持，且官方一律把万安桥放北市、普济桥放南市/中部），但**绝对方位**仍须按 CONFLICT 并列呈现。",
  },
];

// G0–G6 的「冲突」输入（§11）。只登记**已坐实**的冲突；疑点不算冲突。
// 普济桥：年代口径冲突（Commons caption 1265/北宋 vs 上图遗产记录 1267/南宋）→ 记 true。
// 万安桥：**TASK-0011 新增** —— 所跨水道名冲突（金泽塘／市河 vs 上图地名库「秀州塘」，T11-C2）→ 记 true。
export const FEATURE_CONFLICTS = {
  "jinze-min-001/feature/pujiqiao": true,
  "jinze-min-001/feature/wananqiao": true,
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
    "南宋（寺 1260 创建、万安桥 1260–1264 建、普济桥 1267 建）→ 元代（万安桥 1342 加建廊亭；颐浩寺 1288 建殿、1295 升院为寺）→ 明清（屡毁屡建、1561/1620/1791/1906 重修）→ **民国二十七年（1938）颐浩寺大部分建筑毁于日军轰炸** → **1958 拆移** → **1992 在原址重建寺院** → 当代。上述带**粗体**的两段为 TASK-0011 新增证据（此前仅存在于 Legacy 描述）。可用的历史图籍仍为 1879 光绪《青浦县志》图说（青浦县全域），其中**未取得可归因于本切片对象的标签**（HR-MAP-01：金泽/蔡浜/枪开河三标签 UNRESOLVED）。",
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
        "**TASK-0011 已关闭**：1938 由青浦博物馆与青浦区政府新闻办（均 .gov.cn）两份官方来源证实；1992「原址重建」由青浦文明网（中共青浦区委宣传部）证实，「原址」另有青浦博物馆独立支撑。",
      missing_evidence: "剩余缺口：**1938 年之后至 1958 年之间的拆移年份**与「建筑损毁的具体范围」无逐项证据（不在本切片主张内）。",
      proposed_decision:
        "维持关闭；措辞纪律见 change record `yihaosi-site/rebuilt-on-original-site` 的 note：（a）1938 是「大部分建筑毁于轰炸」而非全毁；（b）不得把「修复／重建／原址／开放」四要素合并陈述（「开放」见 U10）。",
      severity: "low",
    },
    {
      key: "U2",
      subject: "万安桥「亭桥（桥上建亭）」形制",
      description:
        "**TASK-0011 已关闭**：亭桥形制由 4 类独立来源证实 —— 青浦区政府档案页（2025）「又称『万安亭桥』…元至正二年（1342年）桥上加建廊亭」、青浦区政府（2023）内嵌《金泽小志》引文、青浦博物馆（2019）、上海市地方志办公室（引《金泽小志》）＋上图地名库「又名万安亭桥」。",
      missing_evidence: "剩余缺口：（a）亭阁**废于何时**；（b）Legacy 自述的「旧志」原件（真正拆到《金泽小志》影印本或《松江府志》原文）尚未取得。",
      proposed_decision: "维持关闭；界面可展示「万安亭桥」与「1342 加建廊亭、今亭阁已废」，但必须标 candidate，且不得声称「今有亭」或给出废圮年份。",
      severity: "low",
    },
    {
      key: "U3",
      subject: "普济桥是否横跨金泽塘",
      description:
        "**TASK-0011 已拆分关闭**：「横跨金泽塘」由青浦区政府档案页（2025）与江南古桥文化研究会证实，水道名「金泽塘」另有上图地名库（迎祥桥条目）与青浦区政府两处独立着录；「位于金泽镇北市」转为冲突（T11-C1）。",
      missing_evidence: "剩余缺口：（a）「北市/南市」的**权威裁定**（本 Task 只登记冲突）；（b）该水道与桥的**空间几何**（无来源，且 §12-7 禁止 AI 补画）。",
      proposed_decision: "E4 关系 `pujiqiao--spans_waterway--jinzetang` 由 E4 升为 **E1**（有独立文献支持），但**仍不得生成坐标**；historical_position_status 维持 relative-only。方位冲突转人审（见 closeure human-review CSV）。",
      severity: "low",
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
      description:
        "**TASK-0011 部分关闭**：名称身份已由独立来源着录（上图地名库迎祥桥条目「跨金泽塘」、青浦区政府档案页两处「跨金泽塘」）；但**前现代图籍着录仍为零**，无坐标、无走向；本 Task 依 §12-7 不生成任何河道线几何。",
      missing_evidence: "任何历史图籍中可归因于金泽塘的河道线或名称着录（明清方志水道图、近代测绘地形图上的河名标注）。",
      proposed_decision:
        "维持 geometry_type=unknown、不生成任何河道线；是否投入历史水道图专项辨读由架构师决定（本 Task 依 §5 P-06 明确 DEFER 该专项）。",
      severity: "medium",
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
    // ---- TASK-0011 新增：本轮暴露的冲突与受限项 ----
    {
      key: "U9",
      subject: "普济桥的历史方位（T11-C1 冲突）",
      description:
        "Legacy 作「位于金泽镇**北市**」；而青浦博物馆、上海市地方志办公室作「金泽镇**南市**」，江南古桥文化研究会作「金泽镇**中部**」，青浦区政府档案页作「金泽古镇」。四份独立来源一致偏离 Legacy。**而「金泽镇北市」恰是官方对万安桥的表述**（青浦区政府 2023、青浦博物馆、上图地名库），故疑为 Legacy 把两桥的方位句串位。",
      missing_evidence: "一条可裁定方位的权威着录（带四至或图上位置的文保公布文本／1930 年代镇图注记）。",
      proposed_decision:
        "依 §1 CONFLICT：**保留双方、阻断静默解决**；不得由当前两桥 GCJ-02 点的南北次序倒推历史方位（当前点序与文献一致只说明「不矛盾」，不是证据）。下游展示须并列两种说法或只展示可辩护的「金泽镇内」。",
      severity: "medium",
    },
    {
      key: "U10",
      subject: "颐浩寺「1992 年开放为佛教活动场所」（A4b 受限部分）",
      description:
        "Legacy 原文为「1992 年原址修复**开放**」。本轮：年份与「原址重建」均有 .gov.cn 来源（青浦文明网），但「**开放为佛教活动场所**」只在非权威转载（快懂百科等）中出现，**未在任何 .gov.cn 来源核实**，也无批准文号。",
      missing_evidence: "官方公布文本（宗教活动场所登记／开放批文，或 1990 年代《青浦县志》《上海宗教志》相应条目）。",
      proposed_decision:
        "维持为 CANDIDATE_WITH_EVIDENCE_LIMIT：可写「1992 年在原址重建寺院」，**不得**写「1992 年开放为宗教活动场所」为既成事实；若必须提及，须标「据非权威转载，待核」。",
      severity: "medium",
    },
    {
      key: "U11",
      subject: "A5 引文「虽杭之灵隐，苏之承天，莫匹其伟」的来源链",
      description:
        "本轮取得两份 .gov.cn 来源（青浦区政府新闻办 2020、青浦文明网 2025）**均把该句归给《松江府志》**，新民晚报同；但**《松江府志》原文未取得** —— 正德本 696 页复本（itemId 3025）的卷次/页映射未打通（其目录与实测卷首叶不一致），且上海市地方志办公室站为 JS 渲染、正文未直接取回。上图古籍书目 dc:title 检索「莫匹其偉」「頤浩」亦无该句出处。",
      missing_evidence: "《松江府志》（正德或崇禎本）寺觀卷中该句的**卷页原文**；或《金澤小志》影印原件（索书号 史71556491，本轮在 pdf/list 全文库中 0 命中，未取得全文）。",
      proposed_decision:
        "维持为 CANDIDATE_WITH_EVIDENCE_LIMIT（attributed tradition）：可写「据《松江府志》，经青浦区官方平台引述」，**不得**作为 verified fact；**不得**因「两个官方页都这么说」就升级为已证（那是转引的复述，不是独立佐证）。",
      severity: "medium",
    },
    {
      key: "U12",
      subject: "金泽塘「不作时间断言」的机器口径（须架构师复核）",
      description:
        "原 slice 定义把该特征的 `attested_time_label` 写成「无年代证据…」且 `attested_time_evidence_backed=false` —— 这等于把「**不作**年代主张」编码为「存在**未获证据支撑**的年代主张」，是 TASK-0010 遗留的语义瑕疵。本 Task 改为：label=null（不主张年代）、flag=true（切片内不再存在无证据的时间断言）。该布尔量同时是 c6 的合取项，故此更正会改变 c6 的取值。",
      missing_evidence: "（非证据问题，而是口径裁定）架构师对「无时间主张时该布尔量应取何值」的确认。",
      proposed_decision:
        "建议采纳本 Task 的口径更正，并配套不变量测试（`attested_time_label is null ⇒ 不得有基于该特征的定年导出`）。**若架构师维持旧口径**，则本特征应回到 flag=false，`c6_every_assertion_traceable` 保持 NOT MET，`HISTORICAL_SPATIAL_SLICE_READY` 保持 PARTIAL —— 两条路径的读数均已在 readiness 报告与本 Task 结果中**同时给出**，不隐藏。",
      severity: "high",
    },
    {
      key: "U13",
      subject: "万安桥／普济桥所跨水道的名称（T11-C2 冲突）",
      description:
        "青浦区官方来源与上海市地方志办公室作「金泽塘」或「市河」；而上图地名库万安桥条作「跨**秀州塘**」。反向线索：上海市地名志道路库中「万安街」位于**金山朱泾镇**，描述作「西迄秀州塘万安桥」——「秀州塘＋万安桥」的组合确实存在于朱泾，故地名库该条疑为**跨镇误配**。",
      missing_evidence: "金泽镇水道的权威名录（《青浦县地名志》水道分册／《金泽镇志》水道条）以裁定金泽塘、市河、秀州塘三者的对应关系。",
      proposed_decision:
        "依 §1 CONFLICT：保留双方；本切片相关关系的措辞改为「据青浦区官方来源跨金泽塘；上图地名库另作跨秀州塘（存疑，见 T11-C2）」。**不得**静默择一。",
      severity: "medium",
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
        "把文献中的相对陈述（两桥同跨一河、一南一北，E3）与今日金泽塘的空间对照 —— 对照的**对象是陈述**，不是历史几何（本切片无历史几何）。TASK-0011 后该对照可加一层：官方来源说两桥均「东西向跨金泽塘」，而上图地名库万安桥条作「跨秀州塘」→ 呈现时**必须并列**两种说法并标冲突（T11-C2）。",
      grounded_on: [
        "pujiqiao--relative_position_south_of--wananqiao",
        "wananqiao--spans_waterway--jinzetang",
        "pujiqiao--spans_waterway--jinzetang",
      ],
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
        "呈现「元代遗物（不断云石刻 / 元碑 / 古银杏）— 遗址 — 1992 年原址重建殿宇」的双层时空结构。TASK-0011 后 1938／1992 两段**有官方证据**，可如实呈现；但「1992 年开放为宗教活动场所」缺官方来源（U10），且「元代鼎盛『虽杭之灵隐…』」仍属转引传统（U11）—— 下游须分别标注这两处限制。",
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
