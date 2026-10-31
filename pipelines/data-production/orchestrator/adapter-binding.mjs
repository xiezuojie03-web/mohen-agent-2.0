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
