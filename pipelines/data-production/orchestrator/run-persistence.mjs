import { writeReports } from "../reporting/write-reports.mjs";

function requireRunAcknowledgment(rows, runId) {
  if (rows.length !== 1 || String(rows[0].run_id) !== runId) throw new Error("PRODUCTION_RUN_PERSISTENCE_MISSING");
}

export async function persistStageProgress({ runId, stage, db }) {
  const rows = await db.queryRows(`update control.production_runs set current_stage=:'stage', status='RUNNING'
    where run_id=:'run_id'::uuid returning run_id::text as run_id`, { stage, run_id: runId });
  requireRunAcknowledgment(rows, runId);
}

export async function finalizeRun({ run, db, outDir }) {
  const rows = await db.queryRows(`update control.production_runs set status=:'status', finished_at=now()
    where run_id=:'run_id'::uuid returning run_id::text as run_id`, { status: run.status, run_id: run.run_id });
  requireRunAcknowledgment(rows, run.run_id);
  return writeReports({ run, outDir });
}
