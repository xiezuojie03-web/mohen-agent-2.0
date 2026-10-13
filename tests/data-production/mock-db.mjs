/**
 * In-memory mock of the MoHen production DB query interface.
 * Used by gate-enforcement regression tests + the guard. It does NOT touch
 * any real database; it only answers the exact queries the repository and
 * lineage-validator issue, so the PASS-only contract is provable offline.
 *
 * Fixture shape:
 *   evidence:      [{ id, ... }]
 *   worldObjects:  [{ id, kind: 'entity'|'relation_claim'|'event'|'change'|'historical_space_claim'|'visual_object', maturity?, subject_entity_id?, object_entity_id? }]
 *   findings:      [{ id, ... }]
 *   readModels:    [{ id, kind: 'world_projection'|'agent_context'|'story_seed'|'discovery_path'|'map_timeline_projection', ... }]
 *   gateAudits:    [{ object_type, object_id, gate_code, result }]
 *   conflicts:     [{ object_type, object_id, resolution_status }]
 */

const GATE_BY_KIND = {
  source: "G0",
  material_evidence: "G1",
  entity: "G2",
  event: "G2",
  relation_claim: "G2",
  change: "G2",
  historical_space_claim: "G2",
  visual_object: "G2",
  finding: "G3",
  world_projection: "G4",
  agent_context: "G4",
  story_seed: "G4",
  discovery_path: "G4",
  map_timeline_projection: "G4",
};

export function createMockDb(fixture = {}) {
  const evidence = fixture.evidence ?? [];
  const worldObjects = fixture.worldObjects ?? [];
  const findings = fixture.findings ?? [];
  const readModels = fixture.readModels ?? [];
  const gateAudits = fixture.gateAudits ?? [];
  const conflicts = fixture.conflicts ?? [];

  const passIds = (objectType) =>
    new Set(
      gateAudits
        .filter((a) => a.object_type === objectType && a.gate_code === GATE_BY_KIND[objectType] && a.result === "PASS")
        .map((a) => a.object_id)
    );

  function answer(sql, params) {
    // PASS views (repository legal-input selectors)
    if (sql.includes("g1_pass_evidence")) {
      const ids = passIds("material_evidence");
      return { rows: evidence.filter((r) => ids.has(r.id)).map((r) => ({ object_id: r.id, ...r })) };
    }
    if (sql.includes("g2_pass_world_objects")) {
      const out = [];
      for (const r of worldObjects) {
        if (passIds(r.kind).has(r.id)) out.push({ object_type: r.kind, object_id: r.id, maturity: r.maturity });
      }
      return { rows: out };
    }
    if (sql.includes("g3_pass_findings")) {
      const ids = passIds("finding");
      return { rows: findings.filter((r) => ids.has(r.id)).map((r) => ({ object_id: r.id, ...r })) };
    }
    if (sql.includes("g4_pass_read_models")) {
      const out = [];
      for (const r of readModels) {
        if (passIds(r.kind).has(r.id)) out.push({ object_type: r.kind, object_id: r.id });
      }
      return { rows: out };
    }
    // Lineage validator: G1 evidence audits
    if (sql.includes("gate_code='G1'")) {
      const want = new Set(params[0] ?? []);
      return {
        rows: gateAudits
          .filter((a) => a.gate_code === "G1" && a.object_type === "material_evidence" && want.has(a.object_id))
          .map((a) => ({ object_id: a.object_id, result: a.result })),
      };
    }
    // Lineage validator: G2 / G3 world+findings audits (matched by object_id)
    if (sql.includes("gate_code='G2'") || sql.includes("gate_code='G3'")) {
      const gate = sql.includes("gate_code='G2'") ? "G2" : "G3";
      const want = new Set(params[0] ?? []);
      return {
        rows: gateAudits
          .filter((a) => a.gate_code === gate && want.has(a.object_id))
          .map((a) => ({ object_id: a.object_id, result: a.result })),
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
