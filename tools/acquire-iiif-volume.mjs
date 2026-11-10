#!/usr/bin/env node
// Y07/Y08 整卷自动取件：IIIF Presentation（manifest）+ IIIF Image（逐页影像）组合路径。
//
// 为什么需要它（对应规范原文，不是自选题目）：
//   * Y07：「可组合 REST/OAI-PMH/SPARQL/IIIF Presentation/Image/HTTP-Range/批量包」；
//     「检查认证、速率、保存权限、分页边界」「产生逐次 Attempt」。
//   * Y08：「核原始字节长度、MIME/魔数、SHA256 与可得官方 Hash、全部页卷图幅范围」；
//     验收「已取得范围有明确分母或标未知」；禁止反例「缺页称全件」。
//   此前只有 M0002 人工下载单页（tools/fetch-naj-page.py 还硬编码 canvas 号），
//   分母只能写 unknown。本工具把"整卷"变成一次可复算的真实获取。
//
// 边界：
//   * 只做已获授权来源的合法取件；取件前强制核对该来源 rights_by_action 的
//     download/retain/machine_read，缺一为 allowed 即停（HOLD），不绕访问控制。
//   * 每页一个 source_version（既有登记函数要求 version.checksum 与本页字节一致），
//     每页一个 raw_item、一个私有原件；整卷摘要另行计算并写入尝试与覆盖结论。
//   * 不写 Gate、不签资格；attempt/coverage 仍只经 source-discovery-repository 唯一写入口。
//   * 分母只认 manifest 的 canvas 总数（并记录 manifest 自身 sha256），不按"下到几页"自证。
//
// 用法（默认只读演算，不落库）：
//   node tools/acquire-iiif-volume.mjs --manifest <manifest.json> --title "松江府志7" \
//        --provider "国立公文书馆(NAJ)" [--catalog-no NAJDA-292-0017] [--width 1800] \
//        [--pages all|1-73] [--delay-ms 1200] [--apply]
import fs from "node:fs";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createLocalPrivateOriginalStorage, MAX_ORIGINAL_BYTES } from "../packages/data-access/src/private-original-storage.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";

const ROOT = new URL("..", import.meta.url);
for (const name of [".env.local", ".env"]) {
  const file = new URL(name, ROOT);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const APPLY = process.argv.includes("--apply");
const PROJECT_ID = arg("project-id", "b0a11000-0000-4000-8000-000000000001");
const OWNER = arg("owner", "270bcecf-9bfb-4865-9432-a0ac9db8df75");
const MANIFEST = arg("manifest");
const TITLE = arg("title");
const PROVIDER = arg("provider");
const CATALOG_NO = arg("catalog-no", "");
const WIDTH = Number(arg("width", "1800"));
const DELAY_MS = Number(arg("delay-ms", "1200"));
const PAGES = arg("pages", "all");
// --resume：已在本库登记过的页（同来源/同页/同取图宽度）不再向对方重复请求，
// 改为从私有存储回读字节并复核哈希后计入本次整卷。限流下的续取是真实能力，不是抄近路。
const RESUME = process.argv.includes("--resume");
const METHOD_KEY = "M0003";
const METHOD_VERSION = "v1";
const UA = "MoHenResearch/1.0 (digital humanities; contact: owner)";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (code, extra = {}) => { console.log(JSON.stringify({ status: "IIIF_VOLUME_FAILED", error: code, ...extra }, null, 2)); process.exitCode = 1; };

// 整卷摘要：把"哪一页、哪份字节、多大"钉成一个可复算的哈希。分母与页序都进摘要，
// 因此少一页或多一页都会算出不同的值，无法用"缺页称全件"蒙过回读比对。
function volumeDigest({ manifestSha256, width, pages }) {
  const canonical = JSON.stringify({
    manifest_sha256: manifestSha256, width, pages: pages.map((p) => [p.page, p.sha256, p.byte_size]),
  });
  return sha256(Buffer.from(canonical, "utf8"));
}

function parseRange(spec, total) {
  if (!spec || spec === "all") return Array.from({ length: total }, (_, i) => i + 1);
  const out = [];
  for (const part of String(spec).split(",")) {
    const [a, b] = part.split("-").map((v) => Number(v.trim()));
    if (!Number.isSafeInteger(a) || a < 1) throw new Error(`IIIF_PAGES_RANGE_INVALID:${part}`);
    const end = b === undefined || Number.isNaN(b) ? a : b;
    if (end < a || end > total) throw new Error(`IIIF_PAGES_RANGE_OUT_OF_BOUNDS:${part}:${total}`);
    for (let n = a; n <= end; n += 1) out.push(n);
  }
  return [...new Set(out)];
}

// Presentation v2（sequences[].canvases[]）与 v3（items[].items[]）都读；
// 每页优先用 Image service 基址按目标宽度取图，没有 service 才退回 resource 原 URL。
function parseManifest(manifest) {
  const canvases = [];
  for (const seq of manifest?.sequences ?? []) canvases.push(...(seq.canvases ?? []));
  for (const item of manifest?.items ?? []) {
    if (Array.isArray(item.items) && item.type !== "Canvas") {
      for (const canvas of item.items) if (canvas?.type === "Canvas" || canvas?.images) canvases.push(canvas);
    } else if (item?.type === "Canvas" || Array.isArray(item?.images)) canvases.push(item);
  }
  const labelOf = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(labelOf).filter(Boolean).join(" ");
    if (value && typeof value === "object") return Object.values(value).map(labelOf).filter(Boolean).join(" ");
    return "";
  };
  const pages = canvases.map((canvas, index) => {
    const image = canvas?.images?.[0]?.resource
      ?? canvas?.items?.[0]?.items?.[0]?.body ?? null;
    const service = Array.isArray(image?.service) ? image.service[0] : image?.service ?? null;
    const serviceId = typeof service === "string" ? service : service?.["@id"] ?? service?.id ?? null;
    return {
      page: index + 1,
      canvas_id: String(canvas?.["@id"] ?? canvas?.id ?? ""),
      label: labelOf(canvas?.label),
      width: Number(canvas?.width) || null,
      height: Number(canvas?.height) || null,
      image_service: serviceId,
      image_url: image?.["@id"] ?? image?.id ?? null,
    };
  });
  return pages;
}

function imageUrlFor(page, width) {
  if (page.image_service) return `${page.image_service}/full/${width},/0/default.jpg`;
  if (page.image_url) return page.image_url;
  throw new Error(`IIIF_PAGE_NO_IMAGE_SOURCE:${page.page}`);
}

async function get(url, { timeoutMs = 90000, maxBytes = 40 * 1024 * 1024 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal, redirect: "follow" });
    if (!response.ok) throw Object.assign(new Error(`HTTP_${response.status}`), { httpStatus: response.status });
    const type = response.headers.get("content-type") ?? "";
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > maxBytes) throw new Error("IIIF_RESPONSE_TOO_LARGE");
      chunks.push(Buffer.from(chunk));
    }
    return { bytes: Buffer.concat(chunks), contentType: type.split(";")[0].trim().toLowerCase() };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, { attempts = 3, label = "" } = {}) {
  let last = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await get(url);
    } catch (error) {
      last = error;
      const status = error?.httpStatus;
      // 429/5xx 是限流与瞬时故障；403 在本馆常见于突发限频，退避后只再试一次，
      // 仍失败即按"明确拒绝不机械重复"记账（规范 Y07 失败/停止路线）。
      const retriable = status === 429 || status === 403 || status === 503 || status === 502 || status === 504
        || error?.name === "AbortError" || /HTTP_5\d\d/.test(String(error?.message));
      const budget = status === 403 ? 2 : attempts;
      if (!retriable || i >= budget) break;
      await sleep(status === 403 ? Math.max(DELAY_MS * 4, 5000) : DELAY_MS * 2 ** i);
    }
  }
  throw Object.assign(new Error(`IIIF_FETCH_FAILED:${label}:${String(last?.message ?? last)}`),
    { cause: last, httpStatus: last?.httpStatus ?? null });
}

function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 3600000 })).toString("base64url");
  const sig = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  return `${payload}.${sig}`;
}

async function ensureSource() {
  const existing = await queryRows(
    `select source_id::text as source_id, carrier_type, content_availability, rights_by_action
       from source.sources where provider=:'p' and title=:'t'`, { p: PROVIDER, t: TITLE });
  if (existing.length > 1) throw new Error("IIIF_SOURCE_AMBIGUOUS");
  if (existing.length === 1) return { ...existing[0], created: false };
  // 只读演算不得留下任何行：没有来源就如实报"待登记"，不预先建空壳来源。
  if (!APPLY) return { source_id: null, rights_by_action: {}, created: false, missing: true };
  const rows = await queryRows(
    `insert into source.sources(provider,title,source_type,carrier_type,content_availability,provenance_status,
       source_uri_or_catalog_no,original_locator,scope)
     values (:'p',:'t','gazetteer','scanned_page','image_scan','verified',:'no',:'locator'::jsonb,:'scope'::jsonb)
     returning source_id::text as source_id, carrier_type, content_availability, rights_by_action`,
    { p: PROVIDER, t: TITLE, no: CATALOG_NO,
      locator: JSON.stringify({ catalog_no: CATALOG_NO, manifest: MANIFEST }),
      scope: JSON.stringify({ project_id: PROJECT_ID }) });
  return { ...rows[0], created: true };
}

// 既有登记函数要求 source_version.checksum_sha256 与本页字节一致，因此"卷"不是一张
// 版本行：每页一版（标签带页码与取图宽度），整卷身份由 volume_digest 表达并记在账上。
async function ensurePageVersion({ sourceId, page }) {
  const label = `${CATALOG_NO || "iiif"}-p${String(page.page).padStart(4, "0")}-w${WIDTH}-jpeg`;
  const existing = await queryRows(
    `select source_version_id::text as id from source.source_versions
      where source_id=:'s'::uuid and checksum_sha256=:'h'`, { s: sourceId, h: page.sha256 });
  if (existing.length > 0) return { id: existing[0].id, created: false };
  const rows = await queryRows(
    `insert into source.source_versions(source_id,version_label,retrieved_at,checksum_sha256,metadata)
     values (:'s'::uuid,:'l',now(),:'h',:'m'::jsonb) returning source_version_id::text as id`,
    { s: sourceId, l: label, h: page.sha256,
      m: JSON.stringify({
        schema: "mohen.iiif-page-original.v1", protocol: "IIIF Image API",
        manifest: MANIFEST, manifest_sha256: page.manifest_sha256,
        canvas_id: page.canvas_id, canvas_label: page.label,
        page_number: page.page, fetched_width: WIDTH,
        media_type: page.content_type, byte_size: page.byte_size,
        landed_by: "tools/acquire-iiif-volume.mjs", reencoded: false,
      }) });
  return { id: rows[0].id, created: true };
}

// 续取：找本库已登记的同页同宽度版本，回读私有字节复核哈希后直接计入本次整卷。
async function findHeldPage({ sourceId, number, page, token, storage, registrations }) {
  const rows = await queryRows(
    `select v.source_version_id::text as version_id, v.checksum_sha256, v.metadata->>'canvas_id' as canvas_id,
            v.metadata->>'canvas_label' as canvas_label, v.metadata->>'media_type' as media_type,
            r.raw_item_id::text as raw_item_id, r.storage_ref, r.byte_size
       from source.source_versions v join source.raw_items r using(source_version_id)
      where v.source_id=:'s'::uuid and v.metadata->>'page_number'=:'n'
        and v.metadata->>'fetched_width'=:'w'
      order by v.retrieved_at desc limit 1`,
    { s: sourceId, n: String(number), w: String(WIDTH) });
  if (rows.length === 0) return null;
  const row = rows[0];
  const key = String(row.storage_ref).split("/").slice(1).join("/");
  const bytes = await storage.readVerified(key, row.checksum_sha256, Number(row.byte_size));
  if (sha256(bytes) !== row.checksum_sha256) throw new Error(`IIIF_RESUME_HASH_MISMATCH:p${number}`);
  const original = await queryRows(
    `select original_id::text as id from studio.private_originals
      where storage_bucket||'/'||storage_key=:'r' and sha256=:'h' and state='STORED_VERIFIED' limit 1`,
    { r: row.storage_ref, h: row.checksum_sha256 });
  let bound = false;
  if (original[0]) {
    const registration = await registrations.lookup(original[0].id, token);
    bound = registration.raw_item_id === row.raw_item_id && registration.source_version_id === row.version_id;
  }
  if (!bound) throw new Error(`IIIF_RESUME_REGISTRATION_NOT_BOUND:p${number}`);
  return {
    page: number, canvas_id: row.canvas_id ?? page.canvas_id, canvas_label: row.canvas_label ?? page.label,
    sha256: row.checksum_sha256, byte_size: Number(row.byte_size), content_type: row.media_type,
    manifest_sha256: page.manifest_sha256, image_url: imageUrlFor(page, WIDTH),
    original_id: original[0].id, storage_ref: row.storage_ref,
    source_version_id: row.version_id, raw_item_id: row.raw_item_id,
    registration_bound: true, resumed: true,
  };
}

async function ensureRawItem({ versionId, storageRef, page }) {
  const existing = await queryRows(
    `select raw_item_id::text as id from source.raw_items
      where source_version_id=:'v'::uuid and storage_ref=:'r'`,
    { v: versionId, r: storageRef });
  if (existing.length > 0) return existing[0].id;
  const rows = await queryRows(
    `insert into source.raw_items(source_version_id,storage_ref,media_type,byte_size,checksum_sha256)
     values (:'v'::uuid,:'r',:'mt',:'b',:'h') returning raw_item_id::text as id`,
    { v: versionId, r: storageRef, mt: page.content_type, b: page.byte_size, h: page.sha256 });
  return rows[0].id;
}

async function main() {
  if (!MANIFEST || !TITLE || !PROVIDER) return fail("IIIF_ARGS_REQUIRED");
  if (!Number.isSafeInteger(WIDTH) || WIDTH < 200 || WIDTH > 6000) return fail("IIIF_WIDTH_INVALID");

  // 1) manifest 是分母与页序的唯一来源；它自己的字节也要留哈希，便于日后复算。
  const manifestResponse = await get(MANIFEST, { maxBytes: 20 * 1024 * 1024 });
  const manifestSha256 = sha256(manifestResponse.bytes);
  const pages = parseManifest(JSON.parse(manifestResponse.bytes.toString("utf8")));
  if (pages.length === 0) return fail("IIIF_MANIFEST_NO_CANVASES");
  const selected = parseRange(PAGES, pages.length);

  const summary = {
    step: "IIIF_ACQUIRE_VOLUME", applied: APPLY,
    manifest: { url: MANIFEST, sha256: manifestSha256, bytes: manifestResponse.bytes.length },
    denominator: { kind: "iiif_manifest_canvas_count", total_pages: pages.length },
    requested_pages: selected.length, provider: PROVIDER, title: TITLE, catalog_no: CATALOG_NO || null,
    width: WIDTH, delay_ms: DELAY_MS, method: `${METHOD_KEY}@${METHOD_VERSION}`,
  };

  const source = await ensureSource();
  // pg 驱动把 jsonb 以字符串返回时也要照原样解析，不能因为类型差异跳过权利 Guard。
  const rights = typeof source.rights_by_action === "string"
    ? JSON.parse(source.rights_by_action) : (source.rights_by_action ?? {});
  summary.source = { source_id: source.source_id, created: source.created, rights_by_action: rights };
  // 强制权利 Guard：不是"能下就下"，download/retain/machine_read 任一非 allowed 即停。
  // 只读演算同样如实报出这三个动作的现状（不落库、不发请求字节）。
  const rightsBlocked = ["download", "retain", "machine_read"].filter((action) => rights[action] !== "allowed");
  summary.rights_guard = { checked: ["download", "retain", "machine_read"], blocked: rightsBlocked };
  if (APPLY && rightsBlocked.length > 0) {
    return fail(`IIIF_RIGHTS_ACTION_NOT_ALLOWED:${rightsBlocked.join(",")}`, { summary });
  }

  if (!APPLY) {
    summary.pages_preview = pages.slice(0, 3).map((p) => ({ page: p.page, canvas: p.canvas_id, url: imageUrlFor(p, WIDTH) }));
    summary.status = "IIIF_VOLUME_DRY_RUN";
    console.log(JSON.stringify(summary, null, 2));
    await getNodePgPool().end();
    return;
  }

  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || !secret) return fail("MOHEN_DATABASE_SESSION_SECRET_MISSING");
  const workerUrl = process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL;
  if (!workerUrl) return fail("MOHEN_PRIVATE_WORKER_DATABASE_URL_MISSING");
  const token = makeToken(OWNER, secret);

  const pool = getNodePgPool();
  const storage = createLocalPrivateOriginalStorage();
  const originals = createPrivateOriginalRepository(pool);
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const { createPrivateWorkerPool, assertPrivateWorkerIdentity } = await import(
    "../packages/data-access/src/private-worker-pool.mjs");
  const caFile = process.env.MOHEN_DATABASE_CA_CERT_FILE;
  const ca = process.env.MOHEN_DATABASE_CA_CERT
    ?? (caFile && fs.existsSync(caFile) ? fs.readFileSync(caFile, "utf8") : undefined);
  const workerPool = await createPrivateWorkerPool(workerUrl, { ca });
  await assertPrivateWorkerIdentity(workerPool);
  const discovery = createSourceDiscoveryRepository({
    query: (text, values) => workerPool.query(text, values) });

  const needRows = await queryRows(
    `select need_id::text as need_id, research_intent from source.source_needs
      where project_id=:'p'::uuid order by created_at desc limit 1`, { p: PROJECT_ID });
  const needId = arg("need-id", needRows[0]?.need_id ?? null);
  if (!needId) { await pool.end(); await workerPool.end(); return fail("IIIF_NEED_RECEIPT_REQUIRED"); }
  summary.need = { need_id: needId, research_intent: needRows[0]?.research_intent ?? null };

  const startedAt = new Date();
  const acquired = [];
  const failures = [];
  const resumedPages = [];
  for (const number of selected) {
    const page = pages[number - 1];
    try {
      if (RESUME) {
        const held = await findHeldPage({ sourceId: source.source_id, number, page, token, storage, registrations });
        if (held) {
          acquired.push(held);
          resumedPages.push(number);
          continue;
        }
      }
      const url = imageUrlFor(page, WIDTH);
      const response = await fetchWithRetry(url, { label: `p${number}` });
      if (!/^image\/(jpeg|png|webp)$/.test(response.contentType)) {
        throw new Error(`IIIF_CONTENT_TYPE_UNEXPECTED:p${number}:${response.contentType}`);
      }
      if (response.bytes.length > MAX_ORIGINAL_BYTES) throw new Error(`IIIF_PAGE_EXCEEDS_LIMIT:p${number}`);
      // MIME 魔数必须与声明一致：200 且带 content-type 不算取到原件。
      const magicOk = (response.contentType === "image/jpeg" && response.bytes[0] === 0xff && response.bytes[1] === 0xd8 && response.bytes[2] === 0xff)
        || (response.contentType === "image/png" && response.bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        || (response.contentType === "image/webp" && response.bytes.subarray(0, 4).toString("ascii") === "RIFF"
          && response.bytes.subarray(8, 12).toString("ascii") === "WEBP");
      if (!magicOk) throw new Error(`IIIF_MAGIC_MISMATCH:p${number}:${response.contentType}`);

      const digest = sha256(response.bytes);
      const record = await originals.reserve({
        projectId: PROJECT_ID, originalId: randomUUID(), assetId: randomUUID(),
        idempotencyKey: `iiif:${CATALOG_NO || "vol"}:p${number}:w${WIDTH}:${digest.slice(0, 12)}`,
        sha256: digest, byteSize: response.bytes.length,
        fileName: `${(CATALOG_NO || "iiif").replace(/[^A-Za-z0-9-]/g, "_")}-p${String(number).padStart(4, "0")}-w${WIDTH}.jpg`,
        contentType: response.contentType,
      }, token);
      let stored = false;
      try {
        const previous = await storage.readVerified(record.storage_key, digest, response.bytes.length);
        if (!previous.equals(response.bytes)) throw new Error("ORIGINAL_INTEGRITY_FAILED");
        stored = true;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (!stored) await storage.putVerified(record.storage_key, response.bytes, response.contentType);
      const finalRecord = await originals.finalize(record.original_id, digest, token);
      if (finalRecord.state !== "STORED_VERIFIED") throw new Error(`IIIF_ORIGINAL_NOT_VERIFIED:p${number}`);

      const storageRef = (await queryRows(
        `select storage_bucket||'/'||storage_key as ref from studio.private_originals where original_id=:'o'::uuid`,
        { o: record.original_id }))[0].ref;
      const entry = {
        page: number, canvas_id: page.canvas_id, canvas_label: page.label,
        sha256: digest, byte_size: response.bytes.length, content_type: response.contentType,
        manifest_sha256: manifestSha256, image_url: url,
        original_id: record.original_id, storage_ref: storageRef, resumed: false,
      };
      const version = await ensurePageVersion({ sourceId: source.source_id, page: entry });
      entry.source_version_id = version.id;
      entry.raw_item_id = await ensureRawItem({ versionId: version.id, storageRef, page: entry });
      // 落库后立刻回读登记：原件必须真的绑到这一版这一件，否则不算取得。
      const registration = await registrations.lookup(record.original_id, token);
      entry.registration_bound = registration.raw_item_id === entry.raw_item_id
        && registration.source_version_id === version.id && registration.sha256 === digest;
      if (!entry.registration_bound) throw new Error(`IIIF_REGISTRATION_NOT_BOUND:p${number}`);
      acquired.push(entry);
      if (DELAY_MS > 0) await sleep(DELAY_MS);
    } catch (error) {
      failures.push({ page: number, error: String(error?.message ?? error) });
    }
  }
  const finishedAt = new Date();

  // 2) 回读复算：只认库内 raw_item 的字节与哈希，不认内存里的下载结果。
  const digestAfter = volumeDigest({ manifestSha256, width: WIDTH, pages: acquired });
  const readBack = [];
  for (const entry of acquired) {
    const rows = await queryRows(
      `select checksum_sha256, byte_size from source.raw_items where raw_item_id=:'r'::uuid`, { r: entry.raw_item_id });
    readBack.push(rows[0]
      ? { page: entry.page, sha256: rows[0].checksum_sha256, byte_size: Number(rows[0].byte_size) }
      : { page: entry.page, sha256: null, byte_size: null });
  }
  const digestReadBack = volumeDigest({ manifestSha256, width: WIDTH, pages: readBack });
  const readBackMatches = readBack.every((r) => r.sha256)
    && digestReadBack === digestAfter;

  const totalRequested = selected.length;
  const complete = failures.length === 0 && acquired.length === totalRequested && totalRequested === pages.length;
  const methodState = complete ? "TESTED_SUCCESS" : (acquired.length > 0 ? "DEGRADED" : "TESTED_FAILURE");

  // 3) Y07：方法目录 + 一次带分页边界的真实尝试。
  const method = await discovery.registerAcquisitionMethod({
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    accessMode: "iiif_presentation_and_image_api",
    resourceScope: {
      protocols: ["IIIF Presentation API", "IIIF Image API"],
      carriers: ["scanned_page"], providers: [PROVIDER],
      resource_scope_note: "整卷（manifest canvas 全集）逐页影像，非目录元数据",
    },
    preconditions: {
      manifest_readable: true, rights_download_allowed: true, rights_retain_allowed: true,
      rate_limit: { inter_request_delay_ms: DELAY_MS, retry_max: 3 },
    },
    steps: [
      "读 IIIF Presentation manifest，按 canvas 顺序建立页码与分母",
      "逐 canvas 用 Image API 按目标宽度取整页影像（限速+退避重试）",
      "逐页核 MIME 与魔数、算 SHA256、落私有原件并回读校验",
      "每页登记 source_version/raw_item，并回读私有登记确认绑定",
      "复算整卷摘要并写一次获取尝试与覆盖结论",
    ],
    successCriteria: [
      "每页字节可回读且 SHA256 与下载一致",
      "整卷摘要可由库内 raw_item 复算得到同一值",
      "已取得页数/分母来自 manifest canvas 总数",
    ],
    failureModes: [
      "IIIF_MANIFEST_NO_CANVASES", "IIIF_FETCH_FAILED", "IIIF_MAGIC_MISMATCH",
      "IIIF_ORIGINAL_NOT_VERIFIED", "IIIF_REGISTRATION_NOT_BOUND", "IIIF_RIGHTS_ACTION_NOT_ALLOWED",
    ],
    alternatives: ["M0002@v1"],
    methodState,
  });
  summary.method_registered = method;

  const requestDigest = sha256(Buffer.from(JSON.stringify({
    manifest: MANIFEST, manifest_sha256: manifestSha256, width: WIDTH,
    pages: selected, method: `${METHOD_KEY}@${METHOD_VERSION}`,
  }), "utf8"));

  const attempt = await discovery.appendAcquisitionAttempt({
    projectId: PROJECT_ID, needId,
    candidateRef: {
      schema: "mohen.acquisition-volume-candidate.v1", target: "source_volume",
      source_id: source.source_id, provider: PROVIDER, title: TITLE,
      catalog_no: CATALOG_NO || null,
      manifest: { url: MANIFEST, sha256: manifestSha256, total_canvases: pages.length },
      volume_digest: digestAfter,
    },
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    executionEnvironment: {
      kind: "agent_workstation", runtime: "node", tool: "tools/acquire-iiif-volume.mjs",
      user_agent: UA, width_px: WIDTH,
    },
    requestDigest,
    pagination: {
      boundary: "canvas_index", total_pages: pages.length, pages_requested: selected,
      pages_acquired: acquired.map((p) => p.page), pages_failed: failures.map((f) => f.page),
      pages_fetched_this_run: acquired.filter((p) => !p.resumed).map((p) => p.page),
      pages_resumed_from_held_versions: resumedPages,
      order: "manifest_canvas_order", inter_request_delay_ms: DELAY_MS, resume_mode: RESUME,
    },
    startedAt, finishedAt,
    resultState: acquired.length === 0 ? "unavailable" : "acquired_verified",
    failureCode: failures.length > 0 ? "IIIF_SUBPAGE_FETCH_FAILED" : null,
    failureCertainty: failures.length > 0 ? "CONFIRMED" : null,
    acquiredExtent: {
      pages: acquired.map((p) => ({ page: p.page, sha256: p.sha256, byte_size: p.byte_size, resumed: p.resumed === true })),
      total_pages: pages.length, complete_volume: complete, volume_digest: digestAfter,
      digest_recomputed_from_db: digestReadBack, read_back_matches: readBackMatches,
    },
    byteSize: acquired.reduce((sum, p) => sum + p.byte_size, 0),
    assetSha256: digestAfter,
    sourceLocator: {
      manifest: MANIFEST, item: arg("item-id", null), catalog_no: CATALOG_NO || null,
      image_pattern: "{service}/full/{width},/0/default.jpg",
    },
    rightsActions: rights,
    accessRestrictions: { robots_or_terms_reviewed: false, rate_limit_observed: true },
    dependencyRefs: [
      { kind: "source", id: source.source_id, layer: "provider" },
      ...acquired.map((p) => ({ kind: "raw_item", id: p.raw_item_id, layer: "digital_asset", page: p.page })),
    ],
    cost: { amount: null, currency: null, certainty: "unknown" },
  });
  summary.attempt = attempt;

  // 4) Y08/Y04：覆盖结论必须带真实分母；缺页就如实 partial 并列出缺哪几页。
  const missing = [
    ...failures.map((f) => ({ part: `page_${f.page}_asset`, state: "not_acquired", reason: f.error })),
    ...(selected.length < pages.length
      ? [{ part: "pages_outside_scope", pages: pages.map((p) => p.page).filter((n) => !selected.includes(n)), state: "not_requested" }]
      : []),
  ];
  const catalogRows = arg("catalog-entry-id", null) ? [] : await queryRows(
    `select catalog_entry_id::text as id from source.resource_catalog
      where project_id=:'p'::uuid and provider=:'pr' and catalog_identifier=:'c'
      order by created_at desc limit 1`, { p: PROJECT_ID, pr: PROVIDER, c: CATALOG_NO || "" });
  const coverage = await discovery.recordAcquisitionCoverage({
    projectId: PROJECT_ID, attemptId: attempt.attempt_id,
    catalogEntryId: arg("catalog-entry-id", null) ?? catalogRows[0]?.id ?? null,
    coverageScope: {
      schema: "mohen.source-volume-coverage.v1", method: "Y04:volume_coverage@v1",
      target: "source_volume", source_id: source.source_id,
      denominator: { kind: "iiif_manifest_canvas_count", total_pages: pages.length, manifest_sha256: manifestSha256 },
      acquired_pages: acquired.map((p) => p.page),
      total_extent: pages.length,
      coverage_ratio: `${acquired.length}/${pages.length}`,
      volume_digest: digestAfter,
      source_version_ids: acquired.map((p) => p.source_version_id),
    },
    missingParts: missing,
    completenessState: complete ? "complete" : "partial",
    verifiedAgainst: {
      attempt_id: attempt.attempt_id, pages_verified: acquired.length, pages_total: pages.length,
      volume_digest: digestAfter, digest_recomputed_from_db: digestReadBack, matched: readBackMatches,
      registrations_bound: acquired.filter((p) => p.registration_bound).length,
    },
    note: complete ? null : `已取得 ${acquired.length}/${pages.length} 页，缺 ${failures.length} 页`,
  });
  summary.coverage = coverage;

  // 5) 方法"当前有效性"必须跟着最近一次真实结果走：登记时若曾失败，
  //    定义不可改写，但状态要能推进，否则账上会长期留着与事实相反的状态。
  summary.method_current = await discovery.recordAcquisitionMethodRevalidation({
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION, methodState,
    revalidatedAt: finishedAt, recommended: complete ? true : undefined,
  });

  summary.result = {
    pages_acquired: acquired.length, pages_total: pages.length,
    pages_resumed: resumedPages.length,
    failures: failures.slice(0, 10), failures_total: failures.length,
    read_back_matches: readBackMatches, volume_digest: digestAfter,
    completeness_state: complete ? "complete" : "partial",
    method_state: summary.method_current.method_state,
  };
  summary.status = complete ? "IIIF_VOLUME_ACQUIRED_COMPLETE" : "IIIF_VOLUME_ACQUIRED_PARTIAL";
  if (!readBackMatches) summary.status = "IIIF_VOLUME_READBACK_MISMATCH";
  await pool.end();
  await workerPool.end();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "IIIF_VOLUME_ACQUIRED_COMPLETE") process.exitCode = 1;
}

main().catch(async (error) => {
  console.log(JSON.stringify({ status: "IIIF_VOLUME_FAILED", error: String(error?.message ?? error),
    stack: String(error?.stack ?? "").split("\n").slice(0, 4) }));
  try { await getNodePgPool().end(); } catch { /* 已关闭 */ }
  process.exitCode = 1;
});
