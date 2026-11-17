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

test("Studio terminal readback retains exact D00/G0 HOLD reason without claiming independent PASS", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mohen-g0-terminal-"));
  let written;
  const run = { run_id: "run-held", research_intent: "fixture", scope: {},
    status: "HOLD", current_stage: "D00", stage_results: [{
      disposition: "HOLD", hold: { reason_code: "INDEPENDENT_GATE_NOT_VERIFIED",
        verification_error: "INDEPENDENT_GATE_VERIFY_UNAVAILABLE",
        next_action: "private content must never enter the Studio status response" },
    }] };
  try {
    await finalizeRun({ run, db: { queryRows: async (_sql, params) => {
      written = params; return [{ run_id: "run-held" }];
    } }, outDir: directory });
    assert.deepEqual(JSON.parse(written.terminal), {
      stage: "D00", gate_code: "G0", disposition: "HOLD",
      independent_gate_audit_id: null, reason_code: "INDEPENDENT_GATE_NOT_VERIFIED",
      verification_error: "INDEPENDENT_GATE_VERIFY_UNAVAILABLE",
    });
    assert.equal(JSON.stringify(written).includes("private content"), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("a stage candidate and arbitrary error text cannot become a G0 PASS receipt", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mohen-g0-no-sign-"));
  let terminal;
  try {
    await finalizeRun({ run: { run_id: "run-candidate", status: "HOLD", current_stage: "D00",
      research_intent: "fixture", scope: {}, stage_results: [{
        disposition: "HOLD", gate_evidence: { qualification: "UNASSESSED" },
        hold: { reason_code: "INDEPENDENT_GATE_NOT_VERIFIED",
          verification_error: "request contains private/secret" },
      }] },
      db: { queryRows: async (_sql, params) => {
        terminal = JSON.parse(params.terminal); return [{ run_id: "run-candidate" }];
      } }, outDir: directory });
    assert.equal(terminal.independent_gate_audit_id, null);
    assert.equal(terminal.disposition, "HOLD");
    assert.equal(terminal.verification_error, null);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("cloud progress uses the existing Owner-scoped SQL RPC, never broad direct UPDATE",async()=>{
 const runId="11111111-1111-4111-8111-111111111111",ownerToken="signed-owner-fixture";
 let query,params;
 const db={queryRows:async(q,p)=>{query=q;params=p;return [{run_id:runId}];}};
 await persistStageProgress({runId,stage:"D00",db,ownerSessionToken:ownerToken});
 assert.match(query,/control\.m5_write_production_progress/);
 assert.doesNotMatch(query,/update control\.production_runs/i);
 assert.equal(params.owner_token,ownerToken);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mohen-cloud-scoped-run-"));
 try{
  const run={run_id:runId,status:"HOLD",current_stage:"D00",research_intent:"test",scope:{},stage_results:[{
   disposition:"HOLD",hold:{reason_code:"INDEPENDENT_GATE_NOT_VERIFIED"}}]};
  const reports=await finalizeRun({run,db,outDir:dir,ownerSessionToken:ownerToken});
  assert.match(query,/control\.m5_write_production_progress/);
  assert.equal(params.status,"HOLD");
  assert.equal(params.stage,"D00");
  assert.equal(JSON.parse(params.terminal).reason_code,"INDEPENDENT_GATE_NOT_VERIFIED");
  assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(reports.machine_report,"utf8"))).includes(ownerToken),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
