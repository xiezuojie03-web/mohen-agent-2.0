/**
 * Read-only lineage service for Evidence on Demand.
 * It intentionally exposes no write method.
 *
 * Physical lineage enrichment is completed through D05 projections and
 * claim-evidence/source relationships. The runtime service starts from a
 * G4-published evidence pointer, never from arbitrary lower-layer search.
 */
export function createLineageReadRepository(db) {
  if (!db || typeof db.query !== "function") throw new Error("DB_QUERY_INTERFACE_REQUIRED");

  return {
    async getEvidencePointer(id) {
      const { rows } = await db.query(
        `select p.* from read_model.evidence_pointers p
         join control.gate_audits g
           on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
          and g.object_type='evidence_pointer' and g.object_id=p.evidence_pointer_id
         where p.evidence_pointer_id=$1`, [id]);
      if (!rows[0]) return null;
      return {
        ...rows[0],
        // D05 may enrich this in payload-oriented projections; empty means direct evidence only.
        finding_ids: rows[0].finding_ids ?? [],
      };
    },
    async getFinding(id) {
      const { rows } = await db.query(`select * from meaning.findings where finding_id=$1`, [id]);
      return rows[0] ? { ...rows[0], world_refs: rows[0].supporting_world_objects ?? [] } : null;
    },
    async getWorldObject(ref) {
      // Ref shape: {type,id}. Fail closed for unknown types.
      const map = {
        entity:["world.entities","entity_id"],
        event:["world.events","event_id"],
        relation_claim:["world.relation_claims","relation_claim_id"],
        change:["world.changes","change_id"],
        historical_space_claim:["world.historical_space_claims","historical_space_claim_id"],
        visual_object:["world.visual_objects","visual_object_id"],
      };
      const [table,idcol] = map[ref?.type] || [];
      if (!table) throw new Error(`UNKNOWN_WORLD_REF:${ref?.type}`);
      const { rows } = await db.query(`select * from ${table} where ${idcol}=$1`, [ref.id]);
      if (!rows[0]) return null;
      const { rows: links } = await db.query(
        `select evidence_id from world.claim_evidence_links where claim_object_type=$1 and claim_object_id=$2`,
        [ref.type, ref.id]
      );
      return { ...rows[0], object_ref:`${ref.type}:${ref.id}`, evidence_ids:links.map(x=>x.evidence_id) };
    },
    async getEvidence(id) {
      const { rows } = await db.query(`select * from evidence.material_evidence where evidence_id=$1`, [id]);
      return rows[0] ?? null;
    },
    async getSource(id) {
      const { rows } = await db.query(`select * from source.sources where source_id=$1`, [id]);
      return rows[0] ?? null;
    },
  };
}
