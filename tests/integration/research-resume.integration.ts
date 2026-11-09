import {beforeAll,beforeEach,afterAll,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
const model=vi.hoisted(()=>({run:vi.fn()}));
vi.mock('../../apps/web/lib/mohen-agent/research',()=>({runResearch:model.run,resolveTopic:()=> 'generic'}));
import {queryRows,queryValue,run,getNodePgPool} from '@mohen/data-access';
import {resumeResearchTask} from '../../apps/web/lib/studio-research';
const localTcpHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:undefined,socket=localTcpHost??process.env.MOHEN_TEST_SOCKET,database=process.env.MOHEN_TEST_DATABASE;
const url=new URL(process.env.DATABASE_URL??'https://invalid.invalid');
if(process.env.MOHEN_RESEARCH_RESUME_TEST!=='isolated-pg17'||!(localTcpHost||socket?.startsWith('/workspace/'))||
 !/^mohen_k3_[a-z0-9_]*test$/.test(database??'')||url.protocol!=='postgresql:'||url.hostname!=='localhost'||
 url.pathname!=='/'+database||url.searchParams.get('host')!==socket||process.env.MOHEN_DB_DRIVER!=='pg')throw Error('MARKED_ISOLATED_RESEARCH_DATABASE_REQUIRED');
const owner=randomUUID();let taskId:string;
const checkpoint={prompt:'synthetic',topic:'generic',holdReason:'budget',holdAt:{toolId:'llm-understand'},budgetSpent:0,reserved:0,ceiling:8};
beforeAll(async()=>{
 expect(await queryValue("select current_setting('mohen.test_instance',true)")).toBe('codex-k3-isolated');
 await run("insert into public.users(user_id,email,username,password_hash)values(:'id',:'email','resume fixture','synthetic')",{id:owner,email:owner+'@example.invalid'});
});
beforeEach(async()=>{
 model.run.mockReset().mockImplementation(async()=>{
  await new Promise(resolve=>setTimeout(resolve,30));
  return {decision:{verdict:'partial',materials:[],gaps:['synthetic'],confidence:0.5},degraded:false,researchLeads:[]};
 });
 taskId=randomUUID();
 await run("insert into public.research_tasks(task_id,owner_user_id,topic,prompt,status,checkpoint)values(:'id',:'owner','generic','synthetic','hold',:'cp'::jsonb)",{id:taskId,owner,cp:JSON.stringify(checkpoint)});
});
afterAll(async()=>{await getNodePgPool().end();});
it('does not grant client credit or execute tools from a numeric resume argument',async()=>{
 expect(await resumeResearchTask(taskId,1000)).toMatchObject({status:'hold',holdReason:'additional_budget_requires_authorization'});
 expect(model.run).not.toHaveBeenCalled();
 const [row]=await queryRows("select status,checkpoint from public.research_tasks where task_id=:'id'",{id:taskId});
 expect(row.status).toBe('hold');expect((row.checkpoint as unknown as {ceiling:number}).ceiling).toBe(8);
});
it('allows one atomic resume winner across independent PostgreSQL connections',async()=>{
 const results=await Promise.all([resumeResearchTask(taskId),resumeResearchTask(taskId)]);
 expect(results.filter(r=>r.status==='done')).toHaveLength(1);
 expect(results.filter(r=>r.status==='hold')).toHaveLength(1);expect(model.run).toHaveBeenCalledTimes(1);
 expect(model.run.mock.calls[0][2].budget.ceiling).toBe(8);
 expect(Number(await queryValue("select count(*) from public.research_events where task_id=:'id' and event='resumed'",{id:taskId}))).toBe(1);
});
it('preserves a durable prerequisite HOLD when a resumed research result is degraded',async()=>{
 model.run.mockImplementationOnce(async()=>({
  decision:{verdict:'partial',materials:[],gaps:['synthetic source unavailable'],confidence:0.5},
  degraded:true,researchLeads:[]
 }));
 const result=await resumeResearchTask(taskId);
 expect(result).toMatchObject({status:'hold',holdReason:'research_prerequisites',
  missingRequirements:['SOURCE_OR_QUALIFICATION_UNAVAILABLE']});
 const [row]=await queryRows("select status,checkpoint from public.research_tasks where task_id=:'id'",{id:taskId});
 expect(row.status).toBe('hold');
 expect((row.checkpoint as {holdReason:string;budgetSpent:number;reserved:number}).holdReason).toBe('research_prerequisites');
 expect((row.checkpoint as {budgetSpent:number}).budgetSpent).toBe(0);
 expect((row.checkpoint as {reserved:number}).reserved).toBe(0);
 expect(Number(await queryValue("select count(*) from public.research_events where task_id=:'id' and event='research_done'",{id:taskId}))).toBe(0);
 expect(model.run).toHaveBeenCalledTimes(1);
});
it('leaves a non-replayable durable HOLD if the claimed task fails before tool execution',async()=>{
 await run(`create function control.test_resume_event_reject() returns trigger language plpgsql set search_path=pg_catalog as $$begin
 if new.event='resumed' then raise exception 'SYNTHETIC_EVENT_WRITE_FAILURE';end if;return new;end$$;
 create trigger test_resume_event_reject before insert on public.research_events for each row execute function control.test_resume_event_reject()`);
 try {
  expect(await resumeResearchTask(taskId)).toMatchObject({status:'hold',holdReason:'research_failed_review_required'});
  expect(model.run).not.toHaveBeenCalled();
  const [row]=await queryRows("select checkpoint from public.research_tasks where task_id=:'id'",{id:taskId});
  const cp=row.checkpoint as unknown as {retry_requires_reconciliation:boolean;resume_claim_ref:string};
  expect(cp.retry_requires_reconciliation).toBe(true);expect(cp.resume_claim_ref).toMatch(/^[a-f0-9-]{36}$/);
  expect(await resumeResearchTask(taskId)).toMatchObject({status:'hold',holdReason:'reconciliation_required'});
  expect(model.run).not.toHaveBeenCalled();
 } finally {await run('drop trigger test_resume_event_reject on public.research_events; drop function control.test_resume_event_reject()');}
});
