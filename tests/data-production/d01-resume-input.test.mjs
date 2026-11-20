import assert from 'node:assert/strict';
import test from 'node:test';
import { rebuildD01ResumeInput } from '../../pipelines/data-production/orchestrator/d01-resume-input.mjs';
import { isTypedD01Carrier } from '../../pipelines/data-production/orchestrator/adapter-binding.mjs';
import { buildMethodPlanRefs } from '../../packages/data-access/src/method-plan-ref.mjs';

const PROJECT='e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5';
const RUN='bfcdfad6-bbcb-4b68-946a-82e1302eeb80';
const ORIGINAL='4ca22839-e3e9-4d14-8ec7-677cd740aa0e';
const SV='67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const RAW='5fe7f057-a797-42cd-81b8-0892d4c271b6';
const SHA='a'.repeat(64);
const revision='28de63852bf7bdd1e6f977ef357fbba4b3f9a214fce00dc70c5ee9ef73e62ca7';
const registry={status:'ACTIVE_AUTHORIZED',activation:{enabled:true},architecture_generation:'fixture',jobs:[
 {stage:'D00',job_id:'d00.source-intake',exit_gate:'G0',implementation:{gate_reviewer_binding:'m5-owner-reviewer-g0g1-producer'}},
]};
const methodPlan=buildMethodPlanRefs({methods:[{method_id:'C02',method_version:'v1'}]});
const candidate={candidate_id:'48766904-c409-4b37-b602-9339a582b7e6',object_id:SV,gate_code:'G0',stage:'D00',
 consumer:'producer',object_type:'source_version',artifact_revision:revision,
 scope:JSON.stringify({project_id:PROJECT,original_id:ORIGINAL,source_version_id:SV,raw_sha256:SHA,page_number:1}),
 evidence_refs:[{kind:'source_version',id:SV,artifact_revision:revision},...methodPlan]};
const request={run_id:RUN,stage:'D00',gate_code:'G0',output_digest:'b'.repeat(64)};
const srcRow={original_id:ORIGINAL,project_id:PROJECT,original_state:'STORED_VERIFIED',content_type:'image/jpeg',
 original_sha256:SHA,original_bytes:'2048',raw_item_id:RAW,raw_checksum:SHA,raw_bytes:'2048'};
const query=async(sql,params)=>{
 if(sql.includes('from source.raw_items'))return [srcRow];
 if(sql.includes('from control.production_runs'))return [{scope:JSON.stringify({project_id:PROJECT,page_number:1,source_version_id:SV,original_id:ORIGINAL,raw_sha256:SHA})}];
 return [];
};

test('rebuilds a typed scanned-page D01 resume input accepted by the Gate shape authority',async()=>{
 const input=await rebuildD01ResumeInput({query,candidate,request,registry,projectId:PROJECT});
 assert.equal(input.schema,'mohen.private-evidence-stage-request.v1');
 assert.equal(input.stage,'D01');
 assert.equal(input.originalId,ORIGINAL);
 assert.equal(input.page.kind,'scanned_page/v1');
 assert.equal(input.page.page_number,1);
 assert.equal(input.page.raw_sha256,SHA);
 assert.equal(isTypedD01Carrier(input),true);
});

test('rejects ambiguous source, mixed methods, and caller page mismatch (fail closed)',async()=>{
 await assert.rejects(()=>rebuildD01ResumeInput({query:async()=>[srcRow,srcRow],candidate,request,registry,projectId:PROJECT}),/NOT_UNIQUE/);
 const mixed={...candidate,evidence_refs:[candidate.evidence_refs[0],
   ...buildMethodPlanRefs({methods:[{method_id:'C01',method_version:'v1'}]}),...methodPlan]};
 await assert.rejects(()=>rebuildD01ResumeInput({query,candidate:mixed,request,registry,projectId:PROJECT}),/METHOD_MIXED/);
 const badScopeQuery=async(sql)=>sql.includes('production_runs')?[{scope:JSON.stringify({project_id:PROJECT,page_number:9,source_version_id:SV,original_id:ORIGINAL,raw_sha256:SHA})}]:[srcRow];
 await assert.rejects(()=>rebuildD01ResumeInput({query:badScopeQuery,candidate,request,registry,projectId:PROJECT}),/PAGE_SCOPE/);
});
