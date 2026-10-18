/**
 * In-memory mock of the MoHen production DB query interface (six-stage).
 * Used by gate-enforcement regression tests + the guard. It does NOT touch any
 * real database; it only answers the exact queries the repository and
 * lineage-validator issue, so the PASS-only contract is provable offline.
 *
 * Fixture shape:
 *   gateAudits:    [{ object_type, object_id, gate_code, result, current_valid? }]
 *   worldObjects:  [{ id, kind, maturity?, subject_entity_id?, object_entity_id? }]
 *   conflicts:     [{ object_type, object_id, resolution_status }]
 */

export function createMockDb(fixture = {}) {
  const gateAudits = fixture.gateAudits ?? [];
  const worldObjects = fixture.worldObjects ?? [];
  const conflicts = fixture.conflicts ?? [];

  function answer(sql, params = []) {
    // Lineage validator: gate_code = $1 ... object_id = any($2) ... current_valid
    if (sql.includes("object_id = any")) {
      const gate = params[0];
      const want = new Set(params[1] ?? []);
      return {
        rows: gateAudits
          .filter((a) => a.gate_code === gate && want.has(a.object_id) && a.result === "PASS" && a.current_valid !== false)
          .map((a) => ({ object_id: a.object_id, result: a.result })),
      };
    }
    // Repository passed/legalInput: gate_code = $1 and result='PASS' and current_valid=true
    if (sql.includes("result = 'PASS'") && sql.includes("current_valid = true")) {
      const gate = params[0];
      return {
        rows: gateAudits.filter((a) => a.gate_code === gate && a.result === "PASS" && a.current_valid !== false),
      };
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
