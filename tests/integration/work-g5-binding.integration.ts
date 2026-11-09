import {afterAll,expect,it} from 'vitest';
import {getNodePgPool} from '@mohen/data-access';
import {requireCurrentWorkConsumerQualification,requireIndependentWorkPublicationG5} from '../../apps/web/lib/work-publish-qualification';
const {MOHEN_TEST_DATABASE:database,MOHEN_WORK_BINDING_FIXTURE:raw}=process.env;
const localTcpHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:undefined;
const socket=localTcpHost??process.env.MOHEN_TEST_SOCKET;
if(!(localTcpHost||socket?.startsWith('/workspace/'))||!/^mohen_k3_[a-z0-9_]*test$/.test(database??'')||!raw)throw Error('MARKED_WORK_BINDING_DATABASE_REQUIRED');
const fixture=JSON.parse(raw) as {work:string;revision:string;content:Record<string,unknown>};
const context={purpose:{namespace:'G5',code:'m5-http',version:'1'},scope:{project:'m5-http'}};
const consumers=['watch','visual_stage','agent','evidence_on_demand'] as const;
const config=()=>JSON.stringify(Object.fromEntries(consumers.map(c=>[c,context])));
afterAll(async()=>{await getNodePgPool().end();});
it('actual application wrapper checks each independently bound consumer and refuses missing or wrong server context',async()=>{
 const original=process.env.MOHEN_G5_CONTEXTS;
 try{
  process.env.MOHEN_G5_CONTEXTS=config();
  for(const consumer of consumers){
   expect(await requireCurrentWorkConsumerQualification(fixture.work,fixture.revision,consumer,fixture.content)).toEqual({ok:true});
   expect((await requireCurrentWorkConsumerQualification(fixture.work,fixture.work,consumer,fixture.content)).ok).toBe(false);
   expect((await requireCurrentWorkConsumerQualification(fixture.work,fixture.revision,consumer,{...fixture.content,beats:[]})).ok).toBe(false);
   process.env.MOHEN_G5_CONTEXTS=JSON.stringify({[consumer]:{...context,scope:{project:'foreign'}}});
   expect((await requireCurrentWorkConsumerQualification(fixture.work,fixture.revision,consumer,fixture.content)).ok).toBe(false);
   process.env.MOHEN_G5_CONTEXTS=config();
  }
  expect(await requireIndependentWorkPublicationG5(fixture.work,fixture.revision,fixture.content)).toEqual({ok:true});
  delete process.env.MOHEN_G5_CONTEXTS;
  for(const consumer of consumers)expect((await requireCurrentWorkConsumerQualification(fixture.work,fixture.revision,consumer,fixture.content)).ok).toBe(false);
  console.log('MAB_WORK_APPLICATION_WRAPPER_PG_PASS four-consumers exact-work wrong-context tamper no-config publication-watch');
 }finally{if(original===undefined)delete process.env.MOHEN_G5_CONTEXTS;else process.env.MOHEN_G5_CONTEXTS=original;}
});
