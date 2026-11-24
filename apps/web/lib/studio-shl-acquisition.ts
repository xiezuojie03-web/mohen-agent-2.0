// apps/web/lib/studio-shl-acquisition.ts
//
// ST-03：Studio 服务端合法获取「上海图书馆开放数据·沪地名志」自带正文的文本原件。
// 设计依据：PLAN §3.5 D.7（Studio 缺口路由与 D00 原件接入）与 CP2-E（Owner 2026-11-08
// 选定路线：dmz 自带正文 → 接口原始响应字节原样留存为 text/plain 私有原件）。
// 复用既有私有原件工作流（workflow.upload：预留→写字节→回读校验→定稿）与既有
// L0 登记结构（Source → Version → Raw），与 tools/land-shl-original.mjs --mode text
// 及 tools/stamp-shl-open-data-rights.mjs 同一口径；不新建第二套原件管理流程。
import { createHash, randomUUID } from "node:crypto";
import {
  createLocalPrivateOriginalStorage, createPrivateOriginalRepository, createPrivateOriginalStorage,
  createPrivateOriginalWorkflow, getNodePgPool, MAX_ORIGINAL_BYTES,
} from "@mohen/data-access";
import { createPrivateSourceRegistrationRepository } from "../../../packages/data-access/src/private-source-registration-repository.mjs";

const provider = "shanghai-library";
const contentType = "text/plain";
const DMZ_PATH = "/shnh/dmz/webapi/geonames/list";
const DMZ_HOST = "data.library.sh.cn";
const DMZ_BASE = process.env.SHL_BASE || "https://data.library.sh.cn";

// 与 tools/stamp-shl-open-data-rights.mjs（Owner 2026-11-08 授权）一致：
// 内部研究四项允许；对外展示/下载/改编/再分发/外发一律 unknown（HOLD）。
const rights = { access_view: "allowed", machine_read: "allowed", retain: "allowed", quote: "allowed" };
const RIGHTS_EVIDENCE = {
  schema: "mohen.rights-evidence.v1",
  basis: "owner_authorization",
  owner_decision_at: "2026-11-08",
  scope: "project_internal_research",
  dataset: "Shanghai Library Open Data Platform (data.library.sh.cn) incl. partner institutions",
  granted_actions: ["access_view", "machine_read", "retain", "quote"],
  held_actions: ["display", "download", "adapt", "redistribute", "external_processing"],
  note: "Same authorization as tools/stamp-shl-open-data-rights.mjs; no inference beyond it.",
  recorded_by: "apps/web/lib/studio-shl-acquisition.ts",
};

type TaskRow = { project_id: string; checkpoint: {
  sourceAcquisitionSelection?: {state?: string; candidate_id?: string; root_task_id?: string; project_id?: string};
  researchLeads?: Array<{id: string; epistemic: string; acquisition_candidate?: {
    provider?: string; locator?: string | null; content_availability?: string; record_uri?: string}}>;
  shlTextOriginal?: {candidate_id: string; original_id: string; source_version_id: string; raw_item_id: string; sha256: string};
} };

const taskSql = `select t.checkpoint, p.project_id::text as project_id
  from public.research_tasks t
  join studio.projects p on p.project_id::text=t.checkpoint->'studio'->>'project_id'
  where t.task_id=$1 and t.owner_user_id=$2 and p.owner_user_id=t.owner_user_id
    and p.lifecycle_status='ACTIVE' and t.status='done'`;

function selectedShlRecord(row: TaskRow | undefined, taskId: string) {
  const selection = row?.checkpoint.sourceAcquisitionSelection;
  if (!row || selection?.state !== "SELECTED" || selection.root_task_id !== taskId ||
      selection.project_id !== row.project_id || !selection.candidate_id)
    throw new Error("STUDIO_SOURCE_SELECTION_REQUIRED");
  const lead = row.checkpoint.researchLeads?.find(item => item.id === selection.candidate_id);
  const candidate = lead?.acquisition_candidate;
  if (lead?.epistemic !== "RESEARCH_LEAD" || candidate?.provider !== provider ||
      candidate.content_availability !== "full_content" ||
      typeof candidate.locator !== "string" || typeof candidate.record_uri !== "string")
    throw new Error("SHL_LOCATOR_UNSUPPORTED");
  return { projectId: row.project_id, candidateId: selection.candidate_id,
    locator: candidate.locator, recordUri: candidate.record_uri };
}

/** 校验线索携带的复取地址并取出检索配方（key 永不出现在 locator/日志）。 */
function dmzFetchRecipe(locator: string) {
  const url = new URL(locator);
  const allowedKeys = ["type", "freetext", "pageSize", "startIndex"];
  if (url.protocol !== "https:" || url.username || url.password ||
      url.hostname !== DMZ_HOST || url.pathname !== DMZ_PATH ||
      ![...url.searchParams.keys()].every(k => allowedKeys.includes(k)) ||
      url.searchParams.get("type") !== "3" ||
      !(url.searchParams.get("freetext") ?? "").trim() ||
      url.searchParams.get("freetext")!.length > 40)
    throw new Error("SHL_LOCATOR_UNSUPPORTED");
  return { path: url.pathname, qs: url.searchParams.toString() };
}

/** 原样复取同一条 dmz 记录的接口响应字节（key 由服务端注入，不落库不入日志）。 */
async function fetchDmzResponse(locator: string, recordUri: string) {
  const { path, qs } = dmzFetchRecipe(locator);
  const key = process.env.SHANGHAI_LIBRARY_KEY;
  if (!key) throw new Error("SHL_KEY_MISSING");
  // 实测（2026-11-08）：key 必须放地址栏参数；不声明 identity 时正文尾部会混入压缩残片。
  const res = await fetch(`${DMZ_BASE}${path}?${qs}&key=${encodeURIComponent(key)}`, {
    cache: "no-store", signal: AbortSignal.timeout(30000),
    headers: { Accept: "application/json", "Accept-Encoding": "identity",
      "User-Agent": "MoHenStudio/1.0 (https://github.com/xiezuojie03-web)" },
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!res.ok || bytes.length === 0) throw new Error("SHL_HTTP_" + res.status);
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 0 && declared !== bytes.length)
    throw new Error("SHL_BODY_TRUNCATED");
  if (bytes.length > MAX_ORIGINAL_BYTES) throw new Error("SHL_SOURCE_TOO_LARGE");
  const text = bytes.toString("utf8");
  if (/[\uFFFD\u0000]/.test(text)) throw new Error("SHL_BODY_CORRUPTED");
  let parsed: { result?: unknown; data?: unknown };
  try { parsed = JSON.parse(text); } catch { throw new Error("SHL_BODY_NOT_JSON"); }
  if (String(parsed.result) !== "0") throw new Error("SHL_RESULT_NOT_OK");
  // 精确对位 Owner 选中的那条记录：按条目 URI 原值匹配，命中必须恰好一条。
  const entries = Array.isArray(parsed.data) ? parsed.data : [];
  const matched = entries.filter(item => {
    const it = item as Record<string, unknown> | null;
    return it && [it.uri, it.placeUri, it.typeUri].some(u => typeof u === "string" && u === recordUri);
  });
  if (matched.length !== 1) throw new Error("SHL_RECORD_NOT_RESOLVED");
  const entry = matched[0] as Record<string, unknown>;
  const name = String(entry.name ?? "").trim();
  if (!name) throw new Error("SHL_RECORD_NAME_MISSING");
  return { bytes, entryName: name, entryIndex: entries.indexOf(entry), total: entries.length,
    freetext: new URL(locator).searchParams.get("freetext") ?? "" };
}

async function readback(receipt: NonNullable<TaskRow["checkpoint"]["shlTextOriginal"]>, projectId: string,
  candidateId: string, pool: ReturnType<typeof getNodePgPool>, sessionToken: string) {
  if (receipt.candidate_id !== candidateId) throw new Error("STUDIO_SOURCE_SELECTION_CHANGED");
  const workflow = createPrivateOriginalWorkflow({
    repository: createPrivateOriginalRepository(pool),
    storage: process.env.MOHEN_PRIVATE_ORIGINAL_LOCAL_FS === "true"
      ? createLocalPrivateOriginalStorage() : createPrivateOriginalStorage(),
  });
  const { record } = await workflow.download(receipt.original_id, sessionToken);
  const registration = await createPrivateSourceRegistrationRepository(pool).lookup(receipt.original_id, sessionToken);
  if (record.sha256 !== receipt.sha256 || registration.sha256 !== receipt.sha256 ||
      registration.project_id !== projectId || registration.source_version_id !== receipt.source_version_id ||
      registration.raw_item_id !== receipt.raw_item_id)
    throw new Error("STUDIO_SOURCE_READBACK_MISMATCH");
  return { ...receipt, byte_size: record.byte_size, state: "REGISTERED", d00: "REGISTRATION_READBACK_VERIFIED" };
}

export async function acquireSelectedShlTextOriginal(taskId: string, ownerId: string, sessionToken: string) {
  if (process.env.MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED !== "true")
    throw new Error("ORIGINAL_STORAGE_NOT_CONFIGURED");
  const pool = getNodePgPool();
  const first = (await pool.query(taskSql, [taskId, ownerId])).rows[0] as TaskRow | undefined;
  const selected = selectedShlRecord(first, taskId);
  const existing = first?.checkpoint.shlTextOriginal;
  if (existing) return readback(existing, selected.projectId, selected.candidateId, pool, sessionToken);

  const original = await fetchDmzResponse(selected.locator, selected.recordUri);
  const workflow = createPrivateOriginalWorkflow({
    repository: createPrivateOriginalRepository(pool),
    storage: process.env.MOHEN_PRIVATE_ORIGINAL_LOCAL_FS === "true"
      ? createLocalPrivateOriginalStorage() : createPrivateOriginalStorage(),
  });
  const idempotencyKey = "shl-dmz:" + createHash("sha256").update(taskId + ":" + selected.candidateId).digest("hex");
  const stored = await workflow.upload({
    projectId: selected.projectId, originalId: randomUUID(), assetId: randomUUID(), idempotencyKey,
    bytes: original.bytes, fileName: `shl-dmz-${createHash("sha256").update(original.bytes).digest("hex").slice(0, 12)}.json.txt`,
    contentType,
  }, sessionToken);

  const client = await pool.connect() as {
    query(sql: string, params?: unknown[]): Promise<{rows: Array<Record<string, unknown>>}>;
    release(): void;
  };
  try {
    await client.query("begin");
    const current = (await client.query(taskSql + " for update of t, p", [taskId, ownerId])).rows[0] as TaskRow | undefined;
    if (!current) throw new Error("STUDIO_SOURCE_SELECTION_CHANGED");
    const confirmed = selectedShlRecord(current, taskId);
    if (confirmed.candidateId !== selected.candidateId || confirmed.projectId !== selected.projectId ||
        confirmed.locator !== selected.locator || confirmed.recordUri !== selected.recordUri)
      throw new Error("STUDIO_SOURCE_SELECTION_CHANGED");
    const replay = current.checkpoint.shlTextOriginal;
    if (replay) {
      await client.query("commit");
      return readback(replay, confirmed.projectId, confirmed.candidateId, pool, sessionToken);
    }
    const verified = (await client.query(
      `select storage_bucket||'/'||storage_key as storage_ref from studio.private_originals
        where original_id=$1 and project_id=$2 and owner_user_id=$3 and state='STORED_VERIFIED'
          and sha256=$4 and byte_size=$5 and asset_revision_id=$6`,
      [stored.original_id, selected.projectId, ownerId, stored.sha256, stored.byte_size, stored.asset_revision_id]
    )).rows[0];
    if (typeof verified?.storage_ref !== "string") throw new Error("STUDIO_SOURCE_READBACK_MISMATCH");
    const sourceId = randomUUID(), versionId = randomUUID(), rawId = randomUUID();
    const locator = { dataset: "Shanghai Library Open Data Platform", dbname: "shnh/dmz",
      endpoint: DMZ_PATH, freetext: original.freetext, matched_uri: selected.recordUri,
      entry_index: original.entryIndex, entry_count: original.total };
    const evidence = { ...RIGHTS_EVIDENCE, endpoint: `${DMZ_BASE}${DMZ_PATH}`, freetext: original.freetext };
    await client.query(`insert into source.sources
      (source_id,provider,title,source_type,carrier_type,content_availability,provenance_status,original_locator,scope,rights,rights_by_action,rights_evidence)
      values ($1,$2,$3,'gazetteer','text_record','structured_content','verified_original',$4,$5,$6,$7,$6)`,
      [sourceId, provider, `上海地名志·${original.entryName}（上海图书馆开放数据 shnh/dmz）`, locator,
       {project_id:selected.projectId}, evidence, rights]);
    await client.query(`insert into source.source_versions
      (source_version_id,source_id,version_label,retrieved_at,checksum_sha256,metadata,rights_snapshot)
      values ($1,$2,$3,now(),$4,$5,$6)`,
      [versionId, sourceId, `dmz-${stored.sha256.slice(0, 16)}`, stored.sha256,
        {...locator, schema: "mohen.shl-text-original.v1", original_id: stored.original_id,
         root_task_id: taskId, landed_by: "apps/web/lib/studio-shl-acquisition.ts",
         extent_kind: "utf8_byte_range/v1"}, rights]);
    await client.query(`insert into source.raw_items
      (raw_item_id,source_version_id,storage_ref,media_type,byte_size,checksum_sha256)
      values ($1,$2,$3,$4,$5,$6)`,
      [rawId, versionId, verified.storage_ref, contentType, stored.byte_size, stored.sha256]);
    const receipt = {candidate_id:selected.candidateId, original_id:stored.original_id,
      source_version_id:versionId, raw_item_id:rawId, sha256:stored.sha256};
    await client.query(`update public.research_tasks
      set checkpoint=jsonb_set(checkpoint,'{shlTextOriginal}',$2::jsonb), updated_at=now()
      where task_id=$1`, [taskId, JSON.stringify(receipt)]);
    await client.query("commit");
    return readback(receipt, selected.projectId, selected.candidateId, pool, sessionToken);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** 只读诊断：同一服务运行时内复核选中记录仍可原样复取。 */
export async function diagnoseSelectedShlTextOriginal(taskId: string, ownerId: string) {
  const pool = getNodePgPool();
  const row = (await pool.query(taskSql, [taskId, ownerId])).rows[0] as TaskRow | undefined;
  const selected = selectedShlRecord(row, taskId);
  const existing = row?.checkpoint.shlTextOriginal;
  if (existing) return { selection: "REGISTERED", upstream: "SHL_TEXT_REGISTERED", record_uri: selected.recordUri };
  try {
    const original = await fetchDmzResponse(selected.locator, selected.recordUri);
    return { selection: "SELECTED", upstream: "SHL_RECORD_VERIFIED", entry_name: original.entryName,
      bytes: original.bytes.length, record_uri: selected.recordUri };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return { selection: "SELECTED", upstream: /^SHL_[A-Z_0-9]+$/.test(code) ? code : "SHL_REQUEST_FAILED",
      record_uri: selected.recordUri };
  }
}
