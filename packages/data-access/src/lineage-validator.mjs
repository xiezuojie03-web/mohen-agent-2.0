/**
 * Lineage hard-check validator for the MoHen data-production pipeline.
 *
 * Purpose (Gate Hardening, PART A):
 *   - G2 PASS may only depend on G1 PASS evidence.
 *   - G3 PASS may only depend on G2 PASS world objects.
 *   - G4 PASS may only depend on G3 PASS findings + G2 PASS world objects.
 *   - A world object whose identity is in an OPEN conflict cannot be
 *     adjudicated, and a relation claim referencing a conflicted entity
 *     cannot be adjudicated (conflicted != adjudicated).
 *
 * This module introduces NO new gate state. It only reads the existing
 * `control.gate_audits` + `world.conflicts` + maturity columns.
 *
 * Fail-closed: any unmet dependency throws; caller must downgrade to HOLD/REJECT.
 */

/**
 * Assert every supporting evidence id has a G1 PASS audit.
 * @param {object} db query interface
 * @param {string[]} evidenceIds
 */
export async function validateG2Lineage(db, evidenceIds = []) {
  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) return;
  const { rows } = await db.query(
    `select object_id, result from control.gate_audits
     where gate_code='G1' and object_type='material_evidence' and object_id = any($1::uuid[])`,
    [evidenceIds]
  );
  const passed = new Set(rows.filter((r) => r.result === "PASS").map((r) => r.object_id));
  const blocked = evidenceIds.filter((id) => !passed.has(id));
  if (blocked.length) {
    throw new Error(`G2_LINEAGE_BLOCKED: evidence not G1 PASS -> ${blocked.join(",")}`);
  }
}

/**
 * Assert every supporting world object id has a G2 PASS audit.
 * @param {object} db query interface
 * @param {string[]} worldObjectIds
 */
export async function validateG3Lineage(db, worldObjectIds = []) {
  if (!Array.isArray(worldObjectIds) || worldObjectIds.length === 0) return;
  const { rows } = await db.query(
    `select object_id, result from control.gate_audits
     where gate_code='G2' and object_id = any($1::uuid[])`,
    [worldObjectIds]
  );
  const passed = new Set(rows.filter((r) => r.result === "PASS").map((r) => r.object_id));
  const blocked = worldObjectIds.filter((id) => !passed.has(id));
  if (blocked.length) {
    throw new Error(`G3_LINEAGE_BLOCKED: world object not G2 PASS -> ${blocked.join(",")}`);
  }
}

/**
 * Assert every G4 PASS read model depends only on G3 PASS findings
 * and G2 PASS world objects.
 * @param {object} db query interface
 * @param {string[]} findingIds
 * @param {string[]} worldObjectIds
 */
export async function validateG4Lineage(db, findingIds = [], worldObjectIds = []) {
  if (Array.isArray(findingIds) && findingIds.length) {
    const { rows } = await db.query(
      `select object_id, result from control.gate_audits
       where gate_code='G3' and object_id = any($1::uuid[])`,
      [findingIds]
    );
    const passed = new Set(rows.filter((r) => r.result === "PASS").map((r) => r.object_id));
    const blocked = findingIds.filter((id) => !passed.has(id));
    if (blocked.length) {
      throw new Error(`G4_LINEAGE_BLOCKED: finding not G3 PASS -> ${blocked.join(",")}`);
    }
  }
  if (Array.isArray(worldObjectIds) && worldObjectIds.length) {
    await validateG3Lineage(db, worldObjectIds);
  }
}

/**
 * Assert no OPEN-conflicted entity/relation is marked adjudicated.
 * A conflicted identity must not silently become an adjudicated fact.
 * @param {object} db query interface
 */
export async function validateNoConflictedAdjudicated(db) {
  const { rows: ent } = await db.query(
    `select c.object_id, c.resolution_status, e.maturity
     from world.conflicts c join world.entities e on e.entity_id = c.object_id
     where c.object_type='entity' and c.resolution_status in ('open','preserved_open')`,
    []
  );
  for (const r of ent) {
    if (r.maturity === "adjudicated") {
      throw new Error(`CONFLICTED_ADJUDICATED: entity ${r.object_id} conflicted but adjudicated`);
    }
  }
  const { rows: rel } = await db.query(
    `select r.relation_claim_id, r.maturity, c.resolution_status
     from world.relation_claims r
     join world.conflicts c
       on (c.object_id = r.subject_entity_id or c.object_id = r.object_entity_id)
     where c.resolution_status in ('open','preserved_open')`,
    []
  );
  for (const r of rel) {
    if (r.maturity === "adjudicated") {
      throw new Error(`CONFLICTED_ADJUDICATED: relation ${r.relation_claim_id} references conflicted entity but adjudicated`);
    }
  }
}

/** Convenience: full upstream lineage check for a candidate G2/G3/G4 object. */
export async function assertLegalPassLineage(db, { g2EvidenceIds = [], g3WorldIds = [], g4FindingIds = [], g4WorldIds = [] } = {}) {
  await validateG2Lineage(db, g2EvidenceIds);
  await validateG3Lineage(db, g3WorldIds);
  await validateG4Lineage(db, g4FindingIds, g4WorldIds);
  await validateNoConflictedAdjudicated(db);
}
