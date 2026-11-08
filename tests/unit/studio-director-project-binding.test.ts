import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({queryRows:vi.fn(),queryValue:vi.fn(),run:vi.fn(),generate:vi.fn()}));
vi.mock('@mohen/data-access',()=>({queryRows:mocks.queryRows,queryValue:mocks.queryValue,run:mocks.run}));
vi.mock('../../apps/web/lib/studio-creation',()=>({
  generateDirectorPlans:vi.fn(),
  generateDirectorPlansFromFacts:mocks.generate,
  generateBeats:vi.fn(),
  generateWorkPanels:vi.fn(),
}));
import {createDirectorPlan} from '../../apps/web/lib/studio-director';
const project='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.resetAllMocks();mocks.generate.mockResolvedValue({planA:{angle:'A'},planB:{angle:'B'},facts:['fact'],finding:{motifCodes:[]}});mocks.queryRows.mockResolvedValue([{ready:'true'}]);mocks.queryValue.mockResolvedValue('33333333-3333-4333-8333-333333333333');mocks.run.mockResolvedValue(true);});
it('persists project_id together with the server-bound source ids',async()=>{
 await createDirectorPlan('brief','jinze','owner',{projectId:project,auth:{grantId:'g'},facts:['fact'],sourceIds:['source-id']});
 expect(mocks.run).toHaveBeenCalledTimes(1);
 const [sql,params]=mocks.run.mock.calls[0];
 expect(sql).toContain('source_ids, project_id');
 expect(params).toMatchObject({project,sids:JSON.stringify(['source-id'])});
});
it('refuses to persist a model result without an exact project binding before generation',async()=>{
 await expect(createDirectorPlan('brief','jinze','owner',{auth:{grantId:'g'},facts:['fact'],sourceIds:['source-id']}))
  .rejects.toThrow('STUDIO_PROJECT_BINDING_REQUIRED');
 expect(mocks.generate).not.toHaveBeenCalled();
 expect(mocks.run).not.toHaveBeenCalled();
});
it('holds before a paid model call when the additive project binding migration is absent',async()=>{
 mocks.queryRows.mockResolvedValueOnce([{ready:'false'}]);
 await expect(createDirectorPlan('brief','jinze','owner',{projectId:project,auth:{grantId:'g'},facts:['fact'],sourceIds:['source-id']}))
  .rejects.toThrow('STUDIO_PROJECT_BINDING_MIGRATION_REQUIRED');
 expect(mocks.generate).not.toHaveBeenCalled();
 expect(mocks.run).not.toHaveBeenCalled();
});
