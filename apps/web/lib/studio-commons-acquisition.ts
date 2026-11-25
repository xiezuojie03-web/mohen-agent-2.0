import { createHash, randomUUID } from "node:crypto";
import {
  createLocalPrivateOriginalStorage, createPrivateOriginalRepository, createPrivateOriginalStorage,
  createPrivateOriginalWorkflow, getNodePgPool, MAX_ORIGINAL_BYTES,
} from "@mohen/data-access";
import { createPrivateSourceRegistrationRepository } from "../../../packages/data-access/src/private-source-registration-repository.mjs";

const provider = "wikimedia-commons";
const licenseUrl = "https://creativecommons.org/licenses/by-sa/3.0/";
const contentType = "image/jpeg";
const rights = { access_view: "allowed", download: "allowed", retain: "allowed", machine_read: "allowed" };

function commonsFile(value: string) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/wikipedia\/commons\/[a-f0-9]\/([a-f0-9]{2})\/([^/]+)$/);
  if (url.origin !== "https://upload.wikimedia.org" || url.username || url.password || !match)
    throw new Error("COMMONS_LOCATOR_UNSUPPORTED");
  const title = decodeURIComponent(match[2]);
  if (!/\.jpe?g$/i.test(title) || /[\/\\\u0000-\u001f\u007f]/.test(title))
    throw new Error("COMMONS_LOCATOR_UNSUPPORTED");
  return { title, original: url.origin + url.pathname };
}

async function boundedFetch(url: string, limit: number, accept: string) {
  const stage = accept === "application/json" ? "METADATA" : "ORIGINAL";
  // 原件上限 10MB：实测代理链路 ~220KB/s，10MB 需 ~47s；60s 余量太小会偶发超时。
  // 元数据保持 15s。
  const timeoutMs = stage === "ORIGINAL" ? 120000 : 15000;
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: accept, "User-Agent": "MoHenStudio/1.0 (https://github.com/xiezuojie03-web)" } });
  if (!response.ok) throw new Error("COMMONS_" + stage + "_HTTP_" + response.status);
  if (!response.body) throw new Error("COMMONS_" + stage + "_BODY_MISSING");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("COMMONS_SOURCE_TOO_LARGE");
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

type CommonsImageInfo = {
  url?: string; mime?: string; size?: number; sha1?: string; timestamp?: string;
  extmetadata?: Record<string, { value?: string }>;
};

async function obtainCommonsOriginal(locator: string) {
  const file = commonsFile(locator);
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", titles: "File:" + file.title,
    prop: "info|imageinfo", iiprop: "url|size|mime|sha1|timestamp|extmetadata",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Attribution|Artist",
  }).toString();
  const reply = JSON.parse((await boundedFetch(api.href, 256 * 1024, "application/json")).toString("utf8")) as {
    query?: { pages?: Array<{ pageid?: number; lastrevid?: number; imageinfo?: CommonsImageInfo[] }> };
  };
  const page = reply.query?.pages?.[0];
  const item = page?.imageinfo?.[0];
  const meta = item?.extmetadata;
  const attribution = (meta?.Attribution?.value || meta?.Artist?.value || "").replace(/<[^>]*>/g, "").trim();
  if (meta?.LicenseShortName?.value !== "CC BY-SA 3.0" ||
      meta?.LicenseUrl?.value?.replace(/\/$/, "") !== licenseUrl.slice(0, -1) ||
      !attribution || attribution.length > 300 || !Number.isSafeInteger(page?.lastrevid))
    throw new Error("COMMONS_LICENSE_NOT_VERIFIED");
  const size = item?.size;
  const expectedSha1 = item?.sha1;
  if (item?.mime !== contentType || !item.url || commonsFile(item.url).original !== file.original ||
      typeof size !== "number" || !Number.isSafeInteger(size) || size < 3)
    throw new Error("COMMONS_ORIGINAL_NOT_VERIFIED");
  // 超过私有原件保存上限的文件单独报码：让用户知道是体积上限，而不是字节损坏。
  if (size > MAX_ORIGINAL_BYTES) throw new Error("COMMONS_ORIGINAL_TOO_LARGE");
  if (typeof expectedSha1 !== "string" || !/^[a-f0-9]{40}$/i.test(expectedSha1))
    throw new Error("COMMONS_ORIGINAL_NOT_VERIFIED");
  const bytes = await boundedFetch(file.original, size, contentType);
  if (bytes.length !== size || bytes.readUIntBE(0, 3) !== 0xffd8ff ||
      createHash("sha1").update(bytes).digest("hex") !== expectedSha1.toLowerCase())
    throw new Error("COMMONS_ORIGINAL_NOT_VERIFIED");

  const evidence = {
    schema: "mohen.commons-source-license.v1", provider, attribution,
    // G0 rights_by_operation（CP2-A 权利词典）要求显式权利依据：这里是 Commons
    // 文件页声明的 CC BY-SA 3.0 许可本身，不是项目自授。
    basis: "wikimedia_commons_cc_by_sa_3_0",
    license: "CC BY-SA 3.0", license_url: licenseUrl,
    file_page: `https://commons.wikimedia.org/w/index.php?oldid=${page?.lastrevid}`,
    file_url: file.original, commons_sha1: expectedSha1, file_timestamp: item.timestamp,
    obligations: ["attribution", "source_link", "license_link", "indicate_changes", "share_alike_for_adaptations"],
    scope: "private_original_acquisition",
  };
  return { bytes, evidence, title: file.title.replace(/_/g, " ") };
}

const taskSql = `select t.checkpoint, p.project_id::text as project_id
  from public.research_tasks t
  join studio.projects p on p.project_id::text=t.checkpoint->'studio'->>'project_id'
  where t.task_id=$1 and t.owner_user_id=$2 and p.owner_user_id=t.owner_user_id
    and p.lifecycle_status='ACTIVE' and t.status='done'`;

type TaskRow = { project_id: string; checkpoint: {
  sourceAcquisitionSelection?: {state?: string; candidate_id?: string; root_task_id?: string; project_id?: string};
  researchLeads?: Array<{id: string; epistemic: string; acquisition_candidate?: {provider?: string; locator?: string}}>;
  commonsOriginal?: {candidate_id: string; original_id: string; source_version_id: string; raw_item_id: string; sha256: string};
} };

function selectedOriginal(row: TaskRow | undefined, taskId: string) {
  const selection = row?.checkpoint.sourceAcquisitionSelection;
  if (!row || selection?.state !== "SELECTED" || selection.root_task_id !== taskId ||
      selection.project_id !== row.project_id || !selection.candidate_id)
    throw new Error("STUDIO_SOURCE_SELECTION_REQUIRED");
  const lead = row.checkpoint.researchLeads?.find(item => item.id === selection.candidate_id);
  if (lead?.epistemic !== "RESEARCH_LEAD" || lead.acquisition_candidate?.provider !== provider ||
      typeof lead.acquisition_candidate.locator !== "string")
    throw new Error("COMMONS_LOCATOR_UNSUPPORTED");
  return { projectId: row.project_id, candidateId: selection.candidate_id, locator: lead.acquisition_candidate.locator };
}

export async function acquireSelectedCommonsOriginal(taskId: string, ownerId: string, sessionToken: string) {
  if (process.env.MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED !== "true")
    throw new Error("ORIGINAL_STORAGE_NOT_CONFIGURED");
  const pool = getNodePgPool();
  const args = [taskId, ownerId];
  const first = (await pool.query(taskSql, args)).rows[0] as TaskRow | undefined;
  const selected = selectedOriginal(first, taskId);
  const repository = createPrivateOriginalRepository(pool);
  const storage = process.env.MOHEN_PRIVATE_ORIGINAL_LOCAL_FS === "true"
    ? createLocalPrivateOriginalStorage() : createPrivateOriginalStorage();
  const workflow = createPrivateOriginalWorkflow({ repository, storage });
  const registrations = createPrivateSourceRegistrationRepository(pool);
  const readback = async (receipt: NonNullable<TaskRow["checkpoint"]["commonsOriginal"]>) => {
    if (receipt.candidate_id !== selected.candidateId) throw new Error("STUDIO_SOURCE_SELECTION_CHANGED");
    const { record } = await workflow.download(receipt.original_id, sessionToken);
    const registration = await registrations.lookup(receipt.original_id, sessionToken);
    if (record.sha256 !== receipt.sha256 || registration.sha256 !== receipt.sha256 ||
        registration.project_id !== selected.projectId || registration.source_version_id !== receipt.source_version_id ||
        registration.raw_item_id !== receipt.raw_item_id)
      throw new Error("STUDIO_SOURCE_READBACK_MISMATCH");
    return { ...receipt, byte_size: record.byte_size, state: "REGISTERED", d00: "REGISTRATION_READBACK_VERIFIED" };
  };
  const existing = first?.checkpoint.commonsOriginal;
  if (existing) return readback(existing);

  const original = await obtainCommonsOriginal(selected.locator);
  const idempotencyKey = "commons:" + createHash("sha256").update(taskId + ":" + selected.candidateId).digest("hex");
  const stored = await workflow.upload({
    projectId: selected.projectId, originalId: randomUUID(), assetId: randomUUID(), idempotencyKey,
    bytes: original.bytes, fileName: "commons-original.jpg", contentType,
  }, sessionToken);

  const client = await pool.connect() as {
    query(sql: string, params?: unknown[]): Promise<{rows: Array<Record<string, unknown>>}>;
    release(): void;
  };
  try {
    await client.query("begin");
    const current = (await client.query(taskSql + " for update of t, p", args)).rows[0] as TaskRow | undefined;
    if (!current) throw new Error("STUDIO_SOURCE_SELECTION_CHANGED");
    const confirmed = selectedOriginal(current, taskId);
    if (confirmed.candidateId !== selected.candidateId || confirmed.projectId !== selected.projectId ||
        confirmed.locator !== selected.locator) throw new Error("STUDIO_SOURCE_SELECTION_CHANGED");
    const replay = current.checkpoint.commonsOriginal;
    if (replay) {
      await client.query("commit");
      return readback(replay);
    }
    const verified = (await client.query(
      `select storage_bucket||'/'||storage_key as storage_ref from studio.private_originals
        where original_id=$1 and project_id=$2 and owner_user_id=$3 and state='STORED_VERIFIED'
          and sha256=$4 and byte_size=$5 and asset_revision_id=$6`,
      [stored.original_id, selected.projectId, ownerId, stored.sha256, stored.byte_size, stored.asset_revision_id]
    )).rows[0];
    if (typeof verified?.storage_ref !== "string") throw new Error("STUDIO_SOURCE_READBACK_MISMATCH");
    const sourceId = randomUUID(), versionId = randomUUID(), rawId = randomUUID();
    const locator = { url: original.evidence.file_url, file_page: original.evidence.file_page, page_number: 1 };
    await client.query(`insert into source.sources
      (source_id,provider,title,source_type,carrier_type,content_availability,provenance_status,original_locator,scope,rights,rights_by_action,rights_evidence)
      values ($1,$2,$3,'image','scanned_page','image_scan','verified_original',$4,$5,$6,$7,$6)`,
      [sourceId, provider, original.title, locator, {project_id:selected.projectId}, original.evidence, rights]);
    await client.query(`insert into source.source_versions
      (source_version_id,source_id,version_label,retrieved_at,checksum_sha256,metadata,rights_snapshot)
      values ($1,$2,$3,now(),$4,$5,$6)`,
      [versionId, sourceId, original.evidence.commons_sha1, stored.sha256,
        {...original.evidence, original_id:stored.original_id, root_task_id:taskId}, rights]);
    await client.query(`insert into source.raw_items
      (raw_item_id,source_version_id,storage_ref,media_type,byte_size,checksum_sha256)
      values ($1,$2,$3,$4,$5,$6)`,
      [rawId, versionId, verified.storage_ref, contentType, stored.byte_size, stored.sha256]);
    const receipt = {candidate_id:selected.candidateId, original_id:stored.original_id,
      source_version_id:versionId, raw_item_id:rawId, sha256:stored.sha256};
    await client.query(`update public.research_tasks
      set checkpoint=jsonb_set(checkpoint,'{commonsOriginal}',$2::jsonb), updated_at=now()
      where task_id=$1`, [taskId, JSON.stringify(receipt)]);
    await client.query("commit");
    return readback(receipt);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Read-only checks in the same server runtime as acquisition. */
export async function diagnoseSelectedCommonsOriginal(taskId: string, ownerId: string) {
  const pool = getNodePgPool();
  const row = (await pool.query(taskSql, [taskId, ownerId])).rows[0] as TaskRow | undefined;
  if (!row) throw new Error("STUDIO_SOURCE_SELECTION_REQUIRED");
  const selected = selectedOriginal(row, taskId);
  let upstream: string;
  try {
    await obtainCommonsOriginal(selected.locator);
    upstream = "COMMONS_ORIGINAL_VERIFIED";
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    upstream = /^COMMONS_[A-Z_0-9]+$/.test(code) ? code : "COMMONS_REQUEST_FAILED";
  }
  let storage: string;
  try {
    const endpoint = process.env.SUPABASE_URL ?? process.env.MOHEN_SUPABASE_URL;
    const token = process.env.MOHEN_PRIVATE_STORAGE_SERVICE_KEY;
    if (process.env.MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED !== "true") storage = "UPLOAD_DISABLED";
    else if (!endpoint || !token) storage = "STORAGE_NOT_CONFIGURED";
    else {
      const base = new URL(endpoint);
      if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/")
        storage = "STORAGE_ENDPOINT_INVALID";
      else {
        const response = await fetch(base.origin + "/storage/v1/bucket/mohen-private-originals", {
          redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
          headers: {apikey: token, Authorization: "Bearer " + token},
        });
        if (!response.ok) storage = `STORAGE_HTTP_${response.status}`;
        else storage = (await response.json()).public === false ? "STORAGE_PRIVATE_BUCKET_REACHABLE" : "STORAGE_BUCKET_NOT_PRIVATE";
      }
    }
  } catch {
    storage = "STORAGE_REQUEST_FAILED";
  }
  return { upstream, storage, original_registered: !!row.checkpoint.commonsOriginal };
}
