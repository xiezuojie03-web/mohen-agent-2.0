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


/** Until a signed, typed D01-D03 private adapter is bound to the one
 * production Registry, never send private-original requests to legacy
 * D01/D02/D03 adapters (which process historic public fixture materials).
 */
export function assertNoUnboundPrivateEvidenceInput(input) {
  if (input === null || typeof input !== 'object') return;
  if (input.schema === 'mohen.private-evidence-stage-request.v1' ||
      input.private_evidence !== undefined ||
      input.private_original !== undefined ||
      input.mab_private_evidence !== undefined) {
    throw Error('PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED');
  }
}
