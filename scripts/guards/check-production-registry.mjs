#!/usr/bin/env node
import path from "node:path";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
const root = path.resolve(process.argv[2] || process.cwd());
const r = loadRegistry(root);
for (const j of r.jobs) {
  if (j.implementation?.executor === "PENDING_PHASE_D") throw new Error(`EXECUTOR_PENDING:${j.job_id}`);
  if (/production_mode|truth_write_ceiling/i.test(JSON.stringify(j))) throw new Error(`LEGACY_FIELD:${j.job_id}`);
}
console.log(`REGISTRY_OK jobs=${r.jobs.length}`);
