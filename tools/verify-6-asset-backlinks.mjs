// CP2-F / QR-07: Studio asset backlinks must be resolvable, enforced and auditable.
// Real PG assertions only. Prints VERIFY_6_BACKLINK_PASS when every check holds.
// The existing revisions are never back-filled here: their state is reported as
// it is, and the fail-closed invariants are asserted instead.
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
import crypto from "node:crypto";
const dataAccess = await import("../packages/data-access/src/index.mjs");
const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
function makeToken(uid) {
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const ownerToken = makeToken(OWNER);
const q = (sql, p = {}) => dataAccess.queryRows(
  sql.replaceAll("/*cfg*/", ", (select set_config('mohen.session_token', :'token', false)) cfg"), { ...p, token: ownerToken });

// A verdict probe that runs on one pinned connection, inside a subtransaction,
// so a refused write leaves no row and a wrong write is caught explicitly.
async function probe(doBody) {
  const client = await dataAccess.getNodePgPool().connect();
  try {
    await client.query("select set_config('mohen.session_token',$1,false)", [ownerToken]);
    await client.query(`do $probe$ begin perform set_config('cp2f.verdict','NO_PROBE',false); ${doBody} end $probe$`);
    const { rows } = await client.query("select current_setting('cp2f.verdict',true) as verdict");
    return rows[0]?.verdict ?? "NO_PROBE";
  } finally {
    client.release();
  }
}

let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
};
// The psql driver returns jsonb as text; parse once so the assertions below
// read real values instead of comparing a string to an object.
const j = (v) => (typeof v === "string" ? JSON.parse(v) : v);

// ---------- A. Reference registry ----------
const kinds = await q(`select ref_type, target_schema, target_table, target_key, revision_key
  from studio.reference_kinds /*cfg*/ order by ref_type`);
ok("reference registry exists", kinds.length >= 17, `${kinds.length} kinds`);
const catalog = await q(`select c.table_schema, c.table_name, c.column_name
  from information_schema.columns c /*cfg*/
  where c.table_schema in ('studio','source','evidence','world','meaning')`);
const catalogSet = new Set(catalog.map(r => `${r.table_schema}.${r.table_name}.${r.column_name}`));
const missing = kinds.filter(k => !catalogSet.has(`${k.target_schema}.${k.target_table}.${k.target_key}`)
  || (k.revision_key && !catalogSet.has(`${k.target_schema}.${k.target_table}.${k.revision_key}`)));
ok("every registered ref kind maps to a real table.key", missing.length === 0,
  missing.map(m => `${m.ref_type}->${m.target_table}.${m.target_key}`).join(",") || "all real");

// ---------- B. Resolution semantics ----------
const raw = await q(`select raw_item_id::text as id, checksum_sha256 from source.raw_items /*cfg*/ limit 1`);
const resolveOne = async (ref) => (await q(`select studio.resolve_asset_reference(:'ref'::jsonb) as r /*cfg*/`,
  { ref: JSON.stringify(ref) }))[0].r;
const resolve = async (ref) => j(await resolveOne(ref));
if (raw.length === 1) {
  ok("a real raw_item ref resolves with a verified checksum",
    (await resolve({ type: "raw_item", id: raw[0].id, revision: raw[0].checksum_sha256 })).revision_check === "MATCH");
  ok("the same ref with a wrong checksum is a revision mismatch",
    (await resolve({ type: "raw_item", id: raw[0].id, revision: "0".repeat(64) })).status === "REVISION_MISMATCH");
  ok("a ref to a non-existent object is not resolved",
    (await resolve({ type: "raw_item", id: crypto.randomUUID() })).status === "NOT_FOUND");
} else {
  ok("a real raw_item ref resolves with a verified checksum", false, "no raw_items row to anchor the check");
}
ok("an unregistered ref type is refused", (await resolve({ type: "TEST_ONLY_UNVERIFIED", id: crypto.randomUUID() })).status === "UNKNOWN_TYPE");
ok("a ref without a type is refused", (await resolve({ id: crypto.randomUUID() })).status === "UNKNOWN_TYPE");
ok("a ref without an id is refused", (await resolve({ type: "source_version" })).status === "MISSING_ID");
ok("a bare string is not a ref", (await resolve("TEST_ONLY_UNVERIFIED")).status === "INVALID_SHAPE");
const aggregate = await q(`select studio.resolve_asset_references(:'refs'::jsonb) as r /*cfg*/`,
  { refs: JSON.stringify([{ type: "raw_item", id: crypto.randomUUID() }, { type: "raw_item", id: crypto.randomUUID() }]) });
const aggregateReport = j(aggregate[0].r);
ok("an aggregate report counts unresolved refs instead of skipping them",
  aggregateReport.status === "OK" && Number(aggregateReport.blocked) === 2 && Array.isArray(aggregateReport.blocked_items));

// ---------- C. Database guards (fail closed, no row survives) ----------
const revisionGuard = await probe(`
  declare v_asset uuid;
  begin
    select h.asset_id into v_asset from studio.asset_heads h where h.project_id = '${PROJECT}' limit 1;
    begin
      insert into studio.asset_revisions(revision_id,asset_id,revision_no,actor_id,workspace_id,origin_kind,
        epistemic_class,payload_format,content_hash,source_refs,dependency_refs,idempotency_key,correlation_id)
      values(gen_random_uuid(),v_asset,999,'${OWNER}','studio','human','observation','application/json',
        repeat('0',64),'[{"type":"raw_item","id":"${crypto.randomUUID()}"}]'::jsonb,'[]'::jsonb,
        'cp2f-probe-'||gen_random_uuid()::text,gen_random_uuid());
      perform set_config('cp2f.verdict','STORED_A_DANGLING_REF',false);
    exception when others then
      perform set_config('cp2f.verdict',case when sqlerrm like 'ASSET_REFERENCE_UNRESOLVED%'
        then 'REFUSED_UNRESOLVED' else 'REFUSED_OTHER:'||sqlerrm end,false);
    end;
  end;`);
ok("the database refuses to store a dangling source ref", revisionGuard === "REFUSED_UNRESOLVED", revisionGuard);

const useGuard = await probe(`
  declare v_rev uuid; v_project uuid;
  begin
    select r.revision_id, h.project_id into v_rev, v_project
      from studio.asset_revisions r join studio.asset_heads h on h.asset_id = r.asset_id
      where h.project_id = '${PROJECT}'
        and (studio.asset_consumption_disposition(r.revision_id,'read')->>'disposition') = 'BLOCKED'
      order by r.revision_id limit 1;
    begin
      insert into studio.use_events(project_id,asset_revision_id,actor_id,consumer,purpose,requested_action,rights_decision_ref)
      values(v_project,v_rev,'${OWNER}','studio','cp2f-probe','read','cp2f probe rights decision');
      perform set_config('cp2f.verdict','STORED_A_BLOCKED_USE',false);
    exception when others then
      perform set_config('cp2f.verdict',case when sqlerrm like 'ASSET_USE_BLOCKED%'
        then 'REFUSED_BLOCKED' else 'REFUSED_OTHER:'||sqlerrm end,false);
    end;
  end;`);
ok("the database refuses to record a use of a revision whose backlinks do not resolve",
  useGuard === "REFUSED_BLOCKED", useGuard);

// ---------- D. Real state of every stored revision (reported, not laundered) ----------
const revisions = await q(`select h.asset_kind, r.revision_id::text, r.epistemic_class, r.source_refs::text as src,
    studio.asset_consumption_disposition(r.revision_id,'read') as read_decision,
    studio.asset_consumption_disposition(r.revision_id,'quote') as quote_decision
  from studio.asset_heads h join studio.asset_revisions r on r.asset_id = h.asset_id /*cfg*/
  order by h.asset_kind`);
for (const r of revisions) {
  const d = j(r.read_decision);
  console.log(`INFO ${r.asset_kind} ${r.revision_id} epistemic=${r.epistemic_class} source_origin=${d.source_origin} ` +
    `read=${d.disposition}${d.disposition === "BLOCKED" ? "(" + d.blockers.join(",") + ")" : ""} ` +
    `quote=${j(r.quote_decision).disposition}`);
}
const evidenceBearing = new Set(["original_material", "observation", "claim", "hypothesis", "qualified_L_ref"]);
const emptySource = revisions.filter(r => JSON.parse(r.src).length === 0);
const unbacklinkedEvidence = emptySource.filter(r => evidenceBearing.has(r.epistemic_class));
// A revision without a stored source ref is only consumable if a verified
// private original points at it; otherwise it must be blocked with NO_SOURCE_REF.
const badBacklink = unbacklinkedEvidence.filter(r => {
  const d = j(r.read_decision);
  return d.source_origin === "VERIFIED_ORIGINAL_BINDING"
    ? d.disposition !== "ELIGIBLE" || d.verified_original_bindings < 1
    : !d.blockers.includes("NO_SOURCE_REF") || d.disposition !== "BLOCKED";
});
ok("every evidence-bearing revision without a stored source ref is either verified or blocked",
  badBacklink.length === 0,
  `${unbacklinkedEvidence.length} such revisions (${unbacklinkedEvidence.filter(r => j(r.read_decision).source_origin === "VERIFIED_ORIGINAL_BINDING").length} verified by original binding)`);
ok("quoting always requires an explicit allowed right",
  revisions.every(r => j(r.quote_decision).disposition === "BLOCKED" || j(r.quote_decision).right === "allowed"));

// ---------- E. Use events must be legal now, not only when written ----------
const uses = await q(`select e.use_event_id::text, e.requested_action,
    studio.asset_consumption_disposition(e.asset_revision_id,e.requested_action) as decision
  from studio.use_events e /*cfg*/`);
const illegal = uses.filter(u => j(u.decision).disposition !== "ELIGIBLE");
ok("every recorded use event is still eligible for its action", illegal.length === 0,
  `${uses.length} events re-checked${illegal.length ? ", illegal=" + illegal.length : ""}`);
const links = await q(`select count(*)::int as n from studio.asset_links /*cfg*/`);
console.log(`INFO stored backlinks: use_events=${uses.length} asset_links=${links[0].n}`);
const guardTriggers = await q(`select t.tgname from pg_trigger t /*cfg*/ where t.tgname in
  ('studio_asset_revision_immutable','studio_use_event_immutable','studio_use_event_guard','studio_asset_revision_reference_guard')`);
ok("immutability and guard triggers are installed", guardTriggers.length === 4,
  guardTriggers.map(t => t.tgname).sort().join(","));

console.log(failures === 0 ? "VERIFY_6_BACKLINK_PASS" : `VERIFY_6_BACKLINK_FAIL ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
