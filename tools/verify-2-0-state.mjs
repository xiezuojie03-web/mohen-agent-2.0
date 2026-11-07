// Step 2 (M3 real D-chain) read-only state verification for the local isolated DB.
// No writes, no secrets echoed. Usage: node tools/verify-2-0-state.mjs
import { queryRows } from "../packages/data-access/src/index.mjs";

const one = async (label, sql) => {
  try {
    const rows = await queryRows(sql);
    return { label, rows };
  } catch (error) {
    return { label, error: String(error?.message || error).slice(0, 200) };
  }
};

const checks = [];
checks.push(await one("private_originals", `
  select original_id::text, project_id::text, content_type, state, byte_size,
         (storage_bucket is not null) as has_bucket, (storage_key is not null) as has_key
  from studio.private_originals order by created_at`));
checks.push(await one("source_counts", `
  select (select count(*) from source.sources) as sources,
         (select count(*) from source.source_versions) as source_versions,
         (select count(*) from source.raw_items) as raw_items`));
checks.push(await one("read_runs_units", `
  select r.method_set::text as method_set, count(*) as runs,
         (select count(*) from source.read_units u where u.read_run_id = any(array_agg(r.read_run_id))) as units
  from source.read_runs r group by r.method_set`));
checks.push(await one("l2_counts", `
  select (select count(*) from evidence.reading_units) as reading_units,
         (select count(*) from evidence.material_evidence) as material_evidence`));
checks.push(await one("production_runs", `
  select run_id::text, status, current_stage, scope::text from control.production_runs order by started_at desc limit 5`));
checks.push(await one("roles", `
  select rolname, rolcanlogin, rolsuper, rolbypassrls from pg_roles
  where rolname in ('mohen_producer','mohen_app_runtime','mohen_gate_signer','mohen_gate_authority','anon','authenticated','service_role')`));
checks.push(await one("functions", `
  select p.proname, n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where p.proname in ('persist_private_text_reading','private_source_binding_matches','sign_gate_candidate',
                      'revoke_gate_qualification','qualification_allows','authenticate_gate_service',
                      'read_gate_stage_qualification','artifact_revision_for')`));
checks.push(await one("gate_tables", `
  select (select count(*) from control.gate_policy_versions) as policy_versions,
         (select count(*) from control.gate_reviewer_bindings) as reviewer_bindings,
         (select count(*) from control.gate_candidates) as gate_candidates,
         (select count(*) from control.gate_audits) as gate_audits,
         (select count(*) from control.qualification_current) as qualification_current`));
checks.push(await one("studio_asset_counts", `
  select (select count(*) from studio.projects) as projects,
         (select count(*) from studio.asset_heads) as asset_heads,
         (select count(*) from studio.asset_revisions) as asset_revisions`));

console.log(JSON.stringify(checks, null, 2));
