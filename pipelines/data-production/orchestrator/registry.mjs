import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { assertStageAlignment, STAGE_ORDER } from "./contracts.mjs";
export { assertStageExecutionAuthorized } from "./execution-authority.mjs";

export function loadRegistry(projectRoot, registryPath = "specs/data-production/production-registry.json") {
  const full = path.resolve(projectRoot, registryPath);
  const registry = JSON.parse(fs.readFileSync(full, "utf8"));
  const schema = JSON.parse(fs.readFileSync(path.resolve(projectRoot, "specs/data-production/schemas/production-registry.schema.json"), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (!validate(registry)) throw new Error(`REGISTRY_SCHEMA_INVALID:${ajv.errorsText(validate.errors)}`);
  if (registry.schema !== "mohen.production-registry") throw new Error("REGISTRY_SCHEMA_INVALID");
  const jobs = registry.jobs || [];
  if (jobs.length !== 6) throw new Error(`REGISTRY_STAGE_OWNER_COUNT:${jobs.length}`);
  for (const j of jobs) assertStageAlignment(j);
  const stages = jobs.map(j => j.stage);
  for (const s of STAGE_ORDER) if (!stages.includes(s)) throw new Error(`REGISTRY_STAGE_MISSING:${s}`);
  if (new Set(stages).size !== stages.length) throw new Error("REGISTRY_DUPLICATE_STAGE_OWNER");
  if (registry.status === "DESIGN_TARGET_NOT_APPLIED" && jobs.some(j => j.execution_policy.enabled)) {
    throw new Error("REGISTRY_DRAFT_JOB_CANNOT_BE_ENABLED");
  }
  return registry;
}

export function jobForStage(registry, stage) {
  const job = registry.jobs.find(j => j.stage === stage);
  if (!job) throw new Error(`JOB_NOT_FOUND:${stage}`);
  return job;
}
