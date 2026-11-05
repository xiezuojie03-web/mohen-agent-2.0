import {beforeEach,describe,expect,it,vi} from 'vitest';

const {run,queryValue,operator}=vi.hoisted(()=>({run:vi.fn(),queryValue:vi.fn(),operator:vi.fn()}));
vi.mock('../../apps/web/lib/auth',()=>({OPERATOR_COOKIE:'operator',isOperator:operator}));
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

it('returns unavailable and no-store for Operator asset invalidation, forbidding other roles',async()=>{
 const {POST}=await import('../../apps/web/app/api/admin/assets/[id]/invalidation-requests/route');
 const req={cookies:{get:()=>({value:'session'})}} as any;
 operator.mockResolvedValue(true);
 const r=await POST(req,{params:Promise.resolve({id:'asset'})});
 expect(r.status).toBe(503);expect(r.headers.get('cache-control')).toBe('no-store');
 expect((await r.json()).reason).toBe('INDEPENDENT_GATE_REVOCATION_REQUIRED');
 operator.mockResolvedValue(false);
 expect((await POST(req,{params:Promise.resolve({id:'asset'})})).status).toBe(403);
 expect(run).not.toHaveBeenCalled();
});
