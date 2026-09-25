// pipelines/experience/build-jinze-3min-experience.mjs
//
// TASK-0012 —— 金泽 3 分钟 Evidence-Grounded Experience Script（确定性构建器）。
//
// 设计（任务书 §14）：
//  · 纯构建产物：读 PostgreSQL（只读）+ data/exports/jinze-historical-spatial-slice.json（truth 导出），
//    写 7 个交付物到 data/exports/。**零 DB 写入、零迁移、零 Legacy 写入。**
//  · 幂等：同输入产出字节级相同输出（写前比对，内容不变则跳过）。
//  · 可被测试直接 import（无子进程 → 规避本机 spawnSync EBUSY 限制）。
//  · 每个 factual narration unit 必须带 evidence_refs，且构建时逐条校验 evidence_id 存在于库。
//  · 不做 UI / Runtime / 路线 / GIS / 视频 / TTS（任务书 §14 边界）。
//
// 总架构裁定（任务书 §4，已冻结）：
//  T11-C1 ACCEPT_CONFLICT；T11-C2 ACCEPT_CONFLICT+SUSPECTED_CROSS_TOWN_MISALIGNMENT；
//  T11-C3 ACCEPT_RETIREMENT；T11-C4 ACCEPT_LIMITED；T11-C5 金泽塘 temporal_assertion=none。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXPORTS = path.join(ROOT, "data", "exports");
const SLICE_JSON = path.join(EXPORTS, "jinze-historical-spatial-slice.json");

const sha256 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

// ---------------------------------------------------------------------------
// 1) 叙事引用的证据登记表（curated）——构建时逐条校验存在于 evidence 表
// ---------------------------------------------------------------------------
const EVIDENCE_REGISTRY = {
  wanan_gov_2025: {
    id: "04ee5f86-7471-4f12-8416-9616143f3982",
    note: "青浦区政府 2025：万安桥 跨金泽塘/1342 加建廊亭/亭阁已废榫口",
  },
  wanan_gov_2023: {
    id: "e4ea7c8d-1d7e-4d1b-832b-2495a823f312",
    note: "青浦区政府 2023：《金泽小志》亭建如穿廊引文",
  },
  wanan_museum: {
    id: "0072b791-f791-424e-8333-98a4390d96f2",
    note: "青浦博物馆：万安桥 桥下有佛阁后废/景定年间建",
  },
  puji_gov_2025: {
    id: "c79b0580-5a1e-40bd-8459-0f9d6fed75d9",
    note: "青浦区政府 2025：普济桥 东西向跨金泽塘/咸淳三年",
  },
  puji_museum_nanshi: {
    id: "93aa3929-afff-4d38-a248-1d39a8616356",
    note: "青浦博物馆：普济桥 南市着录（T11-C1 冲突方）",
  },
  puji_shtong_nanshi: {
    id: "90be9f21-8a18-4d68-b84a-43521b5acceb",
    note: "上海市地方志办公室：普济桥 南市着录（T11-C1 冲突方）",
  },
  puji_assoc_zhongbu: {
    id: "9eb29e06-8016-4661-b12e-b55e7a2efa1a",
    note: "江南古桥研究会：普济桥 中部着录（T11-C1 冲突方）",
  },
  puji_photo_caption: {
    id: "d9dcbff8-21e3-45e1-836b-61fbcd6ba566",
    note: "上图老照片 P83 注文：普济桥宋咸淳三年建",
  },
  yihao_museum_1938: {
    id: "faadce12-0ee1-434a-8f8f-bc24d93f9c59",
    note: "青浦博物馆：颐浩寺 1260 创建/1295 升寺/1938 毁于日军轰炸",
  },
  yihao_civ_1992: {
    id: "1bff151e-5bb2-498a-a56e-fd0e8b03b103",
    note: "青浦文明网：1992 年在颐浩寺中心原址重建寺院 + A5 转引",
  },
  yihao_a5_quote: {
    id: "68c7d118-a60b-4556-8720-acf38ce244b3",
    note: "青浦文明网独立引文行：据《松江府志》记载…（T11-C4 限转引）",
  },
  yihao_news_lvyihao: {
    id: "deafbd03-d821-4b26-9de1-b366605f5084",
    note: "区政府新闻办：相传为宰相吕颐浩宅，故得名",
  },
  shl_dmx_wanan_xiuzhoutang: {
    id: "f7083396-1047-461f-9368-a1160feb8718",
    note: "上图地名志：万安桥 跨秀州塘（T11-C2 冲突方）",
  },
  shl_dmz_yingxiang_jinzetang: {
    id: "cab86b21-1634-4d51-ade7-8ad1fd81eb6b",
    note: "上图地名志（迎祥桥条）：跨金泽塘（水道名独立着录）",
  },
  rel_spans_same_waterway: {
    id: "02190cbd-7e73-439e-ac8b-742b42f6863f",
    note: "E1 关系：普济桥—同跨一水道—万安桥（相对/拓扑）",
  },
  poi_puji_current: {
    id: "ade1eaac-b5e7-f32a-1949-b5a6e0893ab5",
    note: "当前 POI（GCJ-02 原值）：普济桥 —— 仅当前，非历史坐标",
  },
  poi_wanan_current: {
    id: "1721b7e9-8f65-ea56-d6e1-152654bc034a",
    note: "当前 POI（GCJ-02 原值）：万安桥 —— 仅当前，非历史坐标",
  },
  poi_yihao_area: {
    id: "3bddb444-0af0-a4a1-df72-b78cc361c33c",
    note: "近似对象范围（SHR-01，复合 POI）：颐浩寺遗址",
  },
  jinzetang_textual: {
    id: "af39958e-8672-4036-87b0-0d6e6d58618a",
    note: "金泽塘 文本相对陈述锚（无坐标无走向）",
  },
};

// ---------------------------------------------------------------------------
// 2) 叙事场景定义（6–8 场；150–210 秒；级别词表 §9）
// ---------------------------------------------------------------------------
const NARRATION_LEVELS = [
  "FACT_EVIDENCED",
  "FACT_LIMITED",
  "CONFLICT",
  "QUESTION",
  "INTERPRETATION_CANDIDATE",
  "UNKNOWN",
  "INTERACTION",
];
const FACTUAL_LEVELS = ["FACT_EVIDENCED", "FACT_LIMITED", "CONFLICT"];

const SCENES = [
  {
    scene_id: "jinze-3min/s01-today-hook",
    duration_sec: 26,
    experience_goal: "用今天的精确地图建立现场感，并抛出核心问题",
    primary_focus: "万安桥 · 普济桥 · 颐浩寺遗址（当前对象点）",
    spatial_mode: "GEOGRAPHIC_EXACT",
    time_state: "2026（当下）",
    map_state: "modern_map_current_objects",
    experience_hook_refs: ["show_surviving_bridge"],
    narrative: [
      {
        unit_id: "s01-u1",
        level: "FACT_EVIDENCED",
        text:
          "上海青浦，金泽。今天镇上仍有两座宋代石桥：万安桥建于南宋景定年间（1260–1264），普济桥建于咸淳三年（1267），一北一南，都还立在原来的水道上。",
        evidence_refs: ["wanan_gov_2025", "puji_gov_2025", "puji_photo_caption"],
      },
      {
        unit_id: "s01-u2",
        level: "FACT_EVIDENCED",
        text:
          "在两桥之间的迎祥街上，还有一处宋代寺院遗址：颐浩寺遗址。按当前地图锚点直线估读，这三处遗存彼此相距不到一公里。",
        evidence_refs: ["poi_wanan_current", "poi_puji_current", "poi_yihao_area"],
      },
      {
        unit_id: "s01-u3",
        level: "QUESTION",
        text:
          "两座宋桥、一处宋代寺院，为什么靠得这么近？——这不是一个已经有答案的问题。让我们把时间拨回去。",
        evidence_refs: [],
      },
    ],
    uncertainty: "当前坐标仅为现代 POI；不得被读作历史位置。",
    allowed_user_actions: ["FOCUS_PLACE", "OPEN_EVIDENCE"],
    composition_intent: "现代地图为主面，三处遗存对象点高亮；问题以文本浮层出现。",
  },
  {
    scene_id: "jinze-3min/s02-time-travel",
    duration_sec: 26,
    experience_goal: "把时间拨向南宋，并显式执行『精确度改变 → 空间呈现随之改变』",
    primary_focus: "时间轴（1260→1267 三十年窗口）",
    spatial_mode: "RELATIONAL_HISTORICAL",
    time_state: "南宋景定—咸淳（1260–1267）",
    map_state: "relational_space_no_coordinates",
    transition_in:
      "GEOGRAPHIC_EXACT → RELATIONAL_HISTORICAL：现代坐标点淡出（GCJ-02 当前 POI 不是历史坐标），地图退为关系空间",
    experience_hook_refs: ["show_surviving_bridge"],
    narrative: [
      {
        unit_id: "s02-u1",
        level: "FACT_EVIDENCED",
        text:
          "南宋景定元年（1260），颐浩寺就吕颐浩故宅创建；景定年间，万安桥始建；咸淳三年（1267），普济桥落成。三十年之内，桥与寺出现在同一片水乡。",
        evidence_refs: ["yihao_museum_1938", "yihao_news_lvyihao", "wanan_gov_2025", "puji_gov_2025"],
      },
      {
        unit_id: "s02-u2",
        level: "INTERACTION",
        text: "注意：此刻地图上的现代坐标已经淡出——它们是今天的 POI，不是历史的位置。",
        evidence_refs: [],
      },
      {
        unit_id: "s02-u3",
        level: "UNKNOWN",
        text:
          "这三处遗存在宋代的确切位置、间距与走向，今天没有任何历史测绘可用。我们不会假装知道。",
        evidence_refs: [],
      },
    ],
    uncertainty: "U7（金泽塘走向几何）/ U8（颐浩寺历史位置 unresolved）。",
    allowed_user_actions: ["SET_TIME", "FOCUS_PLACE"],
    composition_intent: "时间轴为主面；地图面降为拓扑示意，无坐标标注。",
  },
  {
    scene_id: "jinze-3min/s03-two-bridges-water",
    duration_sec: 28,
    experience_goal: "用有证据的桥—水关系建立第一层历史拓扑（不画历史河道）",
    primary_focus: "万安桥—金泽塘—普济桥（E1 关系）",
    spatial_mode: "RELATIONAL_HISTORICAL",
    time_state: "南宋—元（着录形成的时段）",
    map_state: "relational_space_no_coordinates",
    experience_hook_refs: ["compare_current_water_context_with_historical_evidence"],
    narrative: [
      {
        unit_id: "s03-u1",
        level: "FACT_EVIDENCED",
        text:
          "青浦区官方与地方志的着录一致：普济桥东西向跨金泽塘；万安桥也跨金泽塘。两座桥，同一条有名字的水。",
        evidence_refs: ["puji_gov_2025", "wanan_gov_2025", "wanan_gov_2023", "shl_dmz_yingxiang_jinzetang"],
      },
      {
        unit_id: "s03-u2",
        level: "FACT_EVIDENCED",
        text:
          "而且两座桥之间有直接的相对关系：普济桥在万安桥之南、与之同跨一河——这是有转述着录支撑的历史拓扑，不是地图上的目测。",
        evidence_refs: ["rel_spans_same_waterway", "jinzetang_textual"],
      },
      {
        unit_id: "s03-u3",
        level: "UNKNOWN",
        text:
          "但这条水道在前现代图籍里没有任何着录：它的走向、宽度、是否改道，全部无据。所以在这条体验里，你不看到一条画出来的历史河道——那会是编造。",
        evidence_refs: [],
      },
    ],
    uncertainty: "U7：金泽塘名称身份可辩护，走向几何为零证据；T11-C2 跨水道名冲突在证据面板展开。",
    allowed_user_actions: ["SHOW_HISTORICAL_LAYER", "OPEN_EVIDENCE"],
    composition_intent: "关系空间为主面：两桥节点 + 一条有名字的水（以标签而非线呈现）。",
  },
  {
    scene_id: "jinze-3min/s04-temple-enters",
    duration_sec: 28,
    experience_goal: "让颐浩寺以有证据的时间链登场，同时明确寺—桥功能关系未被证明",
    primary_focus: "颐浩寺遗址（1260 创建 → 1295 升寺）+ 寺—人关系",
    spatial_mode: "RELATIONAL_HISTORICAL",
    time_state: "南宋景定元年（1260）→ 元贞元年（1295）",
    map_state: "relational_space_no_coordinates",
    experience_hook_refs: ["reveal_former_temple_site_relation"],
    narrative: [
      {
        unit_id: "s04-u1",
        level: "FACT_EVIDENCED",
        text:
          "颐浩寺不是一座普通寺院。相传寺址就是南宋宰相吕颐浩的故宅，寺也因他得名——『寺址即其故宅』的着录，让这段寺与人的关系成为本切片里可辩护的历史关系。",
        evidence_refs: ["yihao_museum_1938", "yihao_news_lvyihao"],
      },
      {
        unit_id: "s04-u2",
        level: "FACT_LIMITED",
        text:
          "后来的官方材料转引《松江府志》形容它『虽杭之灵隐，苏之承天，莫匹其伟』——但《松江府志》原书至今没有取得，这句话只能以『转引』的身份出现。",
        evidence_refs: ["yihao_a5_quote", "yihao_civ_1992"],
      },
      {
        unit_id: "s04-u3",
        level: "QUESTION",
        text: "寺与桥在今天的地图上近在咫尺——当年，它们是否属于同一个水利与信仰的体系？",
        evidence_refs: [],
      },
    ],
    uncertainty: "U5：寺—桥当前同街/复合 POI 属 E2 关联（非历史事实）；U11：A5 引文链受限。",
    allowed_user_actions: ["OPEN_EVIDENCE", "SET_TIME"],
    composition_intent: "关系空间扩展出寺节点；寺—桥之间留白（无连线），把『没有证据连线』变成可感知的空缺。",
  },
  {
    scene_id: "jinze-3min/s05-evidence-reveal",
    duration_sec: 28,
    experience_goal: "把已知 / 冲突 / 未知并排呈现——不确定性本身成为体验的一部分",
    primary_focus: "T11-C1（方位）与 T11-C2（跨水道名）两组冲突 + 三项未知",
    spatial_mode: "RELATIONAL_HISTORICAL",
    time_state: "着录层（20 世纪末至今的方志与档案）",
    map_state: "evidence_panel_over_relational_space",
    experience_hook_refs: ["compare_current_water_context_with_historical_evidence"],
    narrative: [
      {
        unit_id: "s05-u1",
        level: "CONFLICT",
        text:
          "证据也会打架。上图地名志把万安桥记作『跨秀州塘』，而青浦区官方着录是『跨金泽塘』；上海地名志里，『秀州塘＋万安桥』的组合另在金山朱泾出现——上图条目疑为跨镇误挂。两说并存，墨痕不替你选边。",
        evidence_refs: ["shl_dmx_wanan_xiuzhoutang", "wanan_gov_2025", "wanan_gov_2023"],
      },
      {
        unit_id: "s05-u2",
        level: "CONFLICT",
        text:
          "普济桥的方位同样三方不一：地方志办与博物馆作『南市』，古桥研究会作『中部』，区政府着录未提方位；更早的『北市』写法没有独立来源。冲突保留在证据里，不悄悄归一。",
        evidence_refs: ["puji_shtong_nanshi", "puji_museum_nanshi", "puji_assoc_zhongbu", "puji_gov_2025"],
      },
      {
        unit_id: "s05-u3",
        level: "UNKNOWN",
        text:
          "还有一件悬案：1879 年《青浦县志》图说第 36 页上疑似出现『金泽』字样，但图上三个印刷标签至今未获裁决——它仍不是金泽的直接历史地图。",
        evidence_refs: [],
      },
      {
        unit_id: "s05-u4",
        level: "INTERPRETATION_CANDIDATE",
        text:
          "把这些并排放在一起看：着录之间的分歧，不是数据的瑕疵，而是历史知识本来的形状。",
        evidence_refs: [],
      },
    ],
    uncertainty: "T11-C1/C2 ACCEPT_CONFLICT（裁定已落实）；HR-MAP-01 维持 PARTIAL_CONFIRM；U6 标签 UNRESOLVED。",
    allowed_user_actions: ["OPEN_EVIDENCE"],
    composition_intent: "证据面板为主面：known（桥水关系）/ conflicting（两组着录冲突）/ unknown（河道几何、寺桥关系、1879 标签）三栏并排。",
  },
  {
    scene_id: "jinze-3min/s06-change-through-time",
    duration_sec: 26,
    experience_goal: "用有证据的变更链呈现 700 年的存续与毁建（不补画面）",
    primary_focus: "万安桥亭桥形制（1342→废）+ 颐浩寺毁建链（1938→1992）",
    spatial_mode: "RELATIONAL_HISTORICAL",
    time_state: "1342 → 1938 → 1992 → 当代",
    map_state: "timeline_with_relational_space",
    experience_hook_refs: [],
    narrative: [
      {
        unit_id: "s06-u1",
        level: "FACT_EVIDENCED",
        text:
          "元至正二年（1342），万安桥上加建廊亭，遂名『万安亭桥』——方志形容它『亭建如穿廊，数间飞出』。",
        evidence_refs: ["wanan_gov_2025", "wanan_gov_2023"],
      },
      {
        unit_id: "s06-u2",
        level: "FACT_EVIDENCED",
        text:
          "今天的桥上，亭、阁已经不在了，但石栏板上还留着当年亭柱的榫口——废毁发生在什么时候，着录没有说；痕迹却还在。",
        evidence_refs: ["wanan_gov_2025"],
      },
      {
        unit_id: "s06-u3",
        level: "FACT_EVIDENCED",
        text:
          "颐浩寺走过另一条路：1938 年大部分建筑毁于日军轰炸；1992 年，寺院在原址重建——元代碑记、『不断云』石刻与大殿柱础，和新殿并置到今天。",
        evidence_refs: ["yihao_museum_1938", "yihao_civ_1992"],
      },
      {
        unit_id: "s06-u4",
        level: "FACT_LIMITED",
        // M4.1（EXP-CULTURAL-03）G-06 单一真源对齐：U10 详细口径唯一来自 008 投影
        // presentConnections.open_questions（证据面板「今日开放问题」）；此处仅保留免责陈述并让位。
        text:
          "这条时间链的每一步都有官方着录支撑；像『开放为宗教活动场所』这样的后续表述，因缺乏文号，本体验不将其作为事实呈现——权威口径只来自证据面板的「今日开放问题」（由遗址—今址记录单一提供）。",
        evidence_refs: ["yihao_civ_1992"],
      },
    ],
    uncertainty: "亭阁废毁年份无证据（不设断言）；T11-C3 ACCEPT_RETIREMENT 已执行。",
    allowed_user_actions: ["SET_TIME", "OPEN_EVIDENCE"],
    composition_intent: "时间轴为主面：四段变更（1260 建 / 1342 加亭 / 1938 毁 / 1992 原址重建）逐段点亮；无任何 AI 复原画面。",
  },
  {
    scene_id: "jinze-3min/s07-return-today",
    duration_sec: 24,
    experience_goal: "回到今天的地理与现场照片，邀请观察而不宣称今貌即原貌",
    primary_focus: "三处遗存的现存影像（confirmed current）",
    spatial_mode: "GEOGRAPHIC_EXACT",
    time_state: "2026（当下）",
    map_state: "modern_map_current_objects",
    transition_in: "RELATIONAL_HISTORICAL → GEOGRAPHIC_EXACT：关系空间收起，现代地图与实景照片回到主面",
    experience_hook_refs: ["show_surviving_bridge"],
    narrative: [
      {
        unit_id: "s07-u1",
        level: "FACT_EVIDENCED",
        text:
          "回到今天的金泽。万安桥、普济桥仍在水道上通行，颐浩寺遗址就在迎祥街旁——照片里的它们，都是此刻的样子。",
        evidence_refs: ["poi_wanan_current", "poi_puji_current", "poi_yihao_area"],
      },
      {
        unit_id: "s07-u2",
        level: "INTERACTION",
        text:
          "如果去现场，可以看看：万安桥栏板上的亭柱榫口、遗址里的元代碑记与古银杏。今天的样貌值得观察——但今天的样貌，不等于它七百年前的样子。",
        evidence_refs: [],
      },
    ],
    uncertainty: "现存影像均为当代实景（无历史视觉资产）；『今貌 ≠ 原貌』显式声明。",
    allowed_user_actions: ["SET_VISUAL_MODE", "FOCUS_PLACE"],
    composition_intent: "实景照片为主面（三张 confirmed current），地图缩为小窗。",
  },
  {
    scene_id: "jinze-3min/s08-next-question",
    duration_sec: 20,
    experience_goal: "给出主发现、留下一个可追问的问题，并演示『补丁不重启』",
    primary_focus: "Primary Discovery + canonical follow-up",
    spatial_mode: "RELATIONAL_HISTORICAL",
    time_state: "跨时段（发现陈述）",
    map_state: "text_focus_over_relational_space",
    experience_hook_refs: [],
    narrative: [
      // TASK-0012A：组合判断不得仅因成分事实有证据而标 FACT_EVIDENCED。
      // 拆分为：事实（桥—水）→ 解释框架（组合命题）→ 未知边界，三段紧邻。
      {
        unit_id: "s08-u1",
        level: "FACT_EVIDENCED",
        text: "先说经得起证据的部分：两座宋桥被独立着录为跨同一条有名的水道。",
        evidence_refs: ["puji_gov_2025", "wanan_gov_2025", "rel_spans_same_waterway"],
      },
      {
        unit_id: "s08-u1b",
        level: "INTERPRETATION_CANDIDATE",
        text:
          "本条体验的主发现，是墨痕基于这些已知事实提出的解释框架，不是已证历史事实：把三处遗存放回水的关系中理解，可以把它们从三个孤立文物重新看成一组值得继续追问的空间节点。",
        evidence_refs: [],
      },
      {
        unit_id: "s08-u2",
        level: "UNKNOWN",
        text:
          "但要说清边界：寺与桥之间是否存在历史上的功能关联，目前没有任何证据支持，也没有证据否证。",
        evidence_refs: [],
      },
      {
        unit_id: "s08-u3",
        level: "QUESTION",
        text: "那颐浩寺和普济桥以前真的有关系吗？——墨痕不会编造答案。",
        evidence_refs: [],
      },
      {
        unit_id: "s08-u4",
        level: "INTERACTION",
        text:
          "继续追问，体验不会重来：它会把已知、未知、缺什么证据摆在桌面上，再告诉你下一步可以查什么、去现场看什么。",
        evidence_refs: [],
      },
    ],
    uncertainty: "U5（E2 关联）保持原证据等级，不得升级为历史事实。",
    allowed_user_actions: ["PROPOSE_ROUTE", "REPLAN", "OPEN_EVIDENCE"],
    composition_intent: "文本聚焦为主面；补丁预览卡片浮现（Patch, not Replace）。",
  },
];

// ---------------------------------------------------------------------------
// 3) 发现（1 Primary + ≤2 Secondary）与冲突裁定
// ---------------------------------------------------------------------------
const T11_RULINGS = [
  { ruling: "T11-C1", topic: "普济桥方位", decision: "ACCEPT_CONFLICT", applied: "叙事只说『跨金泽塘』；北市/南市/中部不作已裁决事实，冲突保留于证据面板（s05-u2）" },
  { ruling: "T11-C2", topic: "万安桥跨水道", decision: "ACCEPT_CONFLICT + SUSPECTED_CROSS_TOWN_MISALIGNMENT", applied: "公开措辞用官方『金泽塘/市河』+出处；上图『秀州塘』在证据展开时保持可见（s05-u1），不删除不静默归一" },
  { ruling: "T11-C3", topic: "1992 开放", decision: "ACCEPT_RETIREMENT", applied: "只说『1992 年在原址重建寺院』+来源限制；『开放为宗教活动场所』不作为事实出现（s06-u4 显式声明）" },
  { ruling: "T11-C4", topic: "《松江府志》引文", decision: "ACCEPT_LIMITED", applied: "引用必须写明『被后来官方材料归于〈松江府志〉，原书未取得』（s04-u2）" },
  { ruling: "T11-C5", topic: "金泽塘时间语义", decision: "PRINCIPLE_ACCEPTED", applied: "本体验中 temporal_assertion=none、temporal_evidence_status=not_applicable；不把 attested_time_evidence_backed 解释为年代已证" },
];

const DISCOVERIES = {
  primary: {
    discovery_id: "jinze-3min/discovery/primary",
    // TASK-0012A：组合判断的认识论分类必须显式。成分事实各有 Evidence，
    // 但「三处遗存 = 同一片水网上的三个节点」这一组合命题本身无直接 Evidence
    // → INTERPRETATION_CANDIDATE，不得为 FACT_EVIDENCED。
    epistemic_classification: "INTERPRETATION_CANDIDATE",
    classification_note:
      "Evidence(桥A跨水)+Evidence(桥B跨水)+Evidence(寺在镇区) ≠ Evidence(三节点组合解释)。组合命题无直接证据，只能作为墨痕提出的解释框架呈现。",
    statement:
      "三处遗存不是三件孤立文物，而是同一片水网上的三个节点：两座宋桥被独立着录为跨同一条有名的水道（E1），寺就建在这片水网所在的镇区——把『水上的关系』当理解框架，比把每件遗存当孤立的年代标本更接近金泽；同时显式标注：寺与桥之间的历史功能关联仍未被证据支持。",
    evidence_basis: [
      "pujiqiao--spans_waterway--jinzetang（E1，4 证据）",
      "wananqiao--spans_waterway--jinzetang（E1，4 证据）",
      "pujiqiao--spans_same_waterway--wananqiao（E1）",
      "yihaosi-site--former_site_of--lvyihao（E1）",
      "yihaosi-site--temple_bridge_association--pujiqiao（E2——正是『未证』边界本身）",
    ],
    unresolved_counterpoint:
      "寺↔桥的历史功能关系（香道/放生/桥庙配套）零前现代文献支持（U5）；金泽塘前现代着录为零（U7）——『水网一体』的历史系统叙事不得越界为事实。",
    why_it_matters:
      "游客在 700 年后的现场仍能看到这三者共存于步行可达的范围——关系框架把『打卡三件文物』变成『读一张水网』，且全程不假装知道证据之外的事。",
    policy_check: "未主张『桥寺水构成完整历史功能系统』（任务书 §10 禁止项），该句以未决问句出现于 s04-u3/s08-u2。",
  },
  secondary: [
    {
      discovery_id: "jinze-3min/discovery/secondary-1",
      statement:
        "万安桥『亭桥』的时间痕迹今天仍可触摸：1342 年加建廊亭（4 类独立来源），亭阁已废，但石栏板榫口犹在——一个把文献着录和现场观察接起来的点。",
      evidence_basis: ["wanan_gov_2025", "wanan_gov_2023", "wananqiao/tingqiao-form-unknown（evidenced）"],
      unresolved_counterpoint: "亭阁废毁的具体年份无着录。",
      why_it_matters: "给出行前的具体观察目标，把『历史』落到一块石头上。",
    },
    {
      discovery_id: "jinze-3min/discovery/secondary-2",
      statement:
        "历史着录本身会互相矛盾（T11-C1 方位、T11-C2 水道名）——冲突被保留而非抹平，看到『证据的分歧』本身就是这次体验的一部分。",
      evidence_basis: ["T11-C1/C2 冲突证据组", "shl_dmx_wanan_xiuzhoutang", "puji_shtong_nanshi", "puji_assoc_zhongbu"],
      unresolved_counterpoint: "两组冲突均无权威仲裁来源，维持 ACCEPT_CONFLICT。",
      why_it_matters: "建立对历史资料的诚实预期：墨痕呈现知识的形状，而不是知识的幻觉。",
    },
  ],
};

// ---------------------------------------------------------------------------
// 4) Follow-up Patch（第一次 Patch-not-Replace 正式测试）
// ---------------------------------------------------------------------------
const FOLLOWUP = {
  patch_id: "jinze-3min/patch/followup-temple-bridge",
  trigger_question: "那颐浩寺和普济桥以前真的有关系吗？",
  behavior_contract: {
    restart_experience: false,
    patch_not_replace: true,
    may_invent_answer: false,
    patch_target: "existing ExperienceState（s08 终态）",
  },
  preserved: {
    experience_id: "jinze-3min/jinze-water-net",
    goal: "体验目标与叙事进度保持不变（已完成 8/8 场）",
    time_state: "跨时段（发现陈述）",
    spatial_state: { mode: "RELATIONAL_HISTORICAL", note: "关系空间不重置" },
    discoveries: "primary + secondary×2 全部保留",
    visited_scenes: "s01–s08 全部保留",
  },
  changed: {
    scene_focus: "s08/s08-next-question → followup 聚焦面板",
    user_question: "那颐浩寺和普济桥以前真的有关系吗？",
    composition: { primarySurface: "evidence_panel", transitionIntent: "补丁浮现，不重播" },
  },
  foregrounded: {
    relations: [
      {
        relation: "yihaosi-site--temple_bridge_association--pujiqiao",
        epistemic_class: "E2",
        meaning:
          "当前唯一支持＝现代 provider 复合 POI（同一 POI 名内含桥与寺）+ 同街地址 → 是『当前的关联』，不是历史事实",
      },
    ],
    evidence: ["poi_yihao_area（SHR-01 近似范围）", "poi_puji_current", "poi_yihao_area 对比 poi_puji_current 的地址字符串同街"],
    uncertainties: ["U5（E2 关联）", "U8（颐浩寺历史位置 unresolved）", "U7（金泽塘走向几何为零证据）"],
    unknown_stated:
      "已知：寺与桥今天相邻、同街；寺 1260 年创建、两桥 1260s–1267 建成（时间窗口重叠有据）。未知：任何前现代文献是否记载寺—桥功能关联。缺失证据：明清方志/寺志中的寺桥关系条目、1879 县志图说该区域可辨读细节。",
  },
  next_actions: [
    { action: "research_lead", text: "把『前现代文献中的寺桥关系』列为 research-lead（康熙/光绪《青浦县志》寺观、津梁卷）——须另行立项，不在本体验内补查" },
    { action: "field_observation", text: "现场踏勘建议：观察寺—桥之间的路径与水岸形态（仅记录观察，不得升为历史证据）" },
    { action: "explore", text: "或回到体验：换一个视角重看 s03 的桥—水拓扑 / s05 的冲突面板" },
  ],
  invariants: ["不升级 E2→E1", "不重启 Experience", "不编造答案", "不改已播场景", "HR-MAP-01 维持 PARTIAL_CONFIRM"],
};

// ---------------------------------------------------------------------------
// 5) 组装 + 校验 + 输出
// ---------------------------------------------------------------------------
async function loadVisualAssets() {
  const rows = await queryRows(
    `select vel.asset_id::text id, va.asset_type::text type, coalesce(va.file_path,'') uri,
            coalesce(va.rights,'') rights, vel.depicted_entity_label::text label
       from visual_entity_links vel join visual_assets va on va.asset_id::text = vel.asset_id::text
      where vel.link_status::text='confirmed' and vel.current_or_historical::text='current'
        and vel.depicted_entity_label::text in ('万安桥','普济桥','颐浩寺遗址')
      order by vel.depicted_entity_label`
  );
  return rows;
}

function collectNarrativeRefs(scene) {
  return scene.narrative.flatMap((u) => u.evidence_refs);
}

// 每个场景明确声明挂载哪些视觉资产（label 白名单；未列出的场景不挂图）
const SCENE_VISUAL_LABELS = {
  "jinze-3min/s01-today-hook": ["万安桥"],
  "jinze-3min/s04-temple-enters": ["颐浩寺遗址"],
  "jinze-3min/s06-change-through-time": ["颐浩寺遗址"],
  "jinze-3min/s07-return-today": ["万安桥", "普济桥", "颐浩寺遗址"],
};

function buildSceneOutput(scene, visualAssets) {
  const refs = collectNarrativeRefs(scene);
  const allowedLabels = SCENE_VISUAL_LABELS[scene.scene_id] ?? [];
  const visualForScene = visualAssets.filter((a) => allowedLabels.includes(a.label));
  const composition = compositionForScene(scene);
  return {
    scene_id: scene.scene_id,
    duration_sec: scene.duration_sec,
    experience_goal: scene.experience_goal,
    primary_focus: scene.primary_focus,
    spatial_mode: scene.spatial_mode,
    time_state: scene.time_state,
    map_state: scene.map_state,
    visual_assets: visualForScene,
    narrative: scene.narrative,
    evidence_refs: [...new Set(refs)],
    epistemic_status: epistemicForScene(scene),
    uncertainty: scene.uncertainty,
    transition_in: scene.transition_in ?? "自上一场景语义延续",
    transition_out: transitionOutForScene(scene),
    allowed_user_actions: scene.allowed_user_actions,
    composition_intent: scene.composition_intent,
    composition,
    renderer_neutral: {
      spoken_narration: scene.narrative.map((u) => ({ unit_id: u.unit_id, text: u.text, level: u.level })),
      on_screen_text: scene.narrative
        .filter((u) => u.level === "QUESTION" || u.level === "INTERACTION")
        .map((u) => u.text),
      camera_or_view_intent: cameraIntentForScene(scene),
      hold_reason: `本场景停留以完成『${scene.experience_goal}』`,
      transition_intent: scene.transition_in ?? "语义延续",
    },
  };
}

function compositionForScene(scene) {
  const map = {
    "jinze-3min/s01-today-hook": { secondarySurface: "current_photo", contextSurface: "timeline", narrativeDensity: "low", visualIntensity: "high", transitionIntent: "establishing" },
    "jinze-3min/s02-time-travel": { secondarySurface: "modern_map", contextSurface: "text_focus", narrativeDensity: "medium", visualIntensity: "medium", transitionIntent: "coordinate-fade" },
    "jinze-3min/s03-two-bridges-water": { secondarySurface: "timeline", contextSurface: "text_focus", narrativeDensity: "medium", visualIntensity: "medium", transitionIntent: "topology-build" },
    "jinze-3min/s04-temple-enters": { secondarySurface: "timeline", contextSurface: "evidence_panel", narrativeDensity: "medium", visualIntensity: "medium", transitionIntent: "node-add" },
    "jinze-3min/s05-evidence-reveal": { secondarySurface: "relational_space", contextSurface: "timeline", narrativeDensity: "high", visualIntensity: "low", transitionIntent: "panel-split" },
    "jinze-3min/s06-change-through-time": { secondarySurface: "relational_space", contextSurface: "current_photo", narrativeDensity: "medium", visualIntensity: "medium", transitionIntent: "timeline-sweep" },
    "jinze-3min/s07-return-today": { secondarySurface: "modern_map", contextSurface: "timeline", narrativeDensity: "low", visualIntensity: "high", transitionIntent: "coordinate-return" },
    "jinze-3min/s08-next-question": { secondarySurface: "evidence_panel", contextSurface: "relational_space", narrativeDensity: "high", visualIntensity: "low", transitionIntent: "patch-preview" },
  };
  const m = map[scene.scene_id];
  return {
    primarySurface: primarySurfaceForScene(scene),
    secondarySurface: m.secondarySurface.trim(),
    contextSurface: m.contextSurface,
    narrativeDensity: m.narrativeDensity,
    visualIntensity: m.visualIntensity,
    transitionIntent: m.transitionIntent.trim(),
  };
}

function primarySurfaceForScene(scene) {
  const map = {
    "jinze-3min/s01-today-hook": "modern_map",
    "jinze-3min/s02-time-travel": "timeline",
    "jinze-3min/s03-two-bridges-water": "relational_space",
    "jinze-3min/s04-temple-enters": "relational_space",
    "jinze-3min/s05-evidence-reveal": "evidence_panel",
    "jinze-3min/s06-change-through-time": "timeline",
    "jinze-3min/s07-return-today": "current_photo",
    "jinze-3min/s08-next-question": "text_focus",
  };
  return map[scene.scene_id];
}

function epistemicForScene(scene) {
  const levels = scene.narrative.map((u) => u.level);
  if (levels.includes("CONFLICT")) return "CONFLICT_SURFACED";
  if (levels.includes("UNKNOWN")) return "KNOWN_WITH_UNKNOWN";
  if (levels.includes("FACT_LIMITED")) return "KNOWN_WITH_LIMITS";
  return "KNOWN";
}

function transitionOutForScene(scene) {
  const map = {
    "jinze-3min/s01-today-hook": "时间轴亮起，进入历史时段",
    "jinze-3min/s02-time-travel": "拓扑空间稳定，进入桥—水关系",
    "jinze-3min/s03-two-bridges-water": "寺节点加入",
    "jinze-3min/s04-temple-enters": "证据面板展开",
    "jinze-3min/s05-evidence-reveal": "时间轴推进至变更链",
    "jinze-3min/s06-change-through-time": "回到今天（坐标回归）",
    "jinze-3min/s07-return-today": "收束至主发现与追问",
    "jinze-3min/s08-next-question": "等待用户追问（Patch 就绪）",
  };
  return map[scene.scene_id];
}

function cameraIntentForScene(scene) {
  const map = {
    "jinze-3min/s01-today-hook": "现代地图俯瞰金泽镇区，三处对象点依序点亮",
    "jinze-3min/s02-time-travel": "地图去坐标化：点位渐隐为标签节点",
    "jinze-3min/s03-two-bridges-water": "两节点居中，『金泽塘』以文字标签浮于两桥之间（无线几何）",
    "jinze-3min/s04-temple-enters": "寺节点自东南侧淡入；寺—桥之间刻意留白",
    "jinze-3min/s05-evidence-reveal": "视图让位给证据面板：三栏（known/conflicting/unknown）",
    "jinze-3min/s06-change-through-time": "时间轴横扫 1342→1938→1992，拓扑空间为底",
    "jinze-3min/s07-return-today": "回到现代地图，切实景照片",
    "jinze-3min/s08-next-question": "静态文本聚焦，补丁卡片轻浮现",
  };
  return map[scene.scene_id];
}

// ---- 校验（构建期一次；测试可复跑） ----
async function validate(script) {
  const errors = [];
  // 场景数 / 时长
  if (script.scene_count < 6 || script.scene_count > 8) errors.push("scene_count out of 6-8");
  if (script.duration_sec < 150 || script.duration_sec > 210) errors.push("duration out of 150-210");
  let total = 0;
  const VALID_MODES = [
    "GEOGRAPHIC_EXACT",
    "GEOGRAPHIC_APPROXIMATE",
    "RELATIONAL_HISTORICAL",
    "HISTORICAL_MAP_SOURCE",
    "RECONSTRUCTED_HISTORICAL",
    "SPATIAL_UNKNOWN",
  ];
  const SURFACES = ["modern_map", "relational_space", "timeline", "evidence_panel", "current_photo", "historical_source", "text_focus"];
  for (const s of script.scenes) {
    total += s.duration_sec;
    if (!VALID_MODES.includes(s.spatial_mode)) errors.push(`${s.scene_id}: invalid spatial_mode`);
    if (s.spatial_mode === "RECONSTRUCTED_HISTORICAL") errors.push(`${s.scene_id}: RECONSTRUCTED_HISTORICAL forbidden`);
    if (!s.composition || !SURFACES.includes(s.composition.primarySurface))
      errors.push(`${s.scene_id}: invalid primarySurface`);
    for (const u of s.narrative) {
      if (!NARRATION_LEVELS.includes(u.level)) errors.push(`${u.unit_id}: invalid level`);
      if (FACTUAL_LEVELS.includes(u.level) && u.evidence_refs.length === 0)
        errors.push(`${u.unit_id}: factual unit without evidence refs`);
      if (/开放为宗教活动场所|开放为佛教活动场所/.test(u.text) && u.level !== "FACT_LIMITED" && u.level !== "INTERACTION" && u.level !== "UNKNOWN")
        errors.push(`${u.unit_id}: retired wording outside allowed meta-context`);
    }
  }
  if (total !== script.duration_sec) errors.push("duration sum mismatch");
  // 冲突在场
  if (!script.conflicts.some((c) => c.ruling === "T11-C1")) errors.push("T11-C1 missing");
  if (!script.conflicts.some((c) => c.ruling === "T11-C2")) errors.push("T11-C2 missing");
  // 金泽塘时间语义
  if (script.waterway_temporal_semantics.temporal_assertion !== "none") errors.push("jinzetang temporal_assertion must be none");
  if (script.waterway_temporal_semantics.temporal_evidence_status !== "not_applicable")
    errors.push("jinzetang temporal_evidence_status must be not_applicable");
  // 唯一 Primary Discovery（primary 为单对象，非数组）
  if (!script.discoveries.primary || !script.discoveries.primary.statement)
    errors.push("primary discovery must be exactly 1");
  if (script.discoveries.secondary.length > 2) errors.push("secondary discoveries > 2");
  // TASK-0012A：组合解释防线——Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C 解释)。
  // 组合命题只能 INTERPRETATION_CANDIDATE；其措辞不得泄漏进任何 FACT_EVIDENCED 单元。
  if (script.discoveries.primary.epistemic_classification !== "INTERPRETATION_CANDIDATE")
    errors.push("primary discovery must be classified INTERPRETATION_CANDIDATE (composite claim has no direct evidence)");
  const COMPOSITE_PHRASE = /(三个节点|同一片水网)/;
  for (const s of script.scenes)
    for (const u of s.narrative)
      if (u.level === "FACT_EVIDENCED" && COMPOSITE_PHRASE.test(u.text))
        errors.push(`${u.unit_id}: composite interpretation phrase leaked into FACT_EVIDENCED`);
  return errors;
}

function buildStateSequence(script) {
  return script.scenes.map((s) => ({
    scene_id: s.scene_id,
    experience_state: {
      experience_id: script.experience_id,
      scene_id: s.scene_id,
      goal: s.experience_goal,
      time_state: s.time_state,
      spatial_state: {
        mode: s.spatial_mode,
        map_state: s.map_state,
        modern_coordinates_visible: s.spatial_mode === "GEOGRAPHIC_EXACT",
        note: "任何模式下，现代坐标都不作为历史坐标呈现",
      },
      focus_entities: focusEntitiesForScene(s.scene_id),
      active_relations: activeRelationsForScene(s.scene_id),
      active_changes: activeChangesForScene(s.scene_id),
      active_evidence: s.evidence_refs,
      active_visual_assets: s.visual_assets.map((a) => a.id),
      uncertainties: uncertaintiesForScene(s.scene_id),
      user_question:
        s.scene_id === "jinze-3min/s01-today-hook"
          ? "为什么在不到一公里的金泽水乡空间里，两座宋桥、一处宋代寺院遗址会如此靠近？"
          : s.scene_id === "jinze-3min/s08-next-question"
            ? "那颐浩寺和普济桥以前真的有关系吗？"
            : null,
      next_possible_actions: s.allowed_user_actions,
    },
    composition_state: s.composition,
  }));
}

function focusEntitiesForScene(id) {
  const map = {
    "jinze-3min/s01-today-hook": ["wananqiao", "pujiqiao", "yihaosi-site"],
    "jinze-3min/s02-time-travel": ["wananqiao", "pujiqiao", "yihaosi-site"],
    "jinze-3min/s03-two-bridges-water": ["pujiqiao", "wananqiao", "jinzetang"],
    "jinze-3min/s04-temple-enters": ["yihaosi-site", "lvyihao"],
    "jinze-3min/s05-evidence-reveal": ["pujiqiao", "wananqiao", "jinzetang"],
    "jinze-3min/s06-change-through-time": ["wananqiao", "yihaosi-site"],
    "jinze-3min/s07-return-today": ["wananqiao", "pujiqiao", "yihaosi-site"],
    "jinze-3min/s08-next-question": ["yihaosi-site", "pujiqiao"],
  };
  return map[id];
}

function activeRelationsForScene(id) {
  const map = {
    "jinze-3min/s01-today-hook": [],
    "jinze-3min/s02-time-travel": [],
    "jinze-3min/s03-two-bridges-water": [
      "pujiqiao--spans_waterway--jinzetang",
      "wananqiao--spans_waterway--jinzetang",
      "pujiqiao--spans_same_waterway--wananqiao",
      "pujiqiao--relative_position_south_of--wananqiao",
    ],
    "jinze-3min/s04-temple-enters": ["yihaosi-site--former_site_of--lvyihao", "yihaosi-site--named_after--lvyihao"],
    "jinze-3min/s05-evidence-reveal": [
      "pujiqiao--spans_waterway--jinzetang",
      "wananqiao--spans_waterway--jinzetang",
      "yihaosi-site--temple_bridge_association--pujiqiao(E2)",
    ],
    "jinze-3min/s06-change-through-time": [],
    "jinze-3min/s07-return-today": [],
    "jinze-3min/s08-next-question": ["yihaosi-site--temple_bridge_association--pujiqiao(E2)"],
  };
  return map[id];
}

function activeChangesForScene(id) {
  const map = {
    "jinze-3min/s06-change-through-time": [
      "wananqiao/tingqiao-form-unknown",
      "yihaosi-site/rebuilt-on-original-site",
    ],
  };
  return map[id] ?? [];
}

function uncertaintiesForScene(id) {
  const map = {
    "jinze-3min/s02-time-travel": ["U7", "U8"],
    "jinze-3min/s03-two-bridges-water": ["U7", "U13"],
    "jinze-3min/s04-temple-enters": ["U5", "U11"],
    "jinze-3min/s05-evidence-reveal": ["U6", "U9", "U13"],
    "jinze-3min/s06-change-through-time": ["U10"],
    "jinze-3min/s07-return-today": [],
    "jinze-3min/s08-next-question": ["U5"],
  };
  return map[id] ?? [];
}

// ---- 输出组装 ----
export async function buildExperience() {
  const slice = JSON.parse(fs.readFileSync(SLICE_JSON, "utf8"));
  if (slice.slice_id !== "jinze-minimum-slice-001") throw new Error("unexpected slice");
  if (slice.readiness?.gate !== "YES") throw new Error("slice not ready: " + JSON.stringify(slice.readiness));

  const visualAssets = await loadVisualAssets();
  if (visualAssets.length !== 3) throw new Error("expected 3 confirmed current visual assets, got " + visualAssets.length);

  const scenes = SCENES.map((s) => buildSceneOutput(s, visualAssets));
  const duration = SCENES.reduce((a, s) => a + s.duration_sec, 0);

  // 证据引用存在性校验（对 DB 只读）
  const allRefs = [...new Set(SCENES.flatMap(collectNarrativeRefs))];
  for (const key of allRefs) {
    const def = EVIDENCE_REGISTRY[key];
    if (!def) throw new Error("evidence key not in registry: " + key);
    const n = await queryValue(`select count(*)::text c from evidence where evidence_id=:'id'`, { id: def.id });
    if (Number(n) !== 1) throw new Error(`evidence not found in DB: ${key} -> ${def.id}`);
  }

  const script = {
    schema: "mohen-experience-script/v1",
    experience_id: "jinze-3min/jinze-water-net",
    title: "一公里之内的南宋：金泽的水、桥与寺",
    primary_question:
      "为什么在不到一公里的金泽水乡空间里，两座宋桥、一处宋代寺院遗址会如此靠近？",
    generated_from: { slice_id: slice.slice_id, truth_store: slice.truth_store, builder: "TASK-0012 deterministic builder" },
    scene_count: SCENES.length,
    duration_sec: duration,
    waterway_temporal_semantics: {
      feature: "jinze-min-001/feature/jinzetang",
      temporal_assertion: "none",
      temporal_evidence_status: "not_applicable",
      note:
        "T11-C5：切片中 attested_time_evidence_backed=true 的语义是『切片不作时间断言』（字段无时间断言可证伪），不表示金泽塘历史年代已获证明。本体验全程不对金泽塘作年代陈述。",
    },
    spatial_mode_policy: {
      allowed: ["GEOGRAPHIC_EXACT", "GEOGRAPHIC_APPROXIMATE", "RELATIONAL_HISTORICAL", "HISTORICAL_MAP_SOURCE", "SPATIAL_UNKNOWN"],
      forbidden_active: ["RECONSTRUCTED_HISTORICAL"],
      principle: "When evidence precision changes, spatial representation must change with it.",
    },
    t11_rulings_applied: T11_RULINGS,
    hr_map_status: "PARTIAL_CONFIRM（未改动；1879 p36 不作为直接金泽历史地图，三标签保持 UNRESOLVED）",
    conflicts: T11_RULINGS.filter((r) => r.decision.startsWith("ACCEPT_CONFLICT")).map((r) => ({
      ruling: r.ruling,
      topic: r.topic,
      decision: r.decision,
      surfaced_in_scene: r.ruling === "T11-C1" ? "jinze-3min/s05-evidence-reveal" : "jinze-3min/s05-evidence-reveal",
    })),
    discoveries: {
      primary: DISCOVERIES.primary,
      secondary: DISCOVERIES.secondary,
    },
    visual_policy: {
      allowed: ["confirmed_current_photos", "text_excerpts", "timeline", "relational_diagrams_from_structured_data"],
      forbidden: ["AI 历史场景生成", "伪旧照处理", "AI 补画河道/街巷", "历史建筑复原", "1879 p36 升级为直接金泽地图"],
      historical_visual_assets_used: 0,
    },
    narrative_policy: {
      levels: NARRATION_LEVELS,
      hard_rule: "QUESTION/INTERPRETATION_CANDIDATE 永不静默改写为 FACT_EVIDENCED；每个 factual unit 必带 evidence_refs",
    },
    scenes,
    followup: FOLLOWUP,
  };

  const errors = await validate(script);
  if (errors.length) throw new Error("validation failed:\n" + errors.join("\n"));

  return { script, slice };
}

// ---- 交付物写盘（幂等：内容不变则不写） ----
function writeFileIdempotent(p, content) {
  if (fs.existsSync(p) && fs.readFileSync(p, "utf8") === content) return "unchanged";
  fs.writeFileSync(p, content, "utf8");
  return "written";
}

function evidenceTraceRows(script) {
  const rows = [["unit_id", "scene_id", "level", "text", "evidence_ids"]];
  for (const s of script.scenes)
    for (const u of s.narrative)
      rows.push([
        u.unit_id,
        s.scene_id,
        u.level,
        u.text,
        u.evidence_refs.map((k) => EVIDENCE_REGISTRY[k].id).join("; "),
      ]);
  // 标准 CSV：全字段引号包裹，内部双引号转义，换行压平
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/\r?\n/g, " ").replace(/"/g, '""')}"`).join(","))
    .join("\n") + "\n";
}

function scriptMarkdown(script) {
  const L = [];
  L.push(`# ${script.title}`);
  L.push("");
  L.push(`- experience_id: \`${script.experience_id}\``);
  L.push(`- 主问题：${script.primary_question}`);
  L.push(`- 场景数：${script.scene_count}　总时长：${script.duration_sec}s（目标 180±30s）`);
  L.push(`- 来源：${script.generated_from.slice_id}（truth store：${script.generated_from.truth_store}）`);
  L.push(`- 金泽塘时间语义：temporal_assertion=none / temporal_evidence_status=not_applicable（T11-C5）`);
  L.push("");
  L.push("## 主发现（Primary Discovery）");
  L.push("");
  L.push(script.discoveries.primary.statement);
  L.push("");
  L.push(`> 未决对点：${script.discoveries.primary.unresolved_counterpoint}`);
  L.push("");
  L.push("## 场景脚本");
  for (const s of script.scenes) {
    L.push("");
    L.push(`### ${s.scene_id}（${s.duration_sec}s · ${s.spatial_mode} · primarySurface=${s.composition.primarySurface}）`);
    L.push(`- 目标：${s.experience_goal}`);
    L.push(`- 状态：${s.epistemic_status}　不确定项：${s.uncertainty}`);
    for (const u of s.narrative) {
      const refs = u.evidence_refs.length ? `〔${u.evidence_refs.map((k) => EVIDENCE_REGISTRY[k].id.slice(0, 8)).join(", ")}〕` : "";
      L.push(`- **[${u.level}]** ${u.text} ${refs}`);
    }
  }
  L.push("");
  L.push("## 追问补丁（Patch, not Replace）");
  L.push("");
  L.push(`触发：『${script.followup.trigger_question}』→ 不重启；前景化 E2 关系与缺失证据；不编造答案。`);
  L.push("");
  L.push("## 裁定落实（T11-C1…C5）");
  for (const r of script.t11_rulings_applied) L.push(`- **${r.ruling} ${r.decision}**：${r.applied}`);
  return L.join("\n") + "\n";
}

export async function runAll() {
  const { script } = await buildExperience();
  fs.mkdirSync(EXPORTS, { recursive: true });

  const scriptJson = JSON.stringify(script, null, 2) + "\n";
  const stateSeq = {
    schema: "mohen-experience-state-sequence/v1",
    experience_id: script.experience_id,
    states: buildStateSequence(script),
  };
  const patch = {
    schema: "mohen-experience-patch/v1",
    ...FOLLOWUP,
    base_experience_id: script.experience_id,
    base_scene_count: script.scene_count,
    patch_semantics: "PATCH_NARRATIVE + FOCUS change on top of s08 terminal state; all 8 scenes preserved",
  };

  const outputs = {
    "jinze-3min-experience-script.json": scriptJson,
    "jinze-3min-experience-script.md": scriptMarkdown(script),
    "jinze-3min-experience-evidence-trace.csv": evidenceTraceRows(script),
    "jinze-3min-experience-state-sequence.json": JSON.stringify(stateSeq, null, 2) + "\n",
    "jinze-3min-experience-followup-patch.json": JSON.stringify(patch, null, 2) + "\n",
  };

  const result = { files: {}, hashes: {} };
  for (const [name, content] of Object.entries(outputs)) {
    result.files[name] = writeFileIdempotent(path.join(EXPORTS, name), content);
    result.hashes[name] = sha256(content);
  }
  return result;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  runAll()
    .then((r) => {
      process.stdout.write(JSON.stringify({ task: "TASK-0012", ...r }, null, 2) + "\n");
    })
    .catch((e) => {
      process.stderr.write("BUILD FAILED: " + e.message + "\n");
      process.exit(1);
    });
}
