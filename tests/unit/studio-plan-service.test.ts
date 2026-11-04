import {it,expect,vi} from 'vitest';
import {saveStudioResearchPlan} from '../../apps/web/lib/studio-plans';
const project='11111111-1111-4111-8111-111111111111',asset='22222222-2222-4222-8222-222222222222',actor='33333333-3333-4333-8333-333333333333';
const input=()=>({project_id:project,asset_id:asset,root_task_ref:asset,series_id:asset,request_id:asset,question:'检验桥边市场来源',source_revision_ids:[asset],expires_at:new Date(Date.now()+3600000).toISOString()});
const stores=()=>({assets:{getRevision:vi.fn(async()=>({revision_id:asset,asset_id:asset,project_id:project,content_hash:'a'.repeat(64)})),saveRevision:vi.fn(async(v:any)=>({revision_id:asset,...v}))},delegations:{saveDelegation:vi.fn(async(v:any)=>({delegation_id:asset,request_hash:'a'.repeat(64),...v}))},registry:{architecture_generation:'mohen.six-stage.v1',activation:{enabled:false},jobs:[]}});
it('stores a frozen Owner plan and permanent envelope without executing or inventing future outputs',async()=>{
 const s=stores(),r=await saveStudioResearchPlan(s,input(),{actorId:actor,token:'signed-owner'});
 expect(r.execution_authorized).toBe(false);expect(r.state).toBe('HOLD');
 const saved=s.assets.saveRevision.mock.calls[0][0];expect(saved.kind).toBe('research_brief');
 expect(saved.payload.plan.actor_id).toBe(actor);expect(saved.payload.plan.budget.amount).toBe('0');
 expect(saved.payload.plan.nodes.some((n:any)=>n.tool_id==='production-run')).toBe(true);
 expect(saved.payload.plan.nodes.every((n:any)=>!n.output_hash)).toBe(true);
 expect(s.delegations.saveDelegation.mock.calls[0][0]).toMatchObject({projectId:project,rootTaskRef:asset,budgetLimit:'0',transferRightsDecision:{external_processing:'DENIED'}});
});
it('refuses foreign source and client budget/policy/actor overrides before saving',async()=>{
 const s=stores();s.assets.getRevision.mockResolvedValue(null as never);
 await expect(saveStudioResearchPlan(s,input(),{actorId:actor,token:'signed-owner'})).rejects.toThrow('STUDIO_SOURCE_NOT_FOUND');
 expect(s.assets.saveRevision).not.toHaveBeenCalled();
 for(const extra of [{budget_limit:'10'},{actor_id:asset},{adapter_url:'https://invalid/code.js'},{policy_ref:{revision:'fake'}}])await expect(saveStudioResearchPlan(stores(),{...input(),...extra},{actorId:actor,token:'signed-owner'})).rejects.toThrow('STUDIO_PLAN_REQUEST_INVALID');
});
it('retry uses the same identity/hash/snapshot and never treats partial persistence as execution success',async()=>{
 const s=stores(),v=input();s.delegations.saveDelegation.mockRejectedValueOnce(Error('storage unavailable'));
 await expect(saveStudioResearchPlan(s,v,{actorId:actor,token:'signed-owner'})).rejects.toThrow('storage unavailable');
 const result=await saveStudioResearchPlan(s,v,{actorId:actor,token:'signed-owner'});expect(result.state).toBe('HOLD');
 expect(s.assets.saveRevision.mock.calls[0]).toEqual(s.assets.saveRevision.mock.calls[1]);
 expect(s.delegations.saveDelegation.mock.calls[0]).toEqual(s.delegations.saveDelegation.mock.calls[1]);
});

it('binds durable envelope to exact asset/request even when the logical DAG hash is shared',async()=>{
 const s=stores(),v=input();await saveStudioResearchPlan(s,v,{actorId:actor,token:'owner'});
 expect(s.assets.saveRevision.mock.calls[0][0].payload).toMatchObject({request_id:v.request_id,delegation_series_id:v.series_id});
 expect(s.delegations.saveDelegation.mock.calls[0][0].rootTaskSnapshot).toMatchObject({plan_asset_id:v.asset_id,request_id:v.request_id});
});
it('retains the exact registration request in the private plan before a partial envelope failure',async()=>{
 const s=stores(),v=input();s.delegations.saveDelegation.mockRejectedValue(Error('write failed'));
 await expect(saveStudioResearchPlan(s,v,{actorId:actor,token:'owner'})).rejects.toThrow('write failed');
 expect(s.assets.saveRevision.mock.calls[0][0].payload.plan_request).toEqual(v);
});
