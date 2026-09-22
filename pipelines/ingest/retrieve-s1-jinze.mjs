// pipelines/ingest/retrieve-s1-jinze.mjs — TASK-0005 WP-C + WP-D（S1 定向补证）
//
// 安全铁律（Task §3 / §13）：
//   - SHANGHAI_LIBRARY_API_KEY 仅经 process.env 取用，只注入请求 query；绝不打印、绝不写入
//     文件 / DB / 日志 / 报告。响应体不含 key，可安全落盘与打印（本脚本只打印统计，不打印响应）。
//   - source_uri / manifest 只存「不含 key 的端点或 item.uri」，绝不存带 key 的 URL。
//   - raw 落盘的是响应体（无 key），checksum 可复现。
//
// 链路：固定 P0/P1 查询 → Raw Store(append-only + checksum) → Source Record → Evidence(record/text)。
// 古籍库现代镇名命中为 0（SKILL 实证），freetext 查不到如实记「未找到」，不伪造。
// 串行请求（并发>3 会触发对方限流返回空）。不扩展其他古镇、不爬取。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import { run, runMany, queryRows } from "../../packages/data-access/src/index.mjs";
// 复用与 TASK-0004 recover 完全一致的门禁逻辑，保证「S1 证据同样走 G0–G6 gate」不变量
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";

const PROJECT_ROOT = "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0";
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
const USER_AGENT = "MoHenAgent2.0/0.1 (TASK-0005 S1 directional retrieval)";

// —— 取 key：仅内存，绝不外泄 ——
function loadKey() {
  const p = path.join(PROJECT_ROOT, ".env.local");
  if (!fs.existsSync(p)) return null;
  const text = fs.readFileSync(p, "utf8").replace(/^﻿/, "");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === "SHANGHAI_LIBRARY_API_KEY") return m[2].replace(/^["']|["']$/g, "");
  }
  return null;
}
const KEY = loadKey();
if (!KEY) {
  console.error("STOP: SHANGHAI_LIBRARY_API_KEY 未配置");
  process.exit(2);
}

function sha256(s) { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
function makeRunId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `jinze-s1-${ymd}-${crypto.randomBytes(4).toString("hex")}`;
}

// 带重定向跟随的 HTTPS GET（key 仅注入 query），返回 {status, body, parsed, error}
function getJson(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { "User-Agent": USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : "https://data1.library.sh.cn" + res.headers.location;
        res.resume();
        resolve(getJson(next));
        return;
      }
      let body = ""; res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, body, parsed, error: null });
      });
    });
    req.on("error", (e) => resolve({ status: 0, body: "", parsed: null, error: e.message }));
    req.setTimeout(25000, () => req.destroy(new Error("timeout")));
  });
}

// 从响应里抽出 items 数组（兼容不同端点形状）
function extractItems(parsed) {
  if (!parsed || typeof parsed !== "object") return [];
  if (Array.isArray(parsed.data)) return parsed.data;
  if (parsed.data && Array.isArray(parsed.data.data)) return parsed.data.data;
  if (parsed.data && parsed.data.result && Array.isArray(parsed.data.result)) return parsed.data.result;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.result)) return parsed.result;
  return [];
}

// —— 固定 P0/P1 查询集合（写死，不动态扩展）——
const QUERIES = [
  // P0-4 金泽地方志书名（gj works title 命中稳定）
  { key: "gj_works_jinze_xiaozhi", endpoint: "gj/webapi/works", qs: { title: "金泽小志" }, topic: "《金泽小志》", p: "P0", why: "P0-4 金泽地方志原文线索" },
  { key: "gj_works_qingpu", endpoint: "gj/webapi/works", qs: { title: "青浦县志" }, topic: "《青浦县志》", p: "P0", why: "P0-4 金泽所属区县方志" },
  { key: "gj_works_songjiang", endpoint: "gj/webapi/works", qs: { title: "松江府志" }, topic: "《松江府志》", p: "P0", why: "P0-4 金泽历史属松江府" },
  // P0-1/P0-3 古籍全文 freetext（现代镇名预期 0，如实记录）
  { key: "gj_inst_yihaosi", endpoint: "gj/webapi/instances", qs: { freetext: "颐浩寺" }, topic: "颐浩寺(古籍freetext)", p: "P0", why: "P0-3 颐浩寺方志记载" },
  { key: "gj_inst_pujing", endpoint: "gj/webapi/instances", qs: { freetext: "普济桥" }, topic: "普济桥(古籍freetext)", p: "P0", why: "P0-1 普济桥方志记载" },
  { key: "gj_inst_lvyihao", endpoint: "gj/webapi/instances", qs: { freetext: "吕颐浩" }, topic: "吕颐浩(古籍freetext)", p: "P0", why: "P0-3 吕颐浩方志记载" },
  { key: "gj_inst_42", endpoint: "gj/webapi/instances", qs: { freetext: "四十二虹桥" }, topic: "四十二虹桥(古籍freetext)", p: "P1", why: "P1-5 四十二虹桥方志记载" },
  // P0-2 水系/地名（地名志 dmz，含古名白苎里）
  { key: "dmz_jinze_t3", endpoint: "shnh/dmz/webapi/geonames/list", qs: { type: "3", freetext: "金泽" }, topic: "金泽(地名志)", p: "P0", why: "P0-2 金泽地名/水系空间关系" },
  { key: "dmz_jinze_t2", endpoint: "shnh/dmz/webapi/geonames/list", qs: { type: "2", freetext: "金泽" }, topic: "金泽(地名志type2)", p: "P0", why: "P0-2 金泽地名" },
  // P1-6/P1-7 人名规范（预期可能 0）
  { key: "kg_zhaomengfu", endpoint: "webapi/kg/list", qs: { freetext: "赵孟頫" }, topic: "赵孟頫(人名规范)", p: "P1", why: "P1-6/P1-7 赵孟頫生年/传说出处" },
  { key: "kg_lvYihao", endpoint: "webapi/kg/list", qs: { freetext: "吕颐浩" }, topic: "吕颐浩(人名规范)", p: "P1", why: "P1-7 吕颐浩权威资料" },
  // P0 叙事素材
  { key: "hsly_jinze", endpoint: "webapi/hsly/route/getEventList", qs: { eventFreeText: "金泽" }, topic: "金泽(叙事事件)", p: "P0", why: "P0 金泽叙事素材" },
];

// 从单个 item 抽取可引用的真实字段（绝不加 AI 补写）
function itemSummary(item) {
  if (!item || typeof item !== "object") return null;
  const parts = [];
  const push = (k, label) => { if (item[k] && String(item[k]).trim()) parts.push(`${label}：${String(item[k]).trim()}`); };
  push("dtitle", "书名");
  push("title", "题名");
  push("name", "名称");
  push("creator", "作者");
  push("edition", "版本");
  push("temporalValue", "年代");
  push("dateLabel", "时间");
  push("description", "描述");
  push("classLabel", "类别");
  return parts.length ? parts.join("；") : null;
}
function itemUri(item) {
  return item && (item.uri || item.placeUri || item.typeUri || item.resourceUri) ? (item.uri || item.placeUri || item.typeUri || item.resourceUri) : null;
}

async function main() {
  const runId = process.argv[2] || makeRunId();
  const baseDir = path.join(RAW_STORE, "external", "jinze-s1");
  const dir = path.join(baseDir, runId);
  if (fs.existsSync(dir)) throw new Error(`Raw snapshot 已存在，禁止覆盖旧 run: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });

  const sourceStmts = [];
  const evidenceStmts = [];
  const sourceChecksums = {}; // queryKey -> checksum
  const manifestQueries = [];
  let totalItems = 0;
  const workUris = []; // 供 Phase B instanceInfo 使用

  for (const q of QUERIES) {
    const qsStr = Object.entries(q.qs).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const url = `https://data1.library.sh.cn/${q.endpoint}?${qsStr}&key=${KEY}`;
    const r = await getJson(url);
    const rawFile = path.join(dir, `raw-${q.key}.json`);
    fs.writeFileSync(rawFile, r.body || "", "utf8");
    const checksum = sha256(r.body || "");
    const items = r.status === 200 && r.parsed ? extractItems(r.parsed) : [];
    const emptyState = r.parsed && r.parsed.state === -1;
    totalItems += items.length;
    if (q.endpoint === "gj/webapi/works") for (const it of items) if (it.uri) workUris.push(it.uri);

    sourceStmts.push({
      sql: `insert into source_records(provider,title,source_uri,content_type,checksum,raw_path,metadata_json)
            values (:'prov',:'title',:'uri','application/json',:'chk',:'rp',:'m'::jsonb)
            on conflict (provider, checksum) do nothing`,
      params: {
        prov: "shanghai-library",
        title: `S1 ${q.topic}`,
        uri: `https://data1.library.sh.cn/${q.endpoint}?${qsStr}`, // 不含 key
        chk: checksum,
        rp: rawFile,
        m: JSON.stringify({ endpoint: q.endpoint, query: q.qs, priority: q.p, why: q.why, item_count: items.length }),
      },
    });
    sourceChecksums[q.key] = checksum;

    // 每条 item 一条 Evidence（record/text，quote 仅来自实际字段）
    for (const it of items) {
      const summary = itemSummary(it);
      const uri = itemUri(it);
      const hasProse = it && (it.description || it.title); // 有真实文本才用 text
      const etype = hasProse ? "text" : "record";
      evidenceStmts.push({
        sql: `insert into evidence(source_id, evidence_type, locator, quote_text, subject_hint, place_hint, time_hint, extraction_method, confidence, verification_status)
              values ((select source_id from source_records where checksum=:'chk' limit 1),
                      :'etype',:'loc',:'quote',:'subj',:'place',:'time',:'meth',:'conf',:'stat')`,
        params: {
          chk: checksum,
          etype,
          loc: uri || `query:${q.key}`,
          quote: summary ? summary.slice(0, 2000) : null,
          subj: q.topic,
          place: uri && /jinze|金泽/i.test(JSON.stringify(it)) ? "金泽" : null,
          time: it && (it.temporalValue || it.dateLabel) ? String(it.temporalValue || it.dateLabel) : null,
          meth: `s1_${q.endpoint.replace(/\W/g, "_")}`,
          conf: 0.9,
          stat: "candidate",
        },
      });
    }

    manifestQueries.push({
      key: q.key, endpoint: q.endpoint, query: q.qs, priority: q.p,
      status: r.status, item_count: items.length, empty_state: !!emptyState,
      checksum,
    });
    console.error(`  [${q.p}] ${q.key}: HTTP ${r.status}, items=${items.length}`);
  }

  // Phase B：gj/instanceInfo 取每本方志的卷次/作者（P0-4 结构证据）
  for (const wuri of workUris) {
    const url = `https://data1.library.sh.cn/gj/webapi/instanceInfo?uri=${encodeURIComponent(wuri)}&key=${KEY}`;
    const r = await getJson(url);
    const rawFile = path.join(dir, `raw-instanceInfo-${crypto.createHash("sha256").update(wuri).digest("hex").slice(0, 12)}.json`);
    fs.writeFileSync(rawFile, r.body || "", "utf8");
    const checksum = sha256(r.body || "");
    const items = r.status === 200 && r.parsed ? extractItems(r.parsed) : [];
    totalItems += items.length;
    sourceStmts.push({
      sql: `insert into source_records(provider,title,source_uri,content_type,checksum,raw_path,metadata_json)
            values (:'prov',:'title',:'uri','application/json',:'chk',:'rp',:'m'::jsonb)
            on conflict (provider, checksum) do nothing`,
      params: {
        prov: "shanghai-library",
        title: `S1 方志instanceInfo ${wuri}`,
        uri: `https://data1.library.sh.cn/gj/webapi/instanceInfo?uri=${encodeURIComponent(wuri)}`,
        chk: checksum, rp: rawFile,
        m: JSON.stringify({ endpoint: "gj/webapi/instanceInfo", work_uri: wuri, item_count: items.length }),
      },
    });
    sourceChecksums["inst_" + wuri] = checksum;
    for (const it of items) {
      const summary = itemSummary(it);
      evidenceStmts.push({
        sql: `insert into evidence(source_id, evidence_type, locator, quote_text, subject_hint, place_hint, extraction_method, confidence, verification_status)
              values ((select source_id from source_records where checksum=:'chk' limit 1),
                      'record',:'loc',:'quote',:'subj',:'place',:'meth',:'conf',:'stat')`,
        params: {
          chk: checksum, loc: wuri, quote: summary ? summary.slice(0, 2000) : null,
          subj: "方志卷次/作者", place: "金泽", meth: "s1_gj_instanceInfo", conf: 0.9, stat: "candidate",
        },
      });
    }
    manifestQueries.push({ key: "inst_" + wuri.slice(-12), endpoint: "gj/webapi/instanceInfo", work_uri: wuri, status: r.status, item_count: items.length, checksum });
    console.error(`  [P0] instanceInfo ${wuri}: HTTP ${r.status}, items=${items.length}`);
  }

  // 落库
  await runMany(sourceStmts);
  await runMany(evidenceStmts);

  // —— WP-D 门禁：S1 证据同样走 G0–G6 gate（与 TASK-0004 recover 的 delete+insert 完全一致，
  // 保证「全证据可审计」不变量；否则 recover 重跑会因 S1 证据未审计而产生新增审计行，破坏幂等）——
  const s1Checksums = Object.values(sourceChecksums);
  const s1Ev = await queryRows(
    `select e.evidence_id::text as oid, e.locator, e.subject_hint, e.place_hint, e.time_hint, e.source_id::text as sid
       from evidence e join source_records s on e.source_id = s.source_id
      where s.provider='shanghai-library' and s.checksum = any(array[${s1Checksums.map((c) => `'${c}'`).join(",")}])`
  );
  const auditStmts = [];
  for (const ev of s1Ev) {
    const res = evaluateGates({
      source: ev.sid && ev.locator ? true : false,
      identity: ev.subject_hint ? true : undefined,
      time: ev.time_hint ? true : undefined,
      spatial: ev.place_hint ? true : undefined,
      evidence: undefined, // 尚未挂到任何 claim，属待人工裁定
      conflict: false,
      forcedC: [],
    });
    for (const code of GATE_CODES) {
      const g = res.gates[code];
      auditStmts.push({
        sql: `delete from evidence_gate_audit where object_type='evidence' and object_id=:'oid' and gate_code=:'gc'`,
        params: { oid: ev.oid, gc: code },
      });
      auditStmts.push({
        sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
              values ('evidence',:'oid',:'gc',:'rs',:'rn','rule')`,
        params: { oid: ev.oid, gc: code, rs: g.result, rn: g.reason },
      });
    }
  }
  await runMany(auditStmts);

  // 回读计数
  const srcCount = await queryRows(
    `select count(*) from source_records where provider='shanghai-library' and checksum in (${Object.values(sourceChecksums).map((c) => `'${c}'`).join(",")})`
  );
  const evCount = await queryRows(
    `select count(*) from evidence e join source_records sr on sr.source_id=e.source_id
       where sr.provider='shanghai-library'`
  );

  const manifest = {
    run_id: runId, schema: "mohen-s1-retrieval/v1", created_at: new Date().toISOString(),
    purpose: "TASK-0005 WP-C+WP-D 金泽 S1 定向补证", source_class: "S1",
    secret_handling: "key only via process.env query; never persisted/logged; source_uri stored key-less",
    queries: manifestQueries,
    counts: { source_records_inserted: sourceStmts.length, evidence_inserted: evidenceStmts.length, total_items: totalItems },
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(baseDir, ".last-run.json"), JSON.stringify({ run_id: runId, dir, manifest }, null, 2), "utf8");

  console.log(JSON.stringify({
    run_id: runId, dir,
    queries: QUERIES.length,
    source_records_inserted: sourceStmts.length,
    evidence_inserted: evidenceStmts.length,
    total_items: totalItems,
  }));
}

main().catch((e) => { console.error("S1 RETRIEVE FAILED:", e.message); process.exit(1); });
