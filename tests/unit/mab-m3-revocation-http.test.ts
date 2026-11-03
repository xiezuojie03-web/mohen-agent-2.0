import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';

const {isOperator}=vi.hoisted(()=>({isOperator:vi.fn()}));
vi.mock('../../apps/web/lib/auth',()=>({
  OPERATOR_COOKIE:'mohen_role',isOperator,
}));
import {POST as governanceRevoke} from '../../apps/web/app/api/governance/gates/revoke/route';
import {POST as rightsInvalidate} from '../../apps/web/app/api/admin/rights/invalidate/route';

const object={object_type:'story_seed',object_id:'123e4567-e89b-42d3-a456-426614174002',reason:'synthetic'};
function post(url:string,payload:object) {
  return new NextRequest('http://localhost'+url,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(payload),
  });
}
describe('M3 legacy revoke HTTP may not report success without independent Reviewer service',()=>{
  beforeEach(()=>{isOperator.mockReset();});
  it.each([
    ['/api/governance/gates/revoke',governanceRevoke],
    ['/api/admin/rights/invalidate',rightsInvalidate],
  ])('returns 503 no-store on %s for even authenticated Operator',async(url,handler)=>{
    isOperator.mockResolvedValue(true);
    const response=await handler(post(url,object) as never);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body=await response.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('INDEPENDENT_GATE_REVOCATION_REQUIRED');
    expect(body.invalidatedGates).toBe(0);
  });
  it.each([
    ['/api/governance/gates/revoke',governanceRevoke],
    ['/api/admin/rights/invalidate',rightsInvalidate],
  ])('rejects non-Operator access on %s',async(url,handler)=>{
    isOperator.mockResolvedValue(false);
    const response=await handler(post(url,object) as never);
    expect(response.status).toBe(403);
    expect((await response.json()).ok).toBe(false);
  });
});
