import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { finalizeRun, persistStageProgress } from "../../pipelines/data-production/orchestrator/run-persistence.mjs";

test("a missing terminal run row cannot publish PASS reports", async () => {
  const directory = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mohen-run-audit-")), "reports");
  try {
    await assert.rejects(finalizeRun({ run: { run_id: "missing-run", status: "PASS", stage_results: [] },
      db: { queryRows: async () => [] }, outDir: directory }), /PRODUCTION_RUN_PERSISTENCE_MISSING/);
    assert.equal(fs.existsSync(directory), false);
    await assert.rejects(persistStageProgress({ runId: "missing-run", stage: "D00", db: { queryRows: async () => [] } }), /PRODUCTION_RUN_PERSISTENCE_MISSING/);
  } finally { fs.rmSync(path.dirname(directory), { recursive: true, force: true }); }
});
test("persistence must acknowledge exactly the intended run", async () => {
  await assert.rejects(persistStageProgress({ runId: "run-a", stage: "D00", db: { queryRows: async () => [{ run_id: "run-b" }] } }), /PRODUCTION_RUN_PERSISTENCE_MISSING/);
});
test("an acknowledged terminal row publishes the matching run reports", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mohen-persisted-run-"));
  const run = { run_id: "run-a", status: "PASS", stage_results: [], research_intent: "fixture", scope: {} };
  try {
    const reports = await finalizeRun({ run, db: { queryRows: async () => [{ run_id: "run-a" }] }, outDir: directory });
    assert.equal(JSON.parse(fs.readFileSync(reports.machine_report)).status, "PASS");
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
