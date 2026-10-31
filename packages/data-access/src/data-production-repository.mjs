const GATE_BY_STAGE = Object.freeze({
  D00: "G0", D01: "G1", D02: "G2", D03: "G3", D04: "G4", D05: "G5",
});

// Stage n consumes G(n-1) PASS rows. Qualification is read directly from the
// append-only control.gate_audits (current_valid = true); legacy PASS views are
// retired and must never be referenced (no_legacy_pass_inheritance).
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
      const { rows } = await db.query(
        `insert into control.gate_candidates
         (run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
          allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,candidate_status)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14,'SUBMITTED')
         returning candidate_id`,
        [runId, stage, gateCode, objectType, objectId, artifactRevision, purpose.namespace, purpose.code, purpose.version,
          JSON.stringify(allowedScope), consumer, JSON.stringify(dependencySnapshot), JSON.stringify(evidenceRefs), inputFingerprint]
      );
      return rows[0].candidate_id;
    },

    /** Current-valid PASS rows for a stage's own exit gate. */
    async passed(stage) {
      const gate = GATE_BY_STAGE[stage];
      if (!gate) throw new Error(`UNKNOWN_STAGE:${stage}`);
      return (await db.query(
        `select * from control.gate_audits
         where gate_code = $1 and result = 'PASS' and current_valid = true`,
        [gate]
      )).rows;
    },

    /** Legal input for a stage: G(n-1) PASS rows (D00 has no upstream gate). */
    async legalInput(stage) {
      const gate = UPSTREAM_GATE[stage];
      if (!gate) throw new Error(`LEGAL_INPUT_NOT_APPLICABLE:${stage}`);
      return (await db.query(
        `select * from control.gate_audits
         where gate_code = $1 and result = 'PASS' and current_valid = true`,
        [gate]
      )).rows;
    },
  };
}
