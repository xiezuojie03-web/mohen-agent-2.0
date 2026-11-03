/**
 * In-memory mock of the MoHen production DB query interface (six-stage).
 * Used by gate-enforcement regression tests + the guard. It does NOT touch any
 * real database; it only answers the exact queries the repository and
 * lineage-validator issue, so scope rejection and legacy isolation can be tested offline; physical
 * signing, immutable revisions and RLS require separate PG17 integration.
 *
 * Fixture shape:
 *   gateAudits:    [{ object_type, object_id, gate_code, result, decision_origin,
 *                     current_qualification, consumer, purpose_*, allowed_scope }]
 *   worldObjects:  [{ id, kind, maturity?, subject_entity_id?, object_entity_id? }]
 *   conflicts:     [{ object_type, object_id, resolution_status }]
 */

export function createMockDb(fixture = {}) {
  const gateAudits = fixture.gateAudits ?? [];
  const worldObjects = fixture.worldObjects ?? [];
  const conflicts = fixture.conflicts ?? [];

  function answer(sql, params = []) {
    // This is a synthetic *independent* current-qualified record, not a mock
    // of a boolean current_valid granting PASS. Real RLS/SQL is exercised in PG17.
    function allows(a, start) {
      if(a.decision_origin!=='independent_gate'||a.current_qualification!==true||
         a.current_valid===false||a.result!=='PASS')return false;
      const [consumer,namespace,code,version,rawScope]=params.slice(start,start+5);
      if(a.consumer!==consumer||a.purpose_namespace!==namespace||
         a.purpose_code!==code||a.purpose_version!==version)return false;
      let scope;
      try{scope=JSON.parse(rawScope)}catch{return false}
      if(!scope||typeof scope!=='object'||Array.isArray(scope))return false;
      return Object.entries(scope).every(([k,v])=>JSON.stringify(a.allowed_scope?.[k])===JSON.stringify(v));
    }
    // Lineage validator: exact IDs and professional current qualification.
    if (sql.includes("object_id=any")) {
      const gate = params[0];
      const want = new Set(params[1] ?? []);
      return {
        rows: gateAudits
          .filter((a) => a.gate_code === gate && want.has(a.object_id) && allows(a,2))
          .map((a) => ({ object_id: a.object_id, result: a.result })),
      };
    }
    // Repository formal current qualification: never pass legacy audits.
    if (sql.includes("control.qualification_allows") &&
        sql.includes("from control.gate_audits")) {
      const gate=params[0];
      return {rows:gateAudits.filter(a=>a.gate_code===gate&&allows(a,1))};
    }
    // Conflict -> adjudicated entity check
    if (sql.includes("world.conflicts") && sql.includes("world.entities")) {
      return {
        rows: conflicts
          .filter((c) => c.object_type === "entity" && ["open", "preserved_open"].includes(c.resolution_status))
          .map((c) => {
            const e = worldObjects.find((w) => w.kind === "entity" && w.id === c.object_id);
            return { object_id: c.object_id, resolution_status: c.resolution_status, maturity: e?.maturity };
          }),
      };
    }
    // Conflict -> adjudicated relation check
    if (sql.includes("world.conflicts") && sql.includes("relation_claims")) {
      const rels = worldObjects.filter((w) => w.kind === "relation_claim");
      const out = [];
      for (const r of rels) {
        const hit = conflicts.find(
          (c) => ["open", "preserved_open"].includes(c.resolution_status) &&
            (c.object_id === r.subject_entity_id || c.object_id === r.object_entity_id)
        );
        if (hit) out.push({ relation_claim_id: r.id, maturity: r.maturity, resolution_status: hit.resolution_status });
      }
      return { rows: out };
    }
    return { rows: [] };
  }

  return { query: async (sql, params) => answer(sql, params) };
}
