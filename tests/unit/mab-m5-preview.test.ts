import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({queryRows:vi.fn(),guard:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({queryRows:mocks.queryRows}));
vi.mock('../../apps/web/lib/guard',()=>({guardRoute:mocks.guard}));
import {POST} from '../../apps/web/app/api/studio/works/[id]/preview/route';
beforeEach(()=>{vi.resetAllMocks();mocks.guard.mockResolvedValue(null);});
const request=new Request('http://localhost/preview',{method:'POST'}),context={params:Promise.resolve({id:'synthetic'})};
it.each(['native','text'])('previews actual saved JSON in %s encoding',async encoding=>{
 const content={beats:[{narration:'saved'}]};mocks.queryRows.mockResolvedValue([{content:encoding==='text'?JSON.stringify(content):content}]);
 const response=await POST(request,context);expect((await response.json()).preview).toEqual(content);
});
it('does not manufacture an empty successful preview for corrupt persisted JSON',async()=>{
 mocks.queryRows.mockResolvedValue([{content:'{broken'}]);
 const response=await POST(request,context);expect(response.status).toBe(503);expect((await response.json()).reason).toBe('preview_unavailable');
});
it('does not query private content when ownership guard refuses',async()=>{
 mocks.guard.mockResolvedValue(new Response(null,{status:403}));
 expect((await POST(request,context)).status).toBe(403);expect(mocks.queryRows).not.toHaveBeenCalled();
});
