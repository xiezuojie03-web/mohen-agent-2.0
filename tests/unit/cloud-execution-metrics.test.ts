import {beforeEach,expect,it,vi} from 'vitest';
const fx=vi.hoisted(()=>({operator:vi.fn(),query:vi.fn()}));
vi.mock('../../apps/web/lib/auth',()=>({OPERATOR_COOKIE:'mohen_role',isOperator:fx.operator}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({queryValue:fx.query}));
import {GET} from '../../apps/web/app/api/admin/metrics/route';
const req={cookies:{get:()=>({value:'synthetic-session'})}};
beforeEach(()=>{vi.clearAllMocks();fx.operator.mockResolvedValue(true);fx.query.mockResolvedValue('0');});
it('operator metrics expose configuration gaps without declaring runtime qualification',async()=>{
  const r=await GET(req as never);const d=await r.json();
  expect(r.headers.get('cache-control')).toContain('no-store');
  expect(d.execution_readiness).toMatchObject({runtime_verified:false,gate_qualification:'NOT_VERIFIED'});
  expect(Object.keys(d.execution_readiness.machine_variable_presence)).toHaveLength(4);
  expect(Object.values(d.execution_readiness.machine_variable_presence).every(value=>typeof value==='boolean')).toBe(true);
  expect(d.execution_readiness.components.some((c:{id:string})=>c.id==='independent_gate')).toBe(true);
});
it('anonymous and non-operator callers cannot inspect execution configuration',async()=>{
  fx.operator.mockResolvedValue(false);const r=await GET(req as never);
  expect(r.status).toBe(403);expect(fx.query).not.toHaveBeenCalled();
  expect(await r.json()).not.toHaveProperty('execution_readiness');
});
