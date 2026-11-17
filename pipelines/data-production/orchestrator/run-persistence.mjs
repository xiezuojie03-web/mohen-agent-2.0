import { writeReports } from "../reporting/write-reports.mjs";

function requireRunAcknowledgment(rows, runId) {
  if (rows.length !== 1 || String(rows[0].run_id) !== runId) throw new Error("PRODUCTION_RUN_PERSISTENCE_MISSING");
}

export async function persistStageProgress({ runId, stage, db, ownerSessionToken }) {
  // The cloud Producer cannot UPDATE the shared run table directly. The existing
  // database owner verifies the signed Owner identity and exact pre-claimed Root.
  const scoped=typeof ownerSessionToken==='string'&&ownerSessionToken.length>0;
  const rows=scoped
    ? await db.queryRows(`select control.m5_write_production_progress(
        :'run_id'::uuid, :'owner_token', 'stage', :'stage', null, null) as run_id`,
      {run_id:runId,owner_token:ownerSessionToken,stage})
    : await db.queryRows(`update control.production_runs set current_stage=:'stage', status='RUNNING'
        where run_id=:'run_id'::uuid returning run_id::text as run_id`,{run_id:runId,stage});
  requireRunAcknowledgment(rows, runId);
}

// Only machine-readable, bounded diagnostic codes leave the Runner. Never
// persist source bytes, claims, credentials or an untrusted exception message.
export function terminalRunEvidence(run) {
  const last = Array.isArray(run.stage_results) ? run.stage_results.at(-1) : null;
  const stage = /^D0[0-5]$/.test(run.current_stage ?? '') ? run.current_stage : null;
  const code = value => typeof value === 'string' && /^[A-Z0-9_]{3,100}$/.test(value) ? value : null;
  const audit = last?.independent_qualification?.gate_audit_id;
  return {
    stage, gate_code: stage ? 'G' + stage.slice(-1) : null,
    disposition: run.status,
    independent_gate_audit_id: typeof audit === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(audit) ? audit : null,
    reason_code: code(last?.hold?.reason_code),
    verification_error: code(last?.hold?.verification_error),
  };
}

export async function finalizeRun({ run, db, outDir, ownerSessionToken }) {
  const scoped=typeof ownerSessionToken==='string'&&ownerSessionToken.length>0;
  const terminal=JSON.stringify(terminalRunEvidence(run));
  const rows=scoped
    ? await db.queryRows(`select control.m5_write_production_progress(
        :'run_id'::uuid, :'owner_token', 'terminal', :'stage', :'status', :'terminal'::jsonb) as run_id`,
      {run_id:run.run_id,owner_token:ownerSessionToken,stage:run.current_stage,status:run.status,terminal})
    : await db.queryRows(`update control.production_runs
        set status=:'status', finished_at=now(),
            metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('m5_terminal', :'terminal'::jsonb)
        where run_id=:'run_id'::uuid returning run_id::text as run_id`,
      {status:run.status,run_id:run.run_id,terminal});
  requireRunAcknowledgment(rows,run.run_id);
  return writeReports({run,outDir});
}
