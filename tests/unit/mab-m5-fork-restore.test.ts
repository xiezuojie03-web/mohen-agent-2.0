import {beforeEach,expect,it,vi} from "vitest";
const db=vi.hoisted(()=>({queryRows:vi.fn(),queryValue:vi.fn(),run:vi.fn()}));
const guard=vi.hoisted(()=>({guardRoute:vi.fn()}));
vi.mock("../../packages/data-access/src/index.mjs",()=>db);
vi.mock("../../apps/web/lib/guard",()=>guard);
import {forkWorkRevision} from "../../apps/web/lib/publication";
import {POST as restore} from "../../apps/web/app/api/studio/works/[id]/restore/route";
import {POST as fork} from "../../apps/web/app/api/studio/works/[id]/fork/route";

const wid="11111111-1111-4111-8111-111111111111";
const src="22222222-2222-4222-8222-222222222222";
const op="33333333-3333-4333-8333-333333333333";
const source={revision_id:src,revision_no:2,title:"历史",description:"来源",content:{beats:[{title:"原件",provenanceRefs:["s@v1"]}],content_hash:"previous"}};
const context={params:Promise.resolve({id:wid})};
beforeEach(()=>{vi.resetAllMocks();guard.guardRoute.mockResolvedValue(null);db.queryValue.mockResolvedValue("4");});
it("a historical restore binds the exact source revision and uses one database CAS",async()=>{
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([{revision_no:3}])
 .mockResolvedValueOnce([]).mockResolvedValueOnce([{revision_id:op}]);
 const out=await forkWorkRevision(wid,{sourceRevisionId:src,expectedRevisionNo:3,operationId:op});
 expect(out).toEqual({ok:true,revisionId:op,revisionNo:4});
 const insert=db.queryRows.mock.calls.find(([sql])=>String(sql).includes("insert into publication.work_revisions"));
 expect(insert).toBeDefined();
 expect(String(insert![0])).toContain("coalesce(max(revision_no),0)");
 expect(String(insert![0])).toContain("on conflict do nothing");
 const saved=JSON.parse(insert![1].content);
 expect(saved.fork_source).toEqual({work_id:wid,revision_id:src,revision_no:2});
 expect(saved.beats).toEqual(source.content.beats);
 expect(saved.content_hash).not.toBe("previous");
 expect(db.run).not.toHaveBeenCalled();
});
it("never claims success when the insert races another edit",async()=>{
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([{revision_no:2}]).mockResolvedValueOnce([]);
 await expect(forkWorkRevision(wid)).resolves.toEqual({ok:false,reason:"version_conflict",revisionNo:4});
});
it("the same operation id can acknowledge a verified previous fork without duplicating it",async()=>{
 let saved:Record<string,unknown>|null=null;
 db.queryRows.mockImplementation(async(sql:string,args:any)=>{
  if(sql.includes("insert into publication.work_revisions")){saved=JSON.parse(args.content);return [{revision_id:op}];}
  if(sql.includes("order by revision_no desc")&&sql.includes("content"))return [source];
  if(sql.includes("order by revision_no desc"))return [{revision_no:2}];
  if(sql.includes("revision_id=:'rid'"))return saved?[{revision_id:op,revision_no:3,content:saved}]:[];
  throw Error("UNEXPECTED_SQL:"+sql);
 });
 await expect(forkWorkRevision(wid,{operationId:op})).resolves.toMatchObject({ok:true,revisionNo:3});
 await expect(forkWorkRevision(wid,{operationId:op})).resolves.toMatchObject({ok:true,revisionId:op,revisionNo:3});
 expect(db.queryRows.mock.calls.filter(([sql])=>String(sql).includes("insert into publication.work_revisions"))).toHaveLength(1);
});
it("rejects malformed historical source, stale expected version and corrupt JSON without inserts",async()=>{
 expect(await forkWorkRevision(wid,{sourceRevisionId:"not-a-uuid"})).toMatchObject({ok:false,reason:"invalid_source"});
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([{revision_no:3}]);
 expect(await forkWorkRevision(wid,{sourceRevisionId:src,expectedRevisionNo:2})).toMatchObject({ok:false,reason:"version_conflict"});
 db.queryRows.mockReset().mockResolvedValueOnce([{...source,content:"{broken"}]);
 expect(await forkWorkRevision(wid)).toMatchObject({ok:false,reason:"source_unavailable"});
 expect(db.queryRows.mock.calls.some(([sql])=>String(sql).includes("insert into publication.work_revisions"))).toBe(false);
});
it("restore accepts explicit historical source while keeping the old bodyless call compatible",async()=>{
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([{revision_no:3}]).mockResolvedValueOnce([{revision_id:op}]);
 const request=new Request("http://localhost/restore",{method:"POST",body:JSON.stringify({source_revision_id:src,expected_revision_no:3})});
 const response=await restore(request,context);
 expect(response.status).toBe(200);
 expect((await response.json()).ok).toBe(true);
 const firstSql=String(db.queryRows.mock.calls[0][0]);
 expect(firstSql).toContain("revision_id=:'src'");
});
it("fork/restore reject unauthenticated actors before fetching private revisions",async()=>{
 guard.guardRoute.mockResolvedValue(new Response(null,{status:403}));
 const resp=await fork(new Request("http://localhost/fork",{method:"POST"}),context);
 expect(resp.status).toBe(403);
 expect(db.queryRows).not.toHaveBeenCalled();
});
