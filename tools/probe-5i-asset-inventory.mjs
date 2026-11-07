// Read-only inventory of the real work 《松江府田赋》 across all 13 asset kinds (batch I prep).
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
import crypto from "node:crypto";
function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const dataAccess = await import("../packages/data-access/src/index.mjs");
const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
const token = makeToken(OWNER, secret);
const q = (sql, p = {}) => dataAccess.queryRows(
  sql.replaceAll("/*cfg*/", ", (select set_config('mohen.session_token', :'token', false)) cfg"), { ...p, token });

console.log("-- studio.projects:");
for (const r of await q(`select project_id::text, project_title, lifecycle_status, created_at::text from studio.projects /*cfg*/ order by created_at`)) console.log(JSON.stringify(r));

console.log("\n-- studio.asset_heads by kind (per project):");
for (const r of await q(`select h.project_id::text, h.asset_kind, count(*)::text as heads,
    count(h.current_revision_id)::text as with_current
  from studio.asset_heads h /*cfg*/ group by h.project_id, h.asset_kind order by h.project_id, h.asset_kind`)) console.log(JSON.stringify(r));

console.log("\n-- studio.asset_revisions detail (kind, state, refs, actor, origin):");
for (const r of await q(`select h.asset_kind, r.revision_id::text, r.revision_no::text,
    r.epistemic_class, r.content_state, r.access_state, r.freshness_state,
    r.validation->>'status' as validation_status,
    jsonb_array_length(coalesce(r.source_refs,'[]'::jsonb))::text as src_refs,
    jsonb_array_length(coalesce(r.dependency_refs,'[]'::jsonb))::text as dep_refs,
    r.origin_kind, r.workspace_id, left(r.content_hash,12) as hash12,
    (h.current_revision_id=r.revision_id) as is_current
  from studio.asset_revisions r join studio.asset_heads h on h.asset_id=r.asset_id /*cfg*/
  order by h.asset_kind, r.created_at`)) console.log(JSON.stringify(r));

console.log("\n-- public.director_plans:");
for (const r of await q(`select plan_id::text, topic, left(brief,60) as brief_head, created_at::text,
    (select count(*)::text from jsonb_array_length(coalesce(source_ids,'[]'::jsonb))) as source_count
  from public.director_plans /*cfg*/ order by created_at`)) console.log(JSON.stringify(r));

console.log("\n-- publication.works + work_revisions:");
for (const r of await q(`select w.work_id::text, w.title, r.revision_id::text,
    r.revision_no::text, r.status as revision_status, r.created_at::text
  from publication.works w left join publication.work_revisions r on r.work_id=w.work_id /*cfg*/ order by r.created_at`)) console.log(JSON.stringify(r));

console.log("\n-- publication.published_pointers:");
for (const r of await q(`select work_id::text, revision_id::text from publication.published_pointers /*cfg*/`)) console.log(JSON.stringify(r));

console.log("\n-- studio.use_events:");
for (const r of await q(`select project_id::text, asset_revision_id::text, consumer, requested_action, purpose::text, created_at::text from studio.use_events /*cfg*/ order by created_at desc limit 20`)) console.log(JSON.stringify(r));

console.log("\n-- control.qualification_current (all):");
for (const r of await q(`select gate_code, object_type, object_id::text, artifact_revision::text, consumer, purpose_code, reviewer_user_id::text, valid_until::text from control.qualification_current /*cfg*/ order by gate_code`)) console.log(JSON.stringify(r));

console.log("\n-- studio.delegations + execution_receipts (count by state):");
for (const r of await q(`select status, count(*)::text as n from studio.delegations /*cfg*/ group by status`)) console.log("delegation", JSON.stringify(r));
for (const r of await q(`select acceptance_state, cost_confidence, count(*)::text as n, sum((result_manifest->>'cost_usd')::numeric)::text as usd from studio.execution_receipts /*cfg*/ group by 1,2 order by 1,2`)) console.log("receipt", JSON.stringify(r));

await dataAccess.getNodePgPool?.().end?.();
process.exit(0);
