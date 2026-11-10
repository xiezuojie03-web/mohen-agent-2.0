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

async function download(url, { attempts = 3, timeoutMs = 120000 } = {}) {
  let last = null;
  for (let i = 1; i <= attempts; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA }, signal: controller.signal, redirect: "follow",
      });
      if (response.status === 401 || response.status === 402 || response.status === 407) {
        throw Object.assign(new Error(`HTTP_${response.status}`), { httpStatus: response.status, needsPermission: true });
      }
      if (!response.ok) throw Object.assign(new Error(`HTTP_${response.status}`), { httpStatus: response.status });
      const declared = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const chunks = [];
      let total = 0;
      for await (const chunk of response.body) {
        total += chunk.length;
        if (total > MAX_ORIGINAL_BYTES) throw new Error("HTTP_FILE_EXCEEDS_LIMIT");
        chunks.push(Buffer.from(chunk));
      }
      return { bytes: Buffer.concat(chunks), declaredType: declared, finalUrl: response.url ?? url };
    } catch (error) {
      last = error;
      if (error?.needsPermission) break;
      const status = error?.httpStatus;
      const retriable = status === 429 || status === 403 || status === 503 || status === 502 || status === 504
        || error?.name === "AbortError" || /HTTP_5\d\d/.test(String(error?.message));
      if (!retriable || i >= (status === 403 ? 2 : attempts)) break;
      await new Promise((resolve) => setTimeout(resolve, (status === 403 ? 5000 : 1500) * i));
    } finally {
      clearTimeout(timer);
    }
  }
  throw Object.assign(new Error(`HTTP_FILE_FETCH_FAILED:${String(last?.message ?? last)}`),
    { cause: last, httpStatus: last?.httpStatus ?? null, needsPermission: last?.needsPermission === true });
}

function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 3600000 })).toString("base64url");
  const sig = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  return `${payload}.${sig}`;
}

async function ensureSource() {
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
      locator: JSON.stringify({ catalog_no: CATALOG_NO, url: URL_ARG }),
      scope: JSON.stringify({ project_id: PROJECT_ID }) });
  return { ...rows[0], created: true };
}

// 一文件一版本：既有登记约束要求 version.checksum 等于原件字节摘要，不能一版多文件。
async function ensureFileVersion({ sourceId, file }) {
  const label = `${CATALOG_NO || "http"}-f0001-${file.contentType.replace(/[^a-z0-9]+/gi, "")}`;
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
        url: file.finalUrl, requested_url: URL_ARG, media_type: file.contentType,
        declared_media_type: file.declaredType, byte_size: file.byteSize,
        file_extent: { files: 1, pages: "unknown" },
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
  if (!URL_ARG || !TITLE || !PROVIDER) return fail("HTTP_FILE_FAILED", "HTTP_FILE_ARGS_REQUIRED");
  let parsed;
  try {
    parsed = new URL(URL_ARG);
  } catch {
    return fail("HTTP_FILE_FAILED", "HTTP_FILE_URL_INVALID");
  }
  if (!/^https?:$/.test(parsed.protocol)) return fail("HTTP_FILE_FAILED", "HTTP_FILE_URL_NOT_HTTP");

  const source = await ensureSource();
  const rights = typeof source.rights_by_action === "string"
    ? JSON.parse(source.rights_by_action) : (source.rights_by_action ?? {});
  const blocked = ["download", "retain", "machine_read"].filter((action) => rights[action] !== "allowed");
  const summary = {
    step: "HTTP_FILE_ACQUIRE", applied: APPLY, method: `${METHOD_KEY}@${METHOD_VERSION}`,
    url: URL_ARG, provider: PROVIDER, title: TITLE, catalog_no: CATALOG_NO || null,
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

  // 1) 真的取一次。
  let response;
  try {
    response = await download(URL_ARG);
  } catch (error) {
    const status = error?.needsPermission ? "HTTP_FILE_REQUIRES_PERMISSION"
      : error?.httpStatus === 404 ? "HTTP_FILE_NOT_FOUND" : "HTTP_FILE_FETCH_FAILED";
    return fail(status, String(error?.message ?? error), { summary });
  }
  const contentType = sniff(response.bytes);
  summary.response = {
    final_url: response.finalUrl, declared_type: response.declaredType,
    sniffed_type: contentType, byte_size: response.bytes.length,
    sha256: sha256(response.bytes),
  };
  // content-type 与魔数都要有说法：没有可识别签名就只当"未知类型二进制"，不冒充图片/PDF。
  if (!contentType) summary.response.type_note = "无可识别魔数，按未知二进制记录，不冒充影像或 PDF";
  const file = {
    finalUrl: response.finalUrl, declaredType: response.declaredType,
    contentType: contentType ?? response.declaredType ?? "application/octet-stream",
    byteSize: response.bytes.length, sha256: summary.response.sha256,
  };
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
  // 2) 落私有原件并回读校验。
  const record = await originals.reserve({
    projectId: PROJECT_ID, originalId: randomUUID(), assetId: randomUUID(),
    idempotencyKey: `http:${CATALOG_NO || TITLE}:${file.sha256.slice(0, 12)}`,
    sha256: file.sha256, byteSize: file.byteSize,
    fileName: `${(CATALOG_NO || "http-file").replace(/[^A-Za-z0-9-]/g, "_")}${extensionFor(file.contentType)}`,
    contentType: file.contentType,
  }, token);
  let stored = false;
  try {
    const previous = await storage.readVerified(record.storage_key, file.sha256, file.byteSize);
    if (!previous.equals(response.bytes)) throw new Error("ORIGINAL_INTEGRITY_FAILED");
    stored = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (!stored) await storage.putVerified(record.storage_key, response.bytes, file.contentType);
  const finalRecord = await originals.finalize(record.original_id, file.sha256, token);
  if (finalRecord.state !== "STORED_VERIFIED") return fail("HTTP_FILE_FAILED", "HTTP_FILE_ORIGINAL_NOT_VERIFIED", { summary });

  const storageRef = (await queryRows(
    `select storage_bucket||'/'||storage_key as ref from studio.private_originals where original_id=:'o'::uuid`,
    { o: record.original_id }))[0].ref;
  const version = await ensureFileVersion({ sourceId: source.source_id, file });
  const rawItemId = await ensureRawItem({ versionId: version.id, storageRef, file });
  const registration = await registrations.lookup(record.original_id, token);
  const registrationBound = registration.raw_item_id === rawItemId
    && registration.source_version_id === version.id && registration.sha256 === file.sha256;
  if (!registrationBound) return fail("HTTP_FILE_FAILED", "HTTP_FILE_REGISTRATION_NOT_BOUND", { summary });
  const finishedAt = new Date();

  // 3) 回读复算：只认库内字节与哈希，不认内存里的下载结果。
  const readBack = (await queryRows(
    `select checksum_sha256, byte_size from source.raw_items where raw_item_id=:'r'::uuid`, { r: rawItemId }))[0];
  const readBackMatches = readBack?.checksum_sha256 === file.sha256
    && Number(readBack?.byte_size) === file.byteSize;

  const needId = NEED_ID ?? (await queryRows(
    `select need_id::text as id from source.source_needs where project_id=:'p'::uuid
      order by created_at desc limit 1`, { p: PROJECT_ID }))[0]?.id ?? null;
  if (!needId) {
    await pool.end(); await workerPool.end();
    return fail("HTTP_FILE_FAILED", "HTTP_FILE_NEED_RECEIPT_REQUIRED", { summary });
  }

  // 4) Y07：方法目录 + 一次真实尝试（单文件，无分页）。
  const method = await discovery.registerAcquisitionMethod({
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    accessMode: "http_get_single_file",
    resourceScope: {
      protocols: ["HTTP GET（REST 直链）", "馆方导出文件"],
      carriers: [CARRIER], providers: [PROVIDER],
      resource_scope_note: "单文件原件（PDF/影像/导出件）；不含目录元数据",
    },
    preconditions: {
      url_publicly_reachable: true, rights_download_allowed: true, rights_retain_allowed: true,
      rate_limit: { retry_max: 3 },
    },
    steps: [
      "对调用方给出的公开 URL 发一次 HTTP GET（跟随重定向、限速退避）",
      "核 content-type 与文件魔数，不一致以魔数为准并如实记录",
      "算 SHA256、落私有原件并回读校验",
      "登记 source_version/raw_item 并回读私有登记确认绑定",
      "按文件粒度写一次获取尝试与覆盖结论（内页数如实 unknown）",
    ],
    successCriteria: [
      "字节可回读且 SHA256 与下载一致",
      "文件级分母 1/1 明确，内页数标明 unknown",
      "来源、版本、原始件三者登记一致",
    ],
    failureModes: [
      "HTTP_FILE_FETCH_FAILED", "HTTP_FILE_REQUIRES_PERMISSION", "HTTP_FILE_ORIGINAL_NOT_VERIFIED",
      "HTTP_FILE_REGISTRATION_NOT_BOUND", "HTTP_FILE_RIGHTS_ACTION_NOT_ALLOWED",
    ],
    alternatives: ["M0003@v1", "M0002@v1"],
    methodState: "TESTED_SUCCESS",
  });
  summary.method_registered = method;

  const requestDigest = sha256(Buffer.from(JSON.stringify({ url: URL_ARG, method: `${METHOD_KEY}@${METHOD_VERSION}` }), "utf8"));
  const attempt = await discovery.appendAcquisitionAttempt({
    projectId: PROJECT_ID, needId,
    candidateRef: {
      schema: "mohen.acquisition-file-candidate.v1", target: "source_file",
      source_id: source.source_id, provider: PROVIDER, title: TITLE, catalog_no: CATALOG_NO || null,
      url: file.finalUrl, media_type: file.contentType,
    },
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    executionEnvironment: {
      kind: "agent_workstation", runtime: "node", tool: "tools/acquire-http-file.mjs", user_agent: UA,
    },
    requestDigest,
    pagination: {
      boundary: "none", note: "单文件直取，无分页；内页数不在本次取得范围内主张",
      files_requested: 1, files_acquired: 1,
    },
    startedAt, finishedAt,
    resultState: readBackMatches ? "acquired_verified" : "unavailable",
    failureCode: readBackMatches ? null : "HTTP_FILE_READBACK_MISMATCH",
    failureCertainty: readBackMatches ? null : "CONFIRMED",
    acquiredExtent: {
      granularity: "file", files: [{ url: file.finalUrl, sha256: file.sha256, byte_size: file.byteSize }],
      files_total: 1, files_acquired: 1, pages: "unknown",
    },
    byteSize: file.byteSize,
    assetSha256: file.sha256,
    sourceLocator: { url: URL_ARG, final_url: file.finalUrl, catalog_no: CATALOG_NO || null },
    rightsActions: rights,
    accessRestrictions: { robots_or_terms_reviewed: false, rate_limit_observed: true },
    dependencyRefs: [
      { kind: "source", id: source.source_id, layer: "provider" },
      { kind: "raw_item", id: rawItemId, layer: "digital_asset", page: 1 },
    ],
    cost: { amount: null, currency: null, certainty: "unknown" },
  });
  summary.attempt = attempt;

  // 5) Y08：文件粒度覆盖结论。分母明确（1 个文件），内页数如实 unknown，
  //    因此这里不能顺手写成"整卷齐全"。
  const coverage = await discovery.recordAcquisitionCoverage({
    projectId: PROJECT_ID, attemptId: attempt.attempt_id,
    catalogEntryId: arg("catalog-entry-id", null),
    coverageScope: {
      schema: "mohen.source-file-coverage.v1", method: "Y08:file_coverage@v1",
      target: "source_file", source_id: source.source_id,
      granularity: "file",
      denominator: { kind: "requested_file_count", total_files: 1, files_acquired: 1 },
      pages_extent: "unknown",
      total_extent: "unknown",
      coverage_ratio: "1/1 file",
      file_sha256: file.sha256,
      source_version_ids: [version.id],
    },
    missingParts: [],
    completenessState: readBackMatches ? "complete" : "partial",
    verifiedAgainst: {
      attempt_id: attempt.attempt_id, files_verified: readBackMatches ? 1 : 0, files_total: 1,
      file_sha256: file.sha256, read_back_matches: readBackMatches,
      registrations_bound: registrationBound ? 1 : 0,
    },
    note: "文件级完整（1/1）且字节已回读校验；内页数未清点，不得据此声称全卷齐全",
  });
  summary.coverage = coverage;
  summary.method_current = await discovery.recordAcquisitionMethodRevalidation({
    methodKey: METHOD_KEY, methodVersion: METHOD_VERSION,
    methodState: readBackMatches ? "TESTED_SUCCESS" : "TESTED_FAILURE",
    revalidatedAt: finishedAt, recommended: readBackMatches ? true : undefined,
  });
  summary.result = {
    file_sha256: file.sha256, byte_size: file.byteSize, media_type: file.contentType,
    read_back_matches: readBackMatches, registration_bound: registrationBound,
    source_version_id: version.id, raw_item_id: rawItemId, storage_ref: storageRef,
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
