// pipelines/ingest/retrieve-amap-jinze.mjs — TASK-0007 WP-B
//
// 金泽 P0/P1 对象的「当前 POI / 当前空间位置」grounding（S3 = 地图服务，现代层）。
//
// 铁律（TASK-0007 §4/§5/§6/§8/§9）：
//   - AMap 只负责「当前空间位置 grounding」，**不是历史证据**。
//   - 当前 POI 坐标绝不冒充历史时期对象精确坐标（region_json.current_vs_historical='current'）。
//   - 不猜坐标；镇级锚点绝不冒充对象点；多候选**禁止自动选最近的**→ 转 Human Review。
//   - 原始值必须保留；坐标系必须显式登记（AMap=GCJ-02）；不做静默换算。
//   - key 只经 process.env 取用，绝不打印/落盘/写入 source_uri。
//   - raw append-only；Source Record 按 (provider,checksum) 去重；Evidence 用确定性 UUID → 重跑幂等。
//   - 新证据入库即写 G0–G6 当前快照（复用 pipelines/evidence/gates.mjs，不修改该层）。
//
// 用法：
//   node pipelines/ingest/retrieve-amap-jinze.mjs [--p0-only]
//   node pipelines/ingest/retrieve-amap-jinze.mjs --p0-only --from-raw <runDir>
//     └ --from-raw 为**离线重放**：不发起网络请求，直接读既有 raw 快照重算结构（幂等证明用）。
//       符合 FOUNDATION「Raw 永久、append-only；结构可重算」。

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { run, queryRows } from "../../packages/data-access/src/index.mjs";
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";

// ── 常量 ────────────────────────────────────────────────────────────
const PROVIDER = "amap";
const METHOD = "spatial_anchor:amap_place_text_v3";
const ENDPOINT = "/v3/place/text";
const BASE = "https://restapi.amap.com";
const CITY_ADCODE = "310118"; // 上海市青浦区（金泽镇所属）
const RAW_ROOT = process.env.MOHEN_RAW_STORE_PATH
  ? path.join(process.env.MOHEN_RAW_STORE_PATH, "external", "jinze-spatial")
  : "D:/MoHen/data/raw/external/jinze-spatial";

// 决策规则（写死并写入 region_json，保证可复现、非"就近择一"）
const DECISION_RULE =
  "仅当「名称与检索词完全一致」且「adname 或 address 含『金泽』」的候选恰为 1 个时才接受为 provider 对象点；" +
  "0 个该类候选 → ambiguous/unresolved；≥2 个 → ambiguous。禁止以距离远近作为取舍依据。";

// ── P0 / P1 靶子（严格取自任务书，不扩）──────────────────────────
const TARGETS = [
  { tier: "P0", entity_name: "万安桥", keywords: ["万安桥"] },
  { tier: "P0", entity_name: "普济桥", keywords: ["普济桥"] },
  { tier: "P0", entity_name: "迎祥桥", keywords: ["迎祥桥"] },
  { tier: "P0", entity_name: "颐浩寺遗址", keywords: ["颐浩寺", "颐浩禅寺"] },
  { tier: "P0", entity_name: "白苎里 → 金溪 → 金泽 · 地名叠影", keywords: ["金泽镇"] },
  { tier: "P1", entity_name: "如意桥", keywords: ["如意桥"] },
  { tier: "P1", entity_name: "天皇阁桥", keywords: ["天皇阁桥", "天王阁桥"] },
  { tier: "P1", entity_name: "金泽放生桥", keywords: ["放生桥"] },
  { tier: "P1", entity_name: "林老桥", keywords: ["林老桥"] },
];

// ── 工具 ───────────────────────────────────────────────────────────
function detUuid(code) {
  const h = crypto.createHash("sha256").update(`mohen-spatial/v1/${code}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const norm = (s) => String(s || "").replace(/\s+/g, "");
const slugify = (s) => String(s).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "_");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 构造查询 URL；sanitized 版**不含 key**，用于 source_uri / locator 登记
function buildUrl(keywords, key) {
  const u = new URL(BASE + ENDPOINT);
  if (key) u.searchParams.set("key", key);
  u.searchParams.set("keywords", keywords);
  u.searchParams.set("city", CITY_ADCODE);
  u.searchParams.set("citylimit", "true");
  u.searchParams.set("offset", "25");
  u.searchParams.set("page", "1");
  u.searchParams.set("extensions", "all");
  u.searchParams.set("output", "JSON");
  const full = u.toString();
  const san = new URL(full);
  san.searchParams.delete("key");
  return { full, sanitized: san.toString() };
}

function loadKey() {
  // 来源：本机 .env.local（gitignored），由 packages/data-access 的 loadDotEnv() 在导入时注入 process.env。
  // 本函数只读取，不打印、不落盘、不写入任何 URI；缺失即 STOP。
  const k = process.env.AMAP_API_KEY;
  if (!k || !k.trim()) {
    throw new Error(
      "AMAP_API_KEY 未配置：请在本机 .env.local 配置后重试（不要在此处或聊天中粘贴 key）。"
    );
  }
  return k.trim();
}

// 取响应：在线抓取（写 raw，append-only）或离线重放（读既有 raw）
async function getResponse(keywords, slug, rawDir, replayDir, key) {
  const fileName = `raw-amap-${slug}.json`;
  const urls = buildUrl(keywords, null);

  if (replayDir) {
    const p = path.join(replayDir, fileName);
    if (!fs.existsSync(p)) {
      return { missing: true, keywords, rawPath: p, sanitized: urls.sanitized, httpStatus: null, text: null, parsed: null };
    }
    const text = fs.readFileSync(p, "utf8");
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* 交由上层判为异常 */
    }
    // 重放时用 raw 的实际落盘时间，保证「检索时刻」可复现（而非用当前时刻）
    return { replay: true, keywords, rawPath: p, sanitized: urls.sanitized, httpStatus: null, text, parsed, mtimeMs: fs.statSync(p).mtimeMs };
  }

  const { full } = buildUrl(keywords, key);
  const res = await fetch(full, {
    headers: { "User-Agent": "mohen-agent-2.0/0.1 (research; jinze spatial grounding)" },
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* 保留原文 */
  }
  const rawPath = path.join(rawDir, fileName);
  fs.writeFileSync(rawPath, text, "utf8"); // append-only（每次 run 独立目录，不覆盖历史）
  return { replay: false, keywords, rawPath, sanitized: urls.sanitized, httpStatus: res.status, text, parsed, mtimeMs: fs.statSync(rawPath).mtimeMs };
}

// ── Source Record 登记（每次查询一条；按 (provider, checksum) 去重）──
// source_uri 使用 sanitized（不含 key）；key 绝不落盘。
async function registerSource({ r, kw, runId }) {
  const checksum = sha256(r.text);
  const srcUuid = detUuid(`source:${PROVIDER}:${checksum}`);
  const pre = await queryRows(
    `select source_id::text as id from source_records where provider=:'p' and checksum=:'ck'`,
    { p: PROVIDER, ck: checksum }
  );
  const existed = pre.length > 0;
  if (!existed) {
    await run(
      `insert into source_records(source_id, provider, title, retrieved_at, source_uri, content_type,
                                 license_code, checksum, raw_path, metadata_json, legacy_id)
       values (:'id'::uuid, :'p', :'t', now(), :'uri', 'application/json', :'lic', :'ck', :'rp', :'md'::jsonb, null)
       on conflict (provider, checksum) do nothing`,
      {
        id: srcUuid,
        p: PROVIDER,
        t: `AMap place/text「${kw}」(city=${CITY_ADCODE})`,
        uri: r.sanitized, // 绝不含 key
        lic: "AMap Web Service ToS（仅内部核验，不得再分发原始 POI 数据）",
        ck: checksum,
        rp: r.rawPath,
        md: JSON.stringify({
          endpoint: ENDPOINT,
          keywords: kw,
          city: CITY_ADCODE,
          http_status: r.httpStatus,
          replay: !!r.replay,
          amap_status: r.parsed ? r.parsed.status : null,
          amap_info: r.parsed ? r.parsed.info : null,
          run_id: runId,
          key_persisted: false,
        }),
      }
    );
  }
  const row = await queryRows(
    `select source_id::text as id from source_records where provider=:'p' and checksum=:'ck'`,
    { p: PROVIDER, ck: checksum }
  );
  return { sourceId: row[0].id, existed };
}

// ── 主流程 ─────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const p0Only = argv.includes("--p0-only");
  const ri = argv.indexOf("--from-raw");
  const replayDir = ri >= 0 ? argv[ri + 1] : null;
  if (ri >= 0 && !replayDir) throw new Error("--from-raw 需要指定 run 目录");

  KEY = replayDir ? "" : loadKey(); // 重放模式不接触 key

  const runId = `jinze-spatial-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${crypto
    .randomBytes(4)
    .toString("hex")}`;
  const rawDir = path.join(RAW_ROOT, runId);
  if (!replayDir) fs.mkdirSync(rawDir, { recursive: true });

  // raw 归属：离线重放时**不产生**新 raw 目录，故 evidence 必须指向「raw 实际所在的 run 目录」。
  // 否则 region_json.run_id 会指向一个不存在的目录 → 破坏 evidence → raw 的可追溯性（不变量 14）。
  const rawRunId = replayDir ? path.basename(replayDir.replace(/[\\/]+$/, "")) : runId;

  const entities = await queryRows(
    `select entity_id::text as id, canonical_name, legacy_id from entities`
  );
  const byName = new Map(entities.map((e) => [e.canonical_name, e]));

  const summary = {
    run_id: runId,
    raw_run_id: rawRunId,
    mode: replayDir ? `replay:${replayDir}` : "fetch",
    raw_dir: replayDir || rawDir,
    targets: 0,
    evidence_written: 0,
    source_created: 0,
    source_reused: 0,
    audit_rows: 0,
    by_status: {},
    outcomes: [],
  };

  const list = p0Only ? TARGETS.filter((t) => t.tier === "P0") : TARGETS;
  summary.targets = list.length;

  for (const t of list) {
    const ent = byName.get(t.entity_name);
    if (!ent) throw new Error(`entity not found (fail loud): ${t.entity_name}`);

    // 全部异名都尝试；只在「已确定性接受」时提前停止；否则留存全部尝试供人审。
    // 注意：不得因「候选多」提前中断——那会掩盖异名可命中的可能。
    const attempts = [];
    let acceptedAtt = null;
    for (const kw of t.keywords) {
      const slug = `${slugify(t.entity_name)}__${kw}`;
      const r = await getResponse(kw, slug, rawDir, replayDir, KEY);
      if (r.missing) throw new Error(`--from-raw 缺少快照：${r.rawPath}`);
      const ok = r.parsed && String(r.parsed.status) === "1";
      const pois = ok && Array.isArray(r.parsed.pois) ? r.parsed.pois : [];
      const exact = pois.filter((p) => norm(p.name) === norm(kw));
      const scoped = exact.filter(
        (p) => String(p.adname || "").includes("金泽") || String(p.address || "").includes("金泽")
      );
      // 每次查询都登记 Source Record（§4 WP-B："For every query … register Source Record"）
      // 即便该次查询未被采纳为最终判定依据，其原始响应仍须可追溯。
      const src = await registerSource({ r, kw, runId });
      const att = { kw, r, ok, pois, exact, scoped, sourceId: src.sourceId, sourceReused: src.existed };
      if (src.existed) summary.source_reused++;
      else summary.source_created++;
      attempts.push(att);
      if (ok && scoped.length === 1) {
        acceptedAtt = att;
        break;
      }
      if (!replayDir) await sleep(400);
    }

    const chosen =
      attempts.find((a) => a.scoped.length >= 1) ||
      attempts.find((a) => a.exact.length >= 1) ||
      attempts[0];
    const { kw, r, ok, pois, exact, scoped } = chosen;
    const accepted = acceptedAtt ? acceptedAtt.scoped[0] : null;

    // ── 状态判定（绝不"就近选一"）────────────────────────────────
    let status;
    let reason;
    if (!ok) {
      status = "unresolved";
      reason = `AMap 返回非成功态（status=${r.parsed ? r.parsed.status : "n/a"}, info=${r.parsed ? r.parsed.info : "unparseable"}）`;
    } else if (scoped.length === 1) {
      status = "official_or_provider_object_point";
      reason = "唯一候选，且名称完全一致且位置落在金泽（adname/address 含『金泽』）";
    } else if (scoped.length >= 2) {
      status = "ambiguous";
      reason = `金泽范围内有 ${scoped.length} 个名称完全一致的候选，禁止自动择一，转人工复核`;
    } else if (pois.length === 0) {
      status = "unresolved";
      reason = "0 命中（该检索词在青浦区无结果）";
    } else if (exact.length === 0) {
      status = "ambiguous";
      reason = `有 ${pois.length} 个候选但无名称完全一致者（含异名/复合名情形），需人工判定`;
    } else {
      status = "ambiguous";
      reason = `有名称完全一致的候选 ${exact.length} 个，但均不在金泽范围内（可能是同名异地），转人工复核`;
    }

    // 歧义/未命中：把候选点完整留给人审，管线不替人做取舍
    const candidatePoints =
      status === "official_or_provider_object_point"
        ? []
        : pois.slice(0, 8).map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            address: p.address,
            adname: p.adname,
            location_raw: p.location,
            coord_system: "GCJ-02",
            exact_name_match: norm(p.name) === norm(kw),
            inside_jinze:
              String(p.adname || "").includes("金泽") || String(p.address || "").includes("金泽"),
          }));

    const locRaw = accepted ? String(accepted.location || "") : null;
    const [lngS, latS] = locRaw ? locRaw.split(",") : [null, null];

    const region = {
      spatial_anchor: true,
      provider: PROVIDER,
      provider_endpoint: ENDPOINT,
      object_ref: {
        entity_id: ent.id,
        entity_legacy_id: ent.legacy_id,
        canonical_name: ent.canonical_name,
        binding: "entity.canonical_name → entity_id（新库无坐标列，绑定记录于 region_json）",
      },
      precision_status: status,
      precision_scope: accepted ? "object_point_provider" : "unknown",
      coord_system: accepted ? "GCJ-02" : null,
      original: accepted ? { lat: Number(latS), lng: Number(lngS), location_raw: locRaw } : null,
      transformed: null,
      transform_applied: false,
      transform_method: null,
      transform_reason: accepted
        ? "AMap 使用 GCJ-02；无官方 GCJ-02→WGS-84 权威算法。为避免与 WGS-84（Wikidata 镇锚）混用造成偏移，保留原始 GCJ-02 且不做换算。"
        : null,
      current_vs_historical: "current",
      current_vs_historical_note:
        "该坐标为**当前** POI/位置；仅证明『当前地图上的位置』，不证明历史时期对象占据该点，也不构成历史位置证据。",
      retrieved_at: new Date(r.mtimeMs || Date.now()).toISOString(),
      run_id: rawRunId,
      replay_from: replayDir || null,
      source_query: { endpoint: ENDPOINT, keywords: kw, city: CITY_ADCODE, citylimit: true },
      provider_hit: accepted
        ? {
            id: accepted.id,
            name: accepted.name,
            type: accepted.type,
            typecode: accepted.typecode,
            address: accepted.address,
            adname: accepted.adname,
            cityname: accepted.cityname,
            pname: accepted.pname,
            location_raw: locRaw,
          }
        : null,
      candidate_counts: { total: pois.length, exact_name: exact.length, jinze_scoped: scoped.length },
      candidate_points: candidatePoints,
      query_attempts: attempts.map((a) => ({
        keywords: a.kw,
        amap_status: a.r.parsed ? a.r.parsed.status : null,
        amap_info: a.r.parsed ? a.r.parsed.info : null,
        candidates_total: a.pois.length,
        candidates_exact_name: a.exact.length,
        candidates_jinze_scoped: a.scoped.length,
        raw_path: a.r.rawPath,
        source_id: a.sourceId,
        source_reused: a.sourceReused,
      })),
      decision_rule: DECISION_RULE,
      decision_reason: reason,
      confidence: 0,
    };

    // ── Source Record：已在查询循环内逐次登记（registerSource），此处取「被采纳那次」的 source ──
    const sourceId = chosen.sourceId;
    const existed = chosen.sourceReused;

    // ── Evidence（确定性 UUID → 重跑幂等）───────────────────────
    const evId = detUuid(`evidence:${PROVIDER}:${t.entity_name}`);
    const locator = accepted ? `https://www.amap.com/place/${accepted.id}` : `${r.sanitized}#${status}`;
    const quote = accepted
      ? `AMap place/text 命中（${kw}）：name=${accepted.name}；type=${accepted.type || ""}；` +
        `address=${accepted.address || ""}；adname=${accepted.adname || ""}；` +
        `location=${locRaw}（GCJ-02，当前 POI，非历史位置）`
      : `AMap place/text 未接受为对象点（判定=${status}）：` +
        attempts
          .map(
            (a) =>
              `[${a.kw}] status=${a.r.parsed ? a.r.parsed.status : "n/a"} 候选=${a.pois.length} 完全同名=${a.exact.length} 金泽内=${a.scoped.length}`
          )
          .join("；") +
        `；原因=${reason}`;

    await run(
      `insert into evidence(evidence_id, source_id, evidence_type, locator, quote_text, region_json,
                            subject_hint, place_hint, time_hint, extraction_method, confidence, verification_status)
       values (:'id'::uuid, :'sid'::uuid, 'record', :'loc', :'q', :'rg'::jsonb,
               :'sh', :'ph', :'th', :'em', 0, 'candidate')
       on conflict (evidence_id) do update set
         source_id=excluded.source_id, locator=excluded.locator, quote_text=excluded.quote_text,
         region_json=excluded.region_json, subject_hint=excluded.subject_hint,
         place_hint=excluded.place_hint, time_hint=excluded.time_hint,
         extraction_method=excluded.extraction_method, verification_status='candidate'`,
      {
        id: evId,
        sid: sourceId,
        loc: locator,
        q: quote,
        rg: JSON.stringify(region),
        // 仅在接受为对象点时才声明身份（G1 诚实：模糊/未命中不冒认身份）
        sh: accepted ? ent.canonical_name : null,
        ph: ent.canonical_name,
        // time_hint 留空：当前坐标不证明历史时期有效性 → G2 保持 pending（不冒认时间语义）
        th: null,
        em: METHOD,
      }
    );
    summary.evidence_written++;

    // ── G0–G6 当前快照（与 recover.mjs 的 evidence 口径一致）─────
    const res = evaluateGates({
      source: true,
      identity: accepted ? true : false,
      time: undefined,
      spatial: accepted ? true : undefined,
      evidence: undefined,
      conflict: status === "ambiguous",
      forcedC: [],
    });
    for (const gc of GATE_CODES) {
      await run(
        `delete from evidence_gate_audit where object_type='evidence' and object_id=:'oid' and gate_code=:'gc'`,
        { oid: evId, gc }
      );
      await run(
        `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
         values ('evidence',:'oid',:'gc',:'rs',:'rn','rule')`,
        { oid: evId, gc, rs: res.gates[gc].result, rn: res.gates[gc].reason }
      );
      summary.audit_rows++;
    }

    summary.by_status[status] = (summary.by_status[status] || 0) + 1;
    summary.outcomes.push({
      tier: t.tier,
      object: t.entity_name,
      keyword_used: kw,
      status,
      gate_tier: res.tier,
      gate_summary: res.summary,
      candidate_counts: region.candidate_counts,
      accepted_point: accepted ? { lng: Number(lngS), lat: Number(latS), gcj02: locRaw } : null,
      evidence_id: evId,
      source_id: sourceId,
      source_reused: existed,
      reason,
    });

    if (!replayDir) await sleep(400);
  }

  if (!replayDir) {
    fs.writeFileSync(
      path.join(rawDir, "_run-summary.json"),
      JSON.stringify({ ...summary, key_persisted: false }, null, 1),
      "utf8"
    );
  }
  console.log(JSON.stringify(summary, null, 1));
}

let KEY = "";
main().catch((e) => {
  console.error("FAILED:", e && e.message ? e.message : e);
  process.exit(1);
});
