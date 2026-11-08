#!/usr/bin/env node
// CP2-E：把上海图书馆开放数据（唯一获授权来源）的一页真实原件落到本地私有原件库，
// 并登记 source / source_version / raw_item，形成 D00 可查的"同一真实原件"。
//
// 原件字节来源：`pdf/stream` 逐页返回的单页 PDF（沪上经纬已于 2026-09-14 下载在册）。
// 该 PDF 内嵌发布方提供的扫描影像为 `/Filter/DCTDecode` 直通流，本工具按 `/Length`
// 原样取出（**不重新编码、不改变像素**），因此取出的 JPEG 就是发布方影像字节。
// 这一步只在项目内部存储与机器读取层面使用（rights_by_action: access_view /
// machine_read / retain = allowed），不做展示、外发、再分发；display/adapt/
// external_processing 仍为 unknown（HOLD）。
//
// 默认只做只读演算（打印 sha256/字节数/抽取诊断），加 --apply 才落库。
import { randomUUID, createHmac } from "node:crypto";
import fs from "node:fs";
import { getNodePgPool, queryRows, run } from "../packages/data-access/src/index.mjs";
import { createLocalPrivateOriginalStorage, originalHash, MAX_ORIGINAL_BYTES } from "../packages/data-access/src/private-original-storage.mjs";
import { createPrivateOriginalRepository } from "../packages/data-access/src/private-original-repository.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";

const PROVIDER = "shanghai-library";
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

// 从单页 PDF 取出内嵌 DCTDecode 影像流（字节直通）。
function extractDctJpeg(buf) {
  const latin = Buffer.from(buf).toString("latin1");
  const found = [];
  let at = latin.indexOf("/Filter/DCTDecode");
  while (at >= 0) {
    // 字典范围：向前找最近的 "N 0 obj"，向后找字典结束的 ">>stream"。
    const objStart = latin.lastIndexOf(" obj", at) >= 0 ? latin.lastIndexOf(" obj", at) : 0;
    const streamAt = latin.indexOf("stream", at);
    // `/Length` 可能出现在 `/Filter/DCTDecode` 之后，必须在整段字典里找。
    const lengthMatch = streamAt > 0 ? /\/Length\s+(\d+)(?!\s+0\s+R)/.exec(latin.slice(objStart, streamAt)) : null;
    if (lengthMatch) {
      let dataStart = streamAt + 6;
      if (latin[dataStart] === "\r" && latin[dataStart + 1] === "\n") dataStart += 2;
      else if (latin[dataStart] === "\n") dataStart += 1;
      const length = Number(lengthMatch[1]);
      const data = buf.subarray(dataStart, dataStart + length);
      if (data.length === length && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
        found.push({ offset: dataStart, bytes: data });
      }
    }
    at = latin.indexOf("/Filter/DCTDecode", at + 1);
  }
  if (found.length === 0) throw new Error("SHL_PAGE_NO_DCT_IMAGE");
  // 单页 PDF 只允许一个可用的整页 DCT 影像；多个候选取最大者并显式报告。
  found.sort((a, b) => b.bytes.length - a.bytes.length);
  return { jpeg: found[0].bytes, candidates: found.length, offset: found[0].offset };
}

function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 30000 })).toString("base64url");
  const sig = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  return `${payload}.${sig}`;
}

async function ensureSource({ title, itemId, projectId }) {
  const existing = await queryRows(
    `select source_id::text from source.sources where provider=:'p' and title=:'t'`, { p: PROVIDER, t: title });
  if (existing.length > 1) throw new Error("SHL_SOURCE_AMBIGUOUS");
  if (existing.length === 1) return existing[0].source_id;
  const rows = await queryRows(
    `insert into source.sources(provider,title,source_type,carrier_type,content_availability,provenance_status,original_locator,scope)
     values (:'p',:'t',:'st','scanned_page','image_scan','verified_original',:'locator'::jsonb,:'scope'::jsonb)
     returning source_id::text as source_id`,
    { p: PROVIDER, t: title, st: "gazetteer",
      locator: JSON.stringify({ dataset: "Shanghai Library Open Data", dbname: "gj", item_id: itemId }),
      scope: JSON.stringify({ project_id: projectId }) });
  return rows[0].source_id;
}

// Owner 2026-11-08 选定路线：改为吸纳"同平台自带正文"的数据后，来源载体是文本记录，
// 不是扫描页。（既有图片页来源不受影响，仍在上面那条路径登记。）
async function ensureTextSource({ title, projectId, endpoint }) {
  const existing = await queryRows(
    `select source_id::text from source.sources where provider=:'p' and title=:'t'`, { p: PROVIDER, t: title });
  if (existing.length > 1) throw new Error("SHL_SOURCE_AMBIGUOUS");
  if (existing.length === 1) {
    const rows = await queryRows(
      `update source.sources set carrier_type='text_record', content_availability='structured_content'
        where source_id=:'id'::uuid returning source_id::text as source_id`, { id: existing[0].source_id });
    return rows[0].source_id;
  }
  const rows = await queryRows(
    `insert into source.sources(provider,title,source_type,carrier_type,content_availability,provenance_status,original_locator,scope)
     values (:'p',:'t','gazetteer','text_record','structured_content','verified_original',:'locator'::jsonb,:'scope'::jsonb)
     returning source_id::text as source_id`,
    { p: PROVIDER, t: title,
      locator: JSON.stringify({ dataset: "Shanghai Library Open Data", dbname: "shnh/dmz", endpoint }),
      scope: JSON.stringify({ project_id: projectId }) });
  return rows[0].source_id;
}

async function ensureVersion({ sourceId, label, sha256, metadata }) {
  const existing = await queryRows(
    `select source_version_id::text from source.source_versions where source_id=:'s'::uuid and checksum_sha256=:'h'`,
    { s: sourceId, h: sha256 });
  if (existing.length === 1) return existing[0].source_version_id;
  const rows = await queryRows(
    `insert into source.source_versions(source_id,version_label,retrieved_at,checksum_sha256,metadata)
     values (:'s'::uuid,:'l',now(),:'h',:'m'::jsonb) returning source_version_id::text as id`,
    { s: sourceId, l: label, h: sha256, m: JSON.stringify(metadata) });
  return rows[0].id;
}

async function ensureRawItem({ versionId, storageRef, sha256, byteSize, mediaType }) {
  const existing = await queryRows(
    `select raw_item_id::text from source.raw_items where storage_ref=:'r' and checksum_sha256=:'h'`,
    { r: storageRef, h: sha256 });
  if (existing.length === 1) return existing[0].raw_item_id;
  const rows = await queryRows(
    `insert into source.raw_items(source_version_id,storage_ref,media_type,byte_size,checksum_sha256)
     values (:'v'::uuid,:'r',:'mt',:'b',:'h') returning raw_item_id::text as id`,
    { v: versionId, r: storageRef, mt: mediaType, b: byteSize, h: sha256 });
  return rows[0].id;
}

// ---- 文本路线（Owner 2026-11-08 选定）：同平台自带正文 → text/plain 原件 ----
function locateFieldExtent(bytes, field, entryIndex) {
  const text = bytes.toString("utf8");
  const marker = `"${field}":"`;
  const starts = [];
  let at = text.indexOf(marker);
  while (at >= 0) { starts.push(at); at = text.indexOf(marker, at + 1); }
  if (starts.length === 0) throw new Error(`SHL_TEXT_FIELD_NOT_FOUND:${field}`);
  const pick = starts[entryIndex];
  if (pick === undefined) throw new Error(`SHL_TEXT_ENTRY_INDEX_OUT_OF_RANGE:${entryIndex}:${starts.length}`);
  const valueStartChar = pick + marker.length;
  const valueEndChar = text.indexOf('"', valueStartChar);
  if (valueEndChar < 0) throw new Error("SHL_TEXT_FIELD_UNTERMINATED");
  const rawValue = text.slice(valueStartChar, valueEndChar);
  if (/[\\]/.test(rawValue)) throw new Error("SHL_TEXT_FIELD_HAS_ESCAPES");
  const startByte = Buffer.byteLength(text.slice(0, valueStartChar), "utf8");
  const endByte = startByte + Buffer.byteLength(rawValue, "utf8");
  const selected = bytes.subarray(startByte, endByte);
  if (!Buffer.from(rawValue, "utf8").equals(selected) || !Buffer.from(selected.toString("utf8"), "utf8").equals(selected)) {
    throw new Error("SHL_TEXT_EXTENT_MISALIGNED");
  }
  return { start_byte: startByte, end_byte: endByte, quote: rawValue, quote_sha256: originalHash(selected), matches: starts.length };
}

async function landText() {
  const file = arg("file");
  const field = arg("field", "description");
  const entryIndex = Number(arg("entry-index", "0"));
  const title = arg("title");
  const endpoint = arg("endpoint", "");
  const originalId = arg("original-id", randomUUID());
  const assetId = arg("asset-id", randomUUID());
  const apply = process.argv.includes("--apply");
  const projectId = arg("project-id", "b0a11000-0000-4000-8000-000000000001");
  const owner = arg("owner", "270bcecf-9bfb-4865-9432-a0ac9db8df75");
  if (!file || !fs.existsSync(file)) throw new Error("SHL_TEXT_FILE_MISSING");
  if (!title) throw new Error("SHL_TEXT_TITLE_MISSING");

  const bytes = Buffer.from(fs.readFileSync(file));
  if (bytes.length > MAX_ORIGINAL_BYTES) throw new Error("SHL_TEXT_EXCEEDS_PRIVATE_ORIGINAL_LIMIT");
  const sha256 = originalHash(bytes);
  const extent = locateFieldExtent(bytes, field, entryIndex);

  const summary = {
    step: "SHL_LAND_TEXT",
    applied: apply,
    source_file: { path_basename: file.split(/[\\/]/).pop(), bytes: bytes.length, sha256 },
    field, entry_index: entryIndex, field_occurrences: extent.matches,
    extent: { start_byte: extent.start_byte, end_byte: extent.end_byte,
      bytes: extent.end_byte - extent.start_byte, quote_sha256: extent.quote_sha256,
      quote_head: extent.quote.slice(0, 60) },
    title, original_id: originalId, asset_id: assetId,
  };
  if (!apply) {
    summary.status = "SHL_LAND_TEXT_DRY_RUN";
    console.log(JSON.stringify(summary, null, 2));
    await getNodePgPool().end();
    return;
  }

  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || !secret) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
  const token = makeToken(owner, secret);
  const pool = getNodePgPool();
  const storage = createLocalPrivateOriginalStorage();
  const repository = createPrivateOriginalRepository(pool);

  const reserved = await repository.reserve({
    projectId, originalId, assetId,
    idempotencyKey: `shl-text:${sha256.slice(0, 16)}`,
    sha256, byteSize: bytes.length,
    fileName: `shl-dmz-${sha256.slice(0, 12)}.json.txt`,
    contentType: "text/plain",
  }, token);
  let alreadyStored = false;
  try {
    const previous = await storage.readVerified(reserved.storage_key, sha256, bytes.length);
    if (!previous.equals(bytes)) throw new Error("ORIGINAL_INTEGRITY_FAILED");
    alreadyStored = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (!alreadyStored) await storage.putVerified(reserved.storage_key, bytes, "text/plain");
  const finalRecord = await repository.finalize(originalId, sha256, token);
  summary.original = { state: finalRecord.state, sha256: finalRecord.sha256, byte_size: finalRecord.byte_size,
    asset_revision_id: finalRecord.asset_revision_id, already_stored: alreadyStored };

  const actualStorageRef = (await queryRows(
    `select storage_bucket||'/'||storage_key as ref from studio.private_originals where original_id=:'o'::uuid`,
    { o: originalId }))[0].ref;
  const sourceId = await ensureTextSource({ title, projectId, endpoint });
  const versionId = await ensureVersion({
    sourceId, label: `dmz-${sha256.slice(0, 16)}`, sha256,
    metadata: {
      schema: "mohen.shl-text-original.v1",
      dataset: "Shanghai Library Open Data Platform",
      dbname: "shnh/dmz", endpoint,
      field, entry_index: entryIndex,
      extent_kind: "utf8_byte_range/v1",
      start_byte: extent.start_byte, end_byte: extent.end_byte, quote_sha256: extent.quote_sha256,
      landed_by: "tools/land-shl-original.mjs --mode text",
    },
  });
  const rawItemId = await ensureRawItem({
    versionId, storageRef: actualStorageRef, sha256, byteSize: bytes.length, mediaType: "text/plain" });
  summary.registration = { source_id: sourceId, source_version_id: versionId, raw_item_id: rawItemId, storage_ref: actualStorageRef };

  const registrations = createPrivateSourceRegistrationRepository(pool);
  const registration = await registrations.lookup(originalId, token);
  summary.d00_lookup = {
    ok: registration.sha256 === sha256 && registration.raw_item_id === rawItemId &&
      registration.source_version_id === versionId && registration.provider === PROVIDER,
    provider: registration.provider, title: registration.title,
    carrier_type: registration.carrier_type, content_type: registration.content_type,
    artifact_revision: registration.artifact_revision,
    source_version_artifact_revision: registration.source_version_artifact_revision,
  };
  summary.reading_input = {
    original_id: originalId, raw_item_id: rawItemId, source_version_id: versionId,
    raw_sha256: sha256, kind: "utf8_byte_range/v1",
    start_byte: extent.start_byte, end_byte: extent.end_byte,
    quote_sha256: extent.quote_sha256, quote: extent.quote,
  };
  summary.status = summary.d00_lookup.ok ? "SHL_LAND_TEXT_OK" : "SHL_LAND_TEXT_NOT_BOUND";
  await pool.end();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.d00_lookup.ok) process.exitCode = 1;
}

async function main() {
  const mode = arg("mode", "pdf-page");
  if (mode === "text") return landText();
  const pdfPath = arg("pdf");
  const pageNumber = Number(arg("page", "0"));
  const itemId = arg("item-id");
  const title = arg("title");
  const originalId = arg("original-id", randomUUID());
  const assetId = arg("asset-id", randomUUID());
  const apply = process.argv.includes("--apply");
  const projectId = arg("project-id", "b0a11000-0000-4000-8000-000000000001");
  const owner = arg("owner", "270bcecf-9bfb-4865-9432-a0ac9db8df75");
  if (!pdfPath || !fs.existsSync(pdfPath)) throw new Error("SHL_PAGE_PDF_MISSING");
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) throw new Error("SHL_PAGE_NUMBER_INVALID");
  if (!itemId || !title) throw new Error("SHL_ITEM_ID_OR_TITLE_MISSING");

  const container = fs.readFileSync(pdfPath);
  const extracted = extractDctJpeg(container);
  const bytes = Buffer.from(extracted.jpeg);
  if (bytes.length > MAX_ORIGINAL_BYTES) throw new Error("SHL_PAGE_EXCEEDS_PRIVATE_ORIGINAL_LIMIT");
  const sha256 = originalHash(bytes);
  const containerSha256 = originalHash(container);

  const summary = {
    step: "SHL_LAND_ORIGINAL",
    applied: apply,
    container: { path_basename: pdfPath.split(/[\\/]/).pop(), bytes: container.length, sha256: containerSha256 },
    extracted: { candidates: extracted.candidates, jpeg_bytes: bytes.length, sha256, leading: bytes.subarray(0, 12).toString("hex") },
    item_id: itemId, page_number: pageNumber, title,
    original_id: originalId, asset_id: assetId,
  };

  if (!apply) {
    summary.status = "SHL_LAND_DRY_RUN";
    console.log(JSON.stringify(summary, null, 2));
    await getNodePgPool().end();
    return;
  }

  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || !secret) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
  const token = makeToken(owner, secret);
  const pool = getNodePgPool();
  const storage = createLocalPrivateOriginalStorage();
  const repository = createPrivateOriginalRepository(pool);

  // 1) 私有原件：预留 → 写字节（不覆盖） → 回读校验 → 定稿为 STORED_VERIFIED。
  const reserved = await repository.reserve({
    projectId, originalId, assetId,
    idempotencyKey: `shl:${itemId}:p${pageNumber}:${sha256.slice(0, 12)}`,
    sha256, byteSize: bytes.length,
    fileName: `shl-gj-${itemId}-p${String(pageNumber).padStart(5, "0")}.jpg`,
    contentType: "image/jpeg",
  }, token);
  let alreadyStored = false;
  try {
    const previous = await storage.readVerified(reserved.storage_key, sha256, bytes.length);
    if (!previous.equals(bytes)) throw new Error("ORIGINAL_INTEGRITY_FAILED");
    alreadyStored = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (!alreadyStored) await storage.putVerified(reserved.storage_key, bytes, "image/jpeg");
  const finalRecord = await repository.finalize(originalId, sha256, token);
  summary.original = { state: finalRecord.state, sha256: finalRecord.sha256, byte_size: finalRecord.byte_size,
    asset_revision_id: finalRecord.asset_revision_id, already_stored: alreadyStored };

  // 2) L0 登记：source / source_version / raw_item（storage_ref 必须与私有原件一致）。
  const storageRef = `${finalRecord.storage_bucket ?? "mohen-private-originals"}/${reserved.storage_key}`;
  const actualStorageRef = (await queryRows(
    `select storage_bucket||'/'||storage_key as ref from studio.private_originals where original_id=:'o'::uuid`,
    { o: originalId }))[0].ref;
  const sourceId = await ensureSource({ title, itemId, projectId });
  const versionId = await ensureVersion({
    sourceId, label: `gj-${itemId}-p${String(pageNumber).padStart(5, "0")}-dct-jpeg`, sha256,
    metadata: {
      schema: "mohen.shl-page-original.v1",
      dataset: "Shanghai Library Open Data Platform",
      dbname: "gj", item_id: itemId, page_number: pageNumber,
      container_media_type: "application/pdf",
      container_sha256: containerSha256, container_bytes: container.length,
      extractor: "dctdecode-byte-passthrough", reencoded: false,
      note: "Publisher image bytes carried inside the per-page PDF; extracted without re-encoding. Internal research storage only.",
      landed_by: "tools/land-shl-original.mjs",
    },
  });
  const rawItemId = await ensureRawItem({
    versionId, storageRef: actualStorageRef, sha256, byteSize: bytes.length, mediaType: "image/jpeg" });
  summary.registration = { source_id: sourceId, source_version_id: versionId, raw_item_id: rawItemId, storage_ref: actualStorageRef };

  // 3) D00 回查（只能经 SECURITY DEFINER 窄口）：必须返回同一原件与同一 sha256。
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const registration = await registrations.lookup(originalId, token);
  summary.d00_lookup = {
    ok: registration.sha256 === sha256 && registration.raw_item_id === rawItemId &&
      registration.source_version_id === versionId && registration.provider === PROVIDER,
    provider: registration.provider, title: registration.title,
    carrier_type: registration.carrier_type, content_type: registration.content_type,
    artifact_revision: registration.artifact_revision,
    source_version_artifact_revision: registration.source_version_artifact_revision,
  };

  summary.status = summary.d00_lookup.ok ? "SHL_LAND_OK" : "SHL_LAND_NOT_BOUND";
  await pool.end();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.d00_lookup.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  console.log(JSON.stringify({ status: "SHL_LAND_FAILED", error: String(error?.message ?? error) }));
  await getNodePgPool().end().catch(() => {});
  process.exitCode = 1;
});
