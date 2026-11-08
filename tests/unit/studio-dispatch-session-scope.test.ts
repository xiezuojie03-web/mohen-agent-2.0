import {beforeEach,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({
  queryRows:vi.fn(),
  getNodePgPool:vi.fn(),
  createStudioDelegationRepository:vi.fn(),
}));
vi.mock('@mohen/data-access',()=>({
  queryRows:mocks.queryRows,
  getNodePgPool:mocks.getNodePgPool,
  createStudioDelegationRepository:mocks.createStudioDelegationRepository,
}));
import {listProjectSourceIds,sourceBindingForWork} from '../../apps/web/lib/studio/dispatch-grant';
import {createStudioDispatcherDeps} from '../../apps/web/lib/studio/provider-dispatcher';

const project='11111111-1111-4111-8111-111111111111';
const source='22222222-2222-4222-8222-222222222222';

beforeEach(()=>{
  vi.resetAllMocks();
  mocks.getNodePgPool.mockReturnValue({});
  mocks.createStudioDelegationRepository.mockReturnValue({});
});

it('uses transaction-local identity for project source reads and work binding',async()=>{
  mocks.queryRows
    .mockResolvedValueOnce([{source_id:source}])
    .mockResolvedValueOnce([{project_id:project,sids:JSON.stringify([source])}]);
  expect(await listProjectSourceIds(project,'owner-token')).toEqual([source]);
  expect(mocks.queryRows.mock.calls[0][0]).toContain("with session_context as materialized");
  expect(mocks.queryRows.mock.calls[0][0]).toContain("set_config('mohen.session_token', :'token', true)");
  expect(await sourceBindingForWork('work-id')).toEqual({projectId:project,sourceIds:[source]});
});

it('uses transaction-local identity for Provider source-right reads',async()=>{
  mocks.queryRows.mockResolvedValueOnce([{source_id:source,rights:{external_processing:'allow'}}]);
  const deps=await createStudioDispatcherDeps();
  const rows=await deps.readSourceRights([source],'owner-token');
  expect(rows).toHaveLength(1);
  expect(mocks.queryRows.mock.calls[0][0]).toContain("with session_context as materialized");
  expect(mocks.queryRows.mock.calls[0][0]).toContain("set_config('mohen.session_token', :'token', true)");
});
