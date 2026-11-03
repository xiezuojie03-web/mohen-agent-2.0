import {expect,it} from 'vitest';
import * as access from '../../packages/data-access/src/index.mjs';
const factory=()=>{expect(access.createStudioDelegationRepository).toBeTypeOf('function');return access.createStudioDelegationRepository({connect(){throw Error('UNEXPECTED_DATABASE_ACCESS');}});};
it('requires a transactional pool',()=>{expect(access.createStudioDelegationRepository).toBeTypeOf('function');expect(()=>access.createStudioDelegationRepository({})).toThrow('TRANSACTIONAL_APP_POOL_REQUIRED');});
it('rejects malformed delegation before opening a connection',async()=>{await expect(factory().saveDelegation({},'token')).rejects.toThrow('STUDIO_DELEGATION_INVALID');});
it('does not accept a claimed successful or Gate-qualified receipt',async()=>{await expect(factory().appendHeldReceipt({acceptanceState:'ACCEPT_AS_CANDIDATE'},'token')).rejects.toThrow('STUDIO_RECEIPT_HOLD_ONLY');});
it('does not turn unverified provider cost into ACTUAL accounting',async()=>{await expect(factory().appendHeldReceipt({costConfidence:'ACTUAL'},'token')).rejects.toThrow('STUDIO_RECEIPT_COST_VERIFICATION_REQUIRED');});
it('rejects a missing identity without using the pool',async()=>{await expect(factory().getDelegation('00000000-0000-0000-0000-000000000001','')).rejects.toThrow('STUDIO_IDENTITY_REQUIRED');});
