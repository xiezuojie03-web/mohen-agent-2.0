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
  // A stage input can be a nested typed artifact. Scanning only top-level
  // fields would let a private original ride through qualified_source and
  // silently fall back to the public legacy adapter. Stop before live grants.
  const visited=new WeakSet();
  function scan(value){
    if(value===null||typeof value!=='object')return;
    if(visited.has(value))return;
    visited.add(value);
    if(value.schema==='mohen.private-evidence-stage-request.v1' ||
       value.private_evidence!==undefined || value.private_original!==undefined ||
       value.mab_private_evidence!==undefined) {
      throw Error('PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED');
    }
    for(const child of Object.values(value))scan(child);
  }
  scan(input);
}
