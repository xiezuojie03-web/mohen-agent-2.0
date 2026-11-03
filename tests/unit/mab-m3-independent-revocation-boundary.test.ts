import {beforeEach,describe,expect,it,vi} from 'vitest';

const {run,queryValue}=vi.hoisted(()=>({run:vi.fn(),queryValue:vi.fn()}));
vi.mock('@mohen/data-access',()=>({run,queryValue}));
import {revokeGate} from '../../apps/web/lib/gate-revoke';

describe('M3 legacy Operator revoke entry is fail closed',()=>{
  beforeEach(()=>{run.mockReset();queryValue.mockReset();});
  it('refuses legacy object-only revocation; never writes signed history or current qualification',async()=>{
    const result=await revokeGate({
      objectType:'story_seed',
      objectId:'123e4567-e89b-42d3-a456-426614174002',
      reason:'synthetic rights change',
    });
    expect(result).toEqual({
      ok:false,reason:'INDEPENDENT_GATE_REVOCATION_REQUIRED',invalidatedGates:0,
    });
    expect(run).not.toHaveBeenCalled();
    expect(queryValue).not.toHaveBeenCalled();
  });
  it('rejects incomplete inputs without any database mutation',async()=>{
    await expect(revokeGate({objectType:'',objectId:''})).resolves.toEqual({
      ok:false,reason:'object_required',invalidatedGates:0,
    });
    expect(run).not.toHaveBeenCalled();
    expect(queryValue).not.toHaveBeenCalled();
  });
});
