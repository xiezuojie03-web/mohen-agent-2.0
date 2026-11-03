import { beforeEach, expect, it, vi } from 'vitest';
const deps=vi.hoisted(()=>({
  originalRepository:vi.fn(),originalWorkflow:vi.fn(),
  evidenceBridge:vi.fn(),download:vi.fn(),linkReading:vi.fn(),linkClaim:vi.fn(),
  authorize:vi.fn(),
}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({
  createPrivateOriginalRepository:deps.originalRepository,
  createPrivateOriginalWorkflow:deps.originalWorkflow,
  createEvidenceBridgeRepository:deps.evidenceBridge,
}));
vi.mock('../../pipelines/data-production/orchestrator/execution-authority.mjs',()=>({
  assertStageExecutionAuthorized:deps.authorize,
}));
import { createHash } from 'node:crypto';
import { createBoundPrivateEvidenceStageWorker } from '../../pipelines/data-production/workers/private-evidence-binding.mjs';

const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const bytes=Buffer.from('江南水乡的合成材料。');
const quote='江南水乡';
const originalId='11111111-1111-4111-8111-111111111111';
const pool={connect:vi.fn()};
const storage={readVerified:vi.fn()};
const key='synthetic-m2-private-evidence-hmac-secret';
const extent={kind:'utf8_byte_range/v1',start_byte:0,end_byte:Buffer.byteLength(quote),
 source_version_id:'22222222-2222-4222-8222-222222222222',
 raw_item_id:'33333333-3333-4333-8333-333333333333',
 raw_sha256:hash(bytes),quote_sha256:hash(Buffer.from(quote))};
const input={originalId,extent,quote};
function args(stage:string,content:unknown){
 return {run:{run_id:'run'},job:{stage,job_id:'job'},registry:{status:'ACTIVE_AUTHORIZED'},context:{},input:content,token:'synthetic-user-session'};
}
beforeEach(()=>{
 vi.clearAllMocks();
 deps.authorize.mockResolvedValue(undefined);
 deps.originalRepository.mockReturnValue({marker:'scoped-repository'});
 deps.download.mockResolvedValue({record:{state:'STORED_VERIFIED',content_type:'text/plain',sha256:hash(bytes)},bytes});
 deps.originalWorkflow.mockReturnValue({download:deps.download});
 deps.linkReading.mockResolvedValue({link_id:'bridge-reading',qualification:'UNASSESSED'});
 deps.linkClaim.mockResolvedValue({link_id:'bridge-claim',qualification:'UNASSESSED'});
 deps.evidenceBridge.mockReturnValue({linkReading:deps.linkReading,linkClaim:deps.linkClaim});
});
it('requires a server-side repository, verified object store, and verifier key',()=>{
 expect(()=>createBoundPrivateEvidenceStageWorker({storage,verificationKey:key})).toThrow('PRIVATE_STAGE_DATABASE_REQUIRED');
 expect(()=>createBoundPrivateEvidenceStageWorker({pool,verificationKey:key})).toThrow('PRIVATE_STAGE_VERIFIED_STORAGE_REQUIRED');
 expect(()=>createBoundPrivateEvidenceStageWorker({pool,storage,verificationKey:'short'})).toThrow('PRIVATE_STAGE_BRIDGE_VERIFIER_REQUIRED');
 expect(deps.originalRepository).not.toHaveBeenCalled();
});
it('composes one identical RLS-authorized original readback into D01 and the evidence bridge',async()=>{
 const worker=createBoundPrivateEvidenceStageWorker({pool,storage,verificationKey:key,keyVersion:'test-only'});
 expect(deps.originalRepository).toHaveBeenCalledWith(pool);
 const original=deps.originalWorkflow.mock.calls[0][0];
 expect(original.storage).toBe(storage);
 expect(original.repository).toEqual({marker:'scoped-repository'});
 const options=deps.evidenceBridge.mock.calls[0][1];
 expect(options).toMatchObject({verificationKey:key,keyVersion:'test-only'});
 expect(typeof options.readOriginal).toBe('function');
 const result=await worker.draftTextReading(args('D01',input));
 expect(result.qualification).toBe('UNASSESSED');
 const bridgeRead=await options.readOriginal(originalId,'synthetic-user-session');
 expect(bridgeRead.bytes).toEqual(bytes);
 expect(deps.download).toHaveBeenCalledWith(originalId,'synthetic-user-session');
 expect(deps.download).toHaveBeenCalledTimes(2);
});
it('rejects a missing execution grant before touching private bytes or the evidence bridge',async()=>{
 const worker=createBoundPrivateEvidenceStageWorker({pool,storage,verificationKey:key});
 deps.authorize.mockRejectedValueOnce(new Error('EXECUTION_SIGNED_GRANT_MISSING'));
 await expect(worker.draftTextReading(args('D01',input))).rejects.toThrow('EXECUTION_SIGNED_GRANT_MISSING');
 expect(deps.download).not.toHaveBeenCalled();
 expect(deps.linkReading).not.toHaveBeenCalled();
});
it('passes D02 and D03 candidates to the existing evidence bridge, never grants a Gate PASS',async()=>{
 const worker=createBoundPrivateEvidenceStageWorker({pool,storage,verificationKey:key});
 const d02={originalId,evidenceId:'evidence',readUnitId:'read',extent,quote,extentOrder:1};
 const d03={originalId,evidenceId:'evidence',claimRevisionId:'revision',supportType:'supports'};
 expect((await worker.linkReading(args('D02',d02))).qualification).toBe('UNASSESSED');
 expect((await worker.linkClaim(args('D03',d03))).qualification).toBe('UNASSESSED');
 expect(deps.linkReading).toHaveBeenCalledWith(d02,'synthetic-user-session');
 expect(deps.linkClaim).toHaveBeenCalledWith(d03,'synthetic-user-session');
});
