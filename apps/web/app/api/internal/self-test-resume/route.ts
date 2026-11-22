// 建设期自检通道：只在 Preview + MOHEN_SELF_TEST_ENABLED=true 时启用，受 HMAC
// 凭据保护。它让施工方（而非 Owner 本人）能从命令行触发一次 D00 接收或一次续跑
// 并读取真实回执，用于端到端自检。D00 接收仍受服务端 MOHEN_D00_APPROVED_RUN
// 预批准绑定约束。绝不在 Production 生效，绝不签发 Gate、绝不伪造创作者浏览器
// 会话——只用 Owner 的服务端短时会话做原件 RLS 复核。
import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getTaskStatus, requestProduction } from "../../../../lib/studio-research";
import { signDatabaseSessionToken } from "../../../../lib/auth";
import { createPrivateOriginalRepository, getNodePgPool } from "@mohen/data-access";
import type { ProductionOriginal } from "../../../../lib/studio-production";
import { createPrivateSourceRegistrationRepository } from "../../../../../../packages/data-access/src/private-source-registration-repository.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCHEMA="mohen.self-test-resume.v1";

export async function POST(req: Request) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.MOHEN_SELF_TEST_ENABLED !== "true")
    return NextResponse.json({ ok: false, reason: "self_test_disabled" }, { status: 404 });
  const credential = process.env.MOHEN_SELF_TEST_CREDENTIAL;
  const ownerUid = process.env.MOHEN_SELF_TEST_OWNER_UID;
  if (typeof credential !== "string" || credential.length < 32 || !UUID.test(ownerUid ?? ""))
    return NextResponse.json({ ok: false, reason: "self_test_not_configured" }, { status: 503 });
  const time = req.headers.get("x-self-test-time") ?? "";
  const sig = req.headers.get("x-self-test-signature") ?? "";
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  const canonical = JSON.stringify(body);
  const expected = createHmac("sha256", credential).update(SCHEMA + "\n" + time + "\n" + canonical).digest("hex");
  if (!/^\d{1,16}$/.test(time) || Math.abs(Date.now() - Number(time)) > 30000 ||
      !/^[a-f0-9]{64}$/.test(sig) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig)))
    return NextResponse.json({ ok: false, reason: "self_test_denied" }, { status: 401 });

  const taskId = body.task_id;
  // 配置诊断：只回报"哪些键缺失/无效"与三个授权端点的 host+path（不含凭据、不含 query），
  // 不联网、不读库、不签发任何 Gate。用于施工侧定位云端执行器的授权缺口。
  if (body.diag === "readiness") {
    const { cloudExecutionReadiness } = await import("../../../../../../pipelines/data-production/orchestrator/cloud-execution-readiness.mjs");
    const endpoints: Record<string, string | null> = {};
    for (const key of ["MOHEN_EXECUTION_AUTH_VERIFY_URL", "MOHEN_EXECUTION_AUTH_DYNAMIC_URL", "MOHEN_INDEPENDENT_GATE_VERIFY_URL"]) {
      const raw = process.env[key];
      try { const u = new URL(String(raw)); endpoints[key] = `${u.protocol}//${u.host}${u.pathname}`; }
      catch { endpoints[key] = null; }
    }
    return NextResponse.json({ ok: true, readiness: cloudExecutionReadiness(process.env), endpoints }, { headers: { "cache-control": "no-store" } });
  }
  // 落库修复：把已在库内登记为 STORED_VERIFIED、但对象字节缺失的原件，按同一 storage key
  // 重放字节。只接受与 private_originals.sha256 完全一致的字节，因此无法借此写入新内容。
  if (body.repair === "original_bytes") {
    const originalId = String(body.original_id ?? "");
    if (!UUID.test(originalId)) return NextResponse.json({ ok: false, reason: "invalid_original" }, { status: 400 });
    const rows = await getNodePgPool().query(
      "select storage_key, sha256, content_type from studio.private_originals where original_id = $1 and state = 'STORED_VERIFIED'",
      [originalId]);
    if (!rows.rows.length) return NextResponse.json({ ok: false, reason: "original_not_found" }, { status: 404 });
    const row = rows.rows[0] as { storage_key: string; sha256: string; content_type: string | null };
    const bytes = Buffer.from(String(body.bytes_b64 ?? ""), "base64");
    if (!bytes.length) return NextResponse.json({ ok: false, reason: "bytes_required" }, { status: 400 });
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (sha !== row.sha256) return NextResponse.json({ ok: false, reason: "byte_sha_mismatch" }, { status: 409 });
    const { createPrivateOriginalStorage } = await import("@mohen/data-access");
    await createPrivateOriginalStorage().putVerified(row.storage_key, bytes, String(row.content_type ?? "application/octet-stream"));
    return NextResponse.json({ ok: true, repaired: true, key: row.storage_key, sha256: sha, byte_size: bytes.length }, { headers: { "cache-control": "no-store" } });
  }
  const originalId = body.original_id;
  const page = body.page_number;
  const fromStage = body.from_stage === "D01" || body.from_stage === "D02" || body.from_stage === "D03" || body.from_stage === "D04" || body.from_stage === "D05" ? body.from_stage : undefined;
  // D00 接收同样只经本通道：它不开新的生产入口，仍由服务端 MOHEN_D00_APPROVED_RUN
  // 预批准绑定（run_id + 输入摘要）把关，未预批准一律拒绝。
  const endStage = body.end_stage === "D00" ? "D00" : undefined;
  if (!UUID.test(String(taskId)) || !UUID.test(String(originalId)) ||
      !Number.isSafeInteger(page) || Number(page) < 1 || Number(page) > 10000 ||
      (endStage !== undefined && fromStage !== undefined))
    return NextResponse.json({ ok: false, reason: "self_test_invalid_input" }, { status: 400 });

  const task = await getTaskStatus(String(taskId));
  if (!task) return NextResponse.json({ ok: false, reason: "task_not_found" }, { status: 404 });
  if (task.status !== "done") return NextResponse.json({ ok: false, reason: "task_not_ready" }, { status: 409 });
  const checkpoint = typeof task.checkpoint === "string"
    ? (() => { try { return JSON.parse(task.checkpoint); } catch { return null; } })()
    : task.checkpoint;
  const studio = checkpoint && typeof checkpoint === "object" && !Array.isArray(checkpoint)
    ? (checkpoint as Record<string, unknown>).studio : null;
  const project = studio && typeof studio === "object" && !Array.isArray(studio)
    ? (studio as Record<string, unknown>).project_id : null;
  if (typeof project !== "string" || !UUID.test(project))
    return NextResponse.json({ ok: false, reason: "production_project_binding_required" }, { status: 409 });

  let source: ProductionOriginal;
  let ownerSessionToken: string;
  try {
    const pool = getNodePgPool();
    const token = signDatabaseSessionToken({ uid: ownerUid as string, r: [] }, 300_000);
    ownerSessionToken = token;
    const original = await createPrivateOriginalRepository(pool).getStored(String(originalId), token);
    if (!original || original.project_id !== project || original.state !== "STORED_VERIFIED" ||
        !original.asset_revision_id || !original.sha256 || !original.content_type)
      return NextResponse.json({ ok: false, reason: "production_original_forbidden" }, { status: 403 });
    const registration = await createPrivateSourceRegistrationRepository(pool).lookup(String(originalId), token);
    if (registration.original_id !== originalId || registration.project_id !== project ||
        registration.sha256 !== original.sha256 || registration.content_type !== original.content_type ||
        registration.asset_revision_id !== original.asset_revision_id ||
        Number(registration.byte_size) !== Number(original.byte_size))
      return NextResponse.json({ ok: false, reason: "production_original_not_bound" }, { status: 409 });
    source = {
      originalId: String(originalId), pageNumber: Number(page), sourceVersionId: registration.source_version_id,
      sha256: original.sha256, assetRevisionId: original.asset_revision_id,
      contentType: original.content_type, byteSize: Number(original.byte_size),
      uploadStartedAt: original.upload_started_at instanceof Date ? original.upload_started_at.toISOString() : String(original.upload_started_at ?? ""),
      uploadVerifiedAt: original.upload_verified_at instanceof Date ? original.upload_verified_at.toISOString() : String(original.upload_verified_at ?? ""),
    };
    if (!Number.isFinite(Date.parse(source.uploadStartedAt)) || !Number.isFinite(Date.parse(source.uploadVerifiedAt)) ||
        Date.parse(source.uploadStartedAt) > Date.parse(source.uploadVerifiedAt))
      return NextResponse.json({ ok: false, reason: "production_acquisition_receipt_required" }, { status: 409 });
  } catch {
    return NextResponse.json({ ok: false, reason: "production_original_check_unavailable" }, { status: 503 });
  }

  const resumeRunId = checkpoint && typeof checkpoint === "object" && !Array.isArray(checkpoint)
    ? (checkpoint as Record<string, unknown>).production_run_id : null;
  const result = await requestProduction(
    String(taskId), ownerUid as string, undefined, undefined, source, ownerSessionToken, endStage,
    fromStage ? { runId: String(resumeRunId), fromStage } : undefined,
  );
  return NextResponse.json({ ok: result.ok, reason: result.reason, run_id: result.run_id });
}
