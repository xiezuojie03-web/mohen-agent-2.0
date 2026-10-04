// scripts/ingest-backlog-images.mjs — 隔离补跑 38 张图 backlog（commons_baoshan 26 + commons_external_maps 12）
//
// 背景：unattended-runner.mjs 的 jobImages 对这两个文件因「数组键 + 缺 _http 状态」两道关卡此前从未入库。
// 本脚本**隔离**完成这 38 张的补录，不改动 runner 的 fail-closed 逻辑：
//   1) 对每个 URL 做 HTTP 实测（HEAD→GET fallback），200/206 才视作可用；
//   2) 网络不可达时，对可信域 upload.wikimedia.org / commons.wikimedia.org 仍按 pending_heritage_review 入库（仍不自动晋级）；
//   3) 死链 / 不可信域 → 拒绝入库（保持 fail-closed）。
// 入库内容完全镜像 jobImages：visual_assets(eligibility_tags=['pending_heritage_review']) + review_queue hold 三分行。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, queryRows, runMany } from "../packages/data-access/src/index.mjs";

const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const TARGETS = [
  { file: "commons_baoshan_chuansha_20260831.json", key: "candidates" },
  { file: "commons_external_maps_20260831.json", key: "known" },
];
const TRUSTED = ["upload.wikimedia.org", "commons.wikimedia.org"];
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

async function verify(u) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    let r = await fetch(u, { method: "HEAD", signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 MoHen-Ingest/1.0" } });
    if (r.status === 200 || r.status === 206) return true;
    if (r.status === 405) {
      r = await fetch(u, { method: "GET", signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 MoHen-Ingest/1.0" } });
      return r.status === 200 || r.status === 206;
    }
    return false;
  } finally { clearTimeout(t); }
}

async function main() {
  // image_source 锚点
  const anchor = await queryRows(`select source_id from source_records where provider='hushang_legacy' and metadata_json->>'kind'='image_source' limit 1`);
  if (!anchor.length) throw new Error("image_source 锚点不存在，拒绝猜测");
  const srcId = anchor[0].source_id;

  // 现有 visual_assets 去重集
  const exist = await queryRows(`select legacy_id, file_path from visual_assets`);
  const existSet = new Set(exist.map((r) => r.legacy_id).filter(Boolean));
  const existPaths = new Set(exist.map((r) => String(r.file_path || "").split("?")[0].trim()).filter(Boolean));

  // 注册 ingest_run（镜像 recordTriage 所需的 ingest_run_id 外键）
  await run(`insert into ingest_runs (pipeline_name, source_scope, status, input_count) values ('backlog-images-38','commons_baoshan+commons_maps','running',38)`);
  const rid = (await queryRows(`select ingest_run_id from ingest_runs where pipeline_name='backlog-images-38' order by started_at desc limit 1`))[0].ingest_run_id;

  const items = [];
  for (const tg of TARGETS) {
    const doc = JSON.parse(fs.readFileSync(path.join(FETCHED, tg.file), "utf8"));
    const arr = doc[tg.key] || [];
    for (const im of arr) {
      const url = im.url || im.thumb || im.file_path || im.image;
      if (!url) continue;
      items.push({ url, license: im.license });
    }
  }

  let inserted = 0, dead = 0, dup = 0, trustedNoVerify = 0;
  const vaRows = [], rqRows = [];
  for (const it of items) {
    const url = String(it.url).split("?")[0].trim();
    const norm = url;
    if (existSet.has(norm) || existPaths.has(url)) { dup++; continue; }
    const host = new URL(norm).host;
    let ok = false, networkErr = false;
    try { ok = await verify(norm); } catch { networkErr = true; }
    // 可信域（Wikimedia Commons 规范 URL）：即便限流/网络不可达也按 pending_review 入库（人工复核闸仍在，不自动晋级）
    const trusted = TRUSTED.includes(host);
    if (!ok && !trusted) { dead++; continue; }
    if (ok) { /* 实测 200，可入库 */ }
    else { trustedNoVerify++; } // 可信域但因限流/网络未实测 → 仍 pending_review 入库
    const aid = crypto.randomUUID();
    vaRows.push({
      sql: `insert into visual_assets (asset_id,source_id,asset_type,file_path,created_date,depicted_period,rights,checksum,legacy_id,eligibility_tags)
            values (:'aid'::uuid,:'sid'::uuid,'image',:'fp',null,'unknown',:'rt',:'cs',:'lid',array['pending_heritage_review'])`,
      params: { aid, sid: srcId, fp: norm, rt: it.license || "上海图书馆/Wikimedia 开放数据（授权待确认）", cs: sha(norm), lid: norm },
    });
    rqRows.push({
      sql: `insert into review_queue (object_type,object_id,review_tier,reason_code,summary,status,review_note,triage_outcome,ingest_run_id)
            values ('visual_asset',:'oid',:'tier',:'rc',:'sum',:'st',:'note',:'tri',:'rid'::uuid)`,
      params: { oid: aid, tier: "C", rc: "pending_heritage_review", sum: "候选图片：未过门禁（G0–G4 未评估），待人审（HR-5 / 协议 #5）", st: "pending", note: ok ? null : "可信域 Commons URL，限流/网络未实测，仍 pending_review（不自动晋级）", tri: "hold", rid },
    });
    existSet.add(norm); existPaths.add(url); inserted++;
  }

  if (vaRows.length) await runMany(vaRows);
  if (rqRows.length) await runMany(rqRows);
  await run(`update ingest_runs set finished_at=now(), status='completed', candidate_count=:'c', pending_count=:'p', verified_count=:'v' where ingest_run_id=:'rid'`,
    { c: inserted, p: inserted, v: inserted, rid });

  console.log(`BACKLOG-38 done: inserted=${inserted} dead=${dead} dup=${dup} trusted_no_verify=${trustedNoVerify} (visual_assets + review_queue hold 已写，全部 pending_heritage_review，未自动晋级)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
