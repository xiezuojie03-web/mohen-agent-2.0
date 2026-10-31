import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
import { assertAdapterBinding, assertNoUnboundTopicInputs } from "../../pipelines/data-production/orchestrator/adapter-binding.mjs";
const root = path.resolve(import.meta.dirname, "../..");
test("CLI adapter choice must match the signed registry binding", () => {
  const registry = loadRegistry(root);
  assert.throws(() => assertAdapterBinding(root, registry, "tests/data-production/fixture-adapters.mjs"), /ADAPTER_BINDING_MISMATCH/);
  assertAdapterBinding(root, registry, "pipelines/data-production/adapters/layer1-adapters.mjs");
});
test("dynamic topic bytes and executable topic configuration require a bound snapshot protocol", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mohen-unbound-topic-"));
  try {
    const topic = path.join(directory, "topic.json");
    fs.writeFileSync(topic, '{"materials":["A"]}');
    assert.throws(() => assertNoUnboundTopicInputs({ MOHEN_TOPIC_JSON_FILE: topic }), /EXECUTION_DYNAMIC_INPUT_BINDING_REQUIRED/);
    fs.writeFileSync(topic, '{"materials":["B"]}');
    assert.throws(() => assertNoUnboundTopicInputs({ MOHEN_TOPIC_JSON_FILE: topic }), /EXECUTION_DYNAMIC_INPUT_BINDING_REQUIRED/);
    assert.throws(() => assertNoUnboundTopicInputs({ MOHEN_TOPIC_CONFIG: "https://untrusted.invalid/topic.mjs" }), /EXECUTION_DYNAMIC_INPUT_BINDING_REQUIRED/);
    assertNoUnboundTopicInputs({});
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
