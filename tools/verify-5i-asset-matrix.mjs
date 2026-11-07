// M5 batch I: dimension 4+6 — 13-kind asset matrix for the real work 《松江府田赋》.
// Real PG assertions only; no fabrication. Prints VERIFY_5I_ALL_PASS when every check holds.
// Read-only except two fail-fast negatives (CAS conflict / canonical-binding guard) that never insert.
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const FOREIGN = "b0a11000-0000-4000-8000-0000000000a1"; // machine reviewer: real user, not project owner
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const PUBLISHED_WORK = "5b42577e-a4d6-4024-b1f9-99d0d788c9ec";
const PUBLISHED_REVISION = "62a8ba95-e07f-4f7e-bcb9-f728004d651a";
import crypto from "node:crypto";
const dataAccess = await import("../packages/data-access/src/index.mjs");
const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
function makeToken(uid) {
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const ownerToken = makeToken(OWNER);
const foreignToken = makeToken(FOREIGN);
const q = (sql, p = {}) => dataAccess.queryRows(
  sql.replaceAll("/*cfg*/", ", (select set_config('mohen.session_token', :'token', false)) cfg"), { ...p, token: ownerToken });

let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
};

// ---------- A. 13-kind matrix ----------
const heads = await q(`select h.asset_id::text, h.asset_kind, h.current_revision_id::text,
    r.revision_id::text, r.revision_no::text, r.actor_id::text, r.origin_kind, r.workspace_id,
    r.epistemic_class, r.content_state, r.access_state, r.freshness_state,
    r.validation->>'status' as validation_status, r.content_hash,
    r.payload::text as payload_text, r.source_refs::text as source_refs_text, r.dependency_refs::text as dependency_refs_text
  from studio.asset_heads h
  join studio.asset_revisions r on r.revision_id = h.current_revision_id /*cfg*/
  where h.project_id = :'project'`, { project: PROJECT });
const byKind = {};
for (const h of heads) (byKind[h.asset_kind] ??= []).push(h);

const producedStudio = { research_brief: 1, source_anchor: 2, reading_note: 1, evidence_note: 1 };
for (const [kind, n] of Object.entries(producedStudio)) {
  ok(`matrix.produced.${kind}`, (byKind[kind] ?? []).length === n, `${(byKind[kind] ?? []).length}/${n} heads`);
}
const NOT_PRODUCED = {
  spacetime_candidate: "本作品未启用时空组件，无候选产生",
  relation_hypothesis: "本作品未提出关系假设",
  humanistic_insight: "人文发现经 D04 链沉淀于 meaning.findings（G4 已签），未另存 Studio 资产",
  research_collection: "单作品切片未建研究合集",
  media_selection: "本作品无媒资选取动作",
  citation_snapshot: "本次发布未要求引用快照",
  consented_feedback: "本作品无用户反馈",
};
for (const [kind, reason] of Object.entries(NOT_PRODUCED)) {
  ok(`matrix.not_produced.${kind}`, (byKind[kind] ?? []).length === 0, reason);
}

// canonical kinds live outside studio.asset_heads by design
const plans = await q(`select plan_id::text, plan_a is not null and plan_b is not null as has_ab,
    jsonb_array_length(coalesce(source_ids,'[]'::jsonb))::int as sources
  from public.director_plans /*cfg*/ where brief ilike '%松江府田赋%'`, {});
ok("matrix.produced.director_plan", plans.length >= 1 && plans.every(p => p.has_ab && p.sources >= 1),
  `${plans.length} canonical director_plans rows, all with A/B plans and bound source_ids`);
const works = await q(`select w.work_id::text, r.revision_id::text, r.revision_no::text, r.status
  from publication.works w join publication.work_revisions r on r.work_id=w.work_id /*cfg*/
  where w.work_id = :'wid' order by r.revision_no`, { wid: PUBLISHED_WORK });
const pointer = await q(`select work_id::text, revision_id::text from publication.published_pointers /*cfg*/ where work_id=:'wid'`, { wid: PUBLISHED_WORK });
ok("matrix.produced.work_revision",
  works.length === 2 && works[1].revision_id === PUBLISHED_REVISION && works[1].status === "published"
  && pointer.length === 1 && pointer[0].revision_id === PUBLISHED_REVISION,
  `revisions ${works.map(w => `${w.revision_no}:${w.status}`).join("→")}, pointer atomically at ${pointer[0]?.revision_id?.slice(0, 8)}`);

// ---------- B. per-revision fields / immutability / CAS state ----------
const hashRe = /^[a-f0-9]{64}$/;
for (const h of heads) {
  const label = `${h.asset_kind}@${h.revision_id.slice(0, 8)}`;
  ok(`fields.${label}`, hashRe.test(h.content_hash) && h.revision_no === "1" && !!h.epistemic_class
    && h.content_state === "SNAPSHOTTED" && h.access_state === "RESTRICTED" && !!h.validation_status
    && h.actor_id === OWNER && h.origin_kind === "human",
    `state=${h.epistemic_class}/${h.content_state}/${h.access_state}/${h.validation_status}`);
  ok(`cas_head.${label}`, h.current_revision_id === h.revision_id);
  const lineage = await q(`select count(*)::text as n, count(distinct content_hash)::text as d
    from studio.asset_revisions r /*cfg*/ where r.asset_id=:'aid'`, { aid: h.asset_id });
  ok(`immutable.${label}`, lineage[0].n === "1" && lineage[0].d === "1", "single immutable revision, unique hash");
}

// ---------- C. ACL / CAS / canonical-binding negatives through the real repository path ----------
const repo = dataAccess.createStudioAssetRepository(dataAccess.getNodePgPool());
const foreign = await repo.listAssets(PROJECT, foreignToken).then(r => ({ rows: r.length, denied: false }))
  .catch(e => ({ rows: 0, denied: e.message === "STUDIO_IDENTITY_REQUIRED" }));
ok("acl.cross_owner_denied", foreign.rows === 0, foreign.denied ? "identity resolution refused foreign user" : `foreign user sees ${foreign.rows} rows`);
const anon = await repo.listAssets(PROJECT, "").then(() => false).catch(e => e.message === "STUDIO_IDENTITY_REQUIRED");
ok("acl.anonymous_denied", anon === true, "empty token refused before any read");
const oneHead = heads[0];
const casNegative = await repo.saveRevision({
  projectId: PROJECT, assetId: oneHead.asset_id, kind: oneHead.asset_kind,
  expectedRevisionId: crypto.randomUUID(), idempotencyKey: "verify-5i-cas-negative-" + Date.now(),
  payload: { probe: true },
}, ownerToken).then(() => "NOT_REJECTED").catch(e => e.message);
ok("cas.stale_expected_rejected", casNegative === "STUDIO_REVISION_CONFLICT", `got ${casNegative}`);
const canonicalNegative = await repo.saveRevision({
  projectId: PROJECT, assetId: crypto.randomUUID(), kind: "director_plan",
  expectedRevisionId: null, idempotencyKey: "verify-5i-canonical-" + Date.now(), payload: { probe: true },
}, ownerToken).then(() => "NOT_REJECTED").catch(e => e.message);
ok("cas.canonical_binding_guard", canonicalNegative === "STUDIO_CANONICAL_BINDING_REQUIRED", `got ${canonicalNegative}`);
const stillOne = await q(`select count(*)::text as n from studio.asset_revisions r /*cfg*/ where r.asset_id=:'aid'`, { aid: oneHead.asset_id });
ok("cas.negative_left_no_mutation", stillOne[0].n === "1", "fail-fast before insert confirmed");

// ---------- D. G qualification backtrace ----------
const quals = await q(`select gate_code, object_type from control.qualification_current /*cfg*/`, {});
for (const g of ["G0", "G1", "G2", "G3", "G4", "G5"]) {
  ok(`gate.${g}_current`, quals.some(r => r.gate_code === g),
    quals.filter(r => r.gate_code === g).map(r => r.object_type).join(",") || "missing");
}
const binding = await q(`select gate_audit_id::text, current_valid from control.gate_audits /*cfg*/
  where gate_code='G5' and details::text like :'rev'`, { rev: "%" + PUBLISHED_REVISION + "%" });
ok("gate.g5_binds_published_revision", bindingOk(binding), bindingDetail(binding));
function bindingOk(rows) { return rows.some(r => r.current_valid === true || r.current_valid === "t"); }
function bindingDetail(rows) { return rows.length ? `${rows.length} audit(s), current=${bindingOk(rows)}` : "no G5 audit references the published revision"; }

// ---------- E. honest gap report (printed, not failed) ----------
const uses = await q(`select count(*)::text as n from studio.use_events /*cfg*/ where project_id=:'project'`, { project: PROJECT });
const bareRefs = heads.filter(h => h.source_refs_text === "[]" && h.dependency_refs_text === "[]").length;
console.log(`\nGAP_REPORT use_events=${uses[0].n}（无复用记录，不得解释为已授权复用）; studio_heads_without_refs=${bareRefs}/${heads.length}（第 1 步早期条目未回链 D 链对象，Admin 视图逐条如实显示为缺口）`);

if (failures) { console.error(`\nVERIFY_5I_FAILED failures=${failures}`); process.exit(1); }
console.log("\nVERIFY_5I_ALL_PASS");
await dataAccess.getNodePgPool?.().end?.();
process.exit(0);
