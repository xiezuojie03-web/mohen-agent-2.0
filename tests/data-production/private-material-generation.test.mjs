import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPrivateMaterialGenerator} from '../../pipelines/data-production/workers/private-material-generation.mjs';
const id=()=>randomUUID();
function fixture(){
 const root=id(),project=id(),delegationId=id(),source=id(),receipts=[];let calls=0;
 const quote='县志记载古桥。';
 const observation={h_type:'H05',literal_reading:quote,source_voice:'official_gazetteer',evidence_type:'gazetteer_observation',
  research_proposition:'县志中记载古桥；非桥址事实裁决。',uncertainty:{qualification:'UNASSESSED',classification_basis:'县志编纂体例'}};
 const delegation={delegation_id:delegationId,root_task_id:root,project_id:project,request_hash:'a'.repeat(64),
  expires_at:new Date(Date.now()+600000).toISOString(),allowed_actions:['d02_material_observation'],
  transfer_rights_decision:{external_processing:'GRANTED'},currency:'USD',budget_limit:'0.020000'};
 const sent=[];
 const deps={apiKey:'synthetic-key',delegations:{getDelegation:async()=>delegation,listReceipts:async()=>receipts,
  appendVerifiedReceipt:async v=>{const r={receipt_id:id(),delegation_id:delegationId,acceptance_state:'ACCEPT_AS_CANDIDATE',
   cost:v.cost,cost_confidence:v.costConfidence,result_manifest:v.resultManifest};receipts.push(r);return r;},
  appendHeldReceipt:async v=>{const r={receipt_id:id(),acceptance_state:'HOLD',cost:null,cost_confidence:'UNKNOWN',error_code:v.errorCode,result_manifest:v.resultManifest};receipts.push(r);return r;}},
  readSourceRights:async()=>[{source_id:source,rights_by_action:{external_processing:'allowed'}}],
  fetchImpl:async(_url,init)=>{calls++;sent.push(JSON.parse(init.body));
   return Response.json({choices:[{message:{content:JSON.stringify(observation)}}],usage:{prompt_tokens:30,completion_tokens:80}});}};
 const input={run:{run_id:id(),scope:{project_id:project,root_task_id:root}},reading:{source_id:source,read_unit_id:id(),artifact_revision:'b'.repeat(64)},quote,token:'synthetic-owner'};
 return {delegationId,delegation,deps,input,observation,receipts,sent,calls:()=>calls};
}
test('private H05 generation reuses controlled dispatcher, exact root, receipt and paid replay',async()=>{
 const f=fixture(),generate=createPrivateMaterialGenerator({delegationId:f.delegationId,model:'deepseek-flash',deps:f.deps});
 const first=await generate(f.input),second=await generate(f.input);
 assert.equal(first.literal_reading,f.input.quote);assert.equal(first.uncertainty.qualification,'UNASSESSED');
 assert.equal(first.uncertainty.provider_receipt_id,f.receipts[0].receipt_id);
 assert.equal(second.uncertainty.provider_receipt_id,first.uncertainty.provider_receipt_id);
 assert.equal(f.calls(),1);assert.equal(f.receipts.length,1);
});

test('the D02 classification instruction follows the H01-H25 standard, including digital gazetteer entries',async()=>{
 const f=fixture();
 const generate=createPrivateMaterialGenerator({delegationId:f.delegationId,model:'deepseek-flash',deps:f.deps});
 await generate(f.input);
 const system=f.sent[0].messages[0];
 assert.equal(system.role,'system');
 // A single gazetteer entry is an H05 reading unit; a whole-book 序跋凡例 is not required.
 assert.match(system.content,/H01–H25历史材料专业分类与阅读方法/);
 assert.match(system.content,/不因缺少整部志书的序跋凡例而拒判/);
 // A digital gazetteer row is a re-representation, never a separate modern gazetteer.
 assert.match(system.content,/数字方志库或开放数据提取的条目/);
 assert.match(system.content,/来源再表示或索引/);
 assert.match(system.content,/不得因此另记一件"现代方志"/);
 // Voice still must be evidenced, and the quote is never rewritten.
 assert.match(system.content,/确实判不出时返回\{"hold":"classification_unresolved_or_unsupported"\}/);
 assert.match(system.content,/literal_reading必须逐字等于quote/);
});
for(const [label,change,error] of [
 ['foreign root',f=>{f.delegation.root_task_id=id();},/PRIVATE_D02_DELEGATION_SCOPE_INVALID/],
 ['foreign project',f=>{f.delegation.project_id=id();},/PRIVATE_D02_DELEGATION_SCOPE_INVALID/],
 ['missing action',f=>{f.delegation.allowed_actions=[];},/DISPATCH_ACTION_NOT_ALLOWED/],
 ['missing transfer',f=>{f.delegation.transfer_rights_decision={};},/TRANSFER_DENIED/],
 ['source denied',f=>{f.deps.readSourceRights=async()=>[];},/TRANSFER_DENIED/],
 ['budget exhausted',f=>{f.delegation.budget_limit='0.000000';},/HOLD_BUDGET/],
 ['unknown prior cost',f=>{f.receipts.push({acceptance_state:'HOLD',cost:null,cost_confidence:'UNKNOWN'});},/DISPATCH_RECONCILIATION_REQUIRED/],
])test('private generation refuses '+label+' before sending',async()=>{
 const f=fixture();change(f);const generate=createPrivateMaterialGenerator({delegationId:f.delegationId,model:'deepseek-flash',deps:f.deps});
 await assert.rejects(()=>generate(f.input),error);assert.equal(f.calls(),0);
});
test('private generation holds timeout and never silently replays the uncertain attempt',async()=>{
 const f=fixture();f.deps.fetchImpl=async()=>{throw Error('network uncertain');};
 const generate=createPrivateMaterialGenerator({delegationId:f.delegationId,model:'deepseek-flash',deps:f.deps});
 await assert.rejects(()=>generate(f.input),e=>e.code==='DISPATCH_UNCERTAIN');
 assert.equal(f.receipts[0].cost_confidence,'UNKNOWN');
 // 未定费用的尝试按授权时上界计入预算；第二次是新的真实尝试，不是静默重放。
 await assert.rejects(()=>generate(f.input),e=>e.code==='DISPATCH_UNCERTAIN');
 assert.equal(f.receipts.length,2);
});
test('private generation preserves paid receipt but rejects unsupported classification and invented quote',async()=>{
 for(const mutate of [o=>{o.h_type='H21';},o=>{o.literal_reading='invented';},o=>{delete o.uncertainty.classification_basis;}]){
  const f=fixture();mutate(f.observation);
  const generate=createPrivateMaterialGenerator({delegationId:f.delegationId,model:'deepseek-flash',deps:f.deps});
  await assert.rejects(()=>generate(f.input),/PRIVATE_D02_GENERATED_OBSERVATION_INVALID/);
  assert.equal(f.receipts.length,1,'already observed spend survives semantic rejection');
 }
});
