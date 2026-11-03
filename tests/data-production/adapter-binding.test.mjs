import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
import { assertAdapterBinding, assertNoUnboundTopicInputs, assertNoUnboundPrivateEvidenceInput } from "../../pipelines/data-production/orchestrator/adapter-binding.mjs";
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

test("unbound M2 private original requests cannot fall through to the old D01-D03 adapters",()=>{
  const privateInput={schema:"mohen.private-evidence-stage-request.v1",private_evidence:{originalId:"private"}};
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput(privateInput),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput({private_original:{id:"private"}}),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput({mab_private_evidence:{id:"private"}}),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assertNoUnboundPrivateEvidenceInput({qualified_source:{id:"legacy-public"},source_version_id:"ordinary-source"});
  assertNoUnboundPrivateEvidenceInput(null);
});

test("a nested typed private source cannot bypass the unbound D01-D03 registry",()=>{
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput({
    qualified_source:{source_refs:[{schema:"mohen.private-evidence-stage-request.v1",originalId:"private"}]}
  }),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assert.throws(()=>assertNoUnboundPrivateEvidenceInput({
    qualified_reading:{provenance:{private_original:{id:"private"}}}
  }),/PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED/);
  assertNoUnboundPrivateEvidenceInput({
    qualified_source:{source_refs:[{schema:"mohen.public-source.v1",raw_item_id:"ordinary"}]}
  });
});

test("M2 selected private D01 adapter can bind without globally changing D00-D05",()=>{
  const registry=structuredClone(loadRegistry(root));
  const privatePath="pipelines/data-production/adapters/private-evidence-adapters.mjs";
  registry.jobs.find(j=>j.stage==="D01").implementation.adapter_binding=privatePath;
  assertAdapterBinding(root,registry,privatePath,["D01"]);
  assert.throws(()=>assertAdapterBinding(root,registry,privatePath),/ADAPTER_BINDING_MISMATCH/);
  assert.throws(()=>assertAdapterBinding(root,registry,privatePath,["D00","D01"]),/ADAPTER_BINDING_MISMATCH/);
  assert.throws(()=>assertAdapterBinding(root,registry,privatePath,["D01","D01"]),/ADAPTER_BINDING_MISMATCH/);
  assert.throws(()=>assertAdapterBinding(root,registry,privatePath,["D99"]),/ADAPTER_BINDING_MISMATCH/);
});
