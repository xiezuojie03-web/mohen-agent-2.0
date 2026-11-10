#!/usr/bin/env node
// Y07/Y08 单文件直取：REST/HTTP 直链（PDF 原件、单幅舆图、单张照片、馆方导出文件）。
//
// 为什么需要它（规范原文，不是自选题目）：
//   * Y07：「可组合 REST/OAI-PMH/SPARQL/IIIF Presentation/Image/HTTP-Range/批量包/馆方申请」；
//     此前本仓只有 IIIF（M0003）与人工单页（M0002）两条路，遇到"馆方给的是 PDF 直链/舆图直链"
//     就无路可走——这不是设计限制，是实现缺口。
//   * Y08：「核原始字节长度、MIME/魔数、SHA256」「已取得范围有明确分母或标未知」「缺页称全件」是反例。
//     单文件的分母是"文件"（1/1），**内页数如实记 unknown**，绝不因为拿到一个 PDF 就声称整卷齐全。
//
// 边界：
//   * 不绕访问控制、不猜路径：只取调用方明确给出的公开 URL；验证码/登录/付费一律停 REQUIRES_PERMISSION。
//   * 强制权利 Guard：来源 rights_by_action 的 download/retain/machine_read 任一非 allowed 即停。
//   * 不写 Gate、不签资格；attempt/coverage 只经 source-discovery-repository 唯一写入口。
//
// 用法（默认只读演算，不落库）：
//   node --env-file=.env.local tools/acquire-http-file.mjs \
//     --url "https://example.org/map.pdf" --title "某某舆图（原件 PDF）" \
//     --provider "某某图书馆" [--catalog-no SH-0001] [--carrier scanned_page] [--apply]
//
// 批量包（馆方一次给一组文件）：
//   node --env-file=.env.local tools/acquire-http-file.mjs \
//     --list ./batch.json --title "某某丛书（馆方批量包）" --provider "某某图书馆" --apply
//   batch.json 形如：{"files":[{"url":"https://…/a.pdf","page":1},{"url":"https://…/b.pdf","page":2}]}
//   或直接：[{ "url": "…", "page": 1 }]
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
const URL_ARG = arg("url");
const TITLE = arg("title");
const PROVIDER = arg("provider");
const CATALOG_NO = arg("catalog-no", "");
const CARRIER = arg("carrier", "scanned_page");
const NEED_ID = arg("need-id");
// 同一份文件可能被多个来源引用；默认按 provider+title 建/复用来源行。
const METHOD_KEY = "M0004";
const METHOD_VERSION = "v1";
const UA = "MoHenResearch/1.0 (digital humanities; contact: owner)";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (status, code, extra = {}) => {
  console.log(JSON.stringify({ status, error: code, ...extra }, null, 2));
  process.exitCode = 1;
};

// 魔数决定"到底是什么文件"：content-type 可以撒谎，签名字节不行。
function sniff(bytes) {
  const head = bytes.subarray(0, 16);
  if (head.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a) return "image/tiff";
  if (head[0] === 0x4d && head[1] === 0x4d && head[3] === 0x2a) return "image/tiff";
  return null;
}

const CHUNK_BYTES = 4 * 1024 * 1024;

// HTTP-Range：大件按 Range 分段取回再拼成整件，最后按整件核长度与 SHA256。
// 服务端不认 Range（回 200）时如实退回整件下载，并把"到底走没走分段"写进 metadata，
// 不能因为"打算分段"就声称分过段。
async function download(url, { attempts = 3, timeoutMs = 180000, chunkSize = CHUNK_BYTES } = {}) {
  const chunks = [];
  let total = null;
  let finalUrl = url;
  let declaredType = "";
  let ranged = false;
  let start = 0;
  for (let round = 1; ; round += 1) {
    if (round > 5000) throw new Error("HTTP_RANGE_TOO_MANY_CHUNKS");
    let response = null;
    let lastError = null;
    for (let i = 1; i <= attempts; i += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetch(url, {
          headers: { "User-Agent": UA, Range: `bytes=${start}-${start + chunkSize - 1}` },
          signal: controller.signal, redirect: "follow",
        });
        if (response.status === 401 || response.status === 402 || response.status === 407) {
          throw Object.assign(new Error(`HTTP_${response.status}`), { httpStatus: response.status, needsPermission: true });
        }
        if (response.status !== 200 && response.status !== 206) {
          throw Object.assign(new Error(`HTTP_${response.status}`), { httpStatus: response.status });
        }
        break;
      } catch (error) {
        response = null;
        lastError = error;
        if (error?.needsPermission) {
          throw Object.assign(new Error(`HTTP_FILE_FETCH_FAILED:${error.message}`),
            { cause: error, httpStatus: error.httpStatus, needsPermission: true });
        }
        const status = error?.httpStatus;
        const retriable = status === 429 || status === 403 || status === 503 || status === 502
          || status === 504 || error?.name === "AbortError";
        if (!retriable || i >= (status === 403 ? 2 : attempts)) break;
        await new Promise((resolve) => setTimeout(resolve, (status === 403 ? 5000 : 1500) * i));
      } finally {
        clearTimeout(timer);
      }
    }
    if (response == null) {
      throw Object.assign(new Error(`HTTP_FILE_FETCH_FAILED:${String(lastError?.message ?? lastError)}`),
        { cause: lastError, httpStatus: lastError?.httpStatus ?? null, needsPermission: lastError?.needsPermission === true });
    }
    declaredType = declaredType || (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    finalUrl = response.url ?? finalUrl;
    const contentRange = response.headers.get("content-range") ?? "";
    if (response.status === 206 && /^bytes\s+\d+-\d+\/(\d+)$/i.test(contentRange.trim())) {
      ranged = true;
      const size = Number(/^bytes\s+\d+-\d+\/(\d+)$/i.exec(contentRange.trim())[1]);
      if (Number.isSafeInteger(size)) total = size;
    } else if (response.status === 200) {
      // 首次请求就拿到 200：服务端忽略 Range，本次响应体就是整件。
      ranged = false;
      const declared = Number(response.headers.get("content-length") ?? NaN);
      total = Number.isFinite(declared) ? declared : null;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) throw new Error("HTTP_FILE_EMPTY_BODY");
    chunks.push({ start, size: bytes.length, sha256: sha256(bytes), bytes });
    start += bytes.length;
    if (total != null && start > total) throw new Error("HTTP_RANGE_OVERRUN");
    if (start > MAX_ORIGINAL_BYTES) throw new Error("HTTP_FILE_EXCEEDS_LIMIT");
    if (total == null || start >= total) break;
    if (!ranged) throw new Error("HTTP_RANGE_UNSUPPORTED_MISMATCH");
  }
  const bytes = Buffer.concat(chunks.map((item) => item.bytes));
  if (total != null && bytes.length !== total) throw new Error("HTTP_RANGE_LENGTH_MISMATCH");
  return {
    bytes, declaredType, finalUrl, ranged,
    rangeChunks: chunks.map((item) => ({ start: item.start, size: item.size, sha256: item.sha256 })),
    declaredBytes: total,
  };
}

function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 3600000 })).toString("base64url");
  const sig = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  return `${payload}.${sig}`;
}

async function ensureSource(entryUrl) {
  const existing = await queryRows(
    `select source_id::text as source_id, rights_by_action from source.sources
      where provider=:'p' and title=:'t'`, { p: PROVIDER, t: TITLE });
  if (existing.length > 1) throw new Error("HTTP_SOURCE_AMBIGUOUS");
  if (existing.length === 1) return { ...existing[0], created: false };
  if (!APPLY) return { source_id: null, rights_by_action: {}, created: false, missing: true };
  const rows = await queryRows(
    `insert into source.sources(provider,title,source_type,carrier_type,content_availability,provenance_status,
       source_uri_or_catalog_no,original_locator,scope)
     values (:'p',:'t','gazetteer',:'carrier','file_download','verified',:'no',:'locator'::jsonb,:'scope'::jsonb)
     returning source_id::text as source_id, rights_by_action`,
    { p: PROVIDER, t: TITLE, carrier: CARRIER, no: CATALOG_NO,
      locator: JSON.stringify({ catalog_no: CATALOG_NO, url: entryUrl }),
      scope: JSON.stringify({ project_id: PROJECT_ID }) });
  return { ...rows[0], created: true };
}

// 一文件一版本：既有登记约束要求 version.checksum 等于原件字节摘要，不能一版多文件。
// 批量包因此是"一个来源 + 多个版本（每件一版）"，并在每版 metadata 里记清自己在包里的位置。
async function ensureFileVersion({ sourceId, file, fileCount }) {
  const label = `${CATALOG_NO || "http"}-f${String(file.index + 1).padStart(4, "0")}-${file.contentType.replace(/[^a-z0-9]+/gi, "")}`;
  const existing = await queryRows(
    `select source_version_id::text as id from source.source_versions
      where source_id=:'s'::uuid and checksum_sha256=:'h'`, { s: sourceId, h: file.sha256 });
  if (existing.length > 0) return { id: existing[0].id, created: false };
  const rows = await queryRows(
    `insert into source.source_versions(source_id,version_label,retrieved_at,checksum_sha256,metadata)
     values (:'s'::uuid,:'l',now(),:'h',:'m'::jsonb) returning source_version_id::text as id`,
    { s: sourceId, l: label, h: file.sha256,
      m: JSON.stringify({
        schema: "mohen.http-file-original.v1", protocol: "HTTP GET（REST 直链）",
        url: file.finalUrl, requested_url: file.target.url, media_type: file.contentType,
        declared_media_type: file.declaredType, byte_size: file.byteSize,
        ranged_download: file.ranged, range_chunks: file.rangeChunks.length,
        file_extent: { files: 1, pages: "unknown" },
        package_extent: { files_in_package: fileCount, file_index: file.index, package_page: file.target.page ?? null },
        landed_by: "tools/acquire-http-file.mjs", reencoded: false,
      }) });
  return { id: rows[0].id, created: true };
}

async function ensureRawItem({ versionId, storageRef, file }) {
  const existing = await queryRows(
    `select raw_item_id::text as id from source.raw_items
      where source_version_id=:'v'::uuid and storage_ref=:'r'`, { v: versionId, r: storageRef });
  if (existing.length > 0) return existing[0].id;
  const rows = await queryRows(
    `insert into source.raw_items(source_version_id,storage_ref,media_type,byte_size,checksum_sha256)
     values (:'v'::uuid,:'r',:'mt',:'b',:'h') returning raw_item_id::text as id`,
    { v: versionId, r: storageRef, mt: file.contentType, b: file.byteSize, h: file.sha256 });
  return rows[0].id;
}

async function main() {
  if ((!URL_ARG && !arg("list")) || !TITLE || !PROVIDER) return fail("HTTP_FILE_FAILED", "HTTP_FILE_ARGS_REQUIRED");
  // --list 是"馆方批量包"入口：一次给一组文件 URL，按同一套校验逐件取回。
  const targets = (() => {
    const listFile = arg("list");
    if (!listFile) return [{ url: URL_ARG, page: 1, name: null }];
    const parsed = JSON.parse(fs.readFileSync(listFile, "utf8"));
    const entries = Array.isArray(parsed) ? parsed : (parsed.files ?? []);
    return entries.map((item) => (typeof item === "string"
      ? { url: item, page: null, name: null }
      : { url: item.url, page: item.page ?? null, name: item.name ?? null })).filter((item) => item.url);
  })();
  if (targets.length === 0) return fail("HTTP_FILE_FAILED", "HTTP_FILE_TARGETS_REQUIRED");
  for (const target of targets) {
    let parsedTarget;
    try {
      parsedTarget = new URL(target.url);
    } catch {
      return fail("HTTP_FILE_FAILED", "HTTP_FILE_URL_INVALID", { url: target.url });
    }
    if (!/^https?:$/.test(parsedTarget.protocol)) return fail("HTTP_FILE_FAILED", "HTTP_FILE_URL_NOT_HTTP", { url: target.url });
  }

  const source = await ensureSource(targets[0].url);
  const rights = typeof source.rights_by_action === "string"
    ? JSON.parse(source.rights_by_action) : (source.rights_by_action ?? {});
  const blocked = ["download", "retain", "machine_read"].filter((action) => rights[action] !== "allowed");
  const summary = {
    step: "HTTP_FILE_ACQUIRE", applied: APPLY, method: `${METHOD_KEY}@${METHOD_VERSION}`,
    requested_urls: targets.map((target) => target.url),
    provider: PROVIDER, title: TITLE, catalog_no: CATALOG_NO || null,
    source: { source_id: source.source_id, created: source.created, rights_by_action: rights },
    rights_guard: { checked: ["download", "retain", "machine_read"], blocked },
  };
  if (APPLY && blocked.length > 0) {
    return fail("HTTP_FILE_RIGHTS_HOLD", `HTTP_FILE_RIGHTS_ACTION_NOT_ALLOWED:${blocked.join(",")}`, { summary });
  }
  if (!APPLY) {
    summary.status = "HTTP_FILE_DRY_RUN";
    console.log(JSON.stringify(summary, null, 2));
    await getNodePgPool().end();
    return;
  }

  // 1) 真的取一遍（单件或批量包清单；大件按 HTTP-Range 分段再拼回整件）。
  const files = [];
  for (const [index, target] of targets.entries()) {
    let response;
    try {
      response = await download(target.url);
    } catch (error) {
      summary.failed_target = { index, url: target.url, error: String(error?.message ?? error) };
      const status = error?.needsPermission ? "HTTP_FILE_REQUIRES_PERMISSION"
        : error?.httpStatus === 404 ? "HTTP_FILE_NOT_FOUND" : "HTTP_FILE_FETCH_FAILED";
      return fail(status, String(error?.message ?? error), { summary });
    }
    const sniffed = sniff(response.bytes);
    // content-type 与魔数都要有说法：没有可识别签名就只当"未知类型二进制"，不冒充图片/PDF。
    files.push({
      index, target, finalUrl: response.finalUrl, declaredType: response.declaredType,
      contentType: sniffed ?? response.declaredType ?? "application/octet-stream", sniffed,
      byteSize: response.bytes.length, sha256: sha256(response.bytes), bytes: response.bytes,
      ranged: response.ranged, rangeChunks: response.rangeChunks, declaredBytes: response.declaredBytes,
    });
  }
  summary.response = files.map((file) => ({
    index: file.index, url: file.target.url, final_url: file.finalUrl,
    declared_type: file.declaredType, sniffed_type: file.sniffed, byte_size: file.byteSize,
    sha256: file.sha256, ranged: file.ranged, range_chunks: file.rangeChunks.length,
    ...(file.sniffed ? {} : { type_note: "无可识别魔数，按未知二进制记录，不冒充影像或 PDF" }),
  }));
  if (blocked.length > 0) return fail("HTTP_FILE_RIGHTS_HOLD", `HTTP_FILE_RIGHTS_ACTION_NOT_ALLOWED:${blocked.join(",")}`, { summary });

  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || !secret) return fail("HTTP_FILE_FAILED", "MOHEN_DATABASE_SESSION_SECRET_MISSING");
  const workerUrl = process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL;
  if (!workerUrl) return fail("HTTP_FILE_FAILED", "MOHEN_PRIVATE_WORKER_DATABASE_URL_MISSING");
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
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => workerPool.query(text, values) });

  const startedAt = new Date();
  // 2) 逐件落私有原件、回读校验、登记 source_version/raw_item 并核私有登记绑定。
  //    批量包的任何一件失败都整批停：不允许"取到几件就先记账"。
  const stored = [];
  for (const file of files) {
    const record = await originals.reserve({
      projectId: PROJECT_ID, originalId: randomUUID(), assetId: randomUUID(),
      idempotencyKey: `http:${CATALOG_NO || TITLE}:${file.index}:${file.sha256.slice(0, 12)}`,
      sha256: file.sha256, byteSize: file.byteSize,
      fileName: `${(CATALOG_NO || "http-file").replace(/[^A-Za-z0-9-]/g, "_")}-f${String(file.index + 1).padStart(4, "0")}${extensionFor(file.contentType)}`,
      contentType: file.contentType,
    }, token);
    let alreadyStored = false;
    try {
      const previous = await storage.readVerified(record.storage_key, file.sha256, file.byteSize);
      if (!previous.equals(file.bytes)) throw new Error("ORIGINAL_INTEGRITY_FAILED");
      alreadyStored = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (!alreadyStored) await storage.putVerified(record.storage_key, file.bytes, file.contentType);
    const finalRecord = await originals.finalize(record.original_id, file.sha256, token);
    if (finalRecord.state !== "STORED_VERIFIED") {
      return fail("HTTP_FILE_FAILED", "HTTP_FILE_ORIGINAL_NOT_VERIFIED", { summary, file_index: file.index });
    }

    const storageRef = (await queryRows(
      `select storage_bucket||'/'||storage_key as ref from studio.private_originals where original_id=:'o'::uuid`,
      { o: record.original_id }))[0].ref;
    const version = await ensureFileVersion({ sourceId: source.source_id, file, fileCount: files.length });
    const rawItemId = await ensureRawItem({ versionId: version.id, storageRef, file });
    const registration = await registrations.lookup(record.original_id, token);
    const registrationBound = registration.raw_item_id === rawItemId
      && registration.source_version_id === version.id && registration.sha256 === file.sha256;
    if (!registrationBound) {
      return fail("HTTP_FILE_FAILED", "HTTP_FILE_REGISTRATION_NOT_BOUND", { summary, file_index: file.index });
    }

    // 3) 回读复算：只认库内字节与哈希，不认内存里的下载结果。
    const readBack = (await queryRows(
      `select checksum_sha256, byte_size from source.raw_items where raw_item_id=:'r'::uuid`, { r: rawItemId }))[0];
    const readBackMatches = readBack?.checksum_sha256 === file.sha256
      && Number(readBack?.byte_size) === file.byteSize;
    stored.push({
      index: file.index, url: file.finalUrl, requestedUrl: file.target.url, page: file.target.page ?? null,
      sha256: file.sha256, byteSize: file.byteSize, contentType: file.contentType,
      originalId: record.original_id, storageRef, versionId: version.id, rawItemId,
      registrationBound, readBackMatches,
    });
  }
  const finishedAt = new Date();
  const filesVerified = stored.filter((item) => item.readBackMatches).length;
  const readBackMatches = stored.length === files.length && filesVerified === files.length;

  const needId = NEED_ID ?? (await queryRows(
    `select need_id::text as id from source.source_needs where project_id=:'p'::uuid
      order by created_at desc limit 1`, { p: PROJECT_ID }))[0]?.id ?? null;
  if (!needId) {
    await pool.end(); await workerPool.end();
    return fail("HTTP_FILE_FAILED", "HTTP_FILE_NEED_RECEIPT_REQUIRED", { summary });
  }

  // 4) Y07：方法目录 + 一次真实尝试（单件或批量包；大件走 HTTP-Range 分段）。
  const method = await discovery.registerAcquisitionMethod({
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    accessMode: "http_get_single_file",
    resourceScope: {
      protocols: ["HTTP GET（REST 直链）", "HTTP-Range 分段", "馆方导出文件/批量包"],
      carriers: [CARRIER], providers: [PROVIDER],
      resource_scope_note: "单文件原件（PDF/影像/导出件）与馆方批量包清单；不含目录元数据",
    },
    preconditions: {
      url_publicly_reachable: true, rights_download_allowed: true, rights_retain_allowed: true,
      rate_limit: { retry_max: 3 },
    },
    steps: [
      "对调用方给出的公开 URL 逐件发 HTTP GET（优先 Range 分段，服务端不认 Range 则整件取回并如实记录）",
      "核 content-type 与文件魔数，不一致以魔数为准并如实记录",
      "逐件算 SHA256、落私有原件并回读校验",
      "逐件登记 source_version/raw_item 并回读私有登记确认绑定",
      "按文件粒度写一次获取尝试与覆盖结论（内页数如实 unknown）",
    ],
    successCriteria: [
      "字节可回读且 SHA256 与下载一致",
      "文件级分母明确（取得件数/请求件数），内页数标明 unknown",
      "来源、版本、原始件三者逐件登记一致",
    ],
    failureModes: [
      "HTTP_FILE_FETCH_FAILED", "HTTP_FILE_REQUIRES_PERMISSION", "HTTP_FILE_ORIGINAL_NOT_VERIFIED",
      "HTTP_FILE_REGISTRATION_NOT_BOUND", "HTTP_FILE_RIGHTS_ACTION_NOT_ALLOWED",
      "HTTP_RANGE_LENGTH_MISMATCH", "HTTP_RANGE_OVERRUN",
    ],
    alternatives: ["M0003@v1", "M0002@v1"],
    methodState: "TESTED_SUCCESS",
  });
  summary.method_registered = method;

  const allBound = stored.every((item) => item.registrationBound);
  const rangedFiles = files.filter((file) => file.ranged);
  const rangeChunkCount = files.reduce((sum, file) => sum + file.rangeChunks.length, 0);
  const totalBytes = stored.reduce((sum, item) => sum + item.byteSize, 0);
  // 批量包没有"一个文件哈希"可言：包身份用可复算的包摘要表达（逐件页码/URL/哈希/字节数），
  // 与 acquire-iiif-volume 的 volume_digest 同一做法；单件则仍用该件自己的 sha256。
  const packageDigest = sha256(Buffer.from(JSON.stringify(
    stored.map((item) => [item.index, item.page, item.url, item.sha256, item.byteSize]),
  ), "utf8"));
  const assetDigest = stored.length === 1 ? stored[0].sha256 : packageDigest;
  const requestDigest = sha256(Buffer.from(JSON.stringify({
    urls: targets.map((target) => target.url), method: `${METHOD_KEY}@${METHOD_VERSION}`,
  }), "utf8"));
  const attempt = await discovery.appendAcquisitionAttempt({
    projectId: PROJECT_ID, needId,
    candidateRef: {
      schema: "mohen.acquisition-file-candidate.v1", target: "source_file",
      source_id: source.source_id, provider: PROVIDER, title: TITLE, catalog_no: CATALOG_NO || null,
      requested_urls: targets.map((target) => target.url),
      files: stored.map((item) => ({ url: item.url, media_type: item.contentType, page: item.page })),
      batch: targets.length > 1,
      package_digest: packageDigest,
    },
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    executionEnvironment: {
      kind: "agent_workstation", runtime: "node", tool: "tools/acquire-http-file.mjs", user_agent: UA,
    },
    requestDigest,
    pagination: {
      boundary: rangedFiles.length > 0 ? "http_range" : "none",
      note: rangedFiles.length > 0
        ? `按 HTTP-Range 分 ${rangeChunkCount} 段取回后拼回整件；分页/内页数不在本次取得范围内主张`
        : "服务端未走分段（或整件一次取回）；内页数不在本次取得范围内主张",
      files_requested: targets.length, files_acquired: stored.length,
      ranged_files: rangedFiles.length, range_chunks: rangeChunkCount,
    },
    startedAt, finishedAt,
    resultState: readBackMatches ? "acquired_verified" : "unavailable",
    failureCode: readBackMatches ? null : "HTTP_FILE_READBACK_MISMATCH",
    failureCertainty: readBackMatches ? null : "CONFIRMED",
    acquiredExtent: {
      granularity: stored.length > 1 ? "file_package" : "file",
      files: stored.map((item) => ({ url: item.url, sha256: item.sha256, byte_size: item.byteSize, page: item.page })),
      files_total: targets.length, files_acquired: stored.length, pages: "unknown",
      package_digest: packageDigest,
      asset_sha256_scope: stored.length === 1 ? "single_file_bytes" : "package_manifest_digest",
    },
    byteSize: totalBytes,
    assetSha256: assetDigest,
    sourceLocator: {
      requested_urls: targets.map((target) => target.url),
      final_urls: files.map((file) => file.finalUrl),
      catalog_no: CATALOG_NO || null,
    },
    rightsActions: rights,
    accessRestrictions: { robots_or_terms_reviewed: false, rate_limit_observed: true },
    dependencyRefs: [
      { kind: "source", id: source.source_id, layer: "provider" },
      ...stored.map((item) => ({
        kind: "raw_item", id: item.rawItemId, layer: "digital_asset", page: item.page ?? item.index + 1,
      })),
    ],
    cost: { amount: null, currency: null, certainty: "unknown" },
  });
  summary.attempt = attempt;

  // 5) Y08：文件粒度覆盖结论。分母是"请求件数"，内页数如实 unknown，
  //    因此这里不能顺手写成"整卷齐全"。
  const coverage = await discovery.recordAcquisitionCoverage({
    projectId: PROJECT_ID, attemptId: attempt.attempt_id,
    catalogEntryId: arg("catalog-entry-id", null),
    coverageScope: {
      schema: "mohen.source-file-coverage.v1", method: "Y08:file_coverage@v1",
      target: "source_file", source_id: source.source_id,
      granularity: stored.length > 1 ? "file_package" : "file",
      denominator: { kind: "requested_file_count", total_files: targets.length, files_acquired: stored.length },
      pages_extent: "unknown",
      total_extent: "unknown",
      coverage_ratio: `${stored.length}/${targets.length} file`,
      file_sha256: stored.length === 1 ? stored[0].sha256 : null,
      file_sha256_list: stored.map((item) => item.sha256),
      package_digest: packageDigest,
      ranged_download_files: rangedFiles.length,
      source_version_ids: stored.map((item) => item.versionId),
    },
    missingParts: [],
    completenessState: readBackMatches ? "complete" : "partial",
    verifiedAgainst: {
      attempt_id: attempt.attempt_id, files_verified: filesVerified, files_total: targets.length,
      read_back_matches: readBackMatches, registrations_bound: stored.filter((item) => item.registrationBound).length,
    },
    note: `文件级完整（${stored.length}/${targets.length}）且字节已逐件回读校验；内页数未清点，不得据此声称全卷齐全`,
  });
  summary.coverage = coverage;
  summary.method_current = await discovery.recordAcquisitionMethodRevalidation({
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    methodState: readBackMatches ? "TESTED_SUCCESS" : "TESTED_FAILURE",
    revalidatedAt: finishedAt, recommended: readBackMatches ? true : undefined,
  });
  summary.result = {
    files: stored.map((item) => ({
      url: item.url, sha256: item.sha256, byte_size: item.byteSize, media_type: item.contentType,
      read_back_matches: item.readBackMatches, registration_bound: item.registrationBound,
      source_version_id: item.versionId, raw_item_id: item.rawItemId, storage_ref: item.storageRef,
    })),
    files_requested: targets.length, files_acquired: stored.length,
    read_back_matches: readBackMatches, registrations_bound: allBound, total_byte_size: totalBytes,
  };
  summary.status = readBackMatches ? "HTTP_FILE_ACQUIRED_VERIFIED" : "HTTP_FILE_READBACK_MISMATCH";
  await pool.end();
  await workerPool.end();
  console.log(JSON.stringify(summary, null, 2));
  if (!readBackMatches) process.exitCode = 1;
}

function extensionFor(contentType) {
  if (contentType === "application/pdf") return ".pdf";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/tiff") return ".tif";
  return ".bin";
}

main().catch(async (error) => {
  console.log(JSON.stringify({ status: "HTTP_FILE_FAILED", error: String(error?.message ?? error),
    stack: String(error?.stack ?? "").split("\n").slice(0, 4) }));
  try { await getNodePgPool().end(); } catch { /* 已关闭 */ }
  process.exitCode = 1;
});
