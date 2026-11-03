import {expect,it,vi} from 'vitest';
import {createHash,createHmac} from 'node:crypto';
import {createPrivateTextReadingRepository} from '../../packages/data-access/src/private-text-reading-repository.mjs';

const id='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222';
const bytes=Buffer.from('桥边有市。合成字节。'),quote='桥边有市。';
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const extent={kind:'utf8_byte_range/v1',source_version_id:id,raw_item_id:id,start_byte:0,
  end_byte:Buffer.byteLength(quote),raw_sha256:sha(bytes),quote_sha256:sha(quote)};
const record={original_id:id,project_id:project,state:'STORED_VERIFIED',content_type:'text/plain',
  sha256:sha(bytes),byte_size:bytes.length};
const input={runId:id,originalId:id,extent,quote,record,bytes};
const key='synthetic-private-reading-verifier-at-least-32';
function fixture(){
 const client={query:vi.fn(async(sql:string,args:any[])=>{
   if(sql.includes('current_app_user_id'))return {rows:[{user_id:id}]};
   if(sql.includes('persist_private_text_reading')){
     const token=args[7],encoded=token.split('.')[0];
     const claims=JSON.parse(Buffer.from(encoded,'base64url').toString());
     expect(token.split('.')[1]).toBe(createHmac('sha256',key).update(encoded).digest('hex'));
     expect(claims).toMatchObject({kind:'MOHEN_PRIVATE_TEXT_READING_V1',uid:id,project_id:project,
       original_id:id,run_id:id,extent,quote,kid:'fixture-v1'});
     expect(claims.exp-claims.iat).toBe(30000);
     return {rows:[{reading:{read_run_id:args[1],read_unit_id:args[2],artifact_revision:'a'.repeat(64),request_digest:args[3]}}]};
   }
   return {rows:[]};
 }),release:vi.fn()};
 const pool={connect:vi.fn(async()=>client)};
 return {pool,client,repository:createPrivateTextReadingRepository(pool,{verificationKey:key,keyVersion:'fixture-v1'})};
}
it('persists exact verified bytes in an Owner transaction with a separate domain attestation and stable IDs',async()=>{
 const {repository,client}=fixture();
 const a=await repository.save(input,'signed-owner');
 const b=await repository.save({...input,extent:{...extent}},'signed-owner');
 expect(a).toEqual(b);expect(a.qualification).toBe('UNASSESSED');
 expect(a.read_unit_id).toMatch(/^[a-f0-9-]{36}$/);expect(a.request_digest).toMatch(/^[a-f0-9]{64}$/);
 expect(client.query).toHaveBeenCalledWith("select set_config('mohen.session_token',$1,true)",['signed-owner']);
 expect(client.query.mock.calls.at(-1)?.[0]).toBe('commit');
});
it('rejects fake bytes, state, source hashes and locators before any transaction',async()=>{
 const {repository,pool}=fixture();
 for(const bad of [{...input,bytes:Buffer.from('fake')},{...input,record:{...record,state:'PENDING'}},
   {...input,extent:{...extent,quote_sha256:'b'.repeat(64)}},
   {...input,extent:{...extent,start_byte:1}},{...input,runId:'bad'},
   {...input,record:{...record,original_id:project}}])
   await expect(repository.save(bad,'signed-owner')).rejects.toThrow();
 expect(pool.connect).not.toHaveBeenCalled();
});
it('does not report candidate persistence without the actual immutable row revision',async()=>{
 const {repository,client}=fixture();
 client.query.mockImplementation(async sql=>sql.includes('current_app_user_id')?{rows:[{user_id:id}]}:{rows:[]});
 await expect(repository.save(input,'signed-owner')).rejects.toThrow('PRIVATE_READING_NOT_PERSISTED');
 expect(client.query.mock.calls.at(-1)?.[0]).toBe('rollback');
});
