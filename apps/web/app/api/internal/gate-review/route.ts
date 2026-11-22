// 部署内受控 Gate 机器评审入口：评审与签名全部在本部署内完成，机器评审会话密钥
// （MOHEN_DATABASE_SESSION_SECRET）与机器签发连接（MOHEN_GATE_MACHINE_DATABASE_URL）
// 只存在于部署环境，绝不出部署、绝不在任何本地进程中物化。评审逻辑与
// tools/rule-gate-reviewer.mjs 的 CLI 完全同一份实现（runGateReview），不存在第二条
// 签发路径；候选必须已是 SUBMITTED、摘要必须由签发方从持久事实自重建（失败关闭）。
// 只在 Preview + 显式开关 + 独立 HMAC 凭据下可用，Production 永不生效。
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCHEMA = "mohen.gate-review.v1";
const GATES = new Set(["G0", "G1", "G2", "G3", "G4", "G5"]);

export async function POST(req: Request) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.MOHEN_GATE_REVIEW_ENABLED !== "true")
    return NextResponse.json({ ok: false, reason: "gate_review_disabled" }, { status: 404 });
  const credential = process.env.MOHEN_GATE_REVIEW_CREDENTIAL;
  if (typeof credential !== "string" || credential.length < 32)
    return NextResponse.json({ ok: false, reason: "gate_review_not_configured" }, { status: 503 });
  const time = req.headers.get("x-gate-review-time") ?? "";
  const sig = req.headers.get("x-gate-review-signature") ?? "";
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  const canonical = JSON.stringify(body);
  const expected = createHmac("sha256", credential).update(SCHEMA + "\n" + time + "\n" + canonical).digest("hex");
  if (!/^\d{1,16}$/.test(time) || Math.abs(Date.now() - Number(time)) > 30000 ||
      !/^[a-f0-9]{64}$/.test(sig) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig)))
    return NextResponse.json({ ok: false, reason: "gate_review_denied" }, { status: 401 });

  const gate = String(body.gate ?? "");
  const projectId = String(body.project_id ?? "");
  const candidateId = body.candidate_id === undefined ? null : String(body.candidate_id);
  const dryRun = body.dry_run === true;
  if (!GATES.has(gate) || !UUID.test(projectId) ||
      (candidateId !== null && !UUID.test(candidateId)))
    return NextResponse.json({ ok: false, reason: "gate_review_invalid_input" }, { status: 400 });
  if (process.env.MOHEN_GATE_MACHINE_DATABASE_URL === undefined)
    return NextResponse.json({ ok: false, reason: "machine_signer_connection_required" }, { status: 503 });

  try {
    const { runGateReview } = await import("../../../../../../tools/rule-gate-reviewer.mjs");
    const outcome = await runGateReview({ gate, projectId, candidateId, attestStageBinding: true, dryRun });
    return NextResponse.json({ ok: outcome.status !== "FAIL", ...outcome }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    // 只回机器可判定的错误码，不回库内细节与凭据。
    const code = String((error as { message?: string } | null)?.message ?? "").split("\n")[0] || "GATE_REVIEW_FAILED";
    return NextResponse.json({ ok: false, reason: "gate_review_failed", error_code: code }, { status: 500 });
  }
}
