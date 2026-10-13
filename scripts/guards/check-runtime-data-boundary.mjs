#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||process.cwd());
const files=[
  "packages/agent-runtime/src/read-model-client.mjs",
  "packages/experience-engine/src/experience-state.mjs",
];

// Detect physical lower-layer table references, not semantic ExperienceAction names
// such as `evidence.open`.
const forbiddenPhysicalRefs = [
  /\bsource\.(sources|source_versions|raw_items)\b/i,
  /\bevidence\.material_evidence\b/i,
  /\bworld\.(entities|events|relation_claims|changes|historical_space_claims|visual_objects|claim_evidence_links|conflicts)\b/i,
  /\bmeaning\.(findings|present_connections|open_questions)\b/i,
];

for (const rel of files) {
  const s=fs.readFileSync(path.join(root,rel),"utf8");
  for (const rx of forbiddenPhysicalRefs) {
    if (rx.test(s)) throw new Error(`LOWER_LAYER_DIRECT_READ_IN_RUNTIME:${rel}:${rx}`);
  }
}
console.log("RUNTIME_DATA_BOUNDARY_OK");
