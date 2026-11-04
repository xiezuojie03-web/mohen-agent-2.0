// Read-only recheck of an immutable, Owner-scoped receipt. Not candidate
// acceptance, external dispatch, Agent permission, a seventh Gate or accounting.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const field=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128;
const exact=['run_id','stage','job_id','reviewer_binding_ref','consumer','object_type','object_id','artifact_revision','input_digest','output_digest'];
function validCandidate(c){return c?.schema==='mohen.studio-stage-candidate-ref.v1'&&UUID.test(c.run_id??'')&&UUID.test(c.object_id??'')&&
 /^D0[0-5]$/.test(c.stage??'')&&c.consumer==='producer'&&['job_id','reviewer_binding_ref','object_type','artifact_revision'].every(k=>field(c[k]))&&
 SHA.test(c.input_digest??'')&&SHA.test(c.output_digest??'');}
export async function assessStudioReceiptCandidates({delegation,receipt,verifyCurrent,timeoutMs=5000}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('STUDIO_ASSESSMENT_TIMEOUT_INVALID');
 const deadline=Date.now()+timeoutMs;
 if(!delegation||!receipt||!Array.isArray(receipt.candidate_refs))throw Error('STUDIO_RECEIPT_INVALID');
 // Snapshot before awaiting the authority; untrusted callers cannot swap refs.
 const refs=structuredClone(receipt.candidate_refs);
 if(refs.length>16)throw Error('STUDIO_CANDIDATE_LIMIT');
 const bound=UUID.test(delegation.delegation_id??'')&&receipt.delegation_id===delegation.delegation_id&&
 SHA.test(delegation.request_hash??'')&&receipt.request_hash===delegation.request_hash&&
 receipt.actual_provider===delegation.provider&&receipt.actual_engine_version===delegation.engine_version&&
 Number.isFinite(Date.parse(delegation.expires_at))&&Date.parse(delegation.expires_at)>Date.now();
 const items=[];
 for(let index=0;index<refs.length;index++){
  const c=refs[index],checks={T1:bound&&validCandidate(c)?'BINDING_MATCHED':'BINDING_NOT_VERIFIED',
   T2:'NOT_VERIFIED',T3:'NOT_VERIFIED',T4:'NOT_VERIFIED',T5:'NOT_VERIFIED',T6:'NOT_VERIFIED',T7:typeof verifyCurrent==='function'?'GATE_NOT_VALID':'NOT_VERIFIED'};
  if(checks.T1==='BINDING_MATCHED'&&typeof verifyCurrent==='function'&&Date.now()<deadline){
   let timer;
   try{
    const request={run:{run_id:c.run_id},job:{job_id:c.job_id,stage:c.stage,
     implementation:{gate_reviewer_binding:c.reviewer_binding_ref}},stage:c.stage,gate:'G'+c.stage.slice(-1),
     input_digest:c.input_digest,output_digest:c.output_digest};
    const p=await Promise.race([Promise.resolve().then(()=>verifyCurrent(request)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('ASSESSMENT_TIMEOUT')),Math.max(1,deadline-Date.now()));})]);
    if(p?.schema==='mohen.independent-gate-current-receipt.v1'&&p.qualification_current===true&&
     p.decision_origin==='independent_gate'&&p.result==='PASS'&&UUID.test(p.gate_audit_id??'')&&
     p.gate_code==='G'+c.stage.slice(-1)&&exact.every(k=>p[k]===c[k])&&
     Number.isFinite(Date.parse(p.valid_until))&&Date.parse(p.valid_until)>Date.now()&&
     Date.parse(delegation.expires_at)>Date.now()&&Date.now()<deadline)checks.T7='VERIFIED_CURRENT';
   }catch{/* Fail closed per item, with no raw provider/database error echo. */}
   finally{clearTimeout(timer);}
  }
  items.push({index,state:'hold',checks});
 }
 return {schema:'mohen.studio-candidate-assessment.v1',receipt_id:receipt.receipt_id,state:'HOLD',
  execution_authorized:false,knowledge_use_authorized:false,cost:receipt.cost,cost_confidence:receipt.cost_confidence,items};
}
