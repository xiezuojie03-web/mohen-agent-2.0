import {beforeEach,expect,it,vi} from 'vitest';
const auth=vi.hoisted(()=>({check:vi.fn(),handoff:vi.fn()}));
vi.mock('../../pipelines/data-production/orchestrator/execution-authority.mjs',()=>({
 assertStageExecutionAuthorized:auth.check,
  consumeAuthorizedStageHandoff:auth.handoff,
}));
import {createHash} from 'node:crypto';
import {createPrivateEvidenceStageWorker} from '../../pipelines/data-production/workers/private-evidence-stage.mjs';
import {buildMethodPlanRefs} from '../../packages/data-access/src/method-plan-ref.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=Buffer.from('桥边有市。\n这是合成材料。');
const quote='桥边有市。';
const originalId='11111111-1111-4111-8111-111111111111';
const extent={kind:'utf8_byte_range/v1',start_byte:0,end_byte:Buffer.byteLength(quote),
 raw_sha256:sha(bytes),quote_sha256:sha(Buffer.from(quote)),
 source_version_id:'22222222-2222-4222-8222-222222222222',raw_item_id:'33333333-3333-4333-8333-333333333333'};
const readOriginal=vi.fn(),linkReading=vi.fn(),linkClaim=vi.fn(),verifySourceBinding=vi.fn(),persistReading=vi.fn();
const submitGateCandidate=vi.fn(),readGateAudit=vi.fn(),readApprovedMethodPlan=vi.fn();
// G0 已批准的消费者方法预选：C01（文本读）与 C02（扫页读）都在计划内。
const approvedPlan={gate_audit_id:'audit-g0',refs:buildMethodPlanRefs({methods:[
 {method_id:'C01',method_version:'v1'},{method_id:'C02',method_version:'v1'}]})};
const worker=createPrivateEvidenceStageWorker({readOriginal,bridge:{linkReading,linkClaim},verifySourceBinding,persistReading,submitGateCandidate,readGateAudit,readApprovedMethodPlan});
const base=(stage,input)=>({run:{run_id:'r',scope:{project_id:'44444444-4444-4444-8444-444444444444'}},job:{stage,job_id:'j'},registry:{status:'ACTIVE_AUTHORIZED'},context:{},input,token:'synthetic-actor-session'});
beforeEach(()=>{vi.clearAllMocks();auth.handoff.mockReset().mockReturnValue(false);auth.check.mockImplementation(async()=>{auth.handoff.mockReturnValueOnce(true);});verifySourceBinding.mockResolvedValue(true);
 submitGateCandidate.mockResolvedValue('candidate-1');readGateAudit.mockResolvedValue(null);
 readApprovedMethodPlan.mockResolvedValue(approvedPlan);
 readOriginal.mockResolvedValue({record:{state:'STORED_VERIFIED',content_type:'text/plain',sha256:sha(bytes)},bytes});
 linkReading.mockResolvedValue({link_id:'link-1',qualification:'UNASSESSED'});
 linkClaim.mockResolvedValue({link_id:'link-2',qualification:'UNASSESSED'});
 persistReading.mockResolvedValue({read_run_id:originalId,read_unit_id:originalId,artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'});
});
it('requires an independent stage grant before any private original read',async()=>{
 auth.check.mockRejectedValueOnce(new Error('EXECUTION_SIGNED_GRANT_MISSING'));
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote}))).rejects.toThrow('EXECUTION_SIGNED_GRANT_MISSING');
 expect(readOriginal).not.toHaveBeenCalled();
});
it('binds a D01 candidate to exact UTF8 bytes, never signs G1',async()=>{
 const result=await worker.draftTextReading(base('D01',{originalId,extent,quote}));
 expect(result).toMatchObject({gate_code:'G1',qualification:'UNASSESSED',original_id:originalId,extent,raw_sha256:sha(bytes)});
 expect(result.read_unit_id).toBe(originalId);
 expect(persistReading).toHaveBeenCalledWith(expect.objectContaining({runId:'r',originalId,extent,quote,bytes}),'synthetic-actor-session');
 expect(auth.check).toHaveBeenCalledWith(expect.objectContaining({input:{originalId,extent,quote}}));
});
it('cannot acknowledge D01 without durable L1 persistence or with a self-qualified persistence result',async()=>{
 const unbound=createPrivateEvidenceStageWorker({readOriginal,bridge:{linkReading,linkClaim},verifySourceBinding,submitGateCandidate,readGateAudit});
 await expect(unbound.draftTextReading(base('D01',{originalId,extent,quote}))).rejects.toThrow('PRIVATE_READING_PERSISTENCE_REQUIRED');
 persistReading.mockResolvedValueOnce({qualification:'PASS'});
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote}))).rejects.toThrow('PRIVATE_READING_NOT_PERSISTED');
});
it('refuses mutated quotes, mid-character offsets, fake hash and wrong original state',async()=>{
 await expect(worker.draftTextReading(base('D01',{originalId,extent:{...extent,start_byte:1},quote}))).rejects.toThrow('PRIVATE_READING_QUOTE_MISMATCH');
 await expect(worker.draftTextReading(base('D01',{originalId,extent:{...extent,raw_sha256:'a'.repeat(64)},quote}))).rejects.toThrow('PRIVATE_READING_ORIGINAL_UNVERIFIED');
 readOriginal.mockResolvedValueOnce({record:{state:'PENDING',content_type:'text/plain',sha256:sha(bytes)},bytes});
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote}))).rejects.toThrow('PRIVATE_READING_ORIGINAL_UNVERIFIED');
});
it('refuses to read before G0 has approved a consumer method plan',async()=>{
 readApprovedMethodPlan.mockResolvedValueOnce(null);
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote})))
  .rejects.toThrow('PRIVATE_D01_G0_METHOD_PLAN_NOT_APPROVED');
 expect(readOriginal).not.toHaveBeenCalled();
});
it('refuses a read method that the approved plan does not cover',async()=>{
 readApprovedMethodPlan.mockResolvedValueOnce({gate_audit_id:'audit-g0',
  refs:buildMethodPlanRefs({methods:[{method_id:'C02',method_version:'v1'}]})});
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote})))
  .rejects.toThrow('PRIVATE_D01_METHOD_NOT_PLANNED:C01');
 expect(readOriginal).not.toHaveBeenCalled();
});
it('refuses a handoff whose carried plan differs from the approved one, and accepts the exact match',async()=>{
 const carriedOnlyC02=buildMethodPlanRefs({methods:[{method_id:'C02',method_version:'v1'}]});
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote,method_plan:carriedOnlyC02})))
  .rejects.toThrow('PRIVATE_D01_METHOD_PLAN_MISMATCH');
 expect(readOriginal).not.toHaveBeenCalled();
 const result=await worker.draftTextReading(base('D01',{originalId,extent,quote,method_plan:approvedPlan.refs}));
 expect(result.method_plan_approval).toMatchObject({gate_audit_id:'audit-g0',method_id:'C01',method_version:'v1'});
});
it('D02 uses only the existing byte-attested bridge, not an invented Gate decision',async()=>{
 const input={originalId,evidenceId:'e1',readUnitId:'u1',extent,quote,extentOrder:1};
 const result=await worker.linkReading(base('D02',input));
 expect(linkReading).toHaveBeenCalledWith(input,'synthetic-actor-session');
 expect(result).toEqual({stage:'D02',candidate_kind:'private_read_evidence_link',link_id:'link-1',
  qualification:'UNASSESSED',gate_code:'G2'});
});
it('D03 binds exact claim revision but cannot self-qualify',async()=>{
 const input={originalId,evidenceId:'e1',claimRevisionId:'rev1',supportType:'supports'};
 expect(await worker.linkClaim(base('D03',input))).toEqual({
  stage:'D03',candidate_kind:'private_claim_revision_evidence_link',link_id:'link-2',
  claim_revision_id:'rev1',qualification:'UNASSESSED',gate_code:'G3'});
});
it('stops wrong stages and a failed authorization before touching bridge',async()=>{
 await expect(worker.linkReading(base('D03',{originalId}))).rejects.toThrow('PRIVATE_STAGE_MISMATCH');
 auth.check.mockRejectedValueOnce(new Error('EXECUTION_LIVE_AUTHORITY_NOT_CONFIRMED'));
 await expect(worker.linkClaim(base('D03',{originalId}))).rejects.toThrow('EXECUTION_LIVE_AUTHORITY_NOT_CONFIRMED');
 expect(linkReading).not.toHaveBeenCalled();expect(linkClaim).not.toHaveBeenCalled();
});
it('fails closed if bridge tries to report PASS rather than an unassessed candidate',async()=>{
 linkReading.mockResolvedValueOnce({link_id:'link-1',qualification:'PASS'});
 await expect(worker.linkReading(base('D02',{originalId}))).rejects.toThrow('PRIVATE_BRIDGE_INVALID_RESULT');
});

it('refuses fabricated source identities before reading original bytes',async()=>{
 verifySourceBinding.mockResolvedValueOnce(false);
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote})))
   .rejects.toThrow('PRIVATE_READING_SOURCE_NOT_BOUND');
 expect(readOriginal).not.toHaveBeenCalled();
 expect(verifySourceBinding).toHaveBeenCalledWith({
   originalId,sourceVersionId:extent.source_version_id,
   rawItemId:extent.raw_item_id,rawSha256:extent.raw_sha256,
 },'synthetic-actor-session');
});
it('refuses syntactically invalid raw/source identities before a DB lookup',async()=>{
 await expect(worker.draftTextReading(base('D01',{originalId,extent:{...extent,raw_item_id:'not-a-uuid'},quote})))
  .rejects.toThrow('PRIVATE_READING_LOCATOR_INVALID');
 expect(verifySourceBinding).not.toHaveBeenCalled();
 expect(readOriginal).not.toHaveBeenCalled();
});
it('forwards source verifier database denial, never falling back to quote-only evidence',async()=>{
 verifySourceBinding.mockRejectedValueOnce(new Error('permission denied for source.raw_items'));
 await expect(worker.draftTextReading(base('D01',{originalId,extent,quote})))
  .rejects.toThrow('permission denied');
 expect(readOriginal).not.toHaveBeenCalled();
});
