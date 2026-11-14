import { requireQualifiedReadContext } from './qualification-read-context.mjs';
const GATE_BY_STAGE = Object.freeze({
  D00: "G0", D01: "G1", D02: "G2", D03: "G3", D04: "G4", D05: "G5",
});

// A stage may consume only currently qualified, independently signed and
// purpose/consumer/scope-authorized G(n-1) objects. Legacy current_valid
// on the audit row is NOT an authorization and must never be used alone.
const UPSTREAM_GATE = Object.freeze({
  D01: "G0", D02: "G1", D03: "G2", D04: "G3", D05: "G4",
});

const ARCH = "mohen.six-stage.v1";

export function createDataProductionRepository(db) {
  if (!db || typeof db.query !== "function") throw new Error("DB_QUERY_INTERFACE_REQUIRED");
  return {
    async createRun({ researchIntent, scope = {}, executionMode = "attended" }) {
      const { rows } = await db.query(
        `insert into control.production_runs
         (research_intent, scope, execution_mode, status, architecture_generation)
         values ($1, $2::jsonb, $3, 'RUNNING', $4) returning run_id`,
        [researchIntent, JSON.stringify(scope), executionMode, ARCH]
      );
      return rows[0].run_id;
    },

    /** Compatibility name: submits a candidate; never signs or supersedes a Gate. */
    async recordGate({
      runId, stage, gateCode, objectType, objectId, result,
      artifactRevision, purpose, allowedScope, consumer, dependencySnapshot,
      evidenceRefs, inputFingerprint,
    }) {
      if (!artifactRevision || !purpose?.namespace || !purpose.code || !purpose.version ||
          !allowedScope || !consumer || !Array.isArray(dependencySnapshot) ||
          !Array.isArray(evidenceRefs) || evidenceRefs.length === 0 || !/^[a-f0-9]{64}$/.test(inputFingerprint ?? "")) {
        throw new Error("GATE_CANDIDATE_METADATA_REQUIRED");
      }
      if (GATE_BY_STAGE[stage] !== gateCode || !objectType || !objectId) throw new Error("GATE_CANDIDATE_STAGE_MISMATCH");
      if (result && !["PASS", "HOLD", "REJECT"].includes(result)) throw new Error("STAGE_RESULT_INVALID");
      // HOLD/REJECT 候选不进入 SUBMITTED 池，独立 Reviewer 只审 SUBMITTED 的 PASS 候选。
      const candidateStatus = result === "HOLD" ? "HOLD" : result === "REJECT" ? "REJECTED" : "SUBMITTED";
      const { rows } = await db.query(
        `insert into control.gate_candidates
         (run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
          allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,candidate_status)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14,$15)
         returning candidate_id`,
        [runId, stage, gateCode, objectType, objectId, artifactRevision, purpose.namespace, purpose.code, purpose.version,
          JSON.stringify(allowedScope), consumer, JSON.stringify(dependencySnapshot), JSON.stringify(evidenceRefs), inputFingerprint, candidateStatus]
      );
      return rows[0].candidate_id;
    },

    /** Read formal current qualification for the gate of this stage only. */
    async passed(stage, qualificationContext) {
      const gate=GATE_BY_STAGE[stage];
      if(!gate)throw Error(`UNKNOWN_STAGE:${stage}`);
      const bound=requireQualifiedReadContext(qualificationContext);
      const {rows}=await db.query(`select a.* from control.gate_audits a
        where a.gate_code=$1 and a.result='PASS' and a.decision_origin='independent_gate'
          and control.qualification_allows(a.gate_audit_id,$2,$3,$4,$5,$6::jsonb)`,[gate,...bound]);
      return rows;
    },

    /** D(n) consumes only current independent G(n-1), never old PASS rows. */
    async legalInput(stage, qualificationContext) {
      const gate=UPSTREAM_GATE[stage];
      if(!gate)throw Error(`LEGAL_INPUT_NOT_APPLICABLE:${stage}`);
      const bound=requireQualifiedReadContext(qualificationContext);
      const {rows}=await db.query(`select a.* from control.gate_audits a
        where a.gate_code=$1 and a.result='PASS' and a.decision_origin='independent_gate'
          and control.qualification_allows(a.gate_audit_id,$2,$3,$4,$5,$6::jsonb)`,[gate,...bound]);
      return rows;
    },
  };
}
