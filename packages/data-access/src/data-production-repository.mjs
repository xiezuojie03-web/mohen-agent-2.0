const PASS_VIEW = {
  D01: "control.g0_pass_sources",
  D02: "control.g1_pass_evidence",
  D03: "control.g2_pass_world_objects",
  D04: "control.g3_pass_findings",
  D05: "control.g4_pass_read_models",
};
export function createDataProductionRepository(db) {
  if (!db || typeof db.query !== "function") throw new Error("DB_QUERY_INTERFACE_REQUIRED");
  return {
    async createRun({ researchIntent, scope = {}, executionMode = "attended" }) {
      const { rows } = await db.query(`insert into control.production_runs
        (research_intent,scope,execution_mode,status) values ($1,$2::jsonb,$3,'RUNNING') returning run_id`,
        [researchIntent, JSON.stringify(scope), executionMode]);
      return rows[0].run_id;
    },
    async recordGate({ runId, stage, gateCode, objectType, objectId, result, reasonCodes = [], details = {} }) {
      const { rows } = await db.query(`insert into control.gate_audits
        (run_id,stage,gate_code,object_type,object_id,result,reason_codes,details)
        values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
        on conflict (run_id,gate_code,object_type,object_id)
        do update set result=excluded.result,reason_codes=excluded.reason_codes,details=excluded.details,checked_at=now()
        returning gate_audit_id`,
        [runId,stage,gateCode,objectType,objectId,result,reasonCodes,JSON.stringify(details)]);
      return rows[0].gate_audit_id;
    },
    async passed(stage) {
      const view=PASS_VIEW[stage]; if (!view) throw new Error(`UNKNOWN_STAGE:${stage}`);
      return (await db.query(`select * from ${view}`,[])).rows;
    },

    // ---- Legal input selectors (Gate Hardening, PART A) ----
    // Downstream executors MUST read their stage input from these selectors,
    // which read only the corresponding G(n-1) PASS view. A HOLD/REJECT row
    // is structurally absent from the view, so it cannot enter the next stage.
    // This is the hard enforcement of: Dn Gate PASS Output = Dn+1 Legal Entry.

    /** D03 may only consume G1 PASS evidence. */
    async legalInputForD03() {
      return (await db.query(`select * from control.g1_pass_evidence`, [])).rows;
    },
    /** D04 may only consume G2 PASS world objects. */
    async legalInputForD04() {
      return (await db.query(`select * from control.g2_pass_world_objects`, [])).rows;
    },
    /** D05 may only consume G3 PASS findings. */
    async legalInputForD05() {
      return (await db.query(`select * from control.g3_pass_findings`, [])).rows;
    },

    /**
     * Generic legal-input contract: returns the PASS-only rows for the stage
     * that is ABOUT TO RUN. D03<-g1, D04<-g2, D05<-g3. D01/D02 read upstream
     * (research_intent / qualified_source) and are out of scope for this guard.
     */
    async legalInput(stage) {
      if (stage === "D03") return this.legalInputForD03();
      if (stage === "D04") return this.legalInputForD04();
      if (stage === "D05") return this.legalInputForD05();
      throw new Error(`LEGAL_INPUT_NOT_APPLICABLE:${stage}`);
    },
  };
}
