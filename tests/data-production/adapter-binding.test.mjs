import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
import { assertAdapterBinding, assertNoUnboundTopicInputs, assertNoUnboundPrivateEvidenceInput, isTypedPrivateStageRequest, isTypedD01Carrier } from "../../pipelines/data-production/orchestrator/adapter-binding.mjs";
const root = path.resolve(import.meta.dirname, "../..");

test("D01 typed handoff binds method plan to exactly one well-formed carrier",()=>{
  const oid="11111111-1111-4111-8111-111111111111",sv="22222222-2222-4222-8222-222222222222",ri="33333333-3333-4333-8333-333333333333";
  const sha="a".repeat(64);
  const c02={kind:"method_plan",id:"C02@v1",method_id:"C02",method_version:"v1"};
  const c01={kind:"method_plan",id:"C01@v1",method_id:"C01",method_version:"v1"};
  const pageReq=(method_plan,over={})=>({schema:"mohen.private-evidence-stage-request.v1",stage:"D01",originalId:oid,
    method_plan,page:{kind:"scanned_page/v1",page_number:1,source_version_id:sv,raw_item_id:ri,raw_sha256:sha,page_sha256:sha,...over}});
  const textReq=(method_plan,over={})=>({schema:"mohen.private-evidence-stage-request.v1",stage:"D01",originalId:oid,
    method_plan,text:{kind:"verified_utf8_full/v1",source_version_id:sv,raw_item_id:ri,raw_sha256:sha,...over}});
  assert.equal(isTypedPrivateStageRequest("D01",pageReq([c02])),true);
  assert.equal(isTypedPrivateStageRequest("D01",textReq([c01])),true);
  // carrier/method mismatch and malformed page are refused
  assert.equal(isTypedPrivateStageRequest("D01",textReq([c02])),false);
  assert.equal(isTypedPrivateStageRequest("D01",pageReq([c01])),false);
  assert.equal(isTypedD01Carrier(pageReq([c02],{page_sha256:"b".repeat(64)})),false);
  assert.equal(isTypedD01Carrier(pageReq([c02],{page_number:0})),false);
  assert.equal(isTypedD01Carrier({...pageReq([c02]),text:textReq([c01]).text}),false);
  assert.equal(isTypedD01Carrier({...pageReq([c02]),method_plan:[{...c02,method_id:"X9"}]}),false);
  // legacy/resume request without method_plan keeps historical shape
  assert.equal(isTypedPrivateStageRequest("D01",{schema:"mohen.private-evidence-stage-request.v1",stage:"D01",originalId:oid}),true);
  // D02-D05 shape check is unchanged by the D01 carrier rule
  assert.equal(isTypedPrivateStageRequest("D02",{schema:"mohen.private-evidence-stage-request.v1",stage:"D02",originalId:oid}),true);
});
test("CLI adapter choice must match the signed registry binding", () => {
  // 8963c9d 起 D00-D05 的 registry adapter_binding 切至 layer1-adapters（自由主题闭环）；
  // 私有原件路径仍走 private-evidence-adapters（runtime loader，不经 registry 绑定）。
  const registry = loadRegistry(root);
  assert.throws(() => assertAdapterBinding(root, registry, "tests/data-production/fixture-adapters.mjs"), /ADAPTER_BINDING_MISMATCH/);
  assertAdapterBinding(root, registry, "pipelines/data-production/adapters/layer1-adapters.mjs", ["D00", "D01"]);
  assertAdapterBinding(root, registry, "pipelines/data-production/adapters/layer1-adapters.mjs", ["D02", "D03", "D04", "D05"]);
  assert.throws(() => assertAdapterBinding(root, registry, "pipelines/data-production/adapters/private-evidence-adapters.mjs", ["D02", "D03", "D04", "D05"]), /ADAPTER_BINDING_MISMATCH/);
});
test("one canonical Registry admits a reviewed private route while retaining layer1",()=>{
  const registry=loadRegistry(root);
  const privatePath="pipelines/data-production/adapters/private-evidence-adapters.mjs",layer1Path="pipelines/data-production/adapters/layer1-adapters.mjs";
  const scope={project_id:"123e4567-e89b-42d3-a456-426614174003",original_id:"123e4567-e89b-42d3-a456-426614174004",page_number:3};
  assertAdapterBinding(root,registry,privatePath,undefined,scope);
  assert.throws(()=>assertAdapterBinding(root,registry,layer1Path,undefined,scope),/ADAPTER_BINDING_MISMATCH/);
  assert.throws(()=>assertAdapterBinding(root,registry,privatePath),/ADAPTER_BINDING_MISMATCH/);
  assert.throws(()=>assertAdapterBinding(root,registry,privatePath,undefined,{...scope,original_id:"invalid"}),/PRIVATE_SOURCE_RUN_SCOPE_INVALID/);
  const missing=structuredClone(registry);
  delete missing.jobs[0].implementation.private_evidence_adapter_binding;
  assert.throws(()=>assertAdapterBinding(root,missing,privatePath,undefined,scope),/PRIVATE_STAGE_ADAPTER_NOT_BOUND/);
  assertAdapterBinding(root,registry,layer1Path);
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

test("M5 free-topic stages bind the reviewed layer1 adapters; private-evidence is a runtime path, not the registry binding",()=>{
  // 8963c9d：registry 六阶段 adapter_binding 均切至 layer1（自由主题闭环）；
  // private-evidence 仅作私有原件 runtime 路径，不再被 registry 接受为 CLI 绑定。
  const registry=structuredClone(loadRegistry(root));
  const privatePath="pipelines/data-production/adapters/private-evidence-adapters.mjs";
  const layer1Path="pipelines/data-production/adapters/layer1-adapters.mjs";
  assertAdapterBinding(root,registry,layer1Path,["D01"]);
  assertAdapterBinding(root,registry,layer1Path,["D00","D01"]);
  assertAdapterBinding(root,registry,layer1Path,["D02","D03","D04","D05"]);
  assertAdapterBinding(root,registry,layer1Path);
  assert.throws(()=>assertAdapterBinding(root,registry,layer1Path,["D01","D01"]),/ADAPTER_BINDING_MISMATCH/);
  assert.throws(()=>assertAdapterBinding(root,registry,layer1Path,["D99"]),/ADAPTER_BINDING_MISMATCH/);
  assert.throws(()=>assertAdapterBinding(root,registry,privatePath),/ADAPTER_BINDING_MISMATCH/);
});
