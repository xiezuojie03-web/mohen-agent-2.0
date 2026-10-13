// pipelines/research/research-pipeline.mjs — Discovery 生产链 D01–D05 的**纯逻辑**实现。
//
// 设计原则：
//   · 先算出对象（内存），再由调用方决定是否落库 —— 因此 DRY_RUN 与 WRITE 走**同一套计算**，
//     不会出现「dry run 说 100 条、真跑变 80 条」这种两套代码的分叉。
//   · 只写 research_* 表（生产注册表 write_scope）；任何 Truth 表写入都会撞上
//     guard:research 与库层 CHECK，等于自爆。
//   · 规模由参数控制（首轮 Legacy-first：不扩大外部抓取，也不一次吃掉全部素材）。
//
// 数据来源：沪上经纬 Legacy Reservoir（**只读**，工作区外的老项目预抓取 JSON）。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { runMany, queryRows } from "../../packages/data-access/src/index.mjs";

export const FETCHED =
  process.env.MOHEN_LEGACY_FETCHED ||
  "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";

const uuid = () => crypto.randomUUID();
const ARR_KEYS = ["items", "images", "results", "data", "rows", "records", "entries", "filled", "list"];

// ── 公共小工具 ────────────────────────────────────────────────────────────────
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const clip = (s, n) => (String(s || "").length > n ? String(s).slice(0, n) + "…" : String(s || ""));

/** 文件名 → 载体类型（T01–T14 的简化可机读分类；首轮够用，不发明大 taxonomy）。 */
export function classify(file) {
  const f = file.toLowerCase();
  if (/^cbdb_/.test(f)) return "biography_db";      // 人物传记数据库
  if (/^clans?_/.test(f)) return "clan_genealogy";   // 宗族 / 族谱
  if (/^gazetteer_/.test(f)) return "gazetteer";     // 方志
  if (/^gj_/.test(f)) return "old_book_fulltext";    // 古籍全文
  if (/^jp_/.test(f)) return "poetry_person";        // 诗词 / 人物
  if (/^mgts_/.test(f)) return "old_book_fulltext";  // 古籍全文（扫描本）
  if (/^yutu_/.test(f)) return "historical_map";     // 舆图 / 地图目录
  if (/^geo_placenames/.test(f)) return "placename_gazetteer";
  if (/^protection|^sh_protection/.test(f)) return "heritage_protection";
  if (/^commons_|^shanghai_images/.test(f)) return "image_catalog";
  if (/^verify_/.test(f)) return "verification_probe";
  if (/^resource_probe/.test(f)) return "access_probe";
  if (/^dmz_/.test(f)) return "town_monograph";      // 镇志
  if (/^suzhou_/.test(f)) return "narrative_candidate";
  if (/^events_|^hsly_events/.test(f)) return "event_record";
  if (/^narrative_/.test(f)) return "narrative_asset";
  if (/^jinze_/.test(f)) return "town_monograph";
  return "unknown";
}

/** 图像类载体：modality 不同（没有正文段落，只有目录/说明）。 */
const isVisual = (t) => t === "image_catalog" || t === "historical_map";

// 噪声键：这些字段的值不是"材料内容"（URL / 路径 / 时间戳 / 状态码 …），
// 把它们当正文会炮制出大量"标题级/元数据"假 Observation —— 首轮实测的根因之一。
const NOISE_KEY = /(?:url|uri|href|path|file|http|link|src|thumb|image|img|id$|_meta|^meta|timestamp|created|updated|date|time|count|status|code|type|format|mime|size|width|height|license|provider|endpoint|note|comment|remark|tag|key|hash|checksum)/i;

/** 递归抽取 JSON 中的**中文正文**片段，返回 [{ p: jsonPath, text }]。内容级定位靠 p。 */
function extractText(node, base = "$", out = [], depth = 0) {
  if (out.length > 5000 || depth > 8) return out;
  if (typeof node === "string") {
    const t = norm(node);
    const han = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 正文门槛（2026-10-04 收紧）：长度 ≥ 40 且中文占比 ≥ 30%（排除标题级/英文元数据/纯数字/URL 残片）
    if (t.length >= 40 && han / t.length >= 0.3) out.push({ p: base, text: t });
    return out;
  }
  if (Array.isArray(node)) {
    node.slice(0, 500).forEach((v, i) => extractText(v, `${base}[${i}]`, out, depth + 1));
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (NOISE_KEY.test(k)) continue;
      extractText(v, `${base}.${k}`, out, depth + 1);
    }
  }
  return out;
}

/**
 * 真实词表（来自 Legacy 自带材料，只读）：
 *   places  ← geo_placenames_shanghai.json（上海地名白名单）
 *   persons ← cbdb_people.json（CBDB 上海籍贯人物）
 * 用真实词表而不是纯正则，是为了让 mention 的 resolution 有依据 ——
 * 首轮纯正则把「朱家角镇」拆成人物「朱家角」，正是典型的误报。
 */
export async function loadLexicon() {
  const places = new Set();
  const persons = new Set();
  try {
    const gp = path.join(FETCHED, "geo_placenames_shanghai.json");
    if (fs.existsSync(gp)) {
      const doc = JSON.parse(fs.readFileSync(gp, "utf8"));
      const arr = Array.isArray(doc) ? doc : [];
      for (const r of arr) {
        // ★ 地名消歧（2026-10-05）：只接受落在上海行政区划内的条目。
        //   否则「兴县/海城市/临泽县/左权县」等非沪地名会因 county 字段被误收入词表并错标 ✓。
        const prov = norm(r && r.prov), city = norm(r && r.city);
        if (prov !== "上海市" && city !== "上海市") continue;
        for (const k of ["city", "county", "name", "place"]) {
          const v = norm(r && r[k]);
          if (/^[\u4e00-\u9fa5]{2,8}$/.test(v)) places.add(v);
        }
      }
    }
  } catch { /* 词表不可用 → 全部 mention 保持 unresolved，不影响主流程 */ }
  try {
    const cp = path.join(FETCHED, "cbdb_people.json");
    if (fs.existsSync(cp)) {
      const doc = JSON.parse(fs.readFileSync(cp, "utf8"));
      for (const p of doc.people || []) {
        const n = norm(p && (p.name || p.person_name || p.姓名));
        if (/^[\u4e00-\u9fa5]{2,4}$/.test(n)) persons.add(n);
      }
    }
  } catch { /* 同上 */ }
  // ★ 再用**项目自己的可信世界**做消歧词表（只读 SELECT）。
  //   读取不违反 truth_write_ceiling=0（那条管的是写权限），而且它解决了一个实测问题：
  //   纯正则把「金泽」「朱家角」判成人物，而它们在库里本来就是 place。
  try {
    const rows = await queryRows(
      `select canonical_name, entity_type from entities
        where canonical_name is not null and canonical_name <> '' limit 6000`
    );
    for (const r of rows) {
      const n = norm(r.canonical_name);
      if (!/^[\u4e00-\u9fa5]{2,8}$/.test(n)) continue;
      if (r.entity_type === "person") persons.add(n); else places.add(n);
    }
  } catch { /* 库不可达 → 只用 legacy 词表 */ }
  return { places, persons };
}

/**
 * 离线词表（不连库）：供看板生成器使用。
 * 与 loadLexicon 的 legacy 部分一致，但**强制上海行政区划校验**（去掉非沪地名误标）。
 */
export function buildOfflineLexicon() {
  const places = new Set();
  const persons = new Set();
  try {
    const gp = path.join(FETCHED, "geo_placenames_shanghai.json");
    if (fs.existsSync(gp)) {
      const doc = JSON.parse(fs.readFileSync(gp, "utf8"));
      const arr = Array.isArray(doc) ? doc : [];
      for (const r of arr) {
        const prov = norm(r && r.prov), city = norm(r && r.city);
        if (prov !== "上海市" && city !== "上海市") continue;
        for (const k of ["city", "county", "name", "place"]) {
          const v = norm(r && r[k]);
          if (/^[\u4e00-\u9fa5]{2,8}$/.test(v)) places.add(v);
        }
      }
    }
  } catch { /* 词表不可用 → 全部 mention 保持 unresolved */ }
  try {
    const cp = path.join(FETCHED, "cbdb_people.json");
    if (fs.existsSync(cp)) {
      const doc = JSON.parse(fs.readFileSync(cp, "utf8"));
      for (const p of doc.people || []) {
        const n = norm(p && (p.name || p.person_name || p.姓名));
        if (/^[\u4e00-\u9fa5]{2,4}$/.test(n)) persons.add(n);
      }
    }
  } catch { /* 同上 */ }
  return { places, persons };
}

const RE_YEAR = /(?:明|清|民国|元至元|洪武|永乐|万历|崇祯|康熙|雍正|乾隆|嘉庆|道光|咸丰|同治|光绪|宣统)\s?[二三三四五六七八九十百千\d]{1,6}\s?年|(?:1[6-9]|20)\d{2}\s?年/;
const RE_PLACE = /[\u4e00-\u9fa5]{2,4}(?:镇|村|桥|寺|庙|庵|观|河|浜|港|浦|塘|湾|泾|圩|路|街|巷|园|亭|塔|宅|祠|县|乡)/g;
// 负向断言：后面紧跟地理通名的一律不是人名（「朱家角镇」≠ 人物「朱家角」）。
const SURN = "王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾田董袁潘蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦方白邹孟熊秦江尹薛段雷侯龙史陶黎贺顾毛郝龚邵万钱严武戴莫孔向汤管虞郁卫翁华包戚章鲁葛苗项仇单路甘封查曲靳房解盛刁边成祁邢蓝涂左谷车柯骆耿聂关詹";
const RE_PERSON = new RegExp(`(?:${SURN})[\\u4e00-\\u9fa5]{1,2}(?![镇村桥寺庙庵观河浜港浦塘湾泾圩路街巷园亭塔宅祠县乡村])`, "g");
// ★ 上下文人名识别（2026-10-05）：社交/题赠类动词后的姓名才是真人物，
//   用于把「赠颜无咎/哭崔渊甫/访汪晋贤」等诗词 dedicatee 解析出来，同时避免「任教/任买办/万元」误判。
const CTX_VERBS = "赠寄怀挽哭送别访和答奉题为忆悼祭酬简呈饯陪饮怀与同示戏赋招讯谢贻唁寿贺";
const RE_PERSON_CTX = new RegExp(`([${CTX_VERBS}])\\s*([${SURN}][\\u4e00-\\u9fa5]{1,2})`, "g");
// ── 人名识别白名单 / 常识过滤（2026-10-06）────────────────────────────────
// 目标：把「白牛篇/有德/于是/在在/方言/严重/关注点/高品质/范工程/范区内」等现代汉语虚词、通用词、
//       地名残片退回"未解析候选"，不要强行解析。已解析人物只来自：① 词表(CBDB+收割作者)；② 通过本过滤的上下文识别名。
const PERSON_BLACKLIST = new Set([
  "于是", "在在", "有德", "严重", "关注点", "高品质", "白牛篇", "范工程", "范区内", "方言",
  "白牛", "关注", "品质", "工程", "区内", "黄酒", "单元层", "成果介", "周边古", "范区一",
]);
// 虚词 / 现代通用字（非姓氏、非人名用字）：人名含其一即判为"非人名"
const FV = new Set("有在是不了的们这那本个等及与和或为之以其此该各某何几无未能已将把从向对以而但因故也都很最太极真实全共同别只还又再才就却并虽既若如使令让叫请给替比跟管干做作看听见听说想知道得能会要可应该须必愿肯敢来去回出进起落死活病痛伤怕".split(""));
// 省级行政区前缀：用于拒绝「江苏青」「浙江X」这类"省名+字"假名
const PROVINCES = ["北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "台湾", "内蒙古", "广西", "西藏", "宁夏", "新疆", "香港", "澳门"];

/**
 * 片段级"描绘时间"判定（2026-10-06）：废止源级判定，逐片段按内容时间线索 + 载体默认。
 * - structYear：结构化条目的权威时间（如事件 begin 年）。有则优先。
 * - 文本含现代西历年(≥1949) → 现代(滤除)；含历史西历年(<1949)或朝代 → 历史(可进叙事)；
 * - 含历史语义标记（当年/曾经/古寺/大寺…）→ 历史；含现代语义（解放后/新中国…）→ 现代；
 * - 无任何时间线索：历史载体(方志/宗谱/古籍/诗词/事件…)默认历史，报刊(press)默认现代。
 */
export function fragDepiction(text, carrier, structYear = null) {
  const t = String(text || "");
  if (structYear != null) return { depiction_year: structYear, pre1949: structYear < 1949 };
  const yrs = [...t.matchAll(/(1[5-9]|20)\d{2}/g)].map((m) => +m[0]);
  const mod = yrs.filter((y) => y >= 1949);
  const hist = yrs.filter((y) => y < 1949 && y >= 1000);
  if (mod.length) return { depiction_year: Math.min(...mod), pre1949: false };
  if (hist.length) return { depiction_year: Math.max(...hist), pre1949: true };
  if (/(唐宋|明清|宋元|秦汉|魏晋|隋唐|宋明|元明|先秦|战国|春秋|南北朝|明|清|民国|唐|宋|元|汉|隋|晋|秦|金|辽|西夏)(代|朝|国|间|时|初|末|中|年)?|洪武|永乐|万历|崇祯|康熙|雍正|乾隆|嘉庆|道光|咸丰|同治|光绪|宣统/.test(t)) return { depiction_year: null, pre1949: true };
  if (/(当年|曾经|昔日|往昔|古寺|古桥|古墓|古塔|古址|旧址|遗迹|遗存|沧桑|历代|古老|旧时|古时|大寺|古刹|古庙)/.test(t)) return { depiction_year: null, pre1949: true };
  if (/(解放后|建国后|新中国|改革开放|人民公社|大跃进|文革|五十年代|六十年代|七十年代|八十年代|九十年代|本世纪|近年来|上世纪|现如今)/.test(t)) return { depiction_year: null, pre1949: false };
  return { depiction_year: null, pre1949: carrier !== "press" };
}
const RE_WORK = /[\u4e00-\u9fa5]{2,8}(?:志|记|录|集|谱|图|碑|传|诗文|钞|稿)/g;
// 机构：只收**通名明确**的（"堂/社/局/所/馆"单字通名会把整句吃进来，实测已污染候选）。
const RE_ORG = /[\u4e00-\u9fa5]{2,6}(?:书院|寺院|道观|教堂|学会|公所|博物馆|图书馆|教育馆|会馆|善堂|书局|印书馆)/g;
// 行政区划通名：用于识别「行政包含」这类平凡关系
const RE_ADMIN = /(?:省|市|自治区|地区|盟|州|区|县|旗|镇|乡|街道|村)$/;
// 句子碎片特征字：中文无空格，含虚词/动词/时间字的匹配几乎都是句子而非命名实体。
const FRAGMENT_CHARS = /[到在于和与的了是为把被从向由其之并而就也还将对该此有各每很太更最上下中前后时年月日之乎者也]/;
const isFragment = (s) => FRAGMENT_CHARS.test(String(s || ""));
const isHan = (c) => !!c && /[一-龥]/.test(c);
// 中文边界约束：匹配串若紧邻其他汉字，说明它只是更长词的一部分 → 丢弃（防"江府志"被切成人名）。
function matchBounded(text, re) {
  const out = [];
  for (const m of String(text || "").matchAll(re)) {
    const i = m.index || 0;
    if (isHan(text[i - 1]) || isHan(text[i + m[0].length])) continue;
    out.push(m[0]);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// D01 · research.source-inventory：盘点来源（载体 / 可读性 / 权利 / raw）
// ═══════════════════════════════════════════════════════════════════════════════
export async function d01Inventory({ run_id, files }) {
  const inv = [];
  const parsed = new Map(); // file -> doc（供 D02 复用，避免重复 IO）
  for (const file of files) {
    const p = path.join(FETCHED, file);
    const carrier = classify(file);
    let doc = null, readability = "unreadable", note = "";
    try {
      doc = JSON.parse(fs.readFileSync(p, "utf8"));
      const arr = ARR_KEYS.map((k) => doc && doc[k]).find((a) => Array.isArray(a));
      const textHits = extractText(doc, "$", [], 0).length;
      if (arr && arr.length > 0) { readability = "readable"; note = `数组 ${arr.length} 条`; }
      else if (textHits > 0) { readability = "readable"; note = `文本片段 ${textHits} 处`; }
      else { readability = "catalog_only"; note = "仅结构/目录，无正文"; }
    } catch (e) {
      readability = "unreadable";
      note = "JSON 解析失败：" + String((e && e.message) || e).slice(0, 60);
    }
    parsed.set(file, doc);
    inv.push({
      inventory_id: uuid(), run_id, source_ref: file, carrier_type: carrier,
      readability, rights_status: "unclear", raw_available: true,
      note: clip(note, 180),
    });
  }
  return { inv, parsed };
}

export function writeInventory(rows) {
  if (!rows.length) return [];
  return rows.map((r) => ({
    sql: `insert into research_source_inventory
            (inventory_id,run_id,source_ref,carrier_type,readability,rights_status,raw_available,note)
          values (:'id'::uuid,:'rid'::uuid,:'sr',:'ct',:'rd',:'rs',:'ra',:'nt')
          on conflict (run_id, source_ref) do nothing`,
    params: { id: r.inventory_id, rid: r.run_id, sr: r.source_ref, ct: r.carrier_type, rd: r.readability, rs: r.rights_status, ra: r.raw_available, nt: r.note },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D02 · research.content-observation：内容级读取（必须带 locator，标题级不算）
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 内容级 region（结构定位）：从 locator（JSON 路径）还原「载体内的结构区域」——
 * 顶层容器 key + 数组下标。与 locator（完整路径串）互补：locator 可机读回源，
 * region 给出「这段内容落在载体的哪一区」，满足 research.content-observation
 * 「每条 Observation 必须带 locator / region / uncertainty」的硬约束（2026-10-05 补）。
 * 纯结构派生，不做任何语义抽取（守「只读不抽」）。
 */
// ── D02 内容级"读懂"：克制归纳 + 结构化读取（协议 §5.4 / §6 / §10 A01） ──
// 规则法（extraction_method="rule_v2"），不调用 LLM；产出 normalized + actions/time/place/relation_signals/qualifiers。
// 目的：让 Observation 不再是"原文切片"，而是"材料记录了什么"的克制归纳 + 可关联信号（仍非事实断言）。
const CARRIER_SHORT = {
  clan_genealogy: "宗谱", gazetteer: "方志", old_book_fulltext: "古籍全文", poetry_person: "诗词人物",
  poetry_corpus: "诗词总集", heritage_protection: "文保名录", town_monograph: "镇志", narrative_candidate: "叙事候选",
  event_record: "事件记录", narrative_asset: "叙事资产", placename_gazetteer: "地名志", press: "报刊",
  image_catalog: "图像目录", historical_map: "舆图",
};
const TOPIC_RULES = [
  ["物产", /物产|土产|贡品|牲畜|六畜|谷|稻|棉|蚕|鱼盐|茶|果|蔬|农/],
  ["建置沿革", /建置|沿革|疆域|境域|郡|县治|州治|镇治|割隶|分防|徙治/],
  ["桥梁水利", /桥梁|津渡|堰闸|塘浦|河渠|水利|堤岸|港汊|津梁|圩/],
  ["寺观祠庙", /寺观|庙宇|庵|道观|寺院|祠|塔|教堂|殿宇/],
  ["风俗岁时", /风俗|岁时|节令|婚嫁|丧葬|祭祀|习尚|民俗|谣/],
  ["职官", /职官|知县|县丞|主簿|典史|巡检|教官|僚属|吏/],
  ["科举选举", /科举|进士|举人|贡生|童试|仕宦|科目|选举|及第/],
  ["户口赋税", /户口|赋税|徭役|田赋|粮|税课|地丁|亩/],
  ["艺文", /艺文|诗文|碑记|序跋|文集|著述|题咏|词/],
  ["灾异", /灾异|旱蝗|水灾|疫疠|兵燹|地震|饥荒|火灾|潦/],
  ["人物列传", /人物|名宦|乡贤|隐逸|流寓|列女|忠义|仕迹/],
  ["兵防", /兵防|营汛|寨堡|屯田|巡检司|武备|汛/],
  ["交通", /驿传|铺递|官道|航道|津渡|运漕|驿/],
];
// 动作二分（2026-10-05，2026-10-06 修正：生/置/设/分/增/减/隶 移入 A 类——避免牛羊"生羔"、物产"置/设"被算成叙事）：
//   A 类 编纂建制动词（撰/著/刻/刊/纂/题/记/任/增/减/分/割/隶/更/易/调/置/设/生 …）— 不计分
//   B 类 叙事动词（建/修/重修/重建/毁/迁/葬/捐/集散/贩运/兴修/浚治/停/废 …）— 才计分
const A_VERBS = ["撰", "著", "刻", "刊", "纂", "题", "记", "任", "擢", "授", "增", "减", "分", "割", "隶", "更", "易", "调", "辖", "改", "并", "置", "设", "生"];
const B_VERBS = ["创建", "重建", "重修", "兴修", "迁建", "新建", "修筑", "建筑", "开凿", "疏浚", "浚治", "修葺", "修", "设立", "设置", "建置", "废", "毁", "圮", "圮废", "倾颓", "敕建", "赐额", "迁", "徙", "葬", "卒", "捐", "集散", "贩运", "停"];
// 组合列表：长词优先（避免「修」抢在「重修」前），每项带分类标记
const ACTION_LEXICON = [
  ...B_VERBS.map((v) => ({ v, kind: "B" })),
  ...A_VERBS.map((v) => ({ v, kind: "A" })),
];
// DYN_RE 必须带 g 标志（供 matchAll 使用）
const DYN_RE = /(明|清|民国|元至元|洪武|永乐|万历|崇祯|康熙|雍正|乾隆|嘉庆|道光|咸丰|同治|光绪|宣统)\s?[二三三四五六七八九十百千\d]{1,6}\s?年|(?:1[6-9]|20)\d{2}\s?年|[宋元明清]\s?代?/g;
const QUALIFIER_RE = /(据说|传闻|俗传|相传|或然|疑|约|未详|失考|可能|殆|盖)/g;

function detectTopics(text) {
  const out = [];
  for (const [label, re] of TOPIC_RULES) if (re.test(text)) out.push(label);
  // ★ 每条 Observation 最多标 3 个实际命中的主题（2026-10-05：避免 13 个标签每源全贴、无区分力）
  return out.slice(0, 3);
}
function detectTime(text) {
  const out = [];
  for (const m of text.matchAll(DYN_RE)) out.push(m[0]);
  return [...new Set(out)].slice(0, 8);
}
// 动作短语：截取含动作谓词、长度受限的上下文窗口（保留"谁对什么做了什么"的线索）
// 每项带 kind（A=编纂建制不计分 / B=叙事计分）
// B 动词可读语境门（2026-10-06 追加）：竖排 OCR 错拼会留下"孤立单字"（两侧皆非汉字），
// 这类字不计 B 分（如 gj_14373 的 卒/捐/修/毁/停 误拼）。复合词自带语境，直接通过。
const isHanChar = (c) => c && /[一-龥]/.test(c);
function detectActions(text) {
  const out = [];
  const seen = new Set();
  for (const { v, kind } of ACTION_LEXICON) {
    if (seen.has(v)) continue;
    let idx = text.indexOf(v);
    if (idx < 0) continue;
    if (kind === "B" && v.length === 1) {
      let found = -1;
      while (idx >= 0) {
        const left = idx > 0 ? text[idx - 1] : "";
        const right = idx + v.length < text.length ? text[idx + v.length] : "";
        if (isHanChar(left) || isHanChar(right)) { found = idx; break; } // 至少一侧是汉字（嵌在词/句中）
        idx = text.indexOf(v, idx + v.length);
      }
      if (found < 0) continue; // 所有出现都是孤立 OCR 字 → 不计分
      idx = found;
    }
    seen.add(v);
    const start = Math.max(0, idx - 10), end = Math.min(text.length, idx + v.length + 10);
    out.push({ verb: v, kind, ctx: norm(text.slice(start, end)) });
    if (out.length >= 10) break;
  }
  return out;
}
function detectQualifiers(text) {
  const out = [];
  for (const m of text.matchAll(QUALIFIER_RE)) out.push(m[0]);
  return [...new Set(out)].slice(0, 6);
}

/**
 * 对单条原文片段做"克制归纳 + 结构化读取"。
 * 返回 { normalized, topics, actions, time_scope, place_scope, person_scope, relation_signals, qualifiers }。
 * 仅做规则抽取，不做事实断言；uncertainty 由调用方统一标注。
 */
export function readFragment(text, carrier, lexicon = { places: new Set(), persons: new Set() }) {
  const topics = detectTopics(text);
  const actions = detectActions(text);
  const time_scope = detectTime(text);
  const lp = lexicon.places instanceof Set ? lexicon.places : new Set();
  const pp = lexicon.persons instanceof Set ? lexicon.persons : new Set();
  const places = new Set(), persons = new Set();
  for (const w of lp) if (w.length >= 2 && text.includes(w)) places.add(w);
  for (const m of matchBounded(text, RE_PLACE)) if (!isFragment(m)) places.add(m);
  for (const w of pp) if (w.length >= 2 && text.includes(w)) persons.add(w);
  for (const m of matchBounded(text, RE_PERSON)) {
    if (isFragment(m) || /[后前时年月日]/.test(m)) continue;
    if ([...places].some((p) => p.includes(m) || m.includes(p))) continue;
    persons.add(m);
  }
  const place_scope = [...places].slice(0, 12).map((t) => ({ text: t, resolved: lp.has(t) }));
  const person_scope = [...persons].slice(0, 12).map((t) => ({ text: t, resolved: pp.has(t) }));
  const relation_signals = [];
  if (person_scope.length && place_scope.length) relation_signals.push("person_place_cooccur");
  if (actions.length) relation_signals.push("action_signal");
  if (time_scope.length) relation_signals.push("temporal_anchor");
  const qualifiers = detectQualifiers(text);
  const topicLabel = topics.length ? topics.join("·") : "杂记";
  const bits = [];
  if (place_scope.length) bits.push("地点 " + place_scope.slice(0, 6).map((p) => p.text).join("、"));
  if (actions.length) bits.push("动作 " + actions.slice(0, 5).map((a) => a.verb).join("、"));
  if (time_scope.length) bits.push("时间 " + time_scope.slice(0, 4).join("、"));
  const normalized = `「${CARRIER_SHORT[carrier] || carrier || "资料"}·${topicLabel}」记录：${bits.join("；") || "（未抽取到明确实体/动作）"}`;
  return { normalized, topics, actions, time_scope, place_scope, person_scope, relation_signals, qualifiers };
}

function regionOf(locator, carrier) {
  const m = String(locator || "").match(/^\$\.([A-Za-z0-9_]+)(?:\[(\d+)\])?/);
  const container = m ? m[1] : null;
  const index = m && m[2] != null ? Number(m[2]) : null;
  return { carrier, container, index };
}

export function d02Observations({ run_id, inv, parsed, maxPerSource = 500, maxObs = 20000, lexicon = { places: new Set(), persons: new Set() } }) {
  // ★ 轮转配额（2026-10-03 修 · 重要缺陷）：
  //   原实现按文件顺序取、撞到全局 maxObs 就 break —— 于是**字母序靠后的来源一条都没被读**
  //   （实测：commons_images 519 条 → 0 条；yutu_plaquettes 36 条 → 0 条）。
  //   这等于"素材就这么多"的假象。现改为多轮轮转：每轮每个来源各取一份，直到配额或素材用尽，
  //   保证**全部可读来源都被覆盖**。
  const ROUNDS = 8;
  const carrierOf = new Map(inv.map((s) => [s.source_ref, s.carrier_type]));
  const pools = new Map();
  for (const s of inv) {
    if (s.readability !== "readable") continue;
    if (isVisual(carrierOf.get(s.source_ref))) continue; // 2026-10-04 收紧：视觉载体无正文段落，不进共现池（降标题级噪声）
    const doc = parsed.get(s.source_ref);
    if (doc == null) continue;
    const hits = extractText(doc, "$", [], 0);
    if (hits.length) pools.set(s.source_ref, hits);
  }
  const bySource = {};
  const fragsBySource = {};
  for (const k of pools.keys()) { bySource[k] = 0; fragsBySource[k] = pools.get(k).length; }

  const obs = [];
  const perRound = Math.max(1, Math.ceil(maxPerSource / ROUNDS));
  for (let r = 0; r < ROUNDS && obs.length < maxObs; r++) {
    for (const [src, hits] of pools) {
      if (obs.length >= maxObs) break;
      const taken = bySource[src];
      if (taken >= maxPerSource || taken >= hits.length) continue;
      for (const h of hits.slice(taken, taken + perRound)) {
        if (obs.length >= maxObs) break;
        if (bySource[src] >= maxPerSource) break; // 严格不越界，避免末轮切片超出配额导致覆盖率虚高
        const reading = readFragment(h.text, carrierOf.get(src), lexicon); // 协议 §5.4/§6：克制归纳 + 结构化读取
        const dep = fragDepiction(h.text, carrierOf.get(src), null); // ★ 片段级描绘时间（2026-10-06）
        obs.push({
          observation_id: uuid(), run_id,
          source_id: src,               // 研究区内来源标识（legacy 文件 key）
          locator: h.p,                 // ★ 内容级定位：JSON 路径，可回源到具体条目/字段
          region: regionOf(h.p, carrierOf.get(src)), // ★ 结构区域（顶层容器 + 下标 + 载体）
          modality: isVisual(carrierOf.get(src)) ? "map_image" : "text",
          excerpt: clip(h.text, 600),
          normalized_observation: reading.normalized, // ★ 克制归纳（不再是原文截断）
          reading,                      // ★ 结构化读取：topics/actions/time_scope/place_scope/relation_signals/qualifiers
          formation_time: null,          // 文本源形成时间（成书/修志年代）未知
          depiction_year: dep.depiction_year, depiction_pre1949: dep.pre1949, // ★ 片段级描绘时间
          extraction_method: "rule_v2",
          uncertainty: "legacy 预抓取快照；规则法读取(rule_v2)，未回原始载体核对，非事实断言",
          association_readiness: (reading.actions.length || reading.relation_signals.length || h.text.length >= 40) ? "ready" : "limited",
        });
        bySource[src]++;
      }
    }
  }
  return { obs, bySource, fragsBySource };
}

export function writeObservations(rows) {
  return rows.map((r) => ({
    sql: `insert into research_observation
            (observation_id,run_id,source_id,locator,region,modality,excerpt,normalized_observation,uncertainty,association_readiness)
          values (:'id'::uuid,:'rid'::uuid,:'sid',:'lc',:'rg'::jsonb,:'md',:'ex',:'no',:'un',:'ar')`,
    params: { id: r.observation_id, rid: r.run_id, sid: r.source_id, lc: r.locator, rg: JSON.stringify(r.region), md: r.modality, ex: r.excerpt, no: r.normalized_observation, un: r.uncertainty, ar: r.association_readiness },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D03 · research.mention / research_source_dependency
//      允许 unresolved；**不制造 unknown Entity**；转引/同源必须登记为 dependency。
// ═══════════════════════════════════════════════════════════════════════════════
export function d03Mentions({ run_id, obs, lexicon = { places: new Set(), persons: new Set() } }) {
  const places = lexicon.places instanceof Set ? lexicon.places : new Set();
  const persons = lexicon.persons instanceof Set ? lexicon.persons : new Set();
  // 地名单词前缀（去掉区/市/省…尾字）：用于排除「徐汇公」「青浦区X」这类"地名残片+后缀"的假人名
  const placeBases = new Set();
  for (const p of places) { const b = p.replace(/(区|市|省|县|镇|乡|街道|村)$/, ""); if (b.length >= 2) placeBases.add(b); }
  const isPlaceName = (nm) => { for (const b of placeBases) if (nm === b || nm.startsWith(b) || b.startsWith(nm)) return true; return false; };
  // 人名尾字黑名单：机构/地名通名后缀，几乎不可能是人名（排除「石拱洞/徐汇公」等）
  const BAD_PERSON_TAIL = /(区|市|省|县|镇|乡|村|桥|寺|庙|庵|观|河|浜|港|浦|塘|湾|泾|圩|路|街|巷|园|亭|塔|宅|祠|里|门|楼|房|院|库|所|部|处|局|科|班|队|社|团|会|馆|店|厂|校|堂|庄|场|站|台|洞|篇|牛|羊|马|猪|鱼|鸟|虫|花|草|树|石|水|火|山|田|工|程|区|内|质|品|关|注|重)$/;
  // ★ 人名白名单校验（2026-10-06）：通过才视为"可解析人名"，否则退回未解析候选。
  const isLikelyName = (nm) => {
    if (!nm || nm.length < 2 || nm.length > 3) return false;
    if (PERSON_BLACKLIST.has(nm)) return false;
    if (FV.has(nm[0]) || FV.has(nm[1]) || (nm[2] && FV.has(nm[2]))) return false; // 含虚词/现代通用字
    if (BAD_PERSON_TAIL.test(nm)) return false;
    if (isPlaceName(nm)) return false;                       // 地名残片（徐汇公…）
    if (PROVINCES.some((p) => nm.startsWith(p))) return false; // 省级前缀（江苏青…）
    return true;
  };
  const mentions = [];
  const excerptMap = new Map(); // 归一化文本 -> [source_id...]（用于 dependency）
  // ── 中文边界约束 ────────────────────────────────────────────────────────────
// 中文没有空格，正则很容易切出碎片：从「松江府志」里切出人物「江府志」、
// 从「该堂位于青浦县朱家角镇」里切出地名「县朱家角镇」。
// 规则：匹配串若**紧邻**其他汉字，说明它只是更长词的一部分 → 丢弃（词表命中不受影响，
// 因为词表给的是完整词）。这是首轮实测最主要的噪声来源。

// 单一 Observation 的 mention 上限：一段材料里列出 30 个"地名"不产生知识，只产生噪声。
  const MENTION_PER_OBS = 6;
  for (const o of obs) {
    const text = o.excerpt || "";
    const cand = new Map();
    // how: "lexicon"(命中词表) | "regex"(正则兜底·未解析) | "recognized"(人名识别规则·待人工核验)
    const add = (txt, type, resolved, how) => {
      const key = type + ":" + txt;
      const prev = cand.get(key);
      const howv = how || (resolved ? "lexicon" : "regex");
      if (!prev) cand.set(key, { txt, type, resolved, how: howv });
      else if (resolved && !prev.resolved) cand.set(key, { txt, type, resolved: true, how: howv });
    };
    // ① 地点（词表优先 → 正则兜底）。词表已强制上海行政区划校验，非沪地名不再误标 ✓。
    //    镇级（镇/乡/村）名称只接受词表精确命中，正则兜底一律按未解析处理（防「金泽镇」被拆/误判）。
    for (const w of places) if (w.length >= 2 && text.includes(w)) add(w, "place", true, "lexicon");
    for (const m of matchBounded(text, RE_PLACE)) {
      if (!isFragment(m)) add(m, "place", false, "regex");
    }
    const placeTexts = [...cand.values()].filter((v) => v.type === "place").map((v) => v.txt);
    // ② 人物：与已识别地名重叠者不是人（「朱家角」⊂「朱家角镇」）；含时间字者不是人（「解放后」）
    for (const w of persons) if (w.length >= 2 && text.includes(w) && !isPlaceName(w)) add(w, "person", true, "lexicon");
    // ②a 上下文识别：社交/题赠动词后的姓名（赠X/哭X/访X…）是真人物，但直接解析需通过白名单校验；
    //     不通过（现代汉语虚词/通用词/地名残片）则退回未解析候选，不强行解析。
    for (const cm of text.matchAll(RE_PERSON_CTX)) {
      const nm = cm[2];
      if (!nm || nm.length < 2 || nm.length > 3) continue;
      if (isFragment(nm) || BAD_PERSON_TAIL.test(nm) || /[后前时年月日]/.test(nm)) continue;
      if (isPlaceName(nm)) continue; // 「徐汇公」等地名残片
      if (placeTexts.some((p) => p.includes(nm) || nm.includes(p))) continue;
      if (isLikelyName(nm)) add(nm, "person", true, persons.has(nm) ? "lexicon" : "recognized");
      else add(nm, "person", false, "regex"); // 退回未解析候选（待 D05 人文核验）
    }
    // ②b 其余 RE_PERSON 裸匹配：命中词表则解析；白名单内的非词表名作未解析候选；
    //     明显的假名（虚词/地名残片）直接丢弃，不污染候选池。
    for (const m of matchBounded(text, RE_PERSON)) {
      if (isFragment(m) || BAD_PERSON_TAIL.test(m) || /[后前时年月日]/.test(m)) continue;
      if (m.length < 2 || m.length > 3) continue;
      if (isPlaceName(m)) continue;
      if (placeTexts.some((p) => p.includes(m) || m.includes(p))) continue;
      if (persons.has(m)) { add(m, "person", true, "lexicon"); continue; }
      if (isLikelyName(m)) add(m, "person", false, "regex"); // 白名单内的非词表名 → 未解析候选
      // 既不命中词表、又不过白名单 → 直接丢弃（不当人名、也不当候选）
    }
    // ③ 作品 / 机构
    for (const m of matchBounded(text, RE_WORK)) if (!isFragment(m)) add(m, "work", false, "regex");
    for (const m of matchBounded(text, RE_ORG)) if (!isFragment(m)) add(m, "organization", false, "regex");

    // 排序取优：resolved 优先，其次**词长降序** —— 让「朱家角」胜出，而不是被「上海」淹没。
    const picked = [...cand.values()]
      .sort((a, b) => (Number(b.resolved) - Number(a.resolved)) || (b.txt.length - a.txt.length))
      .slice(0, MENTION_PER_OBS);
    for (const p of picked) {
      mentions.push({
        mention_id: uuid(), run_id, observation_id: o.observation_id,
        mention_text: clip(p.txt, 60), mention_type: p.type,
        resolution: p.resolved ? "resolved" : "unresolved",
        resolved_entity_id: null,   // ★ 研究态不写 Entity；解析只做标记
        note: p.how === "lexicon" ? "命中 legacy 词表（地名/人物）"
            : p.how === "recognized" ? "人名识别(规则·待人工核验)"
            : "未解析（保持 unresolved，不造 Entity）",
      });
    }

    // dependency 线索：同一段文字出现在多个来源 → same_origin（防止 5 篇转引算 5 个来源）
    const key = norm(text).slice(0, 120);
    if (key.length >= 40) {
      if (!excerptMap.has(key)) excerptMap.set(key, new Set());
      excerptMap.get(key).add(o.source_id);
    }
  }
  const deps = [];
  for (const [, sources] of excerptMap) {
    if (sources.size < 2) continue;
    const arr = [...sources].slice(0, 6);
    for (let i = 1; i < arr.length; i++) {
      deps.push({
        dependency_id: uuid(), run_id, source_id: arr[0], depends_on_source_id: arr[i],
        dependency_type: "same_origin",
        note: "相同文本片段出现在多个来源（转引/同源），不得计为独立来源",
      });
    }
  }
  return { mentions, deps };
}

export function writeMentions(rows) {
  return rows.map((r) => ({
    sql: `insert into research_mention
            (mention_id,run_id,observation_id,mention_text,mention_type,resolution,resolved_entity_id,note)
          values (:'id'::uuid,:'rid'::uuid,:'oid'::uuid,:'mt',:'ty',:'rs',NULL::uuid,:'nt')`,
    params: { id: r.mention_id, rid: r.run_id, oid: r.observation_id, mt: r.mention_text, ty: r.mention_type, rs: r.resolution, nt: r.note },
  }));
}

export function writeDependencies(rows) {
  return rows.map((r) => ({
    sql: `insert into research_source_dependency
            (dependency_id,run_id,source_id,depends_on_source_id,dependency_type,note)
          values (:'id'::uuid,:'rid'::uuid,:'sid',:'ds',:'dt',:'nt')
          on conflict (source_id, depends_on_source_id, dependency_type) do nothing`,
    params: { id: r.dependency_id, rid: r.run_id, sid: r.source_id, ds: r.depends_on_source_id, dt: r.dependency_type, nt: r.note },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D04 · research_signal / research_association_candidate（A01–A12 的简化可回放实现）
//      反噪声：near / same_source / mentioned_in / title-only / embedding-only
//      不得单独形成高优先候选 —— 单来源候选的 AVS 被强制压到 34 以下（不进 Review）。
// ═══════════════════════════════════════════════════════════════════════════════
export function d04Association({ run_id, obs, mentions }) {
  const mentionByObs = new Map();
  for (const m of mentions) {
    if (!mentionByObs.has(m.observation_id)) mentionByObs.set(m.observation_id, []);
    mentionByObs.get(m.observation_id).push(m);
  }
  const obsById = new Map(obs.map((o) => [o.observation_id, o]));
  const pairMap = new Map(); // key -> {subject, object, obsIds, sources, types}

  for (const [oid, ms] of mentionByObs) {
    const o = obsById.get(oid);
    if (!o) continue;
    const uniq = [...new Map(ms.map((m) => [m.mention_type + ":" + m.mention_text, m])).values()];
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        const a = uniq[i], b = uniq[j];
        if (a.mention_text === b.mention_text) continue;
        const [x, y] = [a, b].sort((p, q) => (p.mention_text < q.mention_text ? -1 : 1));
        const key = `${x.mention_type}:${x.mention_text}|${y.mention_type}:${y.mention_text}`;
        if (!pairMap.has(key)) pairMap.set(key, { x, y, obsIds: [], sources: new Set(), hasYear: false, hasNarr: false, sample: "" });
        const rec = pairMap.get(key);
        rec.obsIds.push(oid);
        rec.sources.add(o.source_id);
        if (RE_YEAR.test(o.excerpt || "")) rec.hasYear = true;
        // ★ B 类叙事动作（建/修/毁/迁…）出现 → 该共现带叙事实据（2026-10-05 计分层）
        const acts = o.reading && o.reading.actions;
        if (acts && acts.some((a) => a.kind === "B")) rec.hasNarr = true;
        if (!rec.sample) rec.sample = clip(o.excerpt, 160);
      }
    }
  }

  const signals = [];
  const candidates = [];
  for (const [, rec] of pairMap) {
    const nObs = rec.obsIds.length;
    const nSrc = rec.sources.size;
    const types = new Set([rec.x.mention_type, rec.y.mention_type]);
    // 信号族（可回放：signal_code + detail 记录依据）
    const codes = ["A01_CO_OCCURRENCE"];
    if (nSrc > 1) codes.push("A05_CROSS_SOURCE");
    if (types.has("person") && types.has("place")) codes.push("A03_PERSON_PLACE");
    if (rec.x.mention_type === "place" && rec.y.mention_type === "place") codes.push("A04_PLACE_PLACE");
    if (types.has("work") && types.has("person")) codes.push("A07_WORK_PERSON");
    if (rec.hasYear) codes.push("A06_TEMPORAL_ANCHOR");
    if (rec.hasNarr) codes.push("A08_NARRATIVE_ACTION");

    // AVS（可解释分量）
    let score = 10 * Math.min(nObs, 5) + 20 * (nSrc - 1);
    if (types.has("person") && types.has("place")) score += 10;
    if (rec.x.mention_type === "place" && rec.y.mention_type === "place") score += 6;
    if (types.has("work") && types.has("person")) score += 8;
    if (rec.hasYear) score += 6;
    if (rec.hasNarr) score += 5; // ★ B 类叙事动作才计分（A 类编纂建制动词不计分）
    const counter = [];
    // 偶然共现：跨了 N 个来源却总共只出现 N 次（每源一次）—— 不构成稳定关系，只是词表太宽。
    if (nSrc > 1 && nObs <= nSrc) {
      counter.push({ code: "INCIDENTAL_CO_OCCURRENCE", note: `跨 ${nSrc} 个来源但共现仅 ${nObs} 次（每源一次），属偶然共现` });
      score -= 15;
    }
    if (rec.x.resolution !== "resolved" && rec.y.resolution !== "resolved") {
      counter.push({ code: "UNRESOLVED_BOTH", note: "双方 mention 均未解析，可信度低" });
      score -= 10;
    }
    // 同指/上下位：「金泽 ↔ 金泽镇」是同一个对象的两种写法，不是两个对象之间的关系
    if (rec.x.mention_text !== rec.y.mention_text &&
        (rec.x.mention_text.includes(rec.y.mention_text) || rec.y.mention_text.includes(rec.x.mention_text))) {
      counter.push({ code: "COREF_SUBSTRING", note: "一方是另一方的子串（同指/上下位），不构成两个对象间的新关系" });
      score = Math.min(score, 40);
    }
    // 平凡行政关系：「上海市 ↔ 松江区」这类行政包含不是发现，是常识（G-LINK 非平凡性）
    if (rec.x.mention_type === "place" && rec.y.mention_type === "place" &&
        RE_ADMIN.test(rec.x.mention_text) && RE_ADMIN.test(rec.y.mention_text)) {
      counter.push({ code: "TRIVIAL_ADMIN_RELATION", note: "双方均为行政区划通名结尾，属行政包含，非新发现" });
      score = Math.min(score, 30); // 行政包含不是发现：直接压到候选线以下
    }
    // ★ 反噪声：单来源（same_source_only）不得形成高优先候选
    if (nSrc === 1) { counter.push({ code: "SAME_SOURCE_ONLY", note: "仅在同一来源内出现，不得单独作为高优先依据" }); score = Math.min(score, 34); }
    if (nObs === 1) { counter.push({ code: "SINGLE_OCCURRENCE", note: "仅 1 次共现，证据极弱" }); score = Math.min(score, 25); }
    if (nSrc === 1 && nObs === 1) score = Math.min(score, 20);
    score = Math.max(0, Math.min(100, Math.round(score)));

    const candidate_id = uuid();
    const subject_ref = `${rec.x.mention_type}:${rec.x.mention_text}`;
    const object_ref = `${rec.y.mention_type}:${rec.y.mention_text}`;
    const pairType = [...types].sort().join("+");

    signals.push({
      signal_id: uuid(), run_id, signal_code: codes[codes.length - 1],
      subject_ref, object_ref, observation_ids: rec.obsIds.slice(0, 20),
      strength: Number((Math.min(nObs, 10) / 10).toFixed(2)),
      detail: { codes, distinct_sources: nSrc, observations: nObs, pair_type: pairType },
    });

    candidates.push({
      candidate_id, run_id, subject_ref, object_ref,
      supporting_signals: codes.map((c) => ({ code: c, n_observations: nObs, n_sources: nSrc })),
      counter_signals: counter,
      avs: { occurrence: Math.min(nObs, 5), cross_source: nSrc - 1, pair_type: pairType, temporal: rec.hasYear },
      avs_score: score,
      why_interesting: `${pairType} 共现 ${nObs} 次、跨 ${nSrc} 个来源${rec.hasYear ? "，含年代锚点" : ""}；样例：${rec.sample}`,
      missing_evidence: `缺 S1 原始方志/图籍可定位证据；未核对 ${rec.x.mention_text} 与 ${rec.y.mention_text} 的时空沿革`,
      next_search_tasks: [
        `在方志/寺志中检索「${rec.x.mention_text}」与「${rec.y.mention_text}」的同现记载`,
        `核对两者的地理位置与年代范围，确认是否同一时空`,
        `确认是否有独立来源（当前独立来源 ${nSrc} 个）`,
      ],
      association_readiness: nSrc > 1 && nObs >= 2 ? "ready" : "limited",
      disposition: "long_tail", promoted: false,
      _sample: rec.sample, _nSrc: nSrc, _nObs: nObs,
    });
  }
  return { signals, candidates };
}

export function writeSignals(rows) {
  return rows.map((r) => ({
    sql: `insert into research_signal (signal_id,run_id,signal_code,subject_ref,object_ref,observation_ids,strength,detail)
          values (:'id'::uuid,:'rid'::uuid,:'sc',:'sb',:'ob',:'oi'::jsonb,:'st'::numeric,:'dt'::jsonb)`,
    params: { id: r.signal_id, rid: r.run_id, sc: r.signal_code, sb: r.subject_ref, ob: r.object_ref, oi: JSON.stringify(r.observation_ids), st: r.strength, dt: JSON.stringify(r.detail) },
  }));
}

export function writeCandidates(rows) {
  return rows.map((r) => ({
    sql: `insert into research_association_candidate
            (candidate_id,run_id,subject_ref,object_ref,supporting_signals,counter_signals,avs,avs_score,
             why_interesting,missing_evidence,next_search_tasks,association_readiness,disposition,promoted)
          values (:'id'::uuid,:'rid'::uuid,:'sb',:'ob',:'ss'::jsonb,:'cs'::jsonb,:'av'::jsonb,:'sc'::numeric,
                  :'wi',:'me',:'nt'::jsonb,:'ar',:'dp',false)
          on conflict (run_id, subject_ref, object_ref) do nothing`,
    params: {
      id: r.candidate_id, rid: r.run_id, sb: r.subject_ref, ob: r.object_ref,
      ss: JSON.stringify(r.supporting_signals), cs: JSON.stringify(r.counter_signals),
      av: JSON.stringify(r.avs), sc: r.avs_score, wi: r.why_interesting, me: r.missing_evidence,
      nt: JSON.stringify(r.next_search_tasks), ar: r.association_readiness, dp: r.disposition,
    },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D05 · research.humanistic-selection：AVS 分层 + 长尾机器处置
//      <35 仅保留 Signal ｜ 35–54 Candidate ｜ 55–69 可进 Discovery Review ｜ ≥70 Priority
//      ★ 只有 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 允许挂分诊行；
//        首轮不创建 review_queue（避免用新机制重建人工债务），Selected 转入 research_task。
// ═══════════════════════════════════════════════════════════════════════════════
export function d05Selection({ run_id, candidates, topK = 20 }) {
  const sorted = [...candidates].sort((a, b) => (b.avs_score - a.avs_score) || a.subject_ref.localeCompare(b.subject_ref));
  const selected = sorted.filter((c) => c.avs_score >= 35).slice(0, topK);
  const tasks = [];
  for (const c of selected) {
    c.disposition = c.avs_score >= 70 ? "truth_promotion" : "selected";
    tasks.push({
      task_id: uuid(), run_id, candidate_id: c.candidate_id,
      task_type: "directed_research", target_ref: `${c.subject_ref} ↔ ${c.object_ref}`,
      priority: c.avs_score, note: `AVS ${c.avs_score}：${clip(c.why_interesting, 160)}`,
      status: "open",
    });
  }
  const buckets = {
    priority: sorted.filter((c) => c.avs_score >= 70).length,
    review: sorted.filter((c) => c.avs_score >= 55 && c.avs_score < 70).length,
    candidate: sorted.filter((c) => c.avs_score >= 35 && c.avs_score < 55).length,
    signal_only: sorted.filter((c) => c.avs_score < 35).length,
  };
  return { selected, tasks, buckets, sorted };
}

export function writeTasks(rows) {
  return rows.map((r) => ({
    sql: `insert into research_task (task_id,run_id,candidate_id,task_type,target_ref,priority,note,status)
          values (:'id'::uuid,:'rid'::uuid,:'cid'::uuid,:'tt',:'tr',:'pr'::int,:'nt',:'st')`,
    params: { id: r.task_id, rid: r.run_id, cid: r.candidate_id, tt: r.task_type, tr: r.target_ref, pr: r.priority, nt: r.note, st: r.status },
  }));
}

/** 批量落库（调用方已确认 write=true 且 write_scope 校验通过）。 */
export async function persist(items) {
  if (!items.length) return 0;
  // 分批：单批过大时 psql 单文件会过重。
  const BATCH = 400;
  let n = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    await runMany(items.slice(i, i + BATCH));
    n += Math.min(BATCH, items.length - i);
  }
  return n;
}

/** 读取本 run 的候选（供报告与精选后核对）。 */
export async function loadCandidates(run_id) {
  return queryRows(
    `select candidate_id, subject_ref, object_ref, avs_score, disposition, why_interesting
       from research_association_candidate where run_id = :'rid'::uuid
      order by avs_score desc nulls last limit 50`,
    { rid: run_id }
  );
}
