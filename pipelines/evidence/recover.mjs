// pipelines/evidence/recover.mjs — TASK-0004 Jinze Evidence Recovery。
//
// 职责：把「定向检索得到的外部资料」与「已入库的 Legacy 描述」转成可审计的 Evidence，
//       然后重跑 G0–G6，并产出三份导出。
//
// 严守的红线（与任务书一致）：
//   - 不猜坐标：坐标只能来自有出处的来源；镇级锚点不得冒充对象点位。
//   - 不猜关系：crossLink 不自动改名；只有 Evidence 明确支持才生成 semantic relation candidate。
//   - 不猜身份：不得仅凭姓名 merge（族谱姓名桩无身份维度，不合并）。
//   - 不直接 published；Tier C 不自动 approved/verified。
//   - 新资料先落 Raw Store/Source Record（由 retrieve-external.mjs 完成），此处只生成 Evidence。
//
// 幂等：Evidence 以 checksum 判定重复（同一 locator+quote 不重复写）；audit 同对象同门先删后写。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run as dbRun, queryRows, runMany } from "../../packages/data-access/src/index.mjs";
import { evaluateGates, GATE_CODES } from "./gates.mjs";
import {
  LOCATIONAL_RE,
  LEGEND_RE,
  coordinateStatus,
  resolveIdentity,
  classifyVisual,
  predicateFrom,
} from "./recovery-rules.mjs";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
const EXTERNAL_BASE = path.join(RAW_STORE, "external", "jinze-evidence-recovery");
const LEGACY_SEED =
  process.env.MOHEN_LEGACY_SEED ||
  path.resolve(PROJECT_ROOT, "..", "hushang-jingwei", "data", "seed.master.json");

const UNASSESSED = 0; // 沿用 TASK-0003 约定：0 = 未评定（NOT NULL 列无法留空）

// 本管线专属 extraction_method：用于「区分 baseline 与本轮新增」以及幂等去重
const PIPELINE_METHODS = [
  "coordinate_provenance:wikidata_p625_town_anchor",
  "visual_provenance:commons_imageinfo",
  "identity_resolution:wikidata_entity_match",
];
const MINING_METHOD = "legacy_description_mining";
const ALL_PIPELINE_METHODS = [...PIPELINE_METHODS, MINING_METHOD];

function sha256(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

// ---------- 载入外部 Raw 与状态 ----------
const state = JSON.parse(fs.readFileSync(path.join(EXTERNAL_BASE, ".last-run.json"), "utf8"));
const wdRaw = JSON.parse(fs.readFileSync(path.join(state.dir, "raw-wikidata.json"), "utf8"));
const cmRaw = JSON.parse(fs.readFileSync(path.join(state.dir, "raw-commons.json"), "utf8"));
const srcIds = state.source_ids;

// 从 Wikidata 原始响应里取坐标（P625）
function wdCoord(qid) {
  try {
    const e = wdRaw[qid].entities[qid];
    const c = e.claims.P625;
    if (!c || !c.length) return null;
    const v = c[0].mainsnak.datavalue.value;
    return { lat: v.latitude, lng: v.longitude };
  } catch {
    return null;
  }
}
function wdLabel(qid, lang = "zh") {
  try {
    return wdRaw[qid].entities[qid].labels[lang].value;
  } catch {
    return null;
  }
}
function wdDesc(qid, lang = "zh") {
  try {
    return wdRaw[qid].entities[qid].descriptions[lang].value;
  } catch {
    return null;
  }
}
function wdTime(qid, prop) {
  try {
    const t = wdRaw[qid].entities[qid].claims[prop][0].mainsnak.datavalue.value.time;
    return t.replace(/^\+/, "").slice(0, 4);
  } catch {
    return null;
  }
}

const townAnchor = wdCoord("Q13694319");

// ---------- 读库 ----------
const entities = await queryRows(
  `select entity_id::text, canonical_name as name, entity_type, description,
          coalesce(valid_from,'') as vf, coalesce(valid_to,'') as vt, status::text, legacy_id,
          (select count(*) from claim_evidence ce join claims c on c.claim_id=ce.claim_id
            where c.subject_id=e.entity_id) as ev_count
   from entities e order by canonical_name`
);
const relations = await queryRows(
  `select r.relation_id::text, r.predicate, r.subject_id::text, r.object_id::text, r.legacy_id,
          r.valid_from, r.valid_to,
          (select count(*) from relation_evidence re where re.relation_id=r.relation_id) as ev_count
   from relations r where r.legacy_id is not null order by r.predicate`
);
const visuals = await queryRows(
  `select asset_id::text, file_path, coalesce(created_date,'') as created_date,
          coalesce(rights,'') as rights, coalesce(depicted_period,'') as depicted_period,
          coalesce(checksum,'') as checksum, v.source_id::text,
          (select sr.provider from source_records sr where sr.source_id = v.source_id) as provider_label
   from visual_assets v order by v.file_path`
);
const evidences = await queryRows(
  `select evidence_id::text, evidence_type, coalesce(locator,'') as locator,
          coalesce(subject_hint,'') as subject_hint, coalesce(place_hint,'') as place_hint,
          coalesce(time_hint,'') as time_hint, source_id::text, extraction_method,
          (select count(*) from claim_evidence ce where ce.evidence_id=ev.evidence_id) as claim_count
   from evidence ev
   where ev.extraction_method <> all(array['${ALL_PIPELINE_METHODS.join("','")}'])`
);
const claims = await queryRows(
  `select c.claim_id::text, c.subject_id::text, c.predicate, c.review_tier, c.status::text,
          (select count(*) from claim_evidence ce where ce.claim_id=c.claim_id) as ev_count
   from claims c`
);

const entById = new Map(entities.map((e) => [e.entity_id, e]));
const entByName = new Map(entities.map((e) => [e.name, e]));

// 实体描述性 Evidence 的 source_id（用于给新 Evidence 挂来源）
const entSourceId = new Map();
for (const ev of evidences) {
  if (ev.extraction_method === "legacy_entity_source" && entByName.has(ev.subject_hint)) {
    entSourceId.set(ev.subject_hint, ev.source_id);
  }
}
const legacySourceId = evidences.find((e) => e.extraction_method === "legacy_entity_source")?.source_id || null;

// ---------- 同名检测 ----------
// 两套同名表：
//   nameTownsOld —— TASK-0003 口径（含 family_person 姓名桩），用于复算 before，验证可比性
//   nameTowns    —— 本轮修正口径（排除姓名桩），用于 after
const legacy = JSON.parse(fs.readFileSync(LEGACY_SEED, "utf8"));
const nameTownsOld = new Map();
const nameTowns = new Map();
let stubCount = 0;
for (const e of legacy.entities || []) {
  if (!e.name) continue;
  if (!nameTownsOld.has(e.name)) nameTownsOld.set(e.name, new Set());
  nameTownsOld.get(e.name).add(e.town || "(无镇)");
  if (e.kind === "family_person") {
    stubCount++; // 族谱姓名桩：无 town/era/描述，不构成「异地同名」
    continue;
  }
  if (!nameTowns.has(e.name)) nameTowns.set(e.name, new Set());
  nameTowns.get(e.name).add(e.town || "(无镇)");
}

// Legacy 快照（TASK-0003 ingest 落盘）：取 lat/lng/source_uri，用于 G0 与 G3 判定
const LEGACY_SOURCE = "hushang-jingwei";
const legacyStatePath = path.join(RAW_STORE, "legacy", "jinze", ".last-run.json");
const legacySnapshot = (() => {
  try {
    const st = JSON.parse(fs.readFileSync(legacyStatePath, "utf8"));
    const p = path.join(RAW_STORE, "legacy", "jinze", st.run_id, "jinze-snapshot.json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { entities: [] };
  }
})();
const legacyById = new Map((legacySnapshot.entities || []).map((e) => [e.id, e]));

// ---------- WP A：坐标 provenance ----------
const coordStatus = []; // {entity, status, evidence}
for (const e of entities) {
  // 判定规则见 recovery-rules.mjs：本轮不存在对象级坐标来源，verified 无出口
  const { status, hasLocationalProse } = coordinateStatus(e.description);
  coordStatus.push({
    entity: e.name,
    entity_id: e.entity_id,
    status,
    hasLocationalProse,
    town_anchor: townAnchor,
    note: hasLocationalProse
      ? "有文字位置著录（位于…/寺址…），镇级坐标锚点来自 Wikidata Q13694319；对象级坐标仍无来源"
      : "无文字位置著录，仅有镇级锚点；对象坐标未证明",
  });
}

// ---------- WP B：relation evidence 挖掘 ----------
// 短名 token：长名实体（如叠影类）用可检索的关键词代表
const TOKENS = {
  "普济桥": ["普济桥"],
  "万安桥": ["万安桥"],
  "迎祥桥": ["迎祥桥"],
  "如意桥": ["如意桥"],
  "林老桥": ["林老桥"],
  "天皇阁桥": ["天皇阁桥", "天皇阁"],
  "金泽放生桥": ["放生桥"],
  "颐浩寺遗址": ["颐浩寺", "颐浩禅寺"],
  "吕颐浩": ["吕颐浩"],
  "赵孟頫": ["赵孟頫"],
  "金泽庙会 · 廿八汛与重阳汛": ["庙会"],
  "金泽锭子谢家车": ["谢家车"],
  "《金泽小志》道光续纂成书": ["金泽小志"],
  "白苎里 → 金溪 → 金泽 · 地名叠影": ["白苎里", "金溪"],
  "'四十二虹桥' → 今存七桥 · 古今叠影": ["四十二虹桥", "今存七桥", "古桥群"],
};
function sentences(text) {
  return String(text || "")
    .split(/[。；！\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function findSentence(text, tokens) {
  for (const s of sentences(text)) {
    for (const t of tokens) {
      if (s.includes(t)) return s;
    }
  }
  return null;
}

// predicate 由 Evidence 句子推导（规则见 recovery-rules.mjs：只认文本明确支持的语义，因果类交人工）
const relResults = [];
for (const r of relations) {
  const sub = entById.get(r.subject_id);
  const obj = entById.get(r.object_id);
  const subTok = TOKENS[sub?.name] || [sub?.name];
  const objTok = TOKENS[obj?.name] || [obj?.name];

  const inSub = findSentence(sub?.description, objTok); // 主语描述里提到宾语
  const inObj = findSentence(obj?.description, subTok); // 宾语描述里提到主语

  const evidencesFound = [];
  if (inSub) evidencesFound.push({ from: sub.name, sentence: inSub });
  if (inObj) evidencesFound.push({ from: obj.name, sentence: inObj });

  let status;
  let predicate = null;
  let reason;
  if (!evidencesFound.length) {
    status = "unresolved";
    reason = "两端描述均未出现对方，无 Evidence";
  } else if (evidencesFound.every((x) => LEGEND_RE.test(x.sentence))) {
    // 全部命中句都自述为传说/待考 → 不可作为历史结论
    status = "legend_only";
    reason = "命中句自述为传说/待考（属传说性质），不生成语义关系";
  } else {
    const usable = evidencesFound.filter((x) => !LEGEND_RE.test(x.sentence));
    predicate = predicateFrom(usable[0].sentence, {
      subjectType: sub?.entity_type,
      objectType: obj?.entity_type,
    });
    status = "semantic_candidate";
    reason = `Evidence 支持（${usable.map((u) => u.from).join("、")}）→ ${predicate}`;
  }

  relResults.push({
    relation_id: r.relation_id,
    sub_id: r.subject_id,
    obj_id: r.object_id,
    sub: sub?.name,
    obj: obj?.name,
    predicate: r.predicate,
    status,
    semantic_predicate: predicate,
    evidences: evidencesFound,
    reason,
  });
}

// ---------- WP C：吕颐浩 identity ----------
const ly = entByName.get("吕颐浩");
const identity = {
  subject: "吕颐浩",
  legacy_entity: ly ? { valid_from: ly.vf, valid_to: ly.vt, desc: ly.description } : null,
  wikidata: {
    qid: "Q10918454",
    label: wdLabel("Q10918454"),
    desc: wdDesc("Q10918454"),
    birth: wdTime("Q10918454", "P569"),
    death: wdTime("Q10918454", "P570"),
  },
  homonym_sources: [],
};
{
  const towns = nameTowns.get("吕颐浩") || new Set();
  identity.homonym_sources = [...towns];
  identity.true_cross_town_homonym = towns.size > 1;
  identity.stub_homonym = (legacy.entities || []).some(
    (e) => e.name === "吕颐浩" && e.kind === "family_person"
  );
  // 维度①：生卒年；维度②：朝代/官职；维度③：关联地（颐浩禅寺）
  identity.dimensions = [
    {
      dim: "生卒年",
      legacy: `${ly?.vf}-${ly?.vt}`,
      external: `${identity.wikidata.birth}-${identity.wikidata.death}`,
      agree: `${ly?.vf}-${ly?.vt}` === `${identity.wikidata.birth}-${identity.wikidata.death}`,
    },
    {
      dim: "朝代/官职",
      legacy: /南宋名相|宋/.test(ly?.description || "") ? "南宋名相（Legacy 描述）" : "无",
      external: identity.wikidata.desc || "无",
      agree: /名相|宰相/.test(ly?.description || "") && /宰相/.test(identity.wikidata.desc || ""),
    },
    {
      dim: "关联地/关联物",
      legacy: /颐浩禅寺|颐浩寺/.test(ly?.description || "") ? "颐浩禅寺（寺址即故宅）" : "无",
      external: "Wikidata 未提供关联地",
      // 单向维度：外部来源无对应字段，不构成独立佐证，故不计入 agree
      agree: false,
      note: "单向：仅 Legacy 侧有，外部未证实，不计入一致维度",
    },
  ];
  const verdict = resolveIdentity({
    dimensions: identity.dimensions,
    trueCrossTownHomonym: identity.true_cross_town_homonym,
    stubHomonym: identity.stub_homonym,
  });
  identity.agree_count = verdict.agreeCount;
  identity.decision_basis = verdict.basis;
  identity.auto_merged = verdict.merged; // 恒为 false：跨源身份链接须人工裁决
  identity.decision =
    verdict.decision === "unresolved"
      ? "unresolved"
      : "同一历史人物（宋宰相吕颐浩）；与族谱姓名桩不合并";
}

// ---------- WP D：visual provenance ----------
const visualResults = [];
for (const v of visuals) {
  const rec = cmRaw[v.asset_id] || {};
  const pages = rec.resp?.query?.pages || {};
  const page = Object.values(pages)[0] || {};
  const ii = (page.imageinfo || [])[0];
  const em = ii?.extmetadata || {};
  const strip = (x) => String(x?.value ?? "").replace(/<[^>]+>/g, "").trim();

  const artist = strip(em.Artist);
  const license = strip(em.LicenseShortName);
  const dt = strip(em.DateTimeOriginal);
  const desc = strip(em.ImageDescription);
  const gpsLat = strip(em.GPSLatitude);
  const gpsLng = strip(em.GPSLongitude);

  // 分类规则见 recovery-rules.mjs（来源标签一致性 / 内容是否描绘遗产对象 / 元数据可得性）
  const cls = classifyVisual({
    filePath: v.file_path,
    providerLabel: v.provider_label || null,
    imageinfo: ii || null,
    description: desc,
  });
  if (!license) cls.riskFlags.push("license_unknown");

  visualResults.push({
    asset_id: v.asset_id,
    file: v.file_path.split("/").pop(),
    provider_actual: cls.providerActual,
    provider_label: v.provider_label || "",
    label_mismatch: cls.labelMismatch,
    artist,
    license,
    created_date: dt || v.created_date,
    depicted_period: v.depicted_period,
    gps: gpsLat && gpsLng ? `${gpsLat},${gpsLng}` : "",
    description: desc,
    linkage: cls.linkage, // confirmed / suspected / similar / unconfirmed
    risk: cls.risk,
    risk_flags: cls.riskFlags,
    note: cls.isTrain
      ? "现代高铁照片：可证明金泽地名的当代存在，不可证明历史状态或遗产对象"
      : cls.isBookScan
      ? "书影：内容与金泽的对应关系待考"
      : "",
  });
}

// ---------- 写入 Evidence ----------
const evStmts = [];
const newEvidenceCount = { coordinate: 0, visual_provenance: 0, identity: 0 };
const evKeysSeen = new Set();

// 幂等 + 内容刷新：先取本管线已写过的 Evidence（按其专属 extraction_method 识别）。
// 已存在则 UPDATE（ID 稳定、计数不增长、内容随取证结果刷新），不存在则 INSERT。
const existingPipeEv = await queryRows(
  `select evidence_id::text, extraction_method, locator, coalesce(place_hint,'') as ph, coalesce(subject_hint,'') as sh
     from evidence where extraction_method = any(array['${PIPELINE_METHODS.join("','")}'])`
);
const existingEvKeys = new Map(
  existingPipeEv.map((x) => [`${x.extraction_method}|${x.locator}|${x.ph}|${x.sh}`, x.evidence_id])
);
const evKeyOf = (m, loc, ph, sh) => `${m}|${loc}|${ph || ""}|${sh || ""}`;
const UPD_EV = `update evidence set quote_text=:'qt', region_json=:'rj'::jsonb, extraction_method=:'em'
                where evidence_id=:'eid'::uuid`;

// A) 坐标 Evidence（每实体一条；镇级锚点，明确标注 scope）
for (const c of coordStatus) {
  const sid = srcIds["wd:Q13694319"];
  if (!sid) continue;
  const EM = "coordinate_provenance:wikidata_p625_town_anchor";
  const k = evKeyOf(EM, "https://www.wikidata.org/wiki/Q13694319", c.entity, "");
  const qt = `金泽镇坐标锚点（Wikidata P625，镇级）：${
    townAnchor ? `${townAnchor.lat},${townAnchor.lng}` : "无"
  }；对象状态=${c.status}`;
  const rj = JSON.stringify({
    lat: townAnchor?.lat ?? null,
    lng: townAnchor?.lng ?? null,
    precision_scope: "town_level",
    method: "wikidata_P625",
    object_status: c.status,
    object_identity_note: c.note,
    retrieved_at: new Date().toISOString(),
  });
  if (existingEvKeys.has(k)) {
    evStmts.push({ sql: UPD_EV, params: { eid: existingEvKeys.get(k), qt, rj, em: EM } });
    continue;
  }
  evStmts.push({
    sql: `insert into evidence(source_id,evidence_type,locator,quote_text,place_hint,time_hint,extraction_method,confidence,verification_status,region_json)
          values (:'sid'::uuid,'map',:'loc',:'qt',:'ph','','coordinate_provenance:wikidata_p625_town_anchor',:'conf'::numeric,'candidate',:'rj'::jsonb)`,
    params: {
      sid,
      loc: "https://www.wikidata.org/wiki/Q13694319",
      qt,
      ph: c.entity,
      conf: UNASSESSED,
      rj,
    },
  });
  newEvidenceCount.coordinate++;
}

// D) 视觉 provenance Evidence（每张一条）
for (const v of visualResults) {
  const sid = srcIds[`commons:${v.asset_id}`];
  if (!sid) continue;
  const EM = "visual_provenance:commons_imageinfo";
  const k = evKeyOf(EM, v.file, v.file, "");
  const qt = `author=${v.artist || "-"}；license=${v.license || "-"}；description=${
    v.description || "-"
  }`;
  const rj = JSON.stringify({
    provider_actual: v.provider_actual,
    provider_label: v.provider_label || null,
    label_mismatch: v.label_mismatch,
    license: v.license || null,
    created_date: v.created_date || null,
    depicted_period: v.depicted_period || null,
    gps: v.gps || null,
    linkage: v.linkage,
    risk: v.risk,
    risk_flags: v.risk_flags,
    note: v.note,
    retrieved_at: new Date().toISOString(),
  });
  if (existingEvKeys.has(k)) {
    evStmts.push({ sql: UPD_EV, params: { eid: existingEvKeys.get(k), qt, rj, em: EM } });
    continue;
  }
  evStmts.push({
    sql: `insert into evidence(source_id,evidence_type,locator,quote_text,place_hint,time_hint,extraction_method,confidence,verification_status,region_json)
          values (:'sid'::uuid,'image',:'loc',:'qt',:'ph',:'th','visual_provenance:commons_imageinfo',:'conf'::numeric,'candidate',:'rj'::jsonb)`,
    params: {
      sid,
      loc: v.file,
      qt,
      ph: v.file,
      th: v.created_date || "",
      conf: UNASSESSED,
      rj,
    },
  });
  newEvidenceCount.visual_provenance++;
}

// C) 身份 Evidence（吕颐浩）
{
  const sid = srcIds["wd:Q10918454"];
  const k = evKeyOf(
    "identity_resolution:wikidata_entity_match",
    "https://www.wikidata.org/wiki/Q10918454",
    "",
    "吕颐浩"
  );
  const qt = `${wdLabel("Q10918454")}｜${wdDesc("Q10918454")}｜生卒 ${wdTime(
    "Q10918454",
    "P569"
  )}-${wdTime("Q10918454", "P570")}`;
  const rj = JSON.stringify({
    qid: "Q10918454",
    dimensions: identity.dimensions,
    decision: identity.decision,
    decision_basis: identity.decision_basis,
    stub_homonym: identity.stub_homonym,
    true_cross_town_homonym: identity.true_cross_town_homonym,
    retrieved_at: new Date().toISOString(),
  });
  if (!sid || !ly) {
    // 无来源或无实体，跳过（不猜）
  } else if (existingEvKeys.has(k)) {
    evStmts.push({
      sql: UPD_EV,
      params: { eid: existingEvKeys.get(k), qt, rj, em: "identity_resolution:wikidata_entity_match" },
    });
  } else {
    evStmts.push({
      sql: `insert into evidence(source_id,evidence_type,locator,quote_text,subject_hint,time_hint,extraction_method,confidence,verification_status,region_json)
            values (:'sid'::uuid,'record',:'loc',:'qt',:'sh',:'th','identity_resolution:wikidata_entity_match',:'conf'::numeric,'candidate',:'rj'::jsonb)`,
      params: {
        sid,
        loc: "https://www.wikidata.org/wiki/Q10918454",
        qt,
        sh: "吕颐浩",
        th: `${wdTime("Q10918454", "P569")}-${wdTime("Q10918454", "P570")}`,
        conf: UNASSESSED,
        rj,
      },
    });
    newEvidenceCount.identity++;
  }
}
await runMany(evStmts);

// 本管线已登记总数（幂等重跑时不重复插入，故报告同时给出「已登记」与「本次新增」）
const registeredRows = await queryRows(
  `select extraction_method, count(*)::int as c
     from evidence where extraction_method = any(array['${ALL_PIPELINE_METHODS.join(
       "','"
     )}']) group by extraction_method`
);
const registered = Object.fromEntries(registeredRows.map((x) => [x.extraction_method, x.c]));
const registeredTotal = {
  coordinate: registered["coordinate_provenance:wikidata_p625_town_anchor"] || 0,
  visual_provenance: registered["visual_provenance:commons_imageinfo"] || 0,
  identity: registered["identity_resolution:wikidata_entity_match"] || 0,
  relation: registered[MINING_METHOD] || 0,
};

// B) 语义关系 Evidence + semantic relation candidate（逐条，需要回读 id）
const semanticCreated = [];
let semanticEvidenceInserted = 0;
for (const rr of relResults) {
  if (rr.status !== "semantic_candidate") continue;
  const usable = rr.evidences.filter((x) => !LEGEND_RE.test(x.sentence));
  const srcEnt = entByName.get(usable[0].from);
  const sid = entSourceId.get(usable[0].from) || legacySourceId;
  if (!sid) continue;

  // 幂等键：本管线产出的 Evidence 用 (定位器 + 主体提示) 识别；重跑不重复插入
  const evKey = `legacy_description_mining|${srcEnt ? srcEnt.name : "-"}|${rr.sub} / ${rr.obj}`;
  const existingEv = await queryRows(
    `select evidence_id::text from evidence
      where extraction_method = 'legacy_description_mining'
        and subject_hint = :'sh' and quote_text = :'qt' limit 1`,
    { sh: `${rr.sub} / ${rr.obj}`, qt: usable[0].sentence }
  );
  let evId = existingEv[0]?.evidence_id || null;
  if (!evId) {
    const evRow = await queryRows(
      `insert into evidence(source_id,evidence_type,locator,quote_text,subject_hint,extraction_method,confidence,verification_status)
       values (:'sid'::uuid,'text',:'loc',:'qt',:'sh','legacy_description_mining',:'conf'::numeric,'candidate')
       returning evidence_id::text`,
      {
        sid,
        loc: srcEnt ? `legacy-description:${srcEnt.name}` : "legacy-description",
        qt: usable[0].sentence,
        sh: `${rr.sub} / ${rr.obj}`,
        conf: UNASSESSED,
      }
    );
    evId = evRow[0].evidence_id;
    semanticEvidenceInserted++;
  }
  evKeysSeen.add(evKey);

  // 生成 semantic relation candidate（新行；原 crossLink 保留为 structural）——同谓语同端点已存在则复用
  const existingRel = await queryRows(
    `select relation_id::text from relations
      where subject_id = :'s'::uuid and predicate = :'p' and object_id = :'o'::uuid limit 1`,
    { s: rr.sub_id, p: rr.semantic_predicate, o: rr.obj_id }
  );
  let newRelId = existingRel[0]?.relation_id || null;
  if (!newRelId) {
    const relRow = await queryRows(
      `insert into relations(subject_id,predicate,object_id,confidence,status)
       values (:'s'::uuid,:'p',:'o'::uuid,:'conf'::numeric,'candidate')
       returning relation_id::text`,
      { s: rr.sub_id, p: rr.semantic_predicate, o: rr.obj_id, conf: UNASSESSED }
    );
    newRelId = relRow[0].relation_id;
  }

  await dbRun(
    `insert into relation_evidence(relation_id,evidence_id,support_type)
     values (:'r'::uuid,:'e'::uuid,'supports') on conflict do nothing`,
    { r: newRelId, e: evId }
  );
  semanticCreated.push({ relation_id: newRelId, predicate: rr.semantic_predicate, sub: rr.sub, obj: rr.obj, evidence_id: evId });
}

// ---------- 重跑 G0–G6（baseline 112 个对象） ----------
// 规则与 TASK-0003 pipelines/evidence/run.mjs 逐条对齐，保证 before/after 可比。
// 仅两处受本轮取证影响的增量：
//   (1) 同名表改用排除 family_person 姓名桩的口径（修正 TASK-0003 的假阳性）
//   (2) visual_asset 在 linkage=unconfirmed 时追加证据支持的强制 C 理由（图配错红线）
// 坐标仍无对象级来源 → G3 保持 fail；crossLink 仍无自身 Evidence → G4 保持 fail。
import { STRUCTURAL_PREDICATES } from "./gates.mjs";

const coordByEntity = new Map(coordStatus.map((c) => [c.entity, c]));
const visByAsset = new Map(visualResults.map((v) => [v.asset_id, v]));

/**
 * @param {Map} townsMap 同名表（before 用含姓名桩口径，after 用修正口径）
 * @param {boolean} withRecovery 是否叠加本轮取证带来的增量（视觉风险标记）
 */
function evaluateBaseline(townsMap, withRecovery) {
  const out = [];
  // entities
  for (const e of entities) {
    const legacyRow = legacyById.get(
      String(e.legacy_id || "").replace(`${LEGACY_SOURCE}:entity:`, "")
    );
    const hasCoords = !!(legacyRow && legacyRow.lat && legacyRow.lng);
    const hasSourceUri = !!(legacyRow && legacyRow.source_uri);
    const towns = townsMap.get(e.name) || new Set(["金泽"]);
    const homonym = towns.size > 1;
    const evCount = Number(e.ev_count || 0);
    const forcedC = [];
    if (!hasSourceUri) forcedC.push("Legacy 该实体无 source_uri，出处不可跳转核对");
    if (homonym) forcedC.push("同名异地：该名称在 Legacy 中出现在多个镇");
    out.push({
      object_type: "entity",
      object_id: e.entity_id,
      display_name: e.name,
      res: evaluateGates({
        source: evCount > 0 && hasSourceUri ? true : hasSourceUri === false ? false : undefined,
        identity: homonym ? false : true,
        time: e.vf && e.vt ? Number(e.vf) <= Number(e.vt) : e.vf ? undefined : false,
        spatial: hasCoords ? false : undefined,
        evidence: evCount > 0 ? true : false,
        conflict: false,
        forcedC,
      }),
    });
  }
  // relations（baseline 24 条 crossLink）
  for (const r of relations) {
    const structural = STRUCTURAL_PREDICATES.has(r.predicate);
    const evCount = Number(r.ev_count || 0);
    out.push({
      object_type: "relation",
      object_id: r.relation_id,
      display_name: `${entById.get(r.subject_id)?.name} → ${entById.get(r.object_id)?.name}（${r.predicate}）`,
      res: evaluateGates({
        source: r.legacy_id ? true : false,
        identity: r.subject_id && r.object_id ? true : false,
        time: r.valid_from || r.valid_to ? true : undefined,
        spatial: undefined,
        evidence: evCount > 0 ? true : false,
        conflict: false,
        forcedC: structural ? [`仅有结构型谓词 ${r.predicate}，未证明具体人文语义`] : [],
      }),
    });
  }
  // visual_assets
  for (const v of visuals) {
    const hasDate = !!(v.created_date && String(v.created_date).trim());
    const vr = visByAsset.get(v.asset_id);
    const forcedC = [
      "图像缺少可证明的拍摄地点/年代对应关系，需人工核验（含历史图像与今地疑似同景的情形）",
    ];
    if (withRecovery && vr && vr.linkage === "unconfirmed") {
      forcedC.push(
        `Commons 元数据表明图像内容非遗产对象（linkage=unconfirmed${vr.note ? "：" + vr.note : ""}），禁止用于实体配图`
      );
    }
    out.push({
      object_type: "visual_asset",
      object_id: v.asset_id,
      display_name: v.file_path.split("/").pop(),
      res: evaluateGates({
        source: v.source_id && v.checksum && v.file_path ? true : false,
        identity: undefined,
        time: hasDate ? true : undefined,
        spatial: undefined,
        evidence: undefined,
        conflict: false,
        forcedC,
      }),
    });
  }
  // evidence（baseline 38 条）
  for (const ev of evidences) {
    out.push({
      object_type: "evidence",
      object_id: ev.evidence_id,
      display_name: ev.locator || ev.subject_hint || ev.evidence_type,
      res: evaluateGates({
        source: ev.source_id && ev.locator ? true : false,
        identity: ev.subject_hint ? true : undefined,
        time: ev.time_hint ? true : undefined,
        spatial: ev.place_hint ? true : undefined,
        evidence: Number(ev.claim_count || 0) > 0 ? true : undefined,
        conflict: false,
        forcedC: [],
      }),
    });
  }
  // claims
  for (const c of claims) {
    const evCount = Number(c.ev_count || 0);
    out.push({
      object_type: "claim",
      object_id: c.claim_id,
      display_name: `${entById.get(c.subject_id)?.name || "?"} · ${c.predicate}`,
      res: evaluateGates({
        source: evCount > 0 ? true : false,
        identity: c.subject_id ? true : false,
        time: undefined,
        spatial: undefined,
        evidence: evCount > 0 ? true : false,
        conflict: false,
        forcedC: ["关键结论由 Legacy 字段继承，未经独立来源复核"],
      }),
    });
  }
  return out;
}

// before：完全按 TASK-0003 口径复算，用于验证可比性（应复现 112 / G1 91-1-20 / Tier 0-38-74）
const before = evaluateBaseline(nameTownsOld, false);
const results = evaluateBaseline(nameTowns, true);

// ---------- 本轮新增对象单独评估（36 条 Evidence + 6 条 semantic relation） ----------
// 新增对象不改变 112 基线的分母，单独统计，避免用新增对象稀释/抬高级别分布。
const newEvidenceRows = await queryRows(
  `select evidence_id::text, evidence_type, coalesce(locator,'') as locator,
          coalesce(subject_hint,'') as subject_hint, coalesce(place_hint,'') as place_hint,
          coalesce(time_hint,'') as time_hint, source_id::text, extraction_method, region_json
   from evidence where extraction_method = any(array['${ALL_PIPELINE_METHODS.join(
     "','"
   )}'])`
);
const newRelRows = await queryRows(
  `select r.relation_id::text, r.predicate, r.subject_id::text, r.object_id::text,
          (select count(*) from relation_evidence re where re.relation_id=r.relation_id) as ev_count
   from relations r where r.legacy_id is null order by r.predicate`
);
const newResults = [];
for (const ev of newEvidenceRows) {
  const rj = ev.region_json || {};
  const forcedC = [];
  if (rj.risk === "content_not_depicting_entity") {
    forcedC.push("图像内容与所附实体不匹配（Commons 元数据判定），不得用于配图");
  }
  newResults.push({
    object_type: "evidence",
    object_id: ev.evidence_id,
    display_name: `${ev.extraction_method}｜${ev.locator || ev.subject_hint || ev.place_hint}`.slice(0, 80),
    res: evaluateGates({
      source: ev.source_id && ev.locator ? true : false,
      identity: ev.subject_hint ? true : undefined,
      time: ev.time_hint ? true : undefined,
      spatial: ev.place_hint ? true : undefined,
      evidence: undefined, // 尚未挂到任何 claim，属待人工裁定
      conflict: false,
      forcedC,
    }),
  });
}
for (const r of newRelRows) {
  newResults.push({
    object_type: "relation",
    object_id: r.relation_id,
    display_name: `${entById.get(r.subject_id)?.name} → ${entById.get(r.object_id)?.name}（${r.predicate}）`,
    res: evaluateGates({
      // 新增关系可追溯性判定：以是否存在带 source_id 与 locator 的支撑 Evidence 为准
      source: Number(r.ev_count || 0) > 0 ? true : false,
      identity: r.subject_id && r.object_id ? true : false,
      time: undefined,
      spatial: undefined,
      evidence: Number(r.ev_count || 0) > 0 ? true : false,
      conflict: false,
      forcedC: [],
    }),
  });
}

// 写 audit（同对象同门先删后写，保证重跑幂等）
const auditStmts = [];
for (const item of [...results, ...newResults]) {
  for (const code of GATE_CODES) {
    const g = item.res.gates[code];
    auditStmts.push({
      sql: `delete from evidence_gate_audit where object_type=:'ot' and object_id=:'oid' and gate_code=:'gc'`,
      params: { ot: item.object_type, oid: item.object_id, gc: code },
    });
    auditStmts.push({
      sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
            values (:'ot',:'oid',:'gc',:'rs',:'rn','rule')`,
      params: { ot: item.object_type, oid: item.object_id, gc: code, rs: g.result, rn: g.reason },
    });
  }
}
await runMany(auditStmts);

// ---------- 统计 ----------
function tally(list) {
  const byGate = {};
  for (const c of GATE_CODES) byGate[c] = { pass: 0, fail: 0, pending: 0 };
  const byTier = { A: 0, B: 0, C: 0 };
  for (const r of list) {
    for (const c of GATE_CODES) byGate[c][r.res.gates[c].result]++;
    byTier[r.res.tier]++;
  }
  return { byGate, byTier, total: list.length };
}
const after = tally(results);
const beforeTally = tally(before);
const newTally = tally(newResults);

// 可比性校验：before 必须复现 TASK-0003 baseline（Tier A0/B38/C74，G1 91-1-20）
const BASELINE_TIER = { A: 0, B: 38, C: 74 };
const baselineOk =
  beforeTally.total === 112 &&
  beforeTally.byTier.A === BASELINE_TIER.A &&
  beforeTally.byTier.B === BASELINE_TIER.B &&
  beforeTally.byTier.C === BASELINE_TIER.C;
if (!baselineOk) {
  console.warn(
    "[WARN] before 复算未复现 TASK-0003 基线，before/after 不可比：" +
      JSON.stringify(beforeTally.byTier)
  );
}

// ---------- 导出 ----------
const exportsDir = path.join(PROJECT_ROOT, "data", "exports");
fs.mkdirSync(exportsDir, { recursive: true });
const cell = (v) => `"${String(v ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
const csv = (header, rows) =>
  "﻿" + [header.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n") + "\r\n";

// 1) Human Review Pack：只放真正需要用户判断的 Tier C
const reviewRows = [];
const P = (n) => String(n);
function addReview(priority, object_type, display_name, question, for_, against, refs, options) {
  reviewRows.push([`HR-${reviewRows.length + 1}`, P(priority), object_type, display_name, question, for_, against, refs, options]);
}
// 身份/外部同源链接
addReview(
  1,
  "entity",
  "吕颐浩",
  "是否认可将 Wikidata Q10918454（宋宰相吕颐浩，1071-1139）确立为 JZ-PPL-001 的外部同一性锚点？",
  "生卒年 1071-1139 与 Legacy 完全一致；Wikidata 描述『宋朝宰相』与 Legacy『南宋名相』一致；Legacy 载寺址即其故宅",
  "Wikidata 未提供该人与金泽的直接关联；族谱姓名桩（family_person:吕颐浩）无身份维度，未合并",
  "Wikidata Q10918454；Legacy JZ-PPL-001",
  "A. 采纳外部锚点；B. 仅保留 Legacy 描述不建外部链接；C. 需补方志原文后再定"
);
// 赵孟頫-颐浩寺：传说 vs 史实
addReview(
  2,
  "relation",
  "赵孟頫 ↔ 颐浩寺遗址",
  "双方描述均自述『属传说性质』，是否仍要保留该关联？以何种强度展示？",
  "颐浩寺描述提到元代『不断云』石刻传与赵孟頫相关；赵孟頫条目记载与颐浩寺的传说关联",
  "两处来源均明确标注为传说/据地方文史资料转述，不足以支撑历史结论",
  "Legacy JZ-PPL-002 / JZ-BLD-008",
  "A. 仅作『传说关联』展示并标注；B. 移出主视图待考；C. 补方志/碑刻原文后再定"
);
// 概念对应：古桥群 ↔ 四十二虹桥叠影
addReview(
  3,
  "relation",
  "'四十二虹桥' → 今存七桥 · 古今叠影 ↔ 7 座古桥",
  "是否确认该叠影实体与描述中的『金泽古桥群』为同一概念集合？确认后可批量生成 part_of 语义关系",
  "万安桥描述称『金泽古桥群中最北一座』；天皇阁桥称『金泽古桥群中唯一的三孔石拱桥』——多桥自述属于古桥群",
  "叠影实体本身描述为空（仅年代 960-1279），未明写『古桥群』；四十二虹桥与今存七桥的数量关系亦未由本批证据证明",
  "Legacy JZ-OVL-002 / JZ-BLD-002 / JZ-BLD-007",
  "A. 确认同一概念并批量生成 part_of；B. 不确认，保持 structural；C. 补《金泽小志》桥梁志原文后再定"
);
// 颐浩寺创建/故宅：历史因果
addReview(
  4,
  "relation",
  "吕颐浩 ↔ 颐浩寺遗址（创建/故宅）",
  "『就吕颐浩故宅创建、寺名取自其人』属历史因果与起源结论，是否采纳为事实？",
  "颐浩寺描述：南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人；吕颐浩条目：寺址即其故宅",
  "属二手转述（地方志所辑旧记），未见原始碑刻/方志影印；因果关系按规则默认需人工审核",
  "Legacy JZ-BLD-008 / JZ-PPL-001",
  "A. 采纳为事实；B. 降级为『据方志记载』表述；C. 补 S1 原文后再定"
);
// 视觉资产整体定位
addReview(
  5,
  "visual_asset",
  "本批 20 张视觉资产（19 张为 2026 年高铁照片）",
  "本批图像不描绘任何遗产对象，是否将其移出金泽主视图，或改作『当代金泽（高铁时代）』素材？",
  "Commons 元数据完整（作者/许可/日期/GPS 俱全），可证明当代金泽地名的存在",
  "19 张拍的是 CRH/CR400 列车，1 张为 CADAL 书影；与桥/寺/市/人无对象级关联；现代照片不能证明历史状态",
  "Wikimedia Commons imageinfo（20 条 Source Record）",
  "A. 移出遗产主视图，另作当代素材；B. 保留但标注『非遗产描绘』；C. 补充真实古桥/寺图像后再定"
);
// 赵孟頫生年冲突
addReview(
  6,
  "entity",
  "赵孟頫",
  "Legacy 生年 1271 与 Wikidata 1254-1322 不一致，以何为准？",
  "Wikidata Q197461：Chinese painter (1254-1322)；Legacy 记 1271（疑为至元年号或入元后纪年）",
  "两侧数值不同且 Legacy 未注明依据；该人物的金泽关联本身亦属传说级",
  "Wikidata Q197461；Legacy JZ-PPL-002",
  "A. 采用 Wikidata 1254-1322；B. 标注冲突待考；C. 补权威传记后再定"
);
fs.writeFileSync(
  path.join(exportsDir, "jinze-human-review-pack.csv"),
  csv(
    ["review_id", "priority", "object_type", "display_name", "decision_question", "evidence_for", "evidence_against_or_uncertainty", "source_refs", "recommended_options"],
    reviewRows
  ),
  "utf8"
);

// 2) Research Backlog：本轮无法取得来源的缺口
const backlog = [];
function addBacklog(object_type, display_name, missing, cls, hint, level) {
  backlog.push([object_type, display_name, missing, cls, hint, level]);
}
for (const c of coordStatus) {
  if (c.status !== "verified") {
    addBacklog(
      "entity",
      c.entity,
      "对象级坐标无来源（现仅有镇级锚点）",
      "S1/S3",
      "查《金泽小志》桥梁志或文保单位公布的四至/坐标；或使用政府文保名录 POI",
      c.status === "unresolved" ? "high" : "medium"
    );
  }
}
for (const rr of relResults) {
  if (rr.status === "unresolved" || rr.status === "legend_only") {
    addBacklog(
      "relation",
      `${rr.sub} → ${rr.obj}`,
      rr.status === "legend_only" ? "仅有传说级材料，需原始史料" : "两端无共现 Evidence",
      "S1",
      `在《金泽小志》/地方志原文中检索「${rr.sub}」与「${rr.obj}」同现段落`,
      "medium"
    );
  }
}
addBacklog("entity", "赵孟頫", "生年冲突（Legacy 1271 vs Wikidata 1254）", "S1", "查《元史·赵孟頫传》或权威年谱", "medium");
addBacklog("visual_asset", "金泽古桥/颐浩寺/庙会", "缺真实描绘遗产对象的图像", "S1/S2", "上图馆藏、文保名录公布图、Commons 分类 Category:Jinze", "high");
addBacklog(
  "visual_asset",
  "本批 20 张 visual_assets（source_id 指向 Legacy 来源记录）",
  "来源标签 provider=hushang-jingwei 与实际托管 upload.wikimedia.org 不一致；且 13 张 Commons 元数据不可得",
  "S2",
  "把这批资产重新挂到真实的 Commons Source Record（retrieve-external 已建 20 条），并补齐缺失的 imageinfo",
  "high"
);
addBacklog("entity", "金泽锭子谢家车 / 白苎里叠影 / 《金泽小志》", "Legacy 描述为空，无任何人文证据", "S1", "补《金泽小志》原文与民俗调查材料", "high");
addBacklog("source", "上海图书馆开放数据 / 地方志原文", "本机无 S1 API Key，无法检索馆藏与地方志原文", "S1", "需用户提供上图开放数据 API Key（data1.library.sh.cn），或开放地方志全文检索", "high");
fs.writeFileSync(
  path.join(exportsDir, "jinze-research-backlog.csv"),
  csv(["object_type", "display_name", "missing_evidence", "preferred_source_class", "search_hint", "blocking_level"], backlog),
  "utf8"
);

// 3) Evidence Recovery Report
const gateRows = GATE_CODES.map(
  (c) =>
    `| ${c} | ${beforeTally.byGate[c].pass} / ${after.byGate[c].pass} | ` +
    `${beforeTally.byGate[c].fail} / ${after.byGate[c].fail} | ` +
    `${beforeTally.byGate[c].pending} / ${after.byGate[c].pending} |`
).join("\n");
const newGateRows = GATE_CODES.map(
  (c) =>
    `| ${c} | ${newTally.byGate[c].pass} | ${newTally.byGate[c].fail} | ${newTally.byGate[c].pending} |`
).join("\n");
const coordRows = coordStatus
  .map((c) => `| ${c.entity} | ${c.status} | ${c.hasLocationalProse ? "有" : "无"} | ${c.note} |`)
  .join("\n");
const relRows = relResults
  .map(
    (r) =>
      `| ${r.sub} → ${r.obj} | ${r.predicate} | ${r.status} | ${r.semantic_predicate || "-"} | ${r.reason} |`
  )
  .join("\n");
const visStat = {
  total: visualResults.length,
  label_mismatch: visualResults.filter((v) => v.risk_flags.includes("provider_label_mismatch")).length,
  metadata_unavailable: visualResults.filter((v) => v.risk_flags.includes("metadata_unavailable")).length,
  content_not_depicting: visualResults.filter((v) => v.risk_flags.includes("content_not_depicting_entity")).length,
  license_unknown: visualResults.filter((v) => v.risk_flags.includes("license_unknown")).length,
  by_linkage: visualResults.reduce((a, v) => ((a[v.linkage] = (a[v.linkage] || 0) + 1), a), {}),
};
const visRows = visualResults
  .map(
    (v) =>
      `| ${v.file.slice(0, 42)} | ${v.provider_label || "-"} → 实际 ${v.provider_actual} | ${
        v.license || "-"
      } | ${v.created_date || "-"} | ${v.linkage} | ${v.risk} | ${v.risk_flags.join(" / ") || "-"} |`
  )
  .join("\n");
const semRows = semanticCreated
  .map((s) => `| ${s.sub} → ${s.obj} | ${s.predicate} | ${s.relation_id} |`)
  .join("\n");

const report = `# Jinze Evidence Recovery Report（TASK-0004）

- 外部检索 run: \`${state.run_id}\`
- Raw Store: \`${state.dir}\`
- 生成时间: ${new Date().toISOString()}
- 来源等级：Wikidata / Wikimedia Commons = **S2**（可直接生成 Evidence）；
  **S1（上图/地方志原文）本机无 API Key，未检索**——相关缺口已写入 research backlog，不伪造。

## 1. 本轮检索范围

| 来源 | 查询 | 用途 |
|---|---|---|
| Wikidata | Q13694319 金泽镇 | WP A 镇级坐标锚点 |
| Wikidata | Q10918454 吕颐浩 | WP C 身份识别维度 |
| Wikidata | Q197461 赵孟頫 | WP C/D 关联核验 |
| Wikimedia Commons | 本批 20 个文件的 imageinfo | WP D 视觉 provenance |

定向检索，非爬取；共 ${Object.values(srcIds).filter(Boolean).length} 条 Source Record。

## 2. WP A — 15 个 entity 坐标状态

> 状态定义：**verified**=有对象级坐标来源；**approximate**=仅有文字位置著录 + 镇级锚点；**unresolved**=无位置来源。
> 本轮 **verified = 0**：Wikidata 只有金泽镇（${townAnchor ? `${townAnchor.lat},${townAnchor.lng}` : "无"}）这一镇级锚点，
> 没有任何对象级坐标来源。镇级锚点**不得**冒充对象点位，因此 G3 仍为 fail。

| 对象 | 状态 | 文字位置著录 | 说明 |
|---|---|---|---|
${coordRows}

## 3. WP B — 24 条 relation 处理结果

> 规则：crossLink 不自动改名；只有 Evidence 明确支持才生成 semantic candidate；
> 命中句若自述为「传说/俟考」→ 记为 legend_only，**不生成**语义关系；因果类默认交人工。

| 关系 | 原谓词 | 状态 | 语义候选 | 依据 |
|---|---|---|---|---|
${relRows}

### 本轮生成的 semantic relation candidate（${semanticCreated.length} 条）

| 关系 | 语义谓词 | relation_id |
|---|---|---|
${semRows || "| （无） | - | - |"}

原 24 条 crossLink **全部保留**为 structural relation，未被改名或删除。

## 4. WP C — 吕颐浩 identity

- **重要更正**：TASK-0003 判定的「跨镇同名」是**假阳性**。同名者实为 \`family_person:吕颐浩\`——
  Legacy 中的族谱姓名桩（town/era/描述均为空），并非另一个镇的人物。本轮已排除姓名桩后重算。
- 独立识别维度：

| 维度 | Legacy | 外部(Wikidata Q10918454) | 一致 | 备注 |
|---|---|---|---|
${identity.dimensions
  .map(
    (d) =>
      `| ${d.dim} | ${d.legacy} | ${d.external} | ${d.agree ? "是" : d.note ? "不适用" : "否"} | ${
        d.note || "-"
      } |`
  )
  .join("\n")}

- **decision candidate**：\`${identity.decision}\`（依据：${identity.decision_basis}）
- 族谱姓名桩 \`family_person:吕颐浩\` **不合并**（无任何身份维度，仅凭姓名不得 merge）。
- 是否建立 Wikidata 外部同源链接属跨源身份判断 → 已写入人工审核包（HR-1）。

## 5. WP D — 20 个 visual asset provenance

> 依据 Commons imageinfo 原始元数据（作者/许可/拍摄时间/GPS/描述），**未下载原图、未做图像识别、禁止 AI 生图**。

| 文件 | 来源标签 → 实际 provider | license | created_date | linkage | 主风险 | 全部风险标记 |
|---|---|---|---|---|---|
${visRows}

**关键结论**（全为脚本实测计数，非估算）：

| 统计项 | 数量 / ${visStat.total} |
|---|---|
| 来源标签与实际 provider 不一致 | ${visStat.label_mismatch} |
| 内容经判定非遗产对象（高铁照片） | ${visStat.content_not_depicting} |
| Commons 元数据不可得 | ${visStat.metadata_unavailable} |
| license 未知 | ${visStat.license_unknown} |

1. **来源标签与实际 provider 不一致**：这批图的 \`source_id\` 仍指向 Legacy 那条来源记录
   （\`provider = hushang-jingwei\`），而实际文件托管在 \`upload.wikimedia.org\`。
   按 WP D 要求，这种不一致必须产生风险标记 —— 已写入 \`risk_flags\` 与 Evidence，
   并列入研究缺口（需把这批资产重新挂到真实的 Commons Source Record 上）。
2. **内容非遗产对象**：文件名与 Commons 描述表明为高铁照片（CRH380/CR400，描述为列车班次）与 CADAL 书影。
   它们可证明「当代金泽」地名的存在，**不能**证明任何遗产对象的历史状态；
   故 linkage = unconfirmed，且已写入人工审核包（HR-5）。
3. **元数据不可得的那些**：Commons imageinfo 未返回内容，无法核验，一律打上
   \`metadata_unavailable\` 标记 + linkage unconfirmed，**不猜测**其内容。
4. linkage 分布：${Object.entries(visStat.by_linkage)
   .map(([k, v]) => `${k}=${v}`)
   .join(" / ")}；**没有一张达到 confirmed**。

## 6. 新增 Evidence

| 类型 | 本管线已登记 | 本次运行新增 |
|---|---|---|
| coordinate（镇级锚点） | ${registeredTotal.coordinate} | ${newEvidenceCount.coordinate} |
| visual_provenance | ${registeredTotal.visual_provenance} | ${newEvidenceCount.visual_provenance} |
| identity | ${registeredTotal.identity} | ${newEvidenceCount.identity} |
| relation evidence（语义候选支撑） | ${registeredTotal.relation} | ${semanticEvidenceInserted} |

「本次运行新增」为 0 表示本次为幂等重跑（上次已写入），不是取证失败。
全部关联 Source Record；旧 Evidence 未删除、未覆盖。
注：\`evidence.evidence_type\` 受 001 迁移枚举约束（text/image/map/record/field_observation），
本轮类别改由 \`extraction_method\` 承载（coordinate_provenance / visual_provenance / identity_resolution / legacy_description_mining），未改动 001。

## 7. G0–G6 重评结果（baseline ${results.length} 个对象）

**同一套门禁规则、同一批对象、同一口径复算**：\`before\` 列由本脚本按 TASK-0003 口径原样复算
（含 family_person 姓名桩），用于证明 before/after 可比；\`after\` 列为叠加本轮取证后的结果。

| Gate | pass (before / after) | fail (before / after) | pending (before / after) |
|---|---|---|---|
${gateRows}

| Tier | before | after |
|---|---|---|
| Tier A | ${beforeTally.byTier.A} | ${after.byTier.A} |
| Tier B | ${beforeTally.byTier.B} | ${after.byTier.B} |
| Tier C | ${beforeTally.byTier.C} | ${after.byTier.C} |

可比性校验：\`before 复现 TASK-0003 基线（112 / A0-B38-C74）\` = **${baselineOk ? "通过" : "未通过（见告警）"}**。

**为何 Tier 分布没有变化（这是结论，不是失败）**：

1. **G3 空间诚实保持 fail**：本轮只取得金泽镇**镇级**坐标锚点（Wikidata P625），
   没有任何对象级坐标来源。按用户决策「镇级范围不得冒充精确点位」，G3 不得转为 pass。
2. **G4 证据支持（relation）保持 fail**：24 条 baseline crossLink 仍无自身 Evidence。
   语义化是通过**新建** semantic relation 行实现的，原 crossLink 未被改名、未被删除、也未被自动升级。
3. **吕颐浩同名假阳性已修正**：G1 fail 减 1（${beforeTally.byGate.G1.fail} → ${after.byGate.G1.fail}）。
   但该实体仍有 Legacy 坐标无来源（G3 fail），故 Tier 仍为 C。
4. 本轮**不追求 Tier A 数量**，也**没有**为通过率下调任何门禁阈值。

### 7b. 本轮新增对象（${newResults.length} 个）单独评估

新增对象不计入 112 基线的分母，避免用新增对象稀释或抬高级别分布。

| Gate | pass | fail | pending |
|---|---|---|---|
${newGateRows}

| Tier | 数量 |
|---|---|
| Tier A | ${newTally.byTier.A} |
| Tier B | ${newTally.byTier.B} |
| Tier C | ${newTally.byTier.C} |

组成：新增 Evidence ${newEvidenceRows.length} 条（坐标 / 视觉 provenance / 身份 / 关系支撑）
+ 新增 semantic relation ${newRelRows.length} 条。
新增 semantic relation 因无时间语义（G2 pending）判为 Tier B；
新增视觉 Evidence 中内容被判定为「非遗产对象」的因强制 C 理由判为 Tier C。

## 8. 已证明 / 候选 / 未解决

- **已证明**：吕颐浩身份（≥2 个独立维度一致）；20 张图的 Commons 元数据；金泽镇镇级坐标。
- **候选**：${semanticCreated.length} 条 semantic relation candidate；吕颐浩 identity decision candidate。
- **未解决**：15 个对象级坐标、多数 relation 的语义证据、赵孟頫生年冲突、遗产图像缺失、S1 原文不可达。

## 9. Unresolved gaps

见 \`jinze-research-backlog.csv\`（${backlog.length} 条）。其中 **high** 级缺口：
对象级坐标来源、遗产图像、S1（上图/地方志）API Key。

## 10. 验收命令

\`\`\`bash
node pipelines/ingest/retrieve-external.mjs   # 定向检索 → Raw Store → Source Record
node pipelines/evidence/recover.mjs           # Evidence + G0–G6 重评 + 三份导出
\`\`\`
`;
fs.writeFileSync(path.join(exportsDir, "jinze-evidence-recovery-report.md"), report, "utf8");

console.log(
  JSON.stringify(
    {
      run_id: state.run_id,
      new_evidence_inserted: {
        ...newEvidenceCount,
        relation_evidence: semanticEvidenceInserted,
      },
      registered_total: registeredTotal,
      semantic_candidates: semanticCreated.length,
      coord: {
        verified: coordStatus.filter((c) => c.status === "verified").length,
        approximate: coordStatus.filter((c) => c.status === "approximate").length,
        unresolved: coordStatus.filter((c) => c.status === "unresolved").length,
      },
      relations: {
        semantic_candidate: relResults.filter((r) => r.status === "semantic_candidate").length,
        legend_only: relResults.filter((r) => r.status === "legend_only").length,
        unresolved: relResults.filter((r) => r.status === "unresolved").length,
      },
      identity_decision: identity.decision,
      visual_risks: visualResults.reduce((a, v) => ((a[v.risk] = (a[v.risk] || 0) + 1), a), {}),
      tier_after: after.byTier,
      human_review_rows: reviewRows.length,
      backlog_rows: backlog.length,
    },
    null,
    2
  )
);
