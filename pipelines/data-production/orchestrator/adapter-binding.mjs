import fs from "node:fs";
import path from "node:path";

export function assertAdapterBinding(projectRoot, registry, adapterPath) {
  const root = fs.realpathSync(projectRoot);
  const selected = fs.realpathSync(path.resolve(root, adapterPath));
  if (!selected.startsWith(root + path.sep) || registry.jobs.some(job => {
    const binding = job.implementation?.adapter_binding;
    return typeof binding !== "string" || path.isAbsolute(binding) || binding.split(/[\\/]/).includes("..") ||
      fs.realpathSync(path.resolve(root, binding)) !== selected;
  })) throw new Error("ADAPTER_BINDING_MISMATCH");
}

export function assertNoUnboundTopicInputs(environment = process.env) {
  // These adapters read material/configuration outside run.input. Until a frozen
  // snapshot handshake is implemented they cannot be authorized by an intent-only grant.
  if (environment.MOHEN_TOPIC_JSON_FILE || environment.MOHEN_TOPIC_CONFIG) {
    throw new Error("EXECUTION_DYNAMIC_INPUT_BINDING_REQUIRED");
  }
}


/** The only private evidence adapter module eligible for D01–D03.
 * A Registry document cannot enable private inputs merely by inventing a
 * binding name; binding must resolve to this exact reviewed module.
 */
export const PRIVATE_EVIDENCE_ADAPTER_PATH =
  "pipelines/data-production/adapters/private-evidence-adapters.mjs";

const PRIVATE_REQUEST_SCHEMA = "mohen.private-evidence-stage-request.v1";

function containsPrivateRequest(input) {
  const seen = new WeakSet();
  function visit(value) {
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    if (value.schema === PRIVATE_REQUEST_SCHEMA ||
      value.private_evidence !== undefined ||
      value.private_original !== undefined ||
      value.mab_private_evidence !== undefined) return true;
    return Object.values(value).some(visit);
  }
  return visit(input);
}

/**
 * Private inputs cannot reach a legacy adapter. Only the exact reviewed
 * private module may handle a stage-specific, top-level typed request after
 * the Registry has been activated and stage policy authorized independently.
 * This check never authorizes execution by itself.
 */
export function assertNoUnboundPrivateEvidenceInput(input, { job } = {}) {
  if (!containsPrivateRequest(input)) return;
  if (!job || !["D01","D02","D03"].includes(job.stage) ||
      job.implementation?.adapter_binding !== PRIVATE_EVIDENCE_ADAPTER_PATH ||
      input?.schema !== PRIVATE_REQUEST_SCHEMA ||
      input?.stage !== job.stage ||
      typeof input?.originalId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.originalId) ||
      ["private_evidence","private_original","mab_private_evidence"].some(k=>input[k]!==undefined)) {
    throw Error("PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED");
  }
}
