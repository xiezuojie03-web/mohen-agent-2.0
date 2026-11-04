import {beforeEach, expect, it, vi} from 'vitest';
import {NextRequest} from 'next/server';

const {eligible, raw, retrieve} = vi.hoisted(() => ({eligible:vi.fn(),raw:vi.fn(),retrieve:vi.fn()}));
vi.mock('../../apps/web/lib/publication',()=>({listWatchEligible:eligible,listPublished:raw}));
vi.mock('../../apps/web/lib/mohen-agent/retrieve',()=>({retrieveMaterials:retrieve}));
import {GET as catalog} from '../../apps/web/app/api/public/works/route';
import {GET as detail} from '../../apps/web/app/api/public/works/[id]/route';
import {GET as program} from '../../apps/web/app/api/public/works/[id]/program/route';
import {GET as share} from '../../apps/web/app/api/public/works/[id]/share/route';
import {GET as related} from '../../apps/web/app/api/public/works/[id]/related/route';
import {GET as search} from '../../apps/web/app/api/search/route';

const withheld={work_id:'withheld',revision_id:'old-revision',title:'桥市秘密',revision_no:'1',content:'PRIVATE_BODY'};
const allowed={work_id:'allowed',revision_id:'current-revision',title:'桥市',revision_no:'2',content:'qualified-body'};
beforeEach(()=>{vi.resetAllMocks();raw.mockResolvedValue([withheld,allowed]);eligible.mockResolvedValue([]);retrieve.mockResolvedValue({materials:[],degraded:false});});
const request=new Request('http://localhost/api/public/works/withheld');

it('catalog and search never use an editorial pointer as public authorization',async()=>{
  const listed=await catalog();expect((await listed.json()).works).toEqual([]);
  const found=await search(new NextRequest('http://localhost/api/search?q=桥市'));
  expect((await found.json()).works).toEqual([]);
  expect(raw).not.toHaveBeenCalled();expect(eligible).toHaveBeenCalledTimes(2);
  expect(listed.headers.get('cache-control')).toContain('no-store');
  expect(found.headers.get('cache-control')).toContain('no-store');
});
for(const [name,handler] of [['detail',detail],['program',program],['share',share]] as const){
 it(`${name} refuses withheld content and metadata with no cache`,async()=>{
  const response=await handler(request,{params:Promise.resolve({id:'withheld'})});
  expect(response.status).toBe(404);expect(JSON.stringify(await response.json())).not.toContain('PRIVATE_BODY');
  expect(raw).not.toHaveBeenCalled();expect(eligible).toHaveBeenCalledOnce();
  expect(response.headers.get('cache-control')).toContain('no-store');
 });
}
it('related works filters withheld revisions and metadata',async()=>{
 eligible.mockResolvedValue([allowed]);
 const response=await related(request,{params:Promise.resolve({id:'other'})});
 expect((await response.json()).related).toEqual([{work_id:'allowed',title:'桥市',revision_no:'2'}]);
 expect(raw).not.toHaveBeenCalled();expect(response.headers.get('cache-control')).toContain('no-store');
});
it('each response rechecks current qualification; a previously allowed revision can be withheld',async()=>{
 eligible.mockResolvedValueOnce([allowed]).mockResolvedValueOnce([]);
 const context={params:Promise.resolve({id:'allowed'})};
 const first=await detail(request,context);expect((await first.json()).work).toEqual(allowed);
 expect(first.headers.get('cache-control')).toContain('no-store');
 const second=await detail(request,context);expect(second.status).toBe(404);
 expect(eligible).toHaveBeenCalledTimes(2);expect(raw).not.toHaveBeenCalled();
});
