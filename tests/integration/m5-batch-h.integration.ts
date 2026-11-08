// M5 批次 H：ST-05→ST-09 + WATCH 消费 + 撤权/恢复 的真实隔离全链验证。
//
// 走真实 lib 代码路径（publication.ts / studio-director.ts / provider-dispatcher.ts），
// 真实本地隔离 PG，真实 DeepSeek 调用（H1/H2/H3，grant 正道，≈¥0.02），
// 真实独立 Gate 通道（machine signer 经 control.sign_gate_candidate 签 WATCH G5）。
//
// 诚实边界：编辑签发决策由机器评审人账号记录（Owner 已授权本地隔离 M5 机器规则化签发，
// 人文背书仍以 Owner 体验为准）；gate 候选登记由超级用户直连完成（隔离演练）。
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createWorkDraft,
  listPublished,
  listWatchEligible,
  publishWork,
  submitWork,
} from "../../apps/web/lib/publication";
import { requireCurrentWorkConsumerQualification } from "../../apps/web/lib/work-publish-qualification";
import {
  commitWorkRevision,
  createDirectorPlan,
  selectDirectorPlan,
} from "../../apps/web/lib/studio-director";
import {
  authorizeStudioDispatchGrant,
  createStudioDispatcherDeps,
} from "../../apps/web/lib/studio/provider-dispatcher";
import { queryRows, run, workContentDigest } from "@mohen/data-access";
import {
  MACHINE_REVIEWER_EMAIL,
  MACHINE_REVIEWER_USER_ID,
  mintMachineSessionToken,
} from "../../tools/machine-reviewer-session.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE_AUTHORITY_SCRIPT = path.resolve(rootDir, "packages/data-access/scripts/gate-authority.mjs");

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const NAJ_SOURCE = "b0a11000-0000-4000-8000-000000000004";
// 批次 D 已签发链的 G5 候选（world_projection 对象、G4 依赖快照、evidence_refs 来源）。
const D_CHAIN_G5_CANDIDATE = "c1b252bc-7a1d-4784-a72f-d1b0a8a76e73";
const MACHINE_SIGNER_LOGIN = "mohen_gate_signer_m5_machine";

const WATCH_CTX = JSON.parse(process.env.MOHEN_G5_CONTEXTS ?? "{}").watch as
  { purpose: { namespace: string; code: string; version: string }; scope: Record<string, unknown> };

function makeToken(uid: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const sha256 = (value: unknown) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
// data-access 的 psql 通道把 jsonb 返回为文本；node-pg 通道则返回已解析对象。统一归一为 JS 值。
const asJsonValue = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);
function bucketSeriesUuid(bucket: string): string {
  const hex = crypto.createHash("sha256").update(`verify-6-series-${bucket}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function gateAuthority(command: "decide" | "revoke", decision: Record<string, unknown>, sessionToken: string) {
  const machineUrl = process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
  if (!machineUrl) throw new Error("MOHEN_GATE_MACHINE_DATABASE_URL missing");
  const result = spawnSync(process.execPath, [GATE_AUTHORITY_SCRIPT, command], {
    input: JSON.stringify({ decision, sessionToken }),
    env: { ...process.env, MOHEN_GATE_DATABASE_URL: machineUrl },
    encoding: "utf8",
    timeout: 60000,
  });
  if (result.status !== 0) throw new Error(`gate-authority ${command} failed: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout.trim()) as Record<string, unknown>;
}

describe("M5 批次 H：同一真实作品 ST-05→ST-09 + WATCH + 撤权/恢复", () => {
  const state: Record<string, any> = {};

  it("0. 前置：身份 / 来源推导 / WATCH 上下文", async () => {
    const secret = process.env.MOHEN_DATABASE_SESSION_SECRET ?? "";
    expect(secret.length).toBeGreaterThanOrEqual(32);
    state.token = makeToken(OWNER, secret);
    expect(WATCH_CTX?.purpose?.namespace).toBe("mohen.watch");
    expect(WATCH_CTX?.scope?.mode).toBe("public_watch");
    const who = await queryRows(
      `with session_context as materialized (
         select set_config('mohen.session_token', :'token', true)
       )
       select control.current_app_user_id()::text as uid from session_context`, { token: state.token });
    expect(who[0]?.uid).toBe(OWNER);
    const srcRows = await queryRows(
      `with session_context as materialized (
         select set_config('mohen.session_token', :'token', true)
       )
       select distinct s.source_id::text as source_id
         from session_context
         cross join studio.private_originals o
         join source.raw_items r on r.checksum_sha256 = o.sha256
         join source.source_versions v on v.source_version_id = r.source_version_id
         join source.sources s on s.source_id = v.source_id
        where o.project_id = :'pid'`, { token: state.token, pid: PROJECT });
    state.sourceIds = srcRows.map((r: any) => String(r.source_id)).sort();
    expect(state.sourceIds).toContain(NAJ_SOURCE);
  });

  it("1. ST-05 前置：真实委托 + grant（H1/H2/H3 三动作）", async () => {
    state.deps = await createStudioDispatcherDeps();
    const bucket = new Date().toISOString().slice(0, 13).replace("T", "-") + "h";
    const delegationInput = {
      projectId: PROJECT, seriesId: bucketSeriesUuid(bucket), revisionNo: 1,
      rootTaskRef: "studio-llm-dispatch",
      rootTaskSnapshot: { purpose: "verify-6", scope: "local-isolated" },
      subtaskRef: "studio-director-llm", executor: "mohen-studio", provider: "deepseek",
      engineVersion: "deepseek/2026-11-07",
      inputManifest: { purpose: "verify-6-batch-h" },
      allowedActions: ["llm_director_h1", "llm_director_h2", "llm_director_h3"],
      transferRightsDecision: { external_processing: "GRANTED" },
      policyVersion: "m5.h", expiresAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
      budgetLimit: "1.00", currency: "USD",
      outputSchema: "mohen.studio-llm-dispatch.v1",
      idempotencyKey: `verify-6-batch-h-${bucket}`,
    };
    const delegation = await state.deps.delegations.getDelegationForPlan(
      PROJECT, delegationInput.rootTaskRef, delegationInput.idempotencyKey, state.token)
      ?? await state.deps.delegations.saveDelegation(delegationInput, state.token);
    state.delegationId = delegation.delegation_id;
    state.grant = await authorizeStudioDispatchGrant(state.deps, {
      delegationId: state.delegationId, projectId: PROJECT, actions: ["llm_director_h1", "llm_director_h2", "llm_director_h3"],
      model: "deepseek-flash", sourceIds: state.sourceIds, sessionToken: state.token, maxCalls: 3,
    });
    expect(state.grant.grantId).toBeTruthy();
    const matRows = await queryRows(
      `select left(literal_reading, 200) as t from evidence.material_evidence
        where source_id = :'sid'::uuid and literal_reading is not null and char_length(literal_reading) > 10
        order by created_at desc limit 6`, { sid: NAJ_SOURCE });
    state.facts = matRows.map((r: any) => String(r.t)).filter((s: string) => s.length > 10);
    expect(state.facts.length).toBeGreaterThanOrEqual(2);
  });

  it("2. ST-05：真实 LLM 导演方案（H1+H2）落库，来源绑定持久化", async () => {
    const brief = "用松江府田赋史料做一集 3 分钟短片，说明清代田赋征收中普通农户的实际负担。";
    state.brief = brief;
    const created = await createDirectorPlan(brief, "jinze", OWNER,
      { auth: state.grant, facts: state.facts, sourceIds: state.sourceIds, projectId: PROJECT });
    expect(created).toBeTruthy();
    expect(created!.planA.angle.length).toBeGreaterThan(0);
    expect(created!.planB.angle.length).toBeGreaterThan(0);
    expect(created!.finding).toBeTruthy();
    state.planId = created!.planId;
    const row = (await queryRows(
      `select source_ids, project_id::text as project_id from public.director_plans where plan_id = :'id'`, { id: state.planId }))[0] as any;
    const sids = typeof row?.source_ids === "string" ? JSON.parse(row.source_ids) : row?.source_ids;
    expect(sids).toEqual(state.sourceIds);
    expect(row?.project_id).toBe(PROJECT);
  });

  it("3. ST-05b：选定方案 A，H3 真实节拍（provenanceRefs 绑真实材料）", async () => {
    const result = await selectDirectorPlan(state.planId, "A", state.grant);
    expect(result).toBeTruthy();
    expect(result!.beats.length).toBeGreaterThan(0);
    for (const beat of result!.beats) {
      expect(Array.isArray(beat.provenanceRefs)).toBe(true);
      expect(beat.provenanceRefs!.length).toBeGreaterThan(0);
      for (const ref of beat.provenanceRefs!) expect(state.facts).toContain(ref);
    }
    state.beats = result!.beats;
  });

  it("4. ST-06/07：建作品 + 不可变修订（Creator 显式权利确认）+ 幂等回放", async () => {
    const draft = await createWorkDraft(
      "松江府田赋：一亩低田的税单（M5 批次 H 真实链）", "MoHen Studio", OWNER, undefined, crypto.randomUUID());
    expect(draft.ok).toBe(true);
    if (!draft.ok) throw new Error(`createWorkDraft refused: ${draft.reason}`);
    state.workId = draft.work_id;
    const rev = await commitWorkRevision(state.workId, state.planId, undefined, { rightsAcknowledged: true });
    expect(rev).toBeTruthy();
    expect(rev!.revisionNo).toBe(2);
    state.revisionId = rev!.revisionId;
    const replay = await commitWorkRevision(state.workId, state.planId, 1, { rightsAcknowledged: true });
    expect(replay).toBeTruthy();
    expect(replay!.conflict).toBeFalsy();
    expect(replay!.revisionId).toBe(state.revisionId);
  });

  it("5. ST-08：投稿（submitted）+ 编辑签发决策绑定同一修订", async () => {
    const submitted = await submitWork(state.workId, state.revisionId);
    expect(submitted.ok).toBe(true);
    await run(
      `insert into control.work_publication_decisions(work_id, revision_id, decision, reviewer, note)
       values (:'wid'::uuid, :'rid'::uuid, 'approved', :'reviewer', :'note')`,
      {
        wid: state.workId, rid: state.revisionId, reviewer: MACHINE_REVIEWER_EMAIL,
        note: "M5 批次 H 本地隔离机器规则化编辑签发；人文背书以 Owner 体验为准。",
      });
    const dec = (await queryRows(
      `select decision, reviewer from control.work_publication_decisions
        where work_id = :'wid' order by reviewed_at desc limit 1`, { wid: state.workId }))[0] as any;
    expect(dec?.decision).toBe("approved");
    expect(dec?.reviewer).toBe(MACHINE_REVIEWER_EMAIL);
  });

  it("6. ST-09 前置：WATCH G5 候选登记 + 机器评审 watch 绑定", async () => {
    const src = (await queryRows(
      `select run_id::text as run_id, stage, object_type, object_id::text as object_id,
              artifact_revision::text as artifact_revision, dependency_snapshot, evidence_refs
         from control.gate_candidates where candidate_id = :'cid'::uuid`,
      { cid: D_CHAIN_G5_CANDIDATE }))[0] as any;
    expect(src).toBeTruthy();
    state.g5Object = {
      ...src,
      dependency_snapshot: asJsonValue(src.dependency_snapshot),
      evidence_refs: asJsonValue(src.evidence_refs),
    };
    const current = (await queryRows(
      `select control.artifact_revision_for(:'ot', :'oid'::uuid)::text as rev`,
      { ot: src.object_type, oid: src.object_id }))[0] as any;
    expect(current?.rev).toBe(src.artifact_revision);
    // 机器评审 watch 绑定（幂等）。
    await run(
      `insert into control.gate_reviewer_bindings(reviewer_user_id, db_identity, gate_code,
         purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope,
         valid_from, valid_until, source_ref, active)
       select :'uid'::uuid, :'login', 'G5', :'ns', :'code', :'ver', 'watch', :'scope'::jsonb,
         now(), now() + interval '30 days', 'mhka-m5-batch-h-watch-binding', true
       where not exists(
         select 1 from control.gate_reviewer_bindings
          where reviewer_user_id = :'uid'::uuid and db_identity = :'login' and gate_code = 'G5'
            and purpose_namespace = :'ns' and purpose_code = :'code' and purpose_version = :'ver'
            and consumer = 'watch')`,
      {
        uid: MACHINE_REVIEWER_USER_ID, login: MACHINE_SIGNER_LOGIN,
        ns: WATCH_CTX.purpose.namespace, code: WATCH_CTX.purpose.code, ver: WATCH_CTX.purpose.version,
        scope: JSON.stringify(WATCH_CTX.scope),
      });
  });

  it("7. ST-09：机器评审经独立通道签 WATCH G5（精确修订绑定 + 权利）", async () => {
    const rev = (await queryRows(
      `select title, description, content from publication.work_revisions where revision_id = :'rid'::uuid`,
      { rid: state.revisionId }))[0] as any;
    expect(rev).toBeTruthy();
    const content = typeof rev.content === "string" ? JSON.parse(rev.content) : rev.content;
    const validUntil = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
    state.bindingDetails = {
      schema: "mohen.work-revision-g5-binding.v1",
      work_id: state.workId,
      revision_id: state.revisionId,
      content_sha256: workContentDigest(content),
      complete_work: true,
      consumer: "watch",
      purpose: WATCH_CTX.purpose,
      scope: WATCH_CTX.scope,
      rights_by_action: { display: "allowed" },
      title: String(rev.title),
      description: String(rev.description),
      rights_valid_until: validUntil,
    };
    const candidateId = crypto.randomUUID();
    state.g5CandidateId = candidateId;
    const src = state.g5Object;
    await run(
      `insert into control.gate_candidates(candidate_id, run_id, stage, gate_code, object_type, object_id,
         artifact_revision, purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope,
         input_fingerprint, dependency_snapshot, evidence_refs,
         candidate_status, producer_identity)
       values (:'cid'::uuid, :'run'::uuid, :'stage', 'G5', :'ot', :'oid'::uuid, :'arev',
         :'ns', :'code', :'ver', 'watch', :'scope'::jsonb,
         :'fp', :'deps'::jsonb, :'refs'::jsonb,
         'SUBMITTED', 'mohen_private_worker')`,
      {
        cid: candidateId, run: src.run_id, stage: src.stage, ot: src.object_type, oid: src.object_id,
        arev: src.artifact_revision,
        ns: WATCH_CTX.purpose.namespace, code: WATCH_CTX.purpose.code, ver: WATCH_CTX.purpose.version,
        scope: JSON.stringify(WATCH_CTX.scope),
        fp: sha256({ gate: "G5", object: src.object_id, revision: src.artifact_revision, consumer: "watch" }),
        deps: JSON.stringify(src.dependency_snapshot),
        refs: JSON.stringify(src.evidence_refs),
      });
    const machineToken = mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID });
    const current = (await queryRows(
      `select gate_audit_id::text as aid from control.qualification_current
        where gate_code='G5' and object_type=:'ot' and object_id=:'oid'::uuid
          and artifact_revision=:'arev' and purpose_namespace=:'ns' and purpose_code=:'code'
          and purpose_version=:'ver' and consumer='watch'`,
      { ot: src.object_type, oid: src.object_id, arev: src.artifact_revision,
        ns: WATCH_CTX.purpose.namespace, code: WATCH_CTX.purpose.code, ver: WATCH_CTX.purpose.version }))[0] as any;
    const out = gateAuthority("decide", {
      requestId: crypto.randomUUID(),
      candidateId,
      result: "PASS",
      ruleVersion: "v1",
      validUntil,
      expectedAuditId: current?.aid ?? null,
      receipt: {
        checks: { work_revision_binding: true, rights_by_operation: true },
        work_revision_binding: state.bindingDetails,
        rationale: "批次 H：修订绑定逐字段核验 + 逐动作权利核验通过（本地隔离机器规则评审）。",
        evidence_refs: src.evidence_refs,
      },
    }, machineToken);
    expect(out.gate_audit_id).toBeTruthy();
    state.g5AuditId = String(out.gate_audit_id);
  });

  it("8. ST-09：发布（四道门全过），指针指向同一精确修订", async () => {
    expect(state.revisionId).toBeTruthy();
    const published = await publishWork(state.workId, OWNER);
    if (!published.ok) console.error("[batch-h] publish refused:", published);
    expect(published.ok).toBe(true);
    const pointer = (await queryRows(
      `select revision_id::text as rid from publication.published_pointers where work_id = :'wid'`,
      { wid: state.workId }))[0] as any;
    expect(pointer?.rid).toBe(state.revisionId);
  });

  it("9. 维度 7：WATCH 消费同一合法 WorkRevision；错修订被拒", async () => {
    const eligible = await listWatchEligible();
    const hit = eligible.find((r) => r.work_id === state.workId);
    expect(hit).toBeTruthy();
    expect(hit!.revision_id).toBe(state.revisionId);
    const publishedList = await listPublished();
    expect(publishedList.some((r) => r.work_id === state.workId)).toBe(true);
    const wrong = await requireCurrentWorkConsumerQualification(
      state.workId, crypto.randomUUID(), "watch",
      { beats: state.beats, media: [], rights_acknowledged: true });
    expect(wrong.ok).toBe(false);
  });

  it("10. 维度 8：撤权即时拒绝消费；重签恢复", async () => {
    const machineToken = mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID });
    const revoked = gateAuthority("revoke", {
      requestId: crypto.randomUUID(),
      auditId: state.g5AuditId,
      reason: "批次 H 撤权演练：验证 WATCH 消费即时失效",
    }, machineToken);
    expect(Number(revoked.blocked_count)).toBeGreaterThanOrEqual(1);
    const afterRevoke = await listWatchEligible();
    expect(afterRevoke.some((r) => r.work_id === state.workId)).toBe(false);
    // 恢复：新候选 + 重签（真实撤权-恢复闭环，非事务回滚演练）。
    const candidateId = crypto.randomUUID();
    const src = state.g5Object;
    await run(
      `insert into control.gate_candidates(candidate_id, run_id, stage, gate_code, object_type, object_id,
         artifact_revision, purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope,
         input_fingerprint, dependency_snapshot, evidence_refs,
         candidate_status, producer_identity)
       values (:'cid'::uuid, :'run'::uuid, :'stage', 'G5', :'ot', :'oid'::uuid, :'arev',
         :'ns', :'code', :'ver', 'watch', :'scope'::jsonb,
         :'fp', :'deps'::jsonb, :'refs'::jsonb,
         'SUBMITTED', 'mohen_private_worker')`,
      {
        cid: candidateId, run: src.run_id, stage: src.stage, ot: src.object_type, oid: src.object_id,
        arev: src.artifact_revision,
        ns: WATCH_CTX.purpose.namespace, code: WATCH_CTX.purpose.code, ver: WATCH_CTX.purpose.version,
        scope: JSON.stringify(WATCH_CTX.scope),
        fp: sha256({ gate: "G5", object: src.object_id, revision: src.artifact_revision, consumer: "watch", restore: true }),
        deps: JSON.stringify(src.dependency_snapshot),
        refs: JSON.stringify(src.evidence_refs),
      });
    const validUntil = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
    const restored = gateAuthority("decide", {
      requestId: crypto.randomUUID(),
      candidateId,
      result: "PASS",
      ruleVersion: "v1",
      validUntil,
      receipt: {
        checks: { work_revision_binding: true, rights_by_operation: true },
        work_revision_binding: { ...state.bindingDetails, rights_valid_until: validUntil },
        rationale: "批次 H 撤权后重签恢复（本地隔离机器规则评审）。",
        evidence_refs: src.evidence_refs,
      },
    }, mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID }));
    expect(restored.gate_audit_id).toBeTruthy();
    state.g5AuditIdRestored = String(restored.gate_audit_id);
    const afterRestore = await listWatchEligible();
    expect(afterRestore.some((r) => r.work_id === state.workId && r.revision_id === state.revisionId)).toBe(true);
  });
});
