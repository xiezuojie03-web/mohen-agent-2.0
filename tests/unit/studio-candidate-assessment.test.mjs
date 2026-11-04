import {it,expect,vi} from 'vitest';
import {assessStudioReceiptCandidates} from '../../packages/data-access/src/studio-candidate-assessment.mjs';
const id='11111111-1111-4111-8111-111111111111',hash='a'.repeat(64);
const candidate={schema:'mohen.studio-stage-candidate-ref.v1',run_id:id,stage:'D01',job_id:'reading',reviewer_binding_ref:'reviewer-G1',consumer:'producer',object_type:'read_unit',object_id:id,artifact_revision:hash,input_digest:hash,output_digest:hash};
const delegation=()=>({delegation_id:id,request_hash:hash,provider:'fixture',engine_version:'1',expires_at:new Date(Date.now()+60000).toISOString()});
const receipt=()=>({receipt_id:id,delegation_id:id,request_hash:hash,actual_provider:'fixture',actual_engine_version:'1',acceptance_state:'HOLD',cost:null,cost_confidence:'UNKNOWN',candidate_refs:[candidate]});
const proof=()=>({...candidate,schema:'mohen.independent-gate-current-receipt.v1',gate_code:'G1',gate_audit_id:id,qualification_current:true,decision_origin:'independent_gate',result:'PASS',valid_until:new Date(Date.now()+60000).toISOString()});
it('checks each exact candidate but keeps the immutable receipt and whole package HOLD',async()=>{
 const r=receipt(),before=JSON.stringify(r),verify=vi.fn(async()=>proof());
 const result=await assessStudioReceiptCandidates({delegation:delegation(),receipt:r,verifyCurrent:verify});
 expect(result.state).toBe('HOLD');expect(result.items[0].checks.T7).toBe('VERIFIED_CURRENT');
 expect(result.items[0].checks.T2).toBe('NOT_VERIFIED');expect(result.execution_authorized).toBe(false);
 expect(JSON.stringify(r)).toBe(before);expect(result.cost_confidence).toBe('UNKNOWN');expect(result.cost).toBe(null);
 expect(verify).toHaveBeenCalledWith(expect.objectContaining({stage:'D01',gate:'G1',input_digest:hash,output_digest:hash}));
});
it('does not borrow producer qualification for agent consumption or foreign provider/identity',async()=>{
 const verify=vi.fn(async()=>proof());
 for(const r of [{...receipt(),candidate_refs:[{...candidate,consumer:'agent'}]},{...receipt(),request_hash:'b'.repeat(64)},{...receipt(),actual_provider:'foreign'}]){
  const result=await assessStudioReceiptCandidates({delegation:delegation(),receipt:r,verifyCurrent:verify});expect(result.items.every(x=>x.checks.T7!=='VERIFIED_CURRENT')).toBe(true);
 }
 expect(verify).not.toHaveBeenCalled();
});
it('rejects altered object, revision, stage bindings, expired proofs and denied authority per item',async()=>{
 for(const altered of [{object_id:'22222222-2222-4222-8222-222222222222'},{artifact_revision:'changed'},{job_id:'foreign'},{reviewer_binding_ref:'foreign'},{input_digest:'b'.repeat(64)},{output_digest:'b'.repeat(64)},{consumer:'agent'},{valid_until:'2000-01-01'}]){
  const result=await assessStudioReceiptCandidates({delegation:delegation(),receipt:receipt(),verifyCurrent:async()=>({...proof(),...altered})});expect(result.items[0].checks.T7).toBe('GATE_NOT_VALID');
 }
 const verify=vi.fn().mockResolvedValueOnce(proof()).mockRejectedValueOnce(Error('private SQL/secret'));
 const r={...receipt(),candidate_refs:[candidate,candidate]};
 const result=await assessStudioReceiptCandidates({delegation:delegation(),receipt:r,verifyCurrent:verify});
 expect(result.items.map(x=>x.checks.T7)).toEqual(['VERIFIED_CURRENT','GATE_NOT_VALID']);expect(JSON.stringify(result)).not.toContain('private SQL');
});
it('does not cache success; bounds item count and denies expired delegation without calling authority',async()=>{
 const verify=vi.fn().mockResolvedValueOnce(proof()).mockRejectedValueOnce(Error('revoked'));
 const args={delegation:delegation(),receipt:receipt(),verifyCurrent:verify};
 expect((await assessStudioReceiptCandidates(args)).items[0].checks.T7).toBe('VERIFIED_CURRENT');
 expect((await assessStudioReceiptCandidates(args)).items[0].checks.T7).toBe('GATE_NOT_VALID');
 verify.mockClear();await assessStudioReceiptCandidates({...args,delegation:{...delegation(),expires_at:'2000-01-01'}});expect(verify).not.toHaveBeenCalled();
 await expect(assessStudioReceiptCandidates({...args,receipt:{...receipt(),candidate_refs:Array(17).fill(candidate)}})).rejects.toThrow('STUDIO_CANDIDATE_LIMIT');
 expect(verify).not.toHaveBeenCalled();
});
it('bounds stalled authority and does not continue querying after the assessment deadline',async()=>{
 const verify=vi.fn(()=>new Promise(()=>{})),started=Date.now();
 const result=await assessStudioReceiptCandidates({delegation:delegation(),receipt:{...receipt(),candidate_refs:[candidate,candidate]},verifyCurrent:verify,timeoutMs:25});
 expect(Date.now()-started).toBeLessThan(500);expect(result.items.every(x=>x.checks.T7==='GATE_NOT_VALID')).toBe(true);expect(verify).toHaveBeenCalledTimes(1);
});
it('reports an absent verifier as not checked rather than falsely declaring the Gate invalid',async()=>{
 const result=await assessStudioReceiptCandidates({delegation:delegation(),receipt:receipt()});
 expect(result.items[0].checks.T7).toBe('NOT_VERIFIED');expect(result.state).toBe('HOLD');
});
