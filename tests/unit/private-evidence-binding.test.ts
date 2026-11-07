import { beforeEach, expect, it, vi } from 'vitest';
const deps=vi.hoisted(()=>({
  originalRepository:vi.fn(),originalWorkflow:vi.fn(),
  evidenceBridge:vi.fn(),sourceVerifier:vi.fn(),sourceBinding:vi.fn(),download:vi.fn(),linkReading:vi.fn(),linkClaim:vi.fn(),
  authorize:vi.fn(),handoff:vi.fn(),readingRepository:vi.fn(),persistReading:vi.fn(),
  pageReadingRepository:vi.fn(),persistPageReading:vi.fn(),
  registrationRepository:vi.fn(),registrationLookup:vi.fn(),
}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({
  createPrivateOriginalRepository:deps.originalRepository,
  createPrivateOriginalWorkflow:deps.originalWorkflow,
  createEvidenceBridgeRepository:deps.evidenceBridge,
  createPrivateOriginalSourceVerifier:deps.sourceVerifier,
  createPrivateTextReadingRepository:deps.readingRepository,
  createPrivateScannedPageReadingRepository:deps.pageReadingRepository,
  createPrivateSourceRegistrationRepository:deps.registrationRepository,
}));
vi.mock('../../pipelines/data-production/orchestrator/execution-authority.mjs',()=>({
  assertStageExecutionAuthorized:deps.authorize,
  consumeAuthorizedStageHandoff:deps.handoff,
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
 deps.handoff.mockReset().mockReturnValue(false);
 deps.authorize.mockImplementation(async()=>{deps.handoff.mockReturnValueOnce(true);});
 deps.originalRepository.mockReturnValue({marker:'scoped-repository'});
 deps.download.mockResolvedValue({record:{state:'STORED_VERIFIED',content_type:'text/plain',sha256:hash(bytes)},bytes});
 deps.originalWorkflow.mockReturnValue({download:deps.download});
 deps.linkReading.mockResolvedValue({link_id:'bridge-reading',qualification:'UNASSESSED'});
 deps.linkClaim.mockResolvedValue({link_id:'bridge-claim',qualification:'UNASSESSED'});
 deps.evidenceBridge.mockReturnValue({linkReading:deps.linkReading,linkClaim:deps.linkClaim});
 deps.sourceBinding.mockResolvedValue(true);
 deps.sourceVerifier.mockReturnValue(deps.sourceBinding);
 deps.persistReading.mockResolvedValue({read_run_id:originalId,read_unit_id:originalId,
   artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'});
 deps.readingRepository.mockReturnValue({save:deps.persistReading});
 deps.persistPageReading.mockResolvedValue({read_run_id:originalId,read_unit_id:originalId,
   artifact_revision:'a'.repeat(64),request_digest:'b'.repeat(64),qualification:'UNASSESSED'});
 deps.pageReadingRepository.mockReturnValue({save:deps.persistPageReading});
 deps.registrationLookup.mockResolvedValue({schema:'mohen.private-source-registration.v1',
   original_id:originalId,project_id:'44444444-4444-4444-8444-444444444444',
   source_id:'55555555-5555-4555-8555-555555555555',source_version_id:extent.source_version_id,
   raw_item_id:extent.raw_item_id,sha256:hash(bytes),byte_size:bytes.length,content_type:'image/jpeg',
   provider:'NAJ',title:'松江府志7',source_type:'gazetteer',carrier_type:'scanned_page',
   rights:{status:'public_domain_secondary_use'},asset_revision_id:'66666666-6666-4666-8666-666666666666',
   artifact_revision:'c'.repeat(64)});
 deps.registrationRepository.mockReturnValue({lookup:deps.registrationLookup});
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
 expect(deps.sourceVerifier).toHaveBeenCalledWith(pool);
 const original=deps.originalWorkflow.mock.calls[0][0];
 expect(original.storage).toBe(storage);
 expect(original.repository).toEqual({marker:'scoped-repository'});
 const options=deps.evidenceBridge.mock.calls[0][1];
 expect(options).toMatchObject({verificationKey:key,keyVersion:'test-only'});
 expect(typeof options.readOriginal).toBe('function');
 expect(deps.readingRepository).toHaveBeenCalledWith(pool,{verificationKey:key,keyVersion:'test-only'});
 const result=await worker.draftTextReading(args('D01',input));
 expect(result.qualification).toBe('UNASSESSED');
 const bridgeRead=await options.readOriginal(originalId,'synthetic-user-session');
 expect(bridgeRead.bytes).toEqual(bytes);
 expect(deps.sourceBinding).toHaveBeenCalledWith({originalId,
   sourceVersionId:extent.source_version_id,rawItemId:extent.raw_item_id,rawSha256:extent.raw_sha256},'synthetic-user-session');
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

it('cannot turn a wrong private source binding into a D01 candidate',async()=>{
 deps.sourceBinding.mockResolvedValueOnce(false);
 const worker=createBoundPrivateEvidenceStageWorker({pool,storage,verificationKey:key});
 await expect(worker.draftTextReading(args('D01',input)))
   .rejects.toThrow('PRIVATE_READING_SOURCE_NOT_BOUND');
 expect(deps.download).not.toHaveBeenCalled();
 expect(deps.linkReading).not.toHaveBeenCalled();
});
it('composes D00 source intake through the registration lookup',async()=>{
 const worker=createBoundPrivateEvidenceStageWorker({pool,storage,verificationKey:key,keyVersion:'test-only'});
 expect(deps.registrationRepository).toHaveBeenCalledWith(pool);
 deps.download.mockResolvedValue({record:{original_id:originalId,
   project_id:'44444444-4444-4444-8444-444444444444',
   state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:hash(bytes),byte_size:bytes.length},bytes});
 const result=await worker.verifySourceIntake(args('D00',{research_intent:'松江府田赋',
   scope:{project_id:'44444444-4444-4444-8444-444444444444',original_id:originalId,page_number:35}}));
 expect(result.qualification).toBe('UNASSESSED');
 expect(result.gate_code).toBe('G0');
 expect(result.candidate_kind).toBe('private_source_intake');
 expect(result.rights).toEqual({status:'public_domain_secondary_use'});
 expect(deps.registrationLookup).toHaveBeenCalledWith(originalId,'synthetic-user-session');
 expect(deps.sourceBinding).toHaveBeenCalledWith({originalId,
   sourceVersionId:extent.source_version_id,rawItemId:extent.raw_item_id,rawSha256:hash(bytes)},
   'synthetic-user-session');
});
it('composes the scanned-page reader for C02 page requests, never the text reader',async()=>{
 const worker=createBoundPrivateEvidenceStageWorker({pool,storage,verificationKey:key,keyVersion:'test-only'});
 expect(deps.pageReadingRepository).toHaveBeenCalledWith(pool,{verificationKey:key,keyVersion:'test-only'});
 deps.download.mockResolvedValue({record:{original_id:originalId,
   project_id:'44444444-4444-4444-8444-444444444444',
   state:'STORED_VERIFIED',content_type:'image/jpeg',sha256:hash(bytes),byte_size:bytes.length},bytes});
 const page={kind:'scanned_page/v1',page_number:35,
   source_version_id:extent.source_version_id,raw_item_id:extent.raw_item_id,
   raw_sha256:hash(bytes),page_sha256:hash(bytes)};
 const result=await worker.readScannedPage(args('D01',{originalId,page}));
 expect(result.qualification).toBe('UNASSESSED');
 expect(result.gate_code).toBe('G1');
 expect(result.candidate_kind).toBe('private_scanned_page_reading');
 expect(result.read_unit_id).toBe(originalId);
 expect(deps.persistPageReading).toHaveBeenCalledTimes(1);
 expect(deps.persistReading).not.toHaveBeenCalled();
});
