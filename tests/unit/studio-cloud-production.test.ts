import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const fx=vi.hoisted(()=>({run:vi.fn(),queryRows:vi.fn(),spawn:vi.fn(),local:vi.fn(()=>false),dispatch:vi.fn(),factory:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({run:fx.run,queryRows:fx.queryRows}));
vi.mock('node:child_process',()=>({spawn:fx.spawn}));
vi.mock('../../apps/web/lib/studio-execution-authority',()=>({isExecutionAuthorityReady:fx.local,startVerifier:vi.fn(),startDynamicTokenService:vi.fn(),buildAuthEnv:vi.fn(),executionDigest:vi.fn()}));
vi.mock('../../pipelines/data-production/orchestrator/cloud-production-dispatch.mjs',()=>({createCloudProductionDispatch:fx.factory}));
import {triggerProduction,getProductionBlocker} from '../../apps/web/lib/studio-production';
const id='123e4567-e89b-42d3-a456-426614174001';
const source={originalId:id,pageNumber:1,sourceVersionId:id,sha256:'a'.repeat(64),assetRevisionId:id,contentType:'text/plain',byteSize:10,uploadStartedAt:'2026-11-10T00:00:00.000Z',uploadVerifiedAt:'2026-11-10T00:01:00.000Z'};
afterEach(()=>vi.unstubAllEnvs());
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('MOHEN_CLOUD_EXECUTION_ENABLED','true');vi.stubEnv('MOHEN_CLOUD_EXECUTOR_URL','https://private-worker.invalid/execute');vi.stubEnv('MOHEN_CLOUD_EXECUTOR_CREDENTIAL','synthetic-credential-at-least-32-characters');fx.factory.mockReturnValue(fx.dispatch);fx.dispatch.mockImplementation(async e=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'INDEPENDENT_GATE_NOT_VERIFIED'}));fx.run.mockResolvedValue(undefined);});
it('cloud profile uses authenticated remote dispatch, retaining independent authorizers on executor',async()=>{
 expect(getProductionBlocker(source)).toBe(null);const r=await triggerProduction(id,'cloud test',id,source,'synthetic-owner-session');
 expect(r.started).toBe(true);expect(fx.spawn).not.toHaveBeenCalled();expect(fx.local).not.toHaveBeenCalled();
 const e=fx.dispatch.mock.calls[0][0];expect(e.scope.root_task_id).toBe(id);expect(e.scope.project_id).toBe(id);expect(e.consumer_method_plan.methods[0].method_id).toBe('C01');
 expect(fx.run.mock.calls[0][1].metadata).toContain('input_digest');expect(fx.run.mock.calls[0][1].metadata).not.toContain('synthetic-owner-session');
});
it('network uncertainty leaves original run identity and no local fallback or automatic redispatch',async()=>{
 fx.dispatch.mockRejectedValue(Error('CLOUD_EXECUTOR_UNCERTAIN'));const r=await triggerProduction(id,'cloud test',id,source,'synthetic-owner-session');
 expect(r.started).toBe(false);expect(r.runId).not.toBe('');expect(r.reason).toBe('production_cloud_dispatch_uncertain');expect(fx.dispatch).toHaveBeenCalledTimes(1);expect(fx.spawn).not.toHaveBeenCalled();
 expect(fx.run.mock.calls.some(c=>String(c[0]).includes('cloud_dispatch_uncertain'))).toBe(true);
});
it('malformed cloud configuration blocks before run registration',async()=>{
 fx.factory.mockImplementation(()=>{throw Error('CLOUD_EXECUTOR_CONFIG_INVALID')});const r=await triggerProduction(id,'cloud test',id,source,'synthetic-owner-session');
 expect(r.reason).toBe('production_cloud_executor_not_configured');expect(fx.run).not.toHaveBeenCalled();expect(fx.spawn).not.toHaveBeenCalled();
});

it('executor setup HOLD is not announced as production started',async()=>{
 fx.dispatch.mockImplementation(async e=>({run_id:e.run_id,status:'HOLD',stage:'D00',reason_code:'CLOUD_EXECUTOR_SETUP_FAILED'}));
 const r=await triggerProduction(id,'cloud test',id,source,'synthetic-owner-session');
 expect(r.started).toBe(false);expect(r.reason).toBe('production_cloud_execution_hold');expect(fx.spawn).not.toHaveBeenCalled();
});
