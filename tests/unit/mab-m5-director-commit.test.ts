import {beforeEach,expect,it,vi} from "vitest";
const db=vi.hoisted(()=>({queryRows:vi.fn(),queryValue:vi.fn(),run:vi.fn()}));
vi.mock("../../packages/data-access/src/index.mjs",()=>db);
import {commitWorkRevision} from "../../apps/web/lib/studio-director";

const wid="11111111-1111-4111-8111-111111111111";
const pid="22222222-2222-4222-8222-222222222222";
const rid="33333333-3333-4333-8333-333333333333";
const source={selected:"A",plan_a:{angle:"运河与日常",points:["河流与街区"],cover:"历史地图"},plan_b:{angle:"其他",points:[],cover:""},beats:[{title:"第一章",narration:"证据待复核",visual:"历史地图",directorTimecodeMs:0,provenanceRefs:["source@rev"]}],finding:{motifCodes:["M1"],historicalQuestion:"何以形成?",understandingDelta:"有待补证",supportScope:"私有研究",limitations:[]}};
const base={revision_id:rid,revision_no:1,content:{}};
beforeEach(()=>{vi.resetAllMocks();db.queryValue.mockResolvedValue("44444444-4444-4444-8444-444444444444");});

it("refuses a detached/foreign Owner director plan without writing any revision",async()=>{
 db.queryRows.mockResolvedValueOnce([]);
 await expect(commitWorkRevision(wid,pid)).resolves.toBeNull();
 expect(db.queryRows).toHaveBeenCalledTimes(1);
 expect(String(db.queryRows.mock.calls[0][0])).toContain("w.owner_user_id = d.owner_user_id");
 expect(db.queryValue).not.toHaveBeenCalled();
});
it("commits the selected immutable plan snapshot with a single head-CAS and correct source binding",async()=>{
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([base]).mockResolvedValueOnce([{revision_id:rid}]);
 const v=await commitWorkRevision(wid,pid,1);
 expect(v).toMatchObject({revisionId:rid,revisionNo:2});
 const statement=String(db.queryRows.mock.calls[2][0]);
 expect(statement).toContain("coalesce(max(revision_no),0)");
 expect(statement).toContain("on conflict (work_id,revision_no) do nothing");
 expect(statement).toContain("d.beats=:'beats'::jsonb");
 expect(statement).toContain("d.selected=:'which'");
 const data=db.queryRows.mock.calls[2][1];
 expect(JSON.parse(data.content)).toMatchObject({director_source:{plan_id:pid,selected:"A"}});
 expect(db.run).not.toHaveBeenCalled();
});
it("rejects stale client expected revision before attempting any save",async()=>{
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([base]);
 await expect(commitWorkRevision(wid,pid,0)).resolves.toMatchObject({revisionNo:1,conflict:true});
 expect(db.queryValue).not.toHaveBeenCalled();
});
it("returns a version conflict if a parallel writer wins the database insert",async()=>{
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([base]).mockResolvedValueOnce([]).mockResolvedValueOnce([{revision_id:rid,revision_no:2,content:{}}]);
 await expect(commitWorkRevision(wid,pid,1)).resolves.toMatchObject({revisionNo:2,conflict:true});
 expect(db.run).not.toHaveBeenCalled();
});
it("propagates a failed database write instead of pretending the revision was saved",async()=>{
 db.queryRows.mockResolvedValueOnce([source]).mockResolvedValueOnce([base]).mockRejectedValueOnce(new Error("DB_WRITE_UNAVAILABLE"));
 await expect(commitWorkRevision(wid,pid,1)).rejects.toThrow("DB_WRITE_UNAVAILABLE");
});
it("idempotent retries acknowledge the already saved exact director source/content",async()=>{
 let savedContent:unknown;
 db.queryRows.mockImplementation(async (sql:string,args:any)=>{
   if(sql.includes("from public.director_plans d")&&sql.includes("join publication.works w"))return [source];
   if(sql.includes("order by revision_no desc"))return savedContent
     ? [{revision_id:rid,revision_no:2,content:JSON.parse(String(savedContent))}] : [base];
   if(sql.includes("insert into publication.work_revisions")){savedContent=args.content;return [{revision_id:rid}];}
   throw Error("UNEXPECTED_SQL");
 });
 await expect(commitWorkRevision(wid,pid,1)).resolves.toMatchObject({revisionNo:2});
 await expect(commitWorkRevision(wid,pid,2)).resolves.toMatchObject({revisionId:rid,revisionNo:2});
 expect(db.queryRows.mock.calls.filter(c=>String(c[0]).includes("insert into publication.work_revisions"))).toHaveLength(1);
});
