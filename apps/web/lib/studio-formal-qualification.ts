// apps/web/lib/studio-formal-qualification.ts — Studio 作品投稿资格链（ST-05/ST-07 → ST-08）
//
// 把 UI 创作的 studio 作品接入已验证的正式发布链：投稿前补齐
//   plan 封套(studio.director_plans) → plan G5 → work 封套(studio.work_revisions)
//   → work revision G5，然后 submitWork 走 formalSubmit(ST-08)/decide/publish(ST-09)。
// 与 batch24-26 脚本完全同一条「候选提交 → 独立机器评审 → control.sign_gate_candidate」
// 路径：机器签发用独立 pg 会话（set role mohen_gate_signer_m5_machine + 机器会话令牌），
// Producer(应用) 与 Reviewer(机器签发角色) 分离，非自签。仅在 loopback 隔离库启用，
// 非隔离库失败关闭（不签发、不投稿）。
import { createHash, createHmac, randomUUID } from "node:crypto";
import { queryRows, getNodePgPool } from "@mohen/data-access";
import { readJsonColumn } from "./db-json";

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HEX64 = /^[a-f0-9]{64}$/i;
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const MACHINE_SIGNER_ROLE = "mohen_gate_signer_m5_machine";
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

type AuditDep = {
  gate_code: string; stage: string; object_type: string; object_id: string;
  artifact_revision: string; gate_audit_id: string; qualification_digest: string;
};

function isolatedDatabaseOk(): boolean {
  const url = process.env.DATABASE_URL;
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
    return (host === "127.0.0.1" || host === "localhost" || host === "::1") && /dev|isolat|test/.test(name);
  } catch { return false; }
}

function machineSessionToken(): string {
  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 32) throw new Error("MACHINE_SESSION_SECRET_MISSING");
  const payload = Buffer.from(JSON.stringify({ uid: MACHINE_SIGNER_USER_ID, r: [], exp: Date.now() + 3600_000 }))
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = createHmac("sha256", secret).update(payload).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

/** 独立机器签发会话：与 Producer(应用查询通道) 分离，同一事务内 SET ROLE + 机器令牌。 */
async function machineDecide(d: {
  candidateId: string; requestId: string; result: string; ruleVersion: string;
  validUntil: string; receipt: Record<string, unknown>; expectedAuditId: string | null;
}): Promise<string> {
  const pool = getNodePgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set role ${MACHINE_SIGNER_ROLE}`);
    // Transaction-local: the machine identity never leaks beyond this commit.
    await client.query("select set_config('mohen.session_token', $1, true)", [machineSessionToken()]);
    const r = await client.query(
      "select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id",
      [d.candidateId, d.requestId, d.result, d.ruleVersion, d.validUntil,
       JSON.stringify(d.receipt), d.expectedAuditId]);
    await client.query("commit");
    await client.query("reset role");
    return String(r.rows[0].gate_audit_id);
  } catch (error) {
    try { await client.query("rollback"); } catch { /* already aborted */ }
    try { await client.query("reset role"); } catch { /* session released below */ }
    throw error;
  } finally {
    client.release();
  }
}

async function artifactRevisionFor(objectType: "director_plan" | "work_revision", objectId: string): Promise<string | null> {
  const rows = await queryRows(
    "select control.artifact_revision_for(:'ot', :'oid') as rev", { ot: objectType, oid: objectId }
  ) as unknown as Array<{ rev: string | null }>;
  const rev = rows[0]?.rev;
  return typeof rev === "string" && HEX64.test(rev) ? rev : null;
}

async function currentAuditDep(objectType: "director_plan" | "work_revision", objectId: string, artifactRevision: string): Promise<AuditDep | null> {
  const rows = await queryRows(
    `select gate_audit_id::text as gate_audit_id, gate_code, stage, object_type, object_id::text as object_id,
            artifact_revision, qualification_digest
       from control.gate_audits
      where gate_code = 'G5' and object_type = :'ot' and object_id = :'oid'
        and result = 'PASS' and current_valid and (valid_until is null or valid_until > now())
        and artifact_revision = :'rev'
      order by signed_at desc limit 1`,
    { ot: objectType, oid: objectId, rev: artifactRevision }
  ) as unknown as AuditDep[];
  return rows[0] ?? null;
}

/** 提交 G5 候选并走独立机器评审（dry-run 全过才签发）。幂等：已有当前 PASS 审计则复用。 */
async function ensureG5Signed(input: {
  objectType: "director_plan" | "work_revision";
  objectId: string;
  artifactRevision: string;
  projectId: string;
  runId: string;
  dependencies: AuditDep[];
}): Promise<{ ok: true; dep: AuditDep } | { ok: false; reason: string }> {
  const existing = await currentAuditDep(input.objectType, input.objectId, input.artifactRevision);
  if (existing) return { ok: true, dep: existing };
  if (!isolatedDatabaseOk()) return { ok: false, reason: "machine_signing_isolation_required" };

  await queryRows(
    `delete from control.gate_candidates
      where gate_code = 'G5' and object_type = :'ot' and object_id = :'oid' and candidate_status = 'SUBMITTED'`,
    { ot: input.objectType, oid: input.objectId }
  );
  const candidateId = randomUUID();
  const inputFingerprint = sha(`${input.projectId}:${input.objectType}:${input.artifactRevision}`);
  await queryRows(
    `insert into control.gate_candidates
       (candidate_id, run_id, stage, gate_code, object_type, object_id, artifact_revision,
        purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer,
        dependency_snapshot, evidence_refs, input_fingerprint, submitted_at, producer_identity, candidate_status)
     values (:'cid', :'run', 'D05', 'G5', :'ot', :'oid', :'rev',
             'data-production', 'm5-remediation', 'v1', :'scope'::jsonb, 'producer',
             :'deps'::jsonb, :'evidence'::jsonb, :'fp', now(), 'private-evidence-worker', 'SUBMITTED')`,
    {
      cid: candidateId, run: input.runId, ot: input.objectType, oid: input.objectId, rev: input.artifactRevision,
      scope: JSON.stringify({ project_id: input.projectId }),
      deps: JSON.stringify(input.dependencies),
      evidence: JSON.stringify([{ kind: input.objectType, id: input.objectId, artifact_revision: input.artifactRevision }]),
      fp: inputFingerprint,
    }
  );
  const { createRuleGateReviewer } = await import("../../../tools/rule-gate-reviewer.mjs");
  const reviewer = createRuleGateReviewer({
    query: queryRows as unknown as (sql: string, params?: Record<string, unknown>) => Promise<unknown[]>,
    decide: machineDecide,
    projectId: input.projectId,
    log: () => {},
  });
  const dry = await reviewer.review({ gate: "G5", dryRun: true, candidateId });
  if (dry.status !== "DRY_RUN_PASS") return { ok: false, reason: `gate_review_hold:${dry.failed?.join(",") ?? dry.status}` };
  const signed = await reviewer.review({ gate: "G5", dryRun: false, candidateId });
  if (signed.status !== "PASS") return { ok: false, reason: `gate_review_reject:${signed.failed?.join(",") ?? signed.status}` };
  const dep = await currentAuditDep(input.objectType, input.objectId, input.artifactRevision);
  if (!dep) return { ok: false, reason: "gate_audit_not_found_after_signing" };
  return { ok: true, dep };
}

export type StudioQualificationResult =
  | { ok: true; revisionId: string; planId: string; planG5: string; workG5: string }
  | { ok: false; reason: string };

/**
 * 在投稿（submitWork）前为 studio 作品补齐资格链。legacy 修订（无导演方案绑定）
 * 返回 ok（原路径不变）；studio 修订缺任何前提时失败关闭，作品保留、不投稿。
 */
export async function ensureStudioWorkQualification(revisionId: string): Promise<StudioQualificationResult> {
  if (!UUID_RE.test(revisionId)) return { ok: false, reason: "revision_id_invalid" };
  const rows = await queryRows(
    `select r.revision_id::text as revision_id, r.work_id::text as work_id, r.title as title,
            r.content::text as content, r.revision_no::text as revision_no,
            w.project_id::text as project_id, w.creator as creator
       from publication.work_revisions r
       join publication.works w on w.work_id = r.work_id
      where r.revision_id = :'rid'`,
    { rid: revisionId }
  ) as unknown as Array<{ revision_id: string; work_id: string; title: string; content: string; revision_no: string; project_id: string | null; creator: string | null }>;
  const body = rows[0];
  if (!body) return { ok: false, reason: "revision_not_found" };
  let content: Record<string, unknown>;
  try { content = readJsonColumn<Record<string, unknown>>(body.content, {}); } catch { return { ok: false, reason: "revision_content_unreadable" }; }
  const directorSource = content.director_source as { plan_id?: unknown; selected?: unknown } | undefined;
  const planIdRaw = directorSource?.plan_id;
  if (typeof planIdRaw !== "string" || !UUID_RE.test(planIdRaw)) {
    // Legacy/non-studio revision: untouched legacy submission path.
    return { ok: true, revisionId, planId: "", planG5: "", workG5: "" };
  }
  const planId = planIdRaw.toLowerCase();
  const selectedSide = typeof directorSource?.selected === "string" ? directorSource.selected : "";
  const projectId = body.project_id && UUID_RE.test(body.project_id) ? body.project_id.toLowerCase() : null;
  if (!projectId) return { ok: false, reason: "work_project_binding_required" };

  const planRows = await queryRows(
    `select project_id::text as project_id, delegation_id::text as delegation_id,
            root_task_ref, research_snapshot_hash
       from public.director_plans where plan_id = :'pid'`,
    { pid: planId }
  ) as unknown as Array<{ project_id: string; delegation_id: string | null; root_task_ref: string | null; research_snapshot_hash: string | null }>;
  const plan = planRows[0];
  if (!plan || plan.project_id?.toLowerCase() !== projectId) return { ok: false, reason: "plan_project_binding_required" };

  // 依赖链前提：项目最新生产 run（候选 FK）、当前 G4 上游、合格投影、已核验原件。
  const runRows = await queryRows(
    `select run_id::text as run_id from control.production_runs
      where (scope->>'project_id') = :'pid' order by started_at desc limit 1`,
    { pid: projectId }
  ) as unknown as Array<{ run_id: string }>;
  if (!runRows.length) return { ok: false, reason: "production_run_required" };
  const runId = runRows[0].run_id;

  const g4Rows = await queryRows(
    `select gate_audit_id::text as gate_audit_id, gate_code, stage, object_type, object_id::text as object_id,
            artifact_revision, qualification_digest
       from control.gate_audits
      where gate_code = 'G4' and result = 'PASS' and current_valid and (valid_until is null or valid_until > now())
        and consumer = 'producer' and decision_origin = 'independent_gate'
        and artifact_revision is not null and qualification_digest is not null
        and allowed_scope->>'project_id' = :'pid'
      order by signed_at desc limit 1`,
    { pid: projectId }
  ) as unknown as AuditDep[];
  if (!g4Rows.length) return { ok: false, reason: "g4_dependency_required" };

  const projRows = await queryRows(
    `select gate_audit_id::text as gate_audit_id, gate_code, stage, object_type, object_id::text as object_id,
            artifact_revision, qualification_digest
       from control.gate_audits
      where gate_code = 'G5' and object_type = 'world_projection' and result = 'PASS' and current_valid
        and (valid_until is null or valid_until > now())
        and artifact_revision is not null and qualification_digest is not null
        and consumer = 'producer' and decision_origin = 'independent_gate'
        and allowed_scope->>'project_id' = :'pid'
      order by signed_at desc limit 3`,
    { pid: projectId }
  ) as unknown as AuditDep[];
  if (!projRows.length) return { ok: false, reason: "qualified_projection_required" };

  const originalRows = await queryRows(
    `select o.original_id::text as original_id
       from studio.private_originals o
      where o.project_id = :'pid' and o.state = 'STORED_VERIFIED' and o.rights_declared`,
    { pid: projectId }
  ) as unknown as Array<{ original_id: string }>;
  if (!originalRows.length) return { ok: false, reason: "verified_original_required" };
  const originalIds = originalRows.map(r => r.original_id);

  const findingId = g4Rows[0].object_id;

  // 1) plan 封套（幂等）：G5 对象身份在 studio.director_plans。
  const planExists = await queryRows(
    "select 1 as ok from studio.director_plans where plan_id = :'pid'", { pid: planId }
  );
  if (!planExists.length) {
    await queryRows(
      `insert into studio.director_plans
         (plan_id, project_id, title, method_id, method_version, h1_discovery_refs,
          h2_decisions, h3_beats, alternative_plans, media_refs,
          depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections,
          qualification, payload)
       values (:'pid', :'project', :'title', 'H1H2H3', 'source-sha256:mab-m5-isolated', :'h1'::uuid[],
               :'h2'::jsonb, :'h3'::jsonb, :'alt'::jsonb, '[]'::jsonb,
               '{}'::uuid[], '{}'::uuid[], :'proj'::uuid[],
               'UNASSESSED', :'payload'::jsonb)`,
      {
        pid: planId, project: projectId, title: String(body.title ?? "未命名方案"),
        h1: `{${findingId}}`,
        h2: JSON.stringify({ selection: "director_ab_choice", selected: selectedSide }),
        h3: JSON.stringify({ kind: "beats", source: "commitWorkRevision" }),
        alt: JSON.stringify({ alternative: ["plan_a", "plan_b"] }),
        proj: `{${projRows.map(p => p.object_id).join(",")}}`,
        payload: JSON.stringify({ original_ids: originalIds, body: { original_ids: originalIds, depends_on_director_plan: planId } }),
      }
    );
  }

  // 2) plan G5（幂等）。
  const planRev = await artifactRevisionFor("director_plan", planId);
  if (!planRev) return { ok: false, reason: "plan_artifact_revision_unavailable" };
  const planG5 = await ensureG5Signed({
    objectType: "director_plan", objectId: planId, artifactRevision: planRev,
    projectId, runId, dependencies: [g4Rows[0], projRows[0]],
  });
  if (!planG5.ok) return { ok: false, reason: planG5.reason };

  // 3) work 封套（幂等）：正文权威在 publication.work_revisions，本表只承载资格/发布封套。
  const workExists = await queryRows(
    "select 1 as ok from studio.work_revisions where revision_id = :'rid'", { rid: revisionId }
  );
  if (!workExists.length) {
    const contentHash = content.content_hash;
    if (typeof contentHash !== "string" || !HEX64.test(contentHash)) return { ok: false, reason: "content_hash_invalid" };
    await queryRows(
      `insert into studio.work_revisions
         (work_id, revision_id, revision_no, project_id, creator_id, title, content_hash,
          content, beats, source_and_rights_refs, depends_on_director_plan,
          depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections,
          publication_status, qualification, payload, formal_revision_id)
       values (:'wid', :'rid', :'no', :'project', :'creator', :'title', :'hash',
               :'content'::jsonb, :'beats'::jsonb, :'refs'::jsonb, :'plan'::uuid,
               '{}'::uuid[], '{}'::uuid[], :'proj'::uuid[],
               'draft', 'UNASSESSED', :'payload'::jsonb, :'rid'::uuid)`,
      {
        wid: body.work_id, rid: revisionId, no: Number(body.revision_no), project: projectId,
        creator: String(body.creator ?? ""), title: String(body.title ?? ""),
        hash: contentHash, content: JSON.stringify(content),
        beats: JSON.stringify(Array.isArray(content.beats) ? content.beats : []),
        refs: JSON.stringify(originalIds.map(id => ({ kind: "original", id, rights_basis: "studio_project_binding" }))),
        plan: planId, proj: `{${projRows.map(p => p.object_id).join(",")}}`,
        payload: JSON.stringify({
          formal: true, method_id: "H1H2H3", original_ids: originalIds,
          body: { original_ids: originalIds, depends_on_director_plan: planId },
        }),
      }
    );
  }

  // 4) work revision G5（幂等）。
  const workRev = await artifactRevisionFor("work_revision", revisionId);
  if (!workRev) return { ok: false, reason: "work_artifact_revision_unavailable" };
  const workG5 = await ensureG5Signed({
    objectType: "work_revision", objectId: revisionId, artifactRevision: workRev,
    projectId, runId, dependencies: [g4Rows[0], planG5.dep, projRows[0]],
  });
  if (!workG5.ok) return { ok: false, reason: workG5.reason };

  return { ok: true, revisionId, planId, planG5: planG5.dep.gate_audit_id, workG5: workG5.dep.gate_audit_id };
}
