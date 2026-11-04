import { describe, expect, it } from 'vitest';
import * as api from '../../packages/agent-runtime/src/studio-plan.mjs';

const uuid = '00000000-0000-4000-8000-000000000001';
const hash = 'a'.repeat(64);
const node = (id, dependencies = [], category = 'reuse_asset') => ({ node_id: id, tool_id: category === 'external_delegate' ? 'external-provider' : 'retrieve-local', category, dependencies, input_schema: { type: 'object' }, output_schema: { type: 'object' }, input_hash: hash, output_hash: hash });
const input = (nodes = [node('a')]) => ({ schema_version: 1, root_task_id: uuid, project_id: uuid, actor_id: uuid, policy_ref: { ref: 'policy', revision: 'v1' }, registry_ref: { ref: 'registry', revision: 'v1' }, source_refs: [{ ref: 'source', revision: 'v1' }], budget: { amount: '10.00', currency: 'USD' }, nodes });
const context = () => ({ root_task_id: uuid, project_id: uuid, actor_id: uuid, epoch: 1, now: '2026-11-04T00:00:00Z', lease_expires_at: '2026-11-05T00:00:00Z', revoked: false, fingerprints: { input: hash, policy: hash, registry: hash, dependencies: hash, rights: hash, lease: hash }, registry: { enabled: true, jobs: { 'retrieve-local': true, 'external-provider': true } }, registered_tools: { 'retrieve-local': { category: 'reuse_asset', enabled: true, method_bound: true, price: { amount: '0.10', currency: 'USD' }, qualification_required: false }, 'external-provider': { category: 'external_delegate', enabled: true, method_bound: true, price: { amount: '0.10', currency: 'USD' }, qualification_required: false } }, qualifications: {}, budget: { remaining: '10.00', currency: 'USD' }, transfer_allowed: false });
const check = (plan, ctx = context(), attempts = {}) => api.nextStudioPlanNodes(plan, api.createStudioPlanCheckpoint(plan, ctx, attempts), ctx);

describe('bounded immutable Studio Plan DAG', () => {
  it('rejects cyclic, missing, duplicate and unbounded dependencies', () => {
    expect(() => api.createStudioPlan(input([node('a', ['b']), node('b', ['a'])]))).toThrow('STUDIO_PLAN_CYCLE');
    expect(() => api.createStudioPlan(input([node('a', ['missing'])]))).toThrow('STUDIO_PLAN_DEPENDENCY_INVALID');
    expect(() => api.createStudioPlan(input([node('a'), node('a')]))).toThrow('STUDIO_PLAN_NODE_INVALID');
    expect(() => api.createStudioPlan(input(Array.from({length: 33}, (_, i) => node(`n${i}`))))).toThrow('STUDIO_PLAN_NODE_INVALID');
  });
  it('hashes canonical content, clones and deeply freezes caller inputs', () => {
    const original = input(); const plan = api.createStudioPlan(original);
    const reordered = Object.fromEntries(Object.entries(input()).reverse());
    expect(api.createStudioPlan(reordered).plan_hash).toBe(plan.plan_hash);
    original.nodes[0].input_schema.type = 'string';
    expect(plan.nodes[0].input_schema.type).toBe('object');
    expect(Object.isFrozen(plan.nodes[0].input_schema)).toBe(true);
    expect(api.inspectStudioPlan(plan)).toMatchObject({ plan_hash: plan.plan_hash, node_count: 1, nodes: [{node_id:'a',dependencies:[],category:'reuse_asset',tool_id:'retrieve-local'}] });
  });
  it('rejects inherited fields, unsafe accessors and executable adapter inputs', () => {
    expect(() => api.createStudioPlan(Object.assign(Object.create({ actor_id: uuid }), input()))).toThrow('STUDIO_PLAN_JSON_INVALID');
    const getter = input(); Object.defineProperty(getter.nodes[0], 'adapter_url', { enumerable: true, get() { throw Error('GETTER_EXECUTED'); } });
    expect(() => api.createStudioPlan(getter)).toThrow('STUDIO_PLAN_JSON_INVALID');
    expect(() => api.createStudioPlan(input([{...node('a'),adapter_url:'https://evil.test/run.js'}]))).toThrow('STUDIO_PLAN_NODE_INVALID');
    expect(() => api.createStudioPlan(input([{...node('a'),tool_id:'https://evil.test/run.js'}]))).toThrow('STUDIO_PLAN_NODE_INVALID');
  });
  it('rejects malformed versions, source refs, identity, budgets and schemas', () => {
    for (const change of [{schema_version:2},{actor_id:'anonymous'},{source_refs:[{ref:'source',revision:'latest'}]},{budget:{amount:null,currency:'USD'}},{nodes:[{...node('a'),input_schema:null}]}]) {
      expect(() => api.createStudioPlan({...input(),...change})).toThrow('STUDIO_PLAN_');
    }
  });
  it('accepts planned nodes without invented output hashes but requires completed proof hashes', () => {
    const planned = input(); delete planned.nodes[0].output_hash;
    const plan = api.createStudioPlan(planned);
    expect(plan.nodes[0].output_hash).toBeUndefined();
    expect(() => api.createStudioPlanCheckpoint(plan, context(), {a:{status:'completed',receipt_ref:{ref:'receipt',revision:'1'}}})).toThrow('STUDIO_PLAN_CHECKPOINT_INVALID');
  });
  it('offers only ready dependency nodes from server-owned bindings', () => {
    const plan = api.createStudioPlan(input([node('a'),node('b',['a'])]));
    expect(check(plan)).toMatchObject({ status: 'READY', ready_nodes: ['a'], nodes:[{node_id:'a',status:'READY'},{node_id:'b',status:'BLOCKED'}] });
    const ctx = context(); delete ctx.registered_tools['retrieve-local'];
    expect(check(plan,ctx)).toMatchObject({status:'HOLD',reason:'METHOD_BINDING_UNAVAILABLE',ready_nodes:[]});
  });
  it('fails closed when registry is disabled or job is closed', () => {
    const plan = api.createStudioPlan(input());
    for (const close of [ctx => {ctx.registry.enabled=false;}, ctx => {ctx.registry.jobs['retrieve-local']=false;}]) {
      const ctx=context();close(ctx);expect(check(plan,ctx)).toMatchObject({status:'HOLD',reason:'REGISTRY_DISABLED',ready_nodes:[]});
    }
    expect(api.nextStudioPlanNodes(plan,null,context())).toMatchObject({status:'HOLD',reason:'CHECKPOINT_REQUIRED'});
  });
  it('holds stale checkpoints for each fingerprint and epoch change', () => {
    const plan=api.createStudioPlan(input());
    for (const key of ['input','policy','registry','dependencies','rights','lease']) {
      const ctx=context(), cp=api.createStudioPlanCheckpoint(plan,ctx);ctx.fingerprints[key]='b'.repeat(64);
      expect(api.nextStudioPlanNodes(plan,cp,ctx)).toMatchObject({status:'HOLD',reason:'CHECKPOINT_STALE',ready_nodes:[]});
    }
    const ctx=context(), cp=api.createStudioPlanCheckpoint(plan,ctx);ctx.epoch=2;
    expect(api.nextStudioPlanNodes(plan,cp,ctx).reason).toBe('CHECKPOINT_STALE');
    expect(api.nextStudioPlanNodes(api.createStudioPlan(input([node('b')])),cp,context()).reason).toBe('CHECKPOINT_STALE');
  });
  it('never replays completed nodes and requires reconciliation of running or uncertain attempts', () => {
    const plan=api.createStudioPlan(input([node('a'),node('b',['a'])]));
    const completed={a:{status:'completed',receipt_ref:{ref:'receipt-a',revision:'1'},output_hash:hash}};
    expect(check(plan,context(),completed)).toMatchObject({status:'READY',ready_nodes:['b'],nodes:[{node_id:'a',status:'COMPLETED'},{node_id:'b',status:'READY'}]});
    for(const status of ['running','uncertain']) expect(check(plan,context(),{a:{status,attempt_ref:'attempt-a'}})).toMatchObject({status:'HOLD',reason:'RECONCILIATION_REQUIRED',ready_nodes:[]});
    expect(check(api.createStudioPlan(input()),context(),completed)).toMatchObject({status:'COMPLETE',ready_nodes:[]});
    expect(() => api.createStudioPlanCheckpoint(plan,context(),{a:completed.a,b:completed.a})).toThrow('STUDIO_PLAN_CHECKPOINT_INVALID');
  });
  it('blocks revoked delegation, expired leases and identity mismatch', () => {
    const plan=api.createStudioPlan(input());const ctx=context(),cp=api.createStudioPlanCheckpoint(plan,ctx);
    ctx.revoked=true;expect(api.nextStudioPlanNodes(plan,cp,ctx).reason).toBe('DELEGATION_REVOKED');
    const expired=context();expired.now='2026-11-06T00:00:00Z';expect(check(plan,expired).reason).toBe('LEASE_EXPIRED');
    const foreign=context();foreign.actor_id='00000000-0000-4000-8000-000000000002';expect(check(plan,foreign).reason).toBe('DELEGATION_REVOKED');
  });
  it('holds unknown or insufficient prices/budgets with exact decimal arithmetic', () => {
    const plan=api.createStudioPlan(input());
    for(const amend of [ctx => {ctx.budget.remaining=null;},ctx => {ctx.registered_tools['retrieve-local'].price.amount=null;},ctx => {ctx.budget.remaining='0.09';},ctx => {ctx.budget.currency='EUR';}]){
      const ctx=context();amend(ctx);expect(check(plan,ctx).reason).toBe('BUDGET_EXHAUSTED');
    }
    const ctx=context();ctx.budget.remaining='0.10';expect(check(plan,ctx).ready_nodes).toEqual(['a']);
    const parallel=api.createStudioPlan(input([node('a'),node('b')]));expect(check(parallel,ctx).reason).toBe('BUDGET_EXHAUSTED');
  });
  it('holds missing qualifications and denies external transfer without trusted permission', () => {
    const ctx=context();ctx.registered_tools['retrieve-local'].qualification_required=true;
    expect(check(api.createStudioPlan(input()),ctx).reason).toBe('WAITING_GATE');
    ctx.qualifications['retrieve-local']=true;expect(check(api.createStudioPlan(input()),ctx).status).toBe('READY');
    expect(check(api.createStudioPlan(input([node('a',[],'external_delegate')]))).reason).toBe('TRANSFER_DENIED');
  });
  it('detects tampered plans and checkpoints and does not mutate snapshots', () => {
    const plan=api.createStudioPlan(input()),ctx=context(),cp=api.createStudioPlanCheckpoint(plan,ctx);
    const copy=JSON.parse(JSON.stringify(plan));copy.nodes[0].input_hash='b'.repeat(64);
    expect(() => api.inspectStudioPlan(copy)).toThrow('STUDIO_PLAN_HASH_INVALID');
    const changed=JSON.parse(JSON.stringify(cp));changed.attempts.a={status:'completed',receipt_ref:{ref:'x',revision:'1'},output_hash:hash};
    expect(api.nextStudioPlanNodes(plan,changed,ctx).reason).toBe('CHECKPOINT_STALE');
    ctx.fingerprints.input='c'.repeat(64);expect(cp.fingerprints.input).toBe(hash);
  });
});
