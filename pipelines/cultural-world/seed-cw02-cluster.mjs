// pipelines/cultural-world/seed-cw02-cluster.mjs
//
// CULTURAL-WORLD-02 · First Living Cultural Relation Cluster —— 唯一写库入口（STEP 3 + AD-02/04/05/06）。
//
// 纪律（继承 TASK-0010 四件套范式）：
//  · PG 是唯一真源；确定性 UUID + ON CONFLICT DO NOTHING（幂等，重跑 created=0）。
//  · 不新建 Evidence（仅复用既有行，并按 AD-04 提升 verification_status candidate→evidence_linked）。
//  · 不触碰 Legacy（hushang-jingwei 只读）。
//  · 数组 / jsonb 一律在 JS 端序列化为 SQL 字面量（沿用 build 脚本的 pgTextArray/pgJson 约定，
//    因为 data-access 的参数占位不处理数组/jsonb）。
//  · 外键以 feature_key(text) 寻址且 nullable，为 ExternalCulturalNode 留路（本轮不施工）。
//
// 本脚本负责：
//   AD-02：relations 新增颐浩寺→former_site_of→吕颐浩，并修正 hsr.f4b9bcad 的 existing_relation_id 指向它
//          （原 吕颐浩→mentioned_in→颐浩寺 不删不改）。
//   AD-04：把本簇相关 Evidence 由 candidate 提升至 evidence_linked（记录依据，不进 evidence_gate_audit）。
//   AD-05：evidence_fragments（b24576ed 拆 hr4_usable / u10_forbidden 两片）。
//   AD-06：cultural_conflicts（1265 vs 1267 结构化互指）。
//   STEP 3：cultural_events / cultural_relation_claims / cultural_meaning_candidates / cultural_present_connections。

import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

// ---- 确定性 UUID (sha256 → uuid v4) ----
function det(seed) {
  const h = crypto.createHash("sha256").update(seed, "utf8").digest();
  const b = Buffer.from(h.slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}

// ---- SQL 字面量序列化（沿用 build 脚本约定）----
const esc = (v) => {
  if (v === null || v === undefined) return "NULL";
  return `E'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
};
// 注意：本脚本把数组直接内联进 SQL（不走 :'name' 参数占位），所以必须生成
// 带引号与类型转换的合法 PostgreSQL 数组字面量（bare {} 会语法报错）。
const tarr = (a) => {
  const arr = a || [];
  return arr.length
    ? `ARRAY[${arr.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(",")}]::text[]`
    : "'{}'::text[]";
};
const uarr = (a) => {
  const arr = a || [];
  return arr.length ? `ARRAY[${arr.map((x) => `'${x}'`).join(",")}]::uuid[]` : "'{}'::uuid[]";
};
const jb = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const u = (seed) => `'${det(seed)}'::uuid`;
// uid：已是确定 uuid 字符串（直接包成 ::uuid），不要再次 det() 哈希。
// 重要：existing_relation_id 传入的是「已算好的 uuid」（NEW_REL_FORMER_SITE / REL_* 字面量），
// 若误用 u() 会被二次哈希成另一个 uuid → 外键约束失败。故此处必须用 uid()。
const uid = (x) => `'${x}'::uuid`;

// ---- 锚点常量 ----
const SLICE = "jinze-minimum-slice-001";
const FK_YIHAO = "jinze-min-001/feature/yihaosi-site";
const FK_LYIH = "jinze-min-001/feature/lvyihao";
const FK_PUJI = "jinze-min-001/feature/pujiqiao";
const FK_WANAN = "jinze-min-001/feature/wananqiao";
const FK_JINZE = "jinze-min-001/feature/jinzetang";
const EID_YIHAO = "f9b41231-e064-4a84-b463-1825776f4da4";
const EID_LYIH = "6db1f52e-606a-4b76-b14f-3af9d2f1dde4";
const EID_PUJI = "2feb8aed-dd98-4ec1-9c71-84587a0a6049";
const EID_WANAN = "6e1ac7fd-269a-4589-9a24-5aee83a30559";
const HSR_FORMER_SITE = "f4b9bcad-9c13-4500-a87d-99db84589d4a";
const REL_NAMED_AFTER = "fdd974db-fef6-491d-88da-7450382343ca";
const REL_WANAN_PUJI = "b473e29f-a46a-4a3a-b49a-3538a3d52139";
const REL_PUJI_WANAN = "08093494-347d-4cda-afb5-b3b7eda9076f";

// ---- AD-04：本簇相关 Evidence 提升清单（已 live 校验确属本簇关系/特征支撑证据）----
const EVIDENCE_UPGRADE = [
  // 颐浩寺核心 6
  "b24576ed-1efa-40ac-9cec-45484c382b0b",
  "12c2fc28-ce98-4cb3-b395-13049e7c387c",
  "b4c2a239-3b06-4440-8e7e-1da7dd664121",
  "faadce12-0ee1-434a-8f8f-bc24d93f9c59",
  "deafbd03-d821-4b26-9de1-b366605f5084",
  "1bff151e-5bb2-498a-a56e-fd0e8b03b103",
  // 桥 / 水道共享证据
  "02190cbd-7e73-439e-ac8b-742b42f6863f",
  "87ca8734-9fb2-4846-96be-971b55bae144",
  "04ee5f86-7471-4f12-8416-9616143f3982",
  "0072b791-f791-424e-8333-98a4390d96f2",
  "612dca76-4986-4ae6-83d0-c83b1cc25c1a",
  "f4a491f8-9ec3-4440-85bf-a837059eb9ba",
  "2c905d56-76de-4d0b-8b8a-0b77f222864a",
  "70e7981e-36b1-4162-8e0e-496c8cefb93f",
  "a3132fa1-ec7a-4694-b167-20e2a01348a1",
  "020b8bcf-bf84-4d37-8312-66194ad09f23",
  "af39958e-8672-4036-87b0-0d6e6d58618a",
  "e4ea7c8d-1d7e-4d1b-832b-2495a823f312",
  "c79b0580-5a1e-40bd-8459-0f9d6fed75d9",
  "9eb29e06-8016-4661-b12e-b55e7a2efa1a",
];

// ---- before 快照 ----
const before = {};
for (const t of [
  "cultural_events", "cultural_relation_claims", "cultural_meaning_candidates",
  "cultural_present_connections", "evidence_fragments", "cultural_conflicts",
]) {
  before[t] = Number(await queryValue(`select count(*)::text c from ${t}`));
}
before.relations = Number(await queryValue(`select count(*)::text c from relations`));
before.evidence_linked = Number(await queryValue(`select count(*)::text c from evidence where verification_status::text='evidence_linked'`));
before.evidence_candidate = Number(await queryValue(`select count(*)::text c from evidence where verification_status::text='candidate'`));

// ---- 前置：008 表必须存在 ----
const tblOk = await queryValue(
  `select count(*)::text c from information_schema.tables where table_schema='public' and table_name='cultural_relation_claims'`
);
if (Number(tblOk) !== 1) throw new Error("008 migration 未应用：缺少 cultural_relation_claims");

// ===== 幂等清理：删除本 slice 旧孤儿行（含上轮双重前缀错 ID），统一以正确 ID 重插 =====
// 008 六表仅本脚本写入；但 evidence_fragments / cultural_conflicts 均无 slice_id 列：
//   · evidence_fragments 以 fragment_id 寻址，且其 ID 从未受双重前缀 bug 影响（本就正确），
//     故保留不动，INSERT 用 ON CONFLICT DO NOTHING 幂等补挂新片段即可；
//   · cultural_conflicts 以 conflict_key 唯一寻址，单独按 key 清理。
// 仅删除含 slice_id 的四张表（events/claims/meanings/presents），其旧行是双重前缀错 ID 孤儿。
for (const t of [
  "cultural_present_connections", "cultural_meaning_candidates",
  "cultural_relation_claims", "cultural_events",
]) {
  await run(`DELETE FROM ${t} WHERE slice_id=${esc(SLICE)};`);
}
await run(`DELETE FROM cultural_conflicts WHERE conflict_key='pujiqiao-build-year-1265-1267';`);

// ===== AD-02：新增 relations former_site_of + 修正 hsr 指针 =====
const NEW_REL_FORMER_SITE = det("rel:cw02:yihaosi-former-site-of-lvyihao");
await run(
  `INSERT INTO relations(relation_id, subject_id, predicate, object_id, valid_from, valid_to, confidence, status, legacy_id)
   VALUES (${u("rel:cw02:yihaosi-former-site-of-lvyihao")}, ${esc(EID_YIHAO)}::uuid, 'former_site_of', ${esc(EID_LYIH)}::uuid, '', '', 0, 'candidate', '')
   ON CONFLICT (relation_id) DO NOTHING;`
);
await run(
  `UPDATE historical_spatial_relations SET existing_relation_id=${u("rel:cw02:yihaosi-former-site-of-lvyihao")}
   WHERE hs_relation_id=${esc(HSR_FORMER_SITE)}::uuid;`
);

// ===== AD-04：提升 Evidence candidate → evidence_linked =====
const upgradeLog = [];
for (const id of EVIDENCE_UPGRADE) {
  const cur = await queryValue(`select verification_status::text s from evidence where evidence_id=:'id'::uuid`, { id });
  if (cur === "candidate") {
    await run(`UPDATE evidence SET verification_status='evidence_linked'::verification_status WHERE evidence_id='${id}'::uuid`);
    upgradeLog.push({ id, from: "candidate", to: "evidence_linked", reason: "AD-04: 01C 人工裁决 + Claim scope 可由该 Evidence 精确支持" });
  } else {
    upgradeLog.push({ id, from: cur, to: cur, note: "非 candidate，跳过（幂等）" });
  }
}

// ===== 组装所有 INSERT 语句（确定性 UUID + 字面量）=====
const stmts = [];

// ---- AD-05: evidence_fragments ----
const FRAGS = [
  ["ef:b245:hr4:home", "b24576ed-1efa-40ac-9cec-45484c382b0b", "hr4_usable", "寺址即其故宅", "颐浩寺 former_site_of 吕颐浩（HR-4）", "AD-05 精确放行片段"],
  ["ef:b245:hr4:name", "b24576ed-1efa-40ac-9cec-45484c382b0b", "hr4_usable", "南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人", "颐浩寺 named_after 吕颐浩（HR-4）", "AD-05 精确放行片段"],
  ["ef:b245:u10", "b24576ed-1efa-40ac-9cec-45484c382b0b", "u10_forbidden", "颐浩禅寺（1992年修复开放）", null, "AD-05 U10 禁用：仅非权威转载，无官方文号，不得作为事实"],
  ["ef:faad:1267", "faadce12-0ee1-434a-8f8f-bc24d93f9c59", "generic", "南宋咸淳三年（1267）建的单孔紫石拱桥", "普济桥 1267 建", "整条可用，无需拆分"],
  ["ef:wanan:1342", "04ee5f86-7471-4f12-8416-9616143f3982", "generic", "元至正二年（1342）桥上加建廊亭", "万安桥 1342 加建廊亭", "整条可用"],
  ["ef:yihao:1938", "faadce12-0ee1-434a-8f8f-bc24d93f9c59", "generic", "民国二十七年（1938）大部分建筑毁于日军轰炸", "颐浩寺 1938 大部分建筑毁", "整条可用（注意措辞：大部分，非全毁）"],
  ["ef:yihao:1992", "1bff151e-5bb2-498a-a56e-fd0e8b03b103", "generic", "1992年，在颐浩寺中心原址重建寺院", "颐浩寺 1992 原址重建", "整条可用（注意：仅『原址重建』，不含『开放为宗教活动场所』）"],
  // ---- 以下 9 条补挂：消除 AT-02 零片段缺口（3 事件 + 6 claims）----
  ["ef:faad:1288", "faadce12-0ee1-434a-8f8f-bc24d93f9c59", "generic", "元至元二十五年（1288）建大雄宝殿等", "颐浩寺 1288 建大雄宝殿", "整条可用（青浦博物馆）"],
  ["ef:faad:1295", "faadce12-0ee1-434a-8f8f-bc24d93f9c59", "generic", "元贞元年（1295）奉旨名为颐浩禅寺", "颐浩寺 1295 升院为寺", "整条可用（青浦博物馆）"],
  ["ef:0219:wanan:founded", "02190cbd-7e73-439e-ac8b-742b42f6863f", "generic", "南宋景定年间建，与普济桥一北一南同跨一河，形制相仿，并称'姐妹桥'", "万安桥 1260 创建", "整条可用（上图地名库）"],
  ["ef:0219:sister", "02190cbd-7e73-439e-ac8b-742b42f6863f", "generic", "与普济桥一北一南同跨一河，形制相仿，并称'姐妹桥'", "万安桥与普济桥同跨一河姐妹桥", "整条可用"],
  ["ef:87ca:sister", "87ca8734-9fb2-4846-96be-971b55bae144", "generic", "与北侧万安桥同跨一河、一南一北，形制相仿、年代相接，并称金泽'姐妹桥'", "普济桥与万安桥同跨一河姐妹桥", "整条可用"],
  ["ef:0219:south", "02190cbd-7e73-439e-ac8b-742b42f6863f", "generic", "与普济桥一北一南同跨一河", "普济桥在万安桥之南", "相对位置陈述"],
  ["ef:020b:jinzetang", "020b8bcf-bf84-4d37-8312-66194ad09f23", "generic", "位于金泽镇北，横跨金泽塘，为金泽古桥群中最北一座", "万安桥横跨金泽塘", "整条可用"],
  ["ef:c79b:jinzetang", "c79b0580-5a1e-40bd-8459-0f9d6fed75d9", "generic", "普济桥 位于金泽古镇，东西向跨金泽塘", "普济桥横跨金泽塘", "整条可用（青浦区政府）"],
  ["ef:b4c2:e2", "b4c2a239-3b06-4440-8e7e-1da7dd664121", "generic", "当前 provider 几何：颐浩寺遗址（迎祥街12号）与普济桥同街相邻——属 E2 当前空间观察，非历史关联证明", "寺桥当前空间相邻（E2）", "E2：仅当前空间相邻，不得推历史关联"],
];
for (const [seed, evId, span, quote, usable, note] of FRAGS) {
  stmts.push(
    `INSERT INTO evidence_fragments(fragment_id, evidence_id, span_type, quote_fragment, usable_for_claim, usage_note)
     VALUES (${u("frag:" + seed)}, '${evId}'::uuid, ${esc(span)}, ${esc(quote)}, ${usable ? esc(usable) : "NULL"}, ${note ? esc(note) : "NULL"})
     ON CONFLICT (fragment_id) DO NOTHING;`
  );
}

// ---- STEP 3: cultural_events ----
const EVENTS = [
  ["ev:yihao:founded:1260", "founded", "颐浩寺创建", FK_YIHAO, "1260", "1260", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "据方志与官方来源记载，颐浩寺于南宋景定元年（1260）创建", must_keep_qualifier: ["据方志转引，非影印原文"], forbidden: ["不得称全毁", "不得称开放为宗教活动场所"] },
    ["ef:b245:hr4:name"]],
  ["ev:yihao:hall:1288", "added_structure", "颐浩寺建大雄宝殿等", FK_YIHAO, "1288", "1288", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "元至元二十五年（1288）建大雄宝殿等", must_keep_qualifier: ["据青浦博物馆/青浦区政府新闻办转引"], forbidden: [] }, ["ef:faad:1288"]],
  ["ev:yihao:monastery:1295", "upgraded", "颐浩寺升院为寺", FK_YIHAO, "1295", "1295", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "元贞元年（1295）奉旨赐名颐浩禅寺", must_keep_qualifier: ["据官方来源转引《松江府志》"], forbidden: [] }, ["ef:faad:1295"]],
  ["ev:yihao:destroyed:1938", "destroyed", "颐浩寺大部分建筑毁于日军轰炸", FK_YIHAO, "1938", "1938", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "民国二十七年（1938）大部分建筑毁于日军轰炸", must_keep_qualifier: ["据青浦博物馆、青浦区政府新闻办（.gov.cn）"], forbidden: ["不得写作『全毁』", "不得把 1992 修复开放并入此事件"] }, ["ef:yihao:1938"]],
  ["ev:yihao:rebuilt:1992", "rebuilt", "颐浩寺原址重建寺院", FK_YIHAO, "1992", "1992", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "1992 年在原址重建寺院（大雄宝殿、观音殿、地藏王殿及偏殿、山门）", must_keep_qualifier: ["据青浦文明网（.gov.cn）"], forbidden: ["不得称『1992 年开放为宗教活动场所』为既成事实"] }, ["ef:yihao:1992"]],
  ["ev:wanan:founded:1260", "founded", "万安桥创建", FK_WANAN, "1260", "1264", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "南宋景定年间（1260–1264）创建石拱桥", must_keep_qualifier: ["据上图地名库/地方志转引"], forbidden: [] }, ["ef:0219:wanan:founded"]],
  ["ev:wanan:ting:1342", "added_structure", "万安桥加建廊亭", FK_WANAN, "1342", "1342", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "元至正二年（1342）桥上加建廊亭，遂名万安亭桥", must_keep_qualifier: ["据青浦区政府/青浦博物馆/地方志"], forbidden: ["不得称『今有亭』", "不得称亭阁废于某年（年份无证据）"] }, ["ef:wanan:1342"]],
  ["ev:puji:founded:1267", "founded", "普济桥建（南宋咸淳三年）", FK_PUJI, "1267", "1267", "SUPPORTED_CANDIDATE",
    { tone: "attributed", template: "南宋咸淳三年（1267）建单孔紫石拱桥", must_keep_qualifier: ["据上图遗产记录/官方来源；Commons caption 1265 为冲突值，不得作为默认"], forbidden: ["不得以 1265 为默认建造年代"] }, ["ef:faad:1267"]],
  ["ev:puji:conflict:1265", "founded", "普济桥建造年代冲突值（1265）", FK_PUJI, "1265", "1265", "CONFLICTED",
    { tone: "conflict_explicit", template: "存在冲突记载：Wikimedia Commons caption 作『北宋咸淳元年（1265）』（其内部朝代自相矛盾，咸淳为南宋年号），与权威 1267 冲突", must_keep_qualifier: ["仅作冲突变体记录，非可宣告年代"], forbidden: ["不得作为下游默认建造年代", "不得静默覆盖 1267"] }, []],
];
for (const [seed, type, label, fk, ts, te, epi, rule, frags] of EVENTS) {
  stmts.push(
    `INSERT INTO cultural_events(event_id, slice_id, event_type, canonical_label, subject_feature_key, time_scope_start, time_scope_end, time_scope_unknown, place_refs, evidence_fragment_ids, evidence_ids, epistemic_status, expression_rule, review_status)
     VALUES (${u(seed)}, ${esc(SLICE)}, ${esc(type)}, ${esc(label)}, ${esc(fk)}, ${esc(ts)}, ${esc(te)}, false, ${tarr([])}, ${uarr(frags.map((f) => det("frag:" + f)))}, ${uarr([])}, ${esc(epi)}, ${jb(rule)}, 'candidate')
     ON CONFLICT (event_id) DO NOTHING;`
  );
}

// ---- STEP 3: cultural_relation_claims ----
const CLAIMS = [
  ["rc:yihao:former-site:lvyihao", "FACT", FK_YIHAO, "former_site_of", FK_LYIH, null,
    "SUPPORTED_CANDIDATE", ["HR-4"], NEW_REL_FORMER_SITE,
    { tone: "attributed", template: "据方志记载，颐浩寺寺址即南宋名相吕颐浩故宅", must_keep_qualifier: ["据方志记载（HR-4）", "不得升为确定史实"], forbidden: ["不得称寺受金泽镇灾害影响"] },
    ["ef:b245:hr4:home"], "颐浩寺寺址与吕颐浩故宅的关系（HR-4 冻结为据方志记载，SUPPORTED_CANDIDATE）"],
  ["rc:yihao:named-after:lvyihao", "FACT", FK_YIHAO, "named_after", FK_LYIH, null,
    "SUPPORTED_CANDIDATE", ["HR-4"], REL_NAMED_AFTER,
    { tone: "attributed", template: "据方志记载，颐浩寺因吕颐浩而得名", must_keep_qualifier: ["据方志记载（HR-4）"], forbidden: [] },
    ["ef:b245:hr4:name"], "寺名来源（HR-4）"],
  ["rc:wanan:spans:puji", "RELATION", FK_WANAN, "spans_same_waterway", FK_PUJI, null,
    "SUPPORTED_CANDIDATE", [], REL_WANAN_PUJI,
    { tone: "attributed", template: "万安桥与普济桥同跨一河，并称姐妹桥", must_keep_qualifier: ["据文献转述"], forbidden: [] },
    ["ef:0219:sister"], "两桥同跨一河"],
  ["rc:puji:spans:wanan", "RELATION", FK_PUJI, "spans_same_waterway", FK_WANAN, null,
    "SUPPORTED_CANDIDATE", [], REL_PUJI_WANAN,
    { tone: "attributed", template: "普济桥与万安桥同跨一河", must_keep_qualifier: ["据文献转述"], forbidden: [] },
    ["ef:87ca:sister"], "两桥同跨一河（镜像）"],
  ["rc:puji:south:wanan", "RELATION", FK_PUJI, "relative_position_south_of", FK_WANAN, null,
    "SUPPORTED_CANDIDATE", [], null,
    { tone: "attributed", template: "普济桥在万安桥之南", must_keep_qualifier: ["仅为相对/拓扑陈述，无坐标"], forbidden: ["不得由此生成历史坐标"] },
    ["ef:0219:south"], "相对位置（E3 对应）"],
  ["rc:wanan:spans:jinzetang", "RELATION", FK_WANAN, "spans_waterway", FK_JINZE, null,
    "SUPPORTED_CANDIDATE", [], null,
    { tone: "attributed", template: "万安桥横跨金泽塘", must_keep_qualifier: ["据青浦区政府/青浦博物馆"], forbidden: ["不得静默择一于『秀州塘』冲突说"] },
    ["ef:020b:jinzetang"], "万安桥跨金泽塘（T11-C2 冲突并存）"],
  ["rc:puji:spans:jinzetang", "RELATION", FK_PUJI, "spans_waterway", FK_JINZE, null,
    "SUPPORTED_CANDIDATE", [], null,
    { tone: "attributed", template: "普济桥横跨金泽塘", must_keep_qualifier: ["据青浦区政府/江南古桥研究会"], forbidden: [] },
    ["ef:c79b:jinzetang"], "普济桥跨金泽塘"],
  ["rc:yihao:temple-bridge:puji", "RELATION", FK_YIHAO, "temple_bridge_association", FK_PUJI, null,
    "SUPPORTED_CANDIDATE", ["SHR-01"], null,
    { tone: "attributed", template: "当前 provider 几何显示颐浩寺与普济桥同街相邻", must_keep_qualifier: ["仅当前空间相邻/同街，非历史关联证明（E2）"], forbidden: ["不得表述为『历史上寺桥相邻』"] },
    ["ef:b4c2:e2"], "寺桥当前空间相邻（E2）"],
];
for (const [seed, ctype, subj, pred, obj, oval, epi, hr, existing, rule, frags, disc] of CLAIMS) {
  stmts.push(
    `INSERT INTO cultural_relation_claims(claim_id, slice_id, claim_type, subject_feature_key, predicate, object_feature_key, object_value, time_scope_unknown, spatial_scope, evidence_fragment_ids, evidence_ids, epistemic_status, uncertainty_and_conflict, hr_constraint, existing_relation_id, expression_rule, discovery_affordance, review_status)
     VALUES (${u(seed)}, ${esc(SLICE)}, ${esc(ctype)}, ${esc(subj)}, ${esc(pred)}, ${esc(obj)}, ${oval ? esc(oval) : "NULL"}, false, NULL, ${uarr(frags.map((f) => det("frag:" + f)))}, ${uarr([])}, ${esc(epi)}, NULL, ${tarr(hr)}, ${existing ? uid(existing) : "NULL"}, ${jb(rule)}, ${disc ? jb({ note: disc }) : "NULL"}, 'candidate')
     ON CONFLICT (claim_id) DO NOTHING;`
  );
}

// ---- STEP 3: cultural_meaning_candidates（仅基于已支持 Claims；INTERPRETIVE）----
const MEANINGS = [
  ["mc:yihao:person-bond", FK_YIHAO, "颐浩寺以南宋名相吕颐浩故宅为基、以其人命名，寺与人的绑定是金泽宋韵的一条可感线索",
    ["rc:yihao:former-site:lvyihao", "rc:yihao:named-after:lvyihao"],
    { tone: "interpretive", template: "可以这样理解：颐浩寺的存在，把一位南宋名相的个人宅邸，沉淀成了金泽镇延续至今的文化地标", must_keep_qualifier: ["此为解释层，非史料原文"], forbidden: ["不得改写为『吕颐浩创建了颐浩寺』这一历史事实"] }],
  ["mc:sister-bridges", FK_PUJI, "万安桥与普济桥一北一南、同跨金泽塘，并称『姐妹桥』，是金泽『古桥博物馆』的双璧",
    ["rc:wanan:spans:puji", "rc:puji:south:wanan"],
    { tone: "interpretive", template: "可以这样理解：两桥的相对位置与同跨一河，构成了镇民口传中『姐妹桥』的由来", must_keep_qualifier: ["此为解释层"], forbidden: [] }],
];
for (const [seed, fk, text, derived, rule] of MEANINGS) {
  stmts.push(
    `INSERT INTO cultural_meaning_candidates(meaning_id, slice_id, subject_feature_key, interpretive_text, derived_from_claim_ids, epistemic_status, expression_rule, review_status)
     VALUES (${u(seed)}, ${esc(SLICE)}, ${esc(fk)}, ${esc(text)}, ${uarr(derived.map((d) => det(d)))}, 'SUPPORTED_CANDIDATE', ${jb(rule)}, 'candidate')
     ON CONFLICT (meaning_id) DO NOTHING;`
  );
}

// ---- STEP 3: cultural_present_connections（遗址—复建双层；1992 开放宗教场所 = OPEN_QUESTION）----
const PRESENTS = [
  ["pc:yihao:site-rebuilt", FK_YIHAO, "site_vs_rebuilt", "今址金泽镇金溪居委会迎祥街12号；遗址—复建双层：元代遗物（不断云石刻、元碑、古银杏）与1992原址重建殿宇并置",
    ["ev:yihao:rebuilt:1992", "ev:yihao:destroyed:1938"],
    ["1992年开放为宗教活动场所（U10：仅非权威转载，无官方文号，不进事实层）"],
    { tone: "direct", template: "今日颐浩寺遗址为原址重建寺院与元代遗物并置的双层结构", must_keep_qualifier: ["1992 原址重建为事实", "1992 开放宗教场所为 OPEN_QUESTION"], forbidden: ["不得把『开放宗教场所』写入事实层"] }],
  ["pc:yihao:today-location", FK_YIHAO, "today_location", "现坐落金泽镇金溪居委会迎祥街12号（当前坐标仅为近似对象范围，非历史位置证明）",
    ["ev:yihao:rebuilt:1992"],
    [],
    { tone: "direct", template: "颐浩寺遗址今址为金泽镇迎祥街12号", must_keep_qualifier: ["当前坐标非历史位置证明（SHR-01）"], forbidden: [] }],
];
for (const [seed, fk, ctype, obs, basis, oq, rule] of PRESENTS) {
  stmts.push(
    `INSERT INTO cultural_present_connections(present_id, slice_id, subject_feature_key, connection_type, observed_state, basis_claim_ids, open_questions, expression_rule, review_status)
     VALUES (${u(seed)}, ${esc(SLICE)}, ${esc(fk)}, ${esc(ctype)}, ${esc(obs)}, ${uarr(basis.map((b) => det(b)))}, ${tarr(oq)}, ${jb(rule)}, 'candidate')
     ON CONFLICT (present_id) DO NOTHING;`
  );
}

// ---- AD-06: cultural_conflicts（1265 vs 1267 结构化互指）----
stmts.push(
  `INSERT INTO cultural_conflicts(conflict_id, conflict_key, subject_feature_key, primary_claim_id, conflicted_variant_id, primary_value, conflicted_value, source_of_conflict, resolution_status)
   VALUES (${u("cc:puji:1265-1267")}, 'pujiqiao-build-year-1265-1267', ${esc(FK_PUJI)}, ${u("ev:puji:founded:1267")}, ${u("ev:puji:conflict:1265")}, '1267', '1265', 'Wikimedia Commons caption（作北宋咸淳元年(1265)，内部朝代自相矛盾）', 'preserved_open')
   ON CONFLICT (conflict_key) DO NOTHING;`
);

// 注：冲突的结构化互指由 cultural_conflicts 表承载——primary_claim_id 指向 1267
// event、conflicted_variant_id 指向 1265 event，双向定位，不静默。cultural_events
// 未设 conflict_refs 列（008 迁移未批准该列），故此处不回写 event，避免 schema 扩展
// 超出 Architect 批准范围。Runtime / Cluster Query 必须显式读取 cultural_conflicts，
// 严禁把 1265 当作默认建造年代。

await runMany(stmts);

// ---- after 快照 ----
const after = {};
for (const t of [
  "cultural_events", "cultural_relation_claims", "cultural_meaning_candidates",
  "cultural_present_connections", "evidence_fragments", "cultural_conflicts",
]) {
  after[t] = Number(await queryValue(`select count(*)::text c from ${t}`));
}
after.relations = Number(await queryValue(`select count(*)::text c from relations`));
after.evidence_linked = Number(await queryValue(`select count(*)::text c from evidence where verification_status::text='evidence_linked'`));
after.evidence_candidate = Number(await queryValue(`select count(*)::text c from evidence where verification_status::text='candidate'`));

// AD-02 指针校验
const hsrPointer = await queryValue(
  `select existing_relation_id::text from historical_spatial_relations where hs_relation_id=${esc(HSR_FORMER_SITE)}::uuid`
);
const pointerOk = hsrPointer === NEW_REL_FORMER_SITE;

// 负向检查：claim/event 层不得出现「开放为宗教活动场所」作为事实
const claimForbidden = Number(await queryValue(
  `select count(*)::text c from cultural_relation_claims where object_value::text like '%开放为宗教活动场所%' or subject_feature_key::text like '%开放为宗教活动场所%'`
));
const eventForbidden = Number(await queryValue(
  `select count(*)::text c from cultural_events where canonical_label like '%开放为宗教活动场所%'`
));

// 幂等校验：008 表为本次新建且仅本脚本写入，故用「绝对期望行数」而非「相对增量」，
// 以避免上一次部分提交（runMany 中途失败已提交 6 条 fragments + AD-02 关系）导致重跑时增量断言失效。
const EXPECT = {
  cultural_events: EVENTS.length,
  cultural_relation_claims: CLAIMS.length,
  cultural_meaning_candidates: MEANINGS.length,
  cultural_present_connections: PRESENTS.length,
  evidence_fragments: FRAGS.length,
  cultural_conflicts: 1,
};
const formerSiteRelExists = Number(
  await queryValue(`select count(*)::text c from relations where relation_id=${u("rel:cw02:yihaosi-former-site-of-lvyihao")}`)
);
const checks = {
  events_created: after.cultural_events === EXPECT.cultural_events,
  claims_created: after.cultural_relation_claims === EXPECT.cultural_relation_claims,
  meanings_created: after.cultural_meaning_candidates === EXPECT.cultural_meaning_candidates,
  presents_created: after.cultural_present_connections === EXPECT.cultural_present_connections,
  fragments_created: after.evidence_fragments === EXPECT.evidence_fragments,
  conflicts_created: after.cultural_conflicts === EXPECT.cultural_conflicts,
  former_site_relation_exists: formerSiteRelExists === 1,
  evidence_rows_unchanged: after.evidence_linked + after.evidence_candidate === before.evidence_linked + before.evidence_candidate,
  hsr_pointer_fixed: pointerOk,
  no_fact_1992_open: claimForbidden === 0 && eventForbidden === 0,
};

const out = {
  note: "CULTURAL-WORLD-02 seed (AD-02/04/05/06 + STEP 3)",
  new_relation_former_site_of: NEW_REL_FORMER_SITE,
  new_relation_pointer_target_hsr: HSR_FORMER_SITE,
  upgrade_count: upgradeLog.filter((x) => x.to === "evidence_linked").length,
  upgrade_log: upgradeLog,
  before, after, checks,
  ok: Object.values(checks).every(Boolean),
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
if (!out.ok) process.exit(1);
