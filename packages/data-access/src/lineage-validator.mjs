/**
 * Lineage hard-check validator for the MoHen data-production pipeline (six-stage).
 *
 * Six gates: G0 source, G1 carrier reading, G2 material evidence, G3 world,
 * G4 humanistic finding, G5 read model.
 *
 * Upstream dependencies (fail-closed):
 *   G1 reading      <- G0 PASS source
 *   G2 evidence     <- G1 PASS reading unit
 *   G3 world        <- G2 PASS material evidence
 *   G4 finding      <- G3 PASS world object
 *   G5 read model   <- G4 PASS finding
 *
 * Qualification is read from append-only control.gate_audits (current_valid = true);
 * legacy PASS views are retired. Empty upstream dependency (missing_is_eligible=false)
 * throws rather than silently passing (F09).
 */

function assertNonEmptyDependency(gate, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(`MISSING_DEPENDENCY:${gate}: no upstream reference provided`);
  }
}

async function passedIds(db, gate, ids) {
  const { rows } = await db.query(
    `select object_id, result from control.gate_audits
     where gate_code = $1 and object_id = any($2::uuid[])
       and result = 'PASS' and current_valid = true`,
    [gate, ids]
  );
  return new Set(rows.map((r) => r.object_id));
}

async function assertLineage(db, gate, upstreamGate, ids, label) {
  assertNonEmptyDependency(gate, ids);
  const passed = await passedIds(db, upstreamGate, ids);
  const blocked = ids.filter((id) => !passed.has(id));
  if (blocked.length) {
    throw new Error(`${gate}_LINEAGE_BLOCKED: ${label} not ${upstreamGate} PASS -> ${blocked.join(",")}`);
  }
}

/** G1 reading must depend only on G0 PASS source. */
export async function validateG1Lineage(db, sourceIds = []) {
  await assertLineage(db, "G1", "G0", sourceIds, "source");
}

/** G2 material evidence must depend only on G1 PASS reading units. */
export async function validateG2Lineage(db, readingIds = []) {
  await assertLineage(db, "G2", "G1", readingIds, "reading unit");
}

/** G3 world object must depend only on G2 PASS material evidence. */
export async function validateG3Lineage(db, evidenceIds = []) {
  await assertLineage(db, "G3", "G2", evidenceIds, "material evidence");
}

/** G4 humanistic finding must depend only on G3 PASS world objects. */
export async function validateG4Lineage(db, worldIds = []) {
  await assertLineage(db, "G4", "G3", worldIds, "world object");
}

/** G5 read model must depend only on G4 PASS findings. */
export async function validateG5Lineage(db, findingIds = []) {
  await assertLineage(db, "G5", "G4", findingIds, "finding");
}

/**
 * Assert no OPEN-conflicted entity/relation is marked adjudicated.
 * A conflicted identity must not silently become an adjudicated fact.
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

/** Convenience: full upstream lineage check for candidate G1–G5 objects. */
export async function assertLegalPassLineage(db, {
  g1SourceIds = [],
  g2ReadingIds = [],
  g3EvidenceIds = [],
  g4WorldIds = [],
  g5FindingIds = [],
} = {}) {
  await validateG1Lineage(db, g1SourceIds);
  await validateG2Lineage(db, g2ReadingIds);
  await validateG3Lineage(db, g3EvidenceIds);
  await validateG4Lineage(db, g4WorldIds);
  await validateG5Lineage(db, g5FindingIds);
  await validateNoConflictedAdjudicated(db);
}
