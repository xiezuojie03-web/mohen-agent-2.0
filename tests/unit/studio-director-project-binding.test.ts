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
const delegation='22222222-2222-4222-8222-222222222222';
const snapshotHash='a'.repeat(64);
const validOpts=()=>({
  projectId:project,delegationId:delegation,auth:{grantId:'g'},facts:['fact'],
  sourceIds:['source-id'],researchSnapshotHash:snapshotHash,researchSourceRefs:['source@revision'],
});
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.generate.mockResolvedValue({planA:{angle:'A'},planB:{angle:'B'},facts:['fact'],finding:{motifCodes:[]}});
  mocks.queryRows.mockImplementation(async (sql:string)=>{
    if(sql.includes('information_schema.columns'))return [{ready:'true'}];
    if(sql.includes('from studio.projects p'))return [{root_task_ref:'root-task-1'}];
    throw Error('UNEXPECTED_QUERY:'+sql);
  });
  mocks.queryValue.mockResolvedValue('33333333-3333-4333-8333-333333333333');
  mocks.run.mockResolvedValue(true);
});
it('persists project, delegation, root task ref and research snapshot together',async()=>{
  await createDirectorPlan('brief','jinze','owner',validOpts());
  expect(mocks.run).toHaveBeenCalledTimes(1);
  const [sql,params]=mocks.run.mock.calls[0];
  expect(sql).toContain('delegation_id, root_task_ref, research_snapshot_hash, research_source_refs');
  expect(params).toMatchObject({
    project,delegation,root_ref:'root-task-1',snapshot:snapshotHash,
    sids:JSON.stringify(['source-id']),refs:JSON.stringify(['source@revision']),
  });
});
it('verifies delegation belongs to the same Owner and ACTIVE project',async()=>{
  await createDirectorPlan('brief','jinze','owner',validOpts());
  const sql=String(mocks.queryRows.mock.calls.find(([s]:[string])=>s.includes('from studio.projects p'))?.[0]);
  expect(sql).toContain('p.owner_user_id = :\'owner\'::uuid');
  expect(sql).toContain("p.lifecycle_status = 'ACTIVE'");
  expect(sql).toContain('d.delegation_id = :\'delegation\'::uuid');
});
it('refuses a plan without project or delegation binding before generation',async()=>{
  await expect(createDirectorPlan('brief','jinze','owner',{...validOpts(),delegationId:undefined}))
    .rejects.toThrow('STUDIO_PROJECT_BINDING_REQUIRED');
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.run).not.toHaveBeenCalled();
});
it('refuses a plan whose delegation does not match the Owner project',async()=>{
  mocks.queryRows.mockImplementation(async (sql:string)=>sql.includes('information_schema.columns')
    ? [{ready:'true'}] : []);
  await expect(createDirectorPlan('brief','jinze','owner',validOpts()))
    .rejects.toThrow('STUDIO_DELEGATION_PROJECT_MISMATCH');
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.run).not.toHaveBeenCalled();
});
it('refuses a plan without a server research snapshot hash',async()=>{
  await expect(createDirectorPlan('brief','jinze','owner',{...validOpts(),researchSnapshotHash:undefined}))
    .rejects.toThrow('STUDIO_RESEARCH_SNAPSHOT_REQUIRED');
  expect(mocks.generate).not.toHaveBeenCalled();
});
it('holds before a paid model call when any binding column is missing',async()=>{
  mocks.queryRows.mockResolvedValueOnce([{ready:'false'}]);
  await expect(createDirectorPlan('brief','jinze','owner',validOpts()))
    .rejects.toThrow('STUDIO_PROJECT_BINDING_MIGRATION_REQUIRED');
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.run).not.toHaveBeenCalled();
});
