import fs from "node:fs";
import path from "node:path";
import { assertStageAlignment, STAGE_ORDER } from "./contracts.mjs";

export function loadRegistry(projectRoot, registryPath = "specs/data-production/production-registry.json") {
  const full = path.resolve(projectRoot, registryPath);
  const registry = JSON.parse(fs.readFileSync(full, "utf8"));
  if (registry.schema !== "mohen.production-registry") throw new Error("REGISTRY_SCHEMA_INVALID");
  const jobs = registry.jobs || [];
  if (jobs.length !== 6) throw new Error(`REGISTRY_STAGE_OWNER_COUNT:${jobs.length}`);
  for (const j of jobs) assertStageAlignment(j);
  const stages = jobs.map(j => j.stage);
  for (const s of STAGE_ORDER) if (!stages.includes(s)) throw new Error(`REGISTRY_STAGE_MISSING:${s}`);
  if (new Set(stages).size !== stages.length) throw new Error("REGISTRY_DUPLICATE_STAGE_OWNER");
  return registry;
}

export function jobForStage(registry, stage) {
  const job = registry.jobs.find(j => j.stage === stage);
  if (!job) throw new Error(`JOB_NOT_FOUND:${stage}`);
  return job;
}
