// pipelines/historical-spatial/persist-evidence-closure.mjs
//
// TASK-0011 WP-C —— 把「关闭 A1–A5」的来源与逐字证据写入 source_records / evidence，并即时写 G0–G6 审计。
//
// 纪律对齐：
//  · §10 不新增迁移：只用既有 Source/Evidence 结构。
//  · §6 Evidence 必带 provider/title/URI/locator/逐字 excerpt/retrieval/verification。
//  · §12-20 每条新 Evidence 立即获得 G0–G6 快照。
//  · §12-2 Raw Store append-only（raw_path 指向 append-only 落盘件）。
//  · §12-3 published 保持 0；§12-21 orphan audit 不得增加。
//  · §12-1 Legacy 零写（脚本只读 Legacy 的 mtime/size，绝不打开写句柄）。
//  · 幂等：source_records 靠 UNIQUE(provider,checksum)；evidence 靠确定性 UUID + delete→insert。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";
import { SHL_SOURCES, OFFICIAL_SOURCES } from "./s1-evidence-closure-sources.mjs";

const LEGACY_SEED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/seed.master.json";
// 本轮检索的 Raw Store 运行目录（T11 唯一的 t11-shl-* run；全部原始响应落在此处，append-only）
const RUNDIR_PREV = "D:/MoHen/data/raw/historical-spatial/jinze/t11-closure/t11-shl-20260922-558ac496";

// 确定性 UUID v4（与 pipelines/historical-spatial/register.mjs / build-* 同构）
function deterministicUuid(seed) {
  const h = crypto.createHash("sha256").update(seed, "utf8").digest();
  const b = Buffer.from(h.slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

const legacyStat = () => {
  if (!fs.existsSync(LEGACY_SEED)) return { exists: false };
  const st = fs.statSync(LEGACY_SEED);
  return { exists: true, size: st.size, mtimeMs: st.mtimeMs };
};

const snap = async () => ({
  source_records: Number(await queryValue(`select count(*)::text c from source_records`)),
  evidence: Number(await queryValue(`select count(*)::text c from evidence`)),
  evidence_gate_audit: Number(await queryValue(`select count(*)::text c from evidence_gate_audit`)),
  claims: Number(await queryValue(`select count(*)::text c from claims`)),
  claims_published: Number(
    await queryValue(`select count(*)::text c from claims where status::text in ('verified','published')`)
  ),
  relations: Number(await queryValue(`select count(*)::text c from relations`)),
  audit_relation_orphan: Number(
    await queryValue(
      `select count(*)::text c from evidence_gate_audit a
        where a.object_type='relation'
          and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`
    )
  ),
});

const before = { ...(await snap()), legacy: legacyStat() };

// ---- 组装待写入行 ----
const EVIDENCE_METHOD = {
  "shl-heritage-red-building": { method: "t11_s1a_shl_heritage", tier: "primary", etype: "record" },
  "shl-geonames-dmz": { method: "t11_s1a_shl_geonames", tier: "primary", etype: "record" },
  "shl-whzk-photo": { method: "t11_s1a_shl_photo", tier: "primary", etype: "record" },
  "shl-gj-catalog": { method: "t11_s1a_shl_gj_catalog", tier: "primary", etype: "record" },
  "s1c-qp-gov-ancient-bridges-2025": { method: "t11_s1c_official_source", tier: "official", etype: "text" },
  "s1c-qp-gov-wanan-2023": { method: "t11_s1c_official_source", tier: "official", etype: "text" },
  "s1c-qp-museum": { method: "t11_s1c_official_source", tier: "official", etype: "text" },
  "s1c-qp-news-green-2020": { method: "t11_s1c_official_source", tier: "official", etype: "text" },
  "s1c-qp-civ-2025": { method: "t11_s1c_official_source", tier: "official", etype: "text" },
  "s1c-shtong-jinze": { method: "t11_s1c_local_chronicles", tier: "official", etype: "text" },
  "s1c-xinmin-2021": { method: "t11_s1c_media_report", tier: "secondary", etype: "text" },
  "s1c-anc-bridge": { method: "t11_s1c_association_web", tier: "secondary", etype: "text" },
};

const rows = [];
for (const src of [...SHL_SOURCES, ...OFFICIAL_SOURCES]) {
  const meta = EVIDENCE_METHOD[src.key];
  if (!meta) throw new Error("未定义 extraction_method 的来源：" + src.key);
  // Raw Store：SHL 来源的原始响应已在检索阶段 append-only 落盘；官方网页来源在此把
  // **取回的逐字 excerpt 集**落盘（append-only：已存在则跳过），使 raw_path 恒可回访。
  let rawFile = src.raw_file;
  if (!rawFile) {
    rawFile = `${src.key}.json`;
    const p = path.join(RUNDIR_PREV, rawFile);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(
        p,
        JSON.stringify(
          {
            task: "TASK-0011",
            source_key: src.key,
            provider: src.provider,
            title: src.title,
            source_uri: src.source_uri,
            source_date: src.source_date ?? null,
            retrieval: src.retrieval,
            captured_at: new Date().toISOString(),
            objects: src.objects,
          },
          null, 2
        ),
        "utf8"
      );
    }
  }
  const rawPath = path.join(RUNDIR_PREV, rawFile);
  const checksum = sha256(`TASK-0011|${src.key}|${src.source_uri || src.graph}`);
  const source = {
    source_id_local: src.key,
    provider: src.provider,
    title: src.title,
    creator: null,
    source_date: src.source_date || null,
    source_uri: src.source_uri || src.graph,
    content_type: src.content_type,
    license_code: src.license_code || null,
    checksum,
    raw_path: rawPath,
    metadata: {
      task: "TASK-0011",
      source_key: src.key,
      retrieval: src.retrieval,
      limit_note: src.limit_note ?? null,
      graph: src.graph ?? null,
      endpoint: src.graph ? "https://data1.library.sh.cn/sparql" : null,
      tier: meta.tier,
      retention: "Raw Store append-only（本目录文件已存在则跳过写入）",
    },
  };
  for (const o of src.objects) {
    rows.push({
      source_id_local: src.key,
      ev_local: `${src.key}::${o.id}`,
      source,
      evidence: {
        evidence_type: meta.etype,
        locator: o.uri || o.locator,
        quote_text: o.excerpt,
        subject_hint: o.subject_hint,
        place_hint: o.place_hint ?? null,
        time_hint: o.time_hint ?? null,
        extraction_method: meta.method,
        confidence: meta.tier === "primary" ? 0.92 : meta.tier === "official" ? 0.88 : 0.7,
        verification_status: "candidate",
        region_json: {
          task: "TASK-0011",
          source_key: src.key,
          object_id: o.id,
          assertion: o.assertion,
          label: o.label,
          supports: o.supports,
          tier: meta.tier,
          retrieval: src.retrieval,
          checksum: checksum.slice(0, 16),
        },
      },
    });
  }
}

// ---- 写 source_records ----
let srcCreated = 0, srcReused = 0;
const srcIdByLocal = {};
for (const r of rows) {
  const s = r.source;
  if (srcIdByLocal[s.source_id_local]) continue;
  const existing = await queryValue(
    `select source_id::text from source_records where provider=:'p' and checksum=:'c'`,
    { p: s.provider, c: s.checksum }
  );
  if (existing) { srcIdByLocal[s.source_id_local] = existing; srcReused++; continue; }
  const sid = deterministicUuid("t11src:" + s.source_id_local);
  await run(
    `insert into source_records(source_id,provider,title,creator,source_date,source_uri,content_type,license_code,checksum,raw_path,metadata_json)
     values (:'sid',:'p',:'t',:'cr',:'sd',:'su',:'ct',:'lc',:'cs',:'rp',:'mj')`,
    {
      sid, p: s.provider, t: s.title, cr: s.creator, sd: s.source_date, su: s.source_uri,
      ct: s.content_type, lc: s.license_code, cs: s.checksum, rp: s.raw_path,
      mj: JSON.stringify(s.metadata),
    }
  );
  srcIdByLocal[s.source_id_local] = sid;
  srcCreated++;
}

// ---- 写 evidence + G0–G6 ----
const auditStmts = [];
let evWritten = 0;
let evCreated = 0; // 本轮**首次**写入的条数（重跑时为 0 → 幂等）
for (const r of rows) {
  const eid = deterministicUuid("t11ev:" + r.ev_local);
  const sid = srcIdByLocal[r.source_id_local];
  if (!sid) throw new Error("missing source for " + r.ev_local);
  const existed = await queryValue(`select evidence_id::text from evidence where evidence_id=:'eid'`, { eid });
  if (!existed) evCreated++;
  await run(`delete from evidence where evidence_id=:'eid'`, { eid });
  const e = r.evidence;
  await run(
    `insert into evidence(evidence_id,source_id,evidence_type,locator,quote_text,region_json,subject_hint,place_hint,time_hint,extraction_method,confidence,verification_status)
     values (:'eid',:'sid',:'et',:'loc',:'qt',:'rj',:'sh',:'ph',:'th',:'em',:'cf',:'vs')`,
    {
      eid, sid, et: e.evidence_type, loc: e.locator, qt: e.quote_text, rj: JSON.stringify(e.region_json),
      sh: e.subject_hint, ph: e.place_hint, th: e.time_hint, em: e.extraction_method,
      cf: e.confidence, vs: e.verification_status,
    }
  );
  evWritten++;
  const g = evaluateGates({
    source: !!(sid && e.locator),
    identity: e.subject_hint ? true : undefined,
    time: e.time_hint ? true : undefined,
    spatial: e.place_hint ? true : undefined,
    evidence: undefined, // 尚未挂到 claim：待人工裁定，不得自动晋级
    conflict: false,
    forcedC: e.extraction_method === "t11_s1c_media_report" ? ["媒体/学会来源：仅作旁证"] : [],
  });
  for (const code of GATE_CODES) {
    auditStmts.push({ sql: `delete from evidence_gate_audit where object_type=:'ot' and object_id=:'oid' and gate_code=:'gc'`, params: { ot: "evidence", oid: eid, gc: code } });
    auditStmts.push({
      sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
            values (:'ot',:'oid',:'gc',:'rs',:'rn','rule')`,
      params: { ot: "evidence", oid: eid, gc: code, rs: g.gates[code].result, rn: g.gates[code].reason },
    });
  }
}
await runMany(auditStmts);

const after = { ...(await snap()), legacy: legacyStat() };

const checks = {
  source_records_non_decreasing: after.source_records >= before.source_records,
  // 幂等口径：只在「本轮首次写入」时计数才该增加；重跑应为 0 增量（不等于 0 即说明幂等被破坏）
  evidence_increase_equals_created: after.evidence - before.evidence === evCreated,
  audit_increase_equals_created_x7: after.evidence_gate_audit - before.evidence_gate_audit === evCreated * GATE_CODES.length,
  published_still_zero: after.claims_published === 0,
  audit_orphan_unchanged: after.audit_relation_orphan === before.audit_relation_orphan,
  relations_unchanged: after.relations === before.relations,
  legacy_zero_write:
    before.legacy.exists === after.legacy.exists &&
    before.legacy.size === after.legacy.size &&
    before.legacy.mtimeMs === after.legacy.mtimeMs,
};

const allOk = Object.values(checks).every(Boolean);
process.stdout.write(
  JSON.stringify(
    {
      task: "TASK-0011",
      evidence_rows: evWritten,
      evidence_created_this_run: evCreated,
      evidence_reused_this_run: evWritten - evCreated,
      sources_created: srcCreated,
      sources_reused: srcReused,
      source_id_by_local: srcIdByLocal,
      before, after, checks, ok: allOk,
    },
    null, 2
  ) + "\n"
);
if (!allOk) process.exit(1);
