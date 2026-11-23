import {beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({queryRows:vi.fn(),queryValue:vi.fn(),run:vi.fn()}));
vi.mock('@mohen/data-access',()=>({queryRows:db.queryRows,queryValue:db.queryValue,run:db.run}));
vi.mock('../../apps/web/lib/asset-reflow',()=>({reflowWorkToAssets:vi.fn()}));
vi.mock('../../apps/web/lib/work-publish-qualification',()=>({
  requireIndependentWorkPublicationG5:vi.fn(),requireCurrentWorkConsumerQualification:vi.fn(),
}));
import {createWorkDraft,createWork} from '../../apps/web/lib/publication';

const project='11111111-1111-4111-8111-111111111111';
const revision='33333333-3333-4333-8333-333333333333';
const creation='44444444-4444-4444-8444-444444444444';
function ready(bound:boolean){
  db.queryRows.mockImplementation(async (sql:string)=>{
    if(sql.includes('information_schema.columns'))return [{ready:'true'}];
    if(sql.includes('from studio.projects p'))return bound?[{project_id:project}]:[];
    if(String(sql).includes('insert into publication.work_revisions'))return [{work_id:creation,revision_id:revision}];
    return [];
  });
}
beforeEach(()=>{vi.resetAllMocks();ready(true);});

it('refuses a Studio work without a project candidate before any database read',async()=>{
  db.queryRows.mockReset();
  await expect(createWorkDraft('title','creator','owner',undefined,creation)).resolves.toEqual({
    ok:false,reason:'project_binding_required',
  });
  expect(db.queryRows).not.toHaveBeenCalled();
});
it('holds when the publication.works.project_id migration is absent',async()=>{
  db.queryRows.mockResolvedValueOnce([{ready:'false'}]);
  await expect(createWorkDraft('title','creator','owner',undefined,creation,project)).resolves.toEqual({
    ok:false,reason:'project_binding_migration_required',
  });
});
it('rejects a project not owned ACTIVE by the server-side owner',async()=>{
  ready(false);
  await expect(createWorkDraft('title','creator','owner',undefined,creation,project)).resolves.toEqual({
    ok:false,reason:'project_binding_required',
  });
  const check=String(db.queryRows.mock.calls.find(([sql]:[string])=>String(sql).includes('from studio.projects p'))?.[0]);
  expect(check).toContain('p.owner_user_id = :\'owner\'::uuid');
  expect(check).toContain("p.lifecycle_status = 'ACTIVE'");
  expect(db.queryRows.mock.calls.some(([sql]:[string])=>String(sql).includes('insert into publication.works'))).toBe(false);
});
it('binds a valid Owner ACTIVE project into work creation and its retry check',async()=>{
  await expect(createWorkDraft('title','creator','owner',undefined,creation,project)).resolves.toEqual({
    ok:true,work_id:creation,revision_id:revision,
  });
  const insert=String(db.queryRows.mock.calls.find(([sql]:[string])=>String(sql).includes('insert into publication.works'))?.[0]);
  expect(insert).toContain('project_id');
  expect(db.queryRows.mock.calls.find(([sql]:[string])=>String(sql).includes('insert into publication.works'))?.[1]).toMatchObject({project});
});
it('legacy editorial creation keeps its separate unbound path',async()=>{
  db.queryRows.mockImplementation(async (sql:string)=>String(sql).includes('insert into publication.work_revisions')
    ? [{work_id:creation,revision_id:revision}] : []);
  await expect(createWork('legacy','creator','owner',undefined,creation)).resolves.toBe(creation);
  const insert=String(db.queryRows.mock.calls[0][0]);
  expect(insert).not.toContain('project_id');
});
