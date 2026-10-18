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

    /**
     * Append-only gate audit (producer_may_self_qualify === false).
     * Supersedes any current-valid decision for the same (gate_code, object_type,
     * object_id), then inserts a fresh current_valid decision. Never upserts.
     */
    async recordGate({
      runId, stage, gateCode, objectType, objectId, result,
      reasonCodes = [], details = {}, architectureGeneration = ARCH,
    }) {
      await db.query(
        `update control.gate_audits
         set current_valid = false
         where gate_code = $1 and object_type = $2 and object_id = $3 and current_valid = true`,
        [gateCode, objectType, objectId]
      );
      const { rows } = await db.query(
        `insert into control.gate_audits
         (run_id, stage, gate_code, object_type, object_id, result, reason_codes, details,
          architecture_generation, current_valid)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, true)
         returning gate_audit_id`,
        [runId, stage, gateCode, objectType, objectId, result, reasonCodes, JSON.stringify(details), architectureGeneration]
      );
      return rows[0].gate_audit_id;
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
