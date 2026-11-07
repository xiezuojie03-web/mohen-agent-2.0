import {expect,it} from 'vitest';
const access=await import('../../packages/data-access/src/studio-execution-repository.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const id='00000000-0000-0000-0000-000000000001';
const factory=()=>{expect(access.createStudioExecutionRepository).toBeTypeOf('function');return access.createStudioExecutionRepository({connect(){throw Error('UNEXPECTED_DATABASE_ACCESS');}});};
it('requires a transactional connection before exposing execution controls',()=>{expect(access.createStudioExecutionRepository).toBeTypeOf('function');expect(()=>access.createStudioExecutionRepository({})).toThrow('TRANSACTIONAL_APP_POOL_REQUIRED');});
it('rejects missing identity before database access',async()=>{await expect(factory().getState(id,'')).rejects.toThrow('STUDIO_IDENTITY_REQUIRED');});
it('rejects malformed execution ids before database access',async()=>{await expect(factory().getState('other','token')).rejects.toThrow('STUDIO_ID_INVALID');});
it('rejects malformed lease and CAS inputs before database access',async()=>{await expect(factory().claim({delegationId:id,requestId:id,expectedVersion:-1,ownerRef:'worker',inputDigest:'a'.repeat(64),policyVersion:'p1',leaseSeconds:20},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');});
it('rejects purported spend grants and unknown checkpoint states',async()=>{await expect(factory().checkpoint({delegationId:id,requestId:id,expectedVersion:0,leaseId:id,state:'SPEND_AUTHORIZED',inputDigest:'a'.repeat(64),policyVersion:'p1',payload:{}},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');});
it('rejects malformed revocation before database access',async()=>{await expect(factory().revoke({delegationId:id,requestId:id,reason:''},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');});
it('rejects unserializable and oversized evidence before database access',async()=>{const payload={};payload.self=payload;await expect(factory().checkpoint({delegationId:id,requestId:id,expectedVersion:0,leaseId:id,state:'HOLD',inputDigest:'a'.repeat(64),policyVersion:'p1',payload},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');});

it('requires a bounded lease, ISO currency and pricing policy for spend reservation',async()=>{
 const repo=factory(),base={delegationId:id,requestId:id,expectedVersion:0,leaseId:id,inputDigest:'a'.repeat(64),policyVersion:'p1',amount:'1.250000',currency:'USD',pricingPolicyVersion:'deepseek-2026-11'};
 await expect(repo.reserveBudget(base,'')).rejects.toThrow('STUDIO_IDENTITY_REQUIRED');
 await expect(repo.reserveBudget({...base,amount:'1.0000000'},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');
 await expect(repo.reserveBudget({...base,amount:'-1.00'},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');
 await expect(repo.reserveBudget({...base,currency:'usd'},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');
 await expect(repo.reserveBudget({...base,leaseId:'bad'},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');
});
it('requires an exact optional lease identity for safe pre-dispatch budget release',async()=>{
 const repo=factory(),base={delegationId:id,requestId:id,expectedVersion:0,leaseId:id,inputDigest:'a'.repeat(64),policyVersion:'p1',reason:'Provider call never started'};
 await expect(repo.releaseBudget(base,'')).rejects.toThrow('STUDIO_IDENTITY_REQUIRED');
 await expect(repo.releaseBudget({...base,leaseId:'bad'},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');
 await expect(repo.releaseBudget({...base,leaseId:null,reason:''},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');
});
it('accepts only a persisted receipt reference for cost reconciliation',async()=>{
 const repo=factory(),base={delegationId:id,requestId:id,expectedVersion:0,inputDigest:'a'.repeat(64),policyVersion:'p1',receiptId:id};
 await expect(repo.reconcileCost(base,'')).rejects.toThrow('STUDIO_IDENTITY_REQUIRED');
 await expect(repo.reconcileCost({...base,receiptId:'bad'},'token')).rejects.toThrow('STUDIO_EXECUTION_INVALID');
});
