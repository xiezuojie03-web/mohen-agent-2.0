#!/usr/bin/env node
import { ALLOWED_SCHEMAS, assertPersistenceScope } from "../../pipelines/data-production/adapters/persistence-contract.mjs";

const expected = {
  D01:["source","control"],
  D02:["evidence","control"],
  D03:["world","control"],
  D04:["meaning","control"],
  D05:["read_model","control"],
};

for (const [stage, schemas] of Object.entries(expected)) {
  const actual = ALLOWED_SCHEMAS[stage];
  if (!actual || actual.join("|") !== schemas.join("|")) {
    throw new Error(`PERSISTENCE_BOUNDARY_MISMATCH:${stage}:${actual}`);
  }
  for (const schema of schemas) assertPersistenceScope(stage, `${schema}.fixture`);
}
assertPersistenceScope("D03","world.entities");
try {
  assertPersistenceScope("D03","meaning.findings");
  throw new Error("PERSISTENCE_NEGATIVE_TEST_FAILED");
} catch (err) {
  if (!String(err.message).startsWith("PERSISTENCE_SCOPE_VIOLATION:")) throw err;
}
console.log("CROSS_LAYER_WRITE_BOUNDARY_OK");
