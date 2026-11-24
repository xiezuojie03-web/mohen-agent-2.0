import {expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {retrieveMaterials} from '../../apps/web/lib/mohen-agent/retrieve';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_DATABASE:database,MOHEN_RETRIEVE_STORY:story,MOHEN_RETRIEVE_PHASE:phase}=process.env;
const localTcpHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:undefined;
const socket=localTcpHost??process.env.MOHEN_TEST_SOCKET;
if(!psql||!(localTcpHost||socket?.startsWith('/workspace/'))||!/^mohen_k3_[a-z0-9_]*test$/.test(database??'')||!story||!['current','revoked'].includes(phase??''))throw Error('MARKED_RETRIEVE_DATABASE_REQUIRED');
const sql=(input:string)=>execFileSync(psql!,['-X','-q','-At','-v','ON_ERROR_STOP=1','-h',socket!,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database!],{input,encoding:'utf8'}).trim();
const context={consumer:'visual_stage' as const,purpose:{namespace:'G5',code:'fixture',version:'1'},scope:{project:'fixture'}};
it('marked PG proves exact current G5 retrieval and recursive revocation without mock grants',async()=>{
 expect(sql("select current_setting('mohen.test_instance',true)")).toBe('codex-k3-isolated');
 expect(await retrieveMaterials([],12)).toEqual({materials:[],degraded:true,coverage:'UNAVAILABLE'});
 const result=await retrieveMaterials([],24,{qualification:context} as never);
 expect(result.degraded).toBe(false);
 if(phase==='current')expect(result.materials.map(m=>m.id)).toContain(story);
 else expect(result.materials).toEqual([]);
 for(const qualification of [{...context,consumer:'agent'},{...context,purpose:{...context.purpose,code:'foreign'}},{...context,scope:{project:'foreign'}}]){
  expect((await retrieveMaterials([],24,{qualification} as never)).materials).toEqual([]);
 }
 const legacy=await retrieveMaterials(['legacy'],24,{qualification:context} as never);
 expect(legacy.materials).toEqual([]);
 console.log('MAB_M5_RETRIEVE_'+phase.toUpperCase()+'_PASS real-PG exact-consumer-purpose-scope legacy-denied');
});
