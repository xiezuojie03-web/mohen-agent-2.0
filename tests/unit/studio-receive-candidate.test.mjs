import {it,expect,vi} from 'vitest';
import * as receiverModule from '../../packages/data-access/src/studio-receive-candidate.mjs';
import {originalHash} from '../../packages/data-access/src/private-original-storage.mjs';

const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const hash='a'.repeat(64),future=()=>new Date(Date.now()+60000).toISOString();
const bytes=Buffer.from('序言：历史原文。尾注','utf8'),quote='历史原文';
const source={original_id:id,source_version_id:id,raw_item_id:id,raw_sha256:originalHash(bytes)};
const candidate={schema:'mohen.studio-stage-candidate-ref.v1',run_id:id,stage:'D01',job_id:'reading',reviewer_binding_ref:'reviewer-G1',consumer:'producer',object_type:'read_unit',object_id:id,artifact_revision:hash,input_digest:hash,output_digest:hash};
const context=()=>({actor_id:id,project_id:id,consumer:'producer',purpose:{namespace:'studio',code:'research',version:'1'},scope:{project_id:id},policy_version:'p1',profile_version:'text-v1',token:'private-session'});
const item=()=>({schema:'mohen.studio-receive-item.v1',candidate_ref:{...candidate},source:{...source},provenance:{kind:'tool_candidate',provider:'fixture',engine_version:'1'},extent:{kind:'utf8_byte_range/v1',start_byte:Buffer.byteLength('序言：'),end_byte:Buffer.byteLength('序言：'+quote),quote_sha256:originalHash(Buffer.from(quote))},original_quote:quote,transcription_candidate:null,interpretation:null,operation:'internal_candidate_read'});
function fixture(overrides={}){
 const one=item();
 const request={delegation:{delegation_id:id,request_hash:hash,provider:'fixture',engine_version:'1',expires_at:future(),requester:id,project_id:id,policy_version:'p1',input_manifest:{source_refs:[source]},allowed_actions:['internal_candidate_read']},receipt:{receipt_id:id,delegation_id:id,request_hash:hash,actual_provider:'fixture',actual_engine_version:'1',candidate_refs:[{...one.candidate_ref}],cost:null,cost_confidence:'UNKNOWN'},items:[one]};
 const evidence=(schema,r,extra)=>({schema,request_fingerprint:r.request_fingerprint,decision_id:id,current:true,valid_until:future(),...extra});
 const dependencies={
  readOriginal:async()=>({record:{original_id:id,project_id:id,state:'STORED_VERIFIED',content_type:'text/plain',byte_size:bytes.length,sha256:source.raw_sha256},bytes:Buffer.from(bytes)}),
  verifySource:async r=>evidence('mohen.studio-source-current.v1',r,{matches:true}),
  checkRights:async r=>evidence('mohen.studio-rights-current.v1',r,{decision:'ALLOW',explicit_transfer:false}),
  resolveLineage:async r=>evidence('mohen.studio-lineage-current.v1',r,{family_id:'family-1',lineage_refs:[{...source}]}),
  verifySemantics:async r=>evidence('mohen.studio-semantic-current.v1',r,{result:'PASS'}),
  verifyCurrent:async()=>({...candidate,schema:'mohen.independent-gate-current-receipt.v1',gate_code:'G1',gate_audit_id:id,qualification_current:true,decision_origin:'independent_gate',result:'PASS',valid_until:future()}),
  ...overrides,
 };
 return {request,dependencies,ctx:context(),receive:()=>receiverModule.createStudioCandidateReceiver(dependencies).receive(request,context())};
}
it('exports the bounded candidate receiver factory',()=>{
 expect(typeof receiverModule.createStudioCandidateReceiver).toBe('function');
});
it('accepts only as private producer candidate after actual UTF8 bytes and all current checks',async()=>{
 const f=fixture(),before=JSON.stringify(f.request),r=await f.receive();
 expect(r.state).toBe('HOLD');expect(r.items[0].state).toBe('accept');
 expect(r.items[0].acceptance).toBe('ACCEPT_AS_CANDIDATE');expect(r.items[0].checks.T7).toBe('VERIFIED_CURRENT');
 expect(r.execution_authorized).toBe(false);expect(r.knowledge_use_authorized).toBe(false);
 expect(r.items[0].knowledge_use_authorized).toBe(false);expect(r.independent_family_count).toBe(1);
 for(const k of ['input_fingerprint','request_fingerprint','result_fingerprint'])expect(r[k]).toMatch(/^[a-f0-9]{64}$/);
 expect(JSON.stringify(f.request)).toBe(before);expect(JSON.stringify(r)).not.toContain(quote);expect(JSON.stringify(r)).not.toContain('private-session');
});
it('rejects envelope identity/provider/version, source revision and foreign consumer mismatches without reading bytes',async()=>{
 for(const mutate of [f=>f.request.receipt.request_hash='b'.repeat(64),f=>f.request.receipt.actual_provider='foreign',f=>f.request.receipt.actual_engine_version='2',f=>f.request.delegation.expires_at='2000-01-01',f=>f.request.items[0].source.raw_sha256=hash,f=>f.ctx.consumer='agent',f=>f.request.items[0].provenance.provider='foreign',f=>f.request.items[0].candidate_ref.object_id=other]){
  const read=vi.fn(),f=fixture({readOriginal:read});mutate(f);
  const r=await receiverModule.createStudioCandidateReceiver(f.dependencies).receive(f.request,f.ctx);
  expect(r.items[0].state).toBe('reject');expect(read).not.toHaveBeenCalled();
 }
});
it('quarantines tampered bytes, hash, quote, split UTF8 locator and voice collision',async()=>{
 for(const mutate of [f=>f.dependencies.readOriginal=async()=>({record:{original_id:id,project_id:id,state:'STORED_VERIFIED',content_type:'text/plain',byte_size:bytes.length,sha256:source.raw_sha256},bytes:Buffer.alloc(bytes.length)}),f=>f.request.items[0].original_quote='解释冒原文',f=>f.request.items[0].extent.start_byte++,f=>f.request.items[0].extent.quote_sha256=hash,f=>f.request.items[0].original_quote={kind:'interpretation',text:quote},f=>f.request.items[0].transcription_candidate={kind:'original',text:quote}]){
  const f=fixture();mutate(f);const r=await f.receive();expect(r.items[0].state).toBe('quarantine');
 }
});
it('does not accept unverified booleans or trust the envelope transfer decision',async()=>{
 for(const dependency of ['verifySource','checkRights','resolveLineage','verifySemantics']){
  const f=fixture({[dependency]:async()=>true});f.request.delegation.transfer_rights_decision={decision:'ALLOW',verified:true};
  const r=await f.receive();expect(r.items[0].state).toBe('hold');
 }
 for(const decision of ['DENY','UNKNOWN']){
  const f=fixture();const original=f.dependencies.checkRights;f.dependencies.checkRights=async r=>({...await original(r),decision});
  expect((await f.receive()).items[0].state).toBe(decision==='DENY'?'reject':'hold');
 }
});
it('requires explicit trusted thirdparty transfer permission separately from internal candidate read',async()=>{
 const f=fixture();f.request.items[0].operation='thirdparty_transfer';f.request.delegation.allowed_actions.push('thirdparty_transfer');
 f.request.items[0].transfer_target={provider:'external',purpose:'transcription'};
 f.request.delegation.transfer_rights_decision={decision:'ALLOW',verified:true};
 expect((await f.receive()).items[0].state).toBe('reject');
 const check=f.dependencies.checkRights;f.dependencies.checkRights=async r=>({...await check(r),explicit_transfer:true});
 expect((await f.receive()).items[0].state).toBe('accept');
});
it('holds absent or unsupported semantics and expires or changes exact trusted evidence',async()=>{
 for(const dependency of ['verifySource','checkRights','resolveLineage','verifySemantics']){
  for(const change of [{request_fingerprint:hash},{valid_until:'2000-01-01'},{current:false}]){
   const f=fixture(),original=f.dependencies[dependency];f.dependencies[dependency]=async r=>({...await original(r),...change});
   expect((await f.receive()).items[0].state).toBe('hold');
  }
 }
 const f=fixture({verifySemantics:undefined});expect((await f.receive()).items[0].state).toBe('hold');
 const g=fixture();const original=g.dependencies.verifySemantics;g.dependencies.verifySemantics=async r=>({...await original(r),result:'UNSUPPORTED'});
 expect((await g.receive()).items[0].state).toBe('hold');
});
it('uses unchanged T7 for changed refs, revocation, foreign consumer proof and per-item request_stage',async()=>{
 for(const change of [{object_id:other},{artifact_revision:'changed'},{consumer:'agent'},{qualification_current:false},{valid_until:'2000-01-01'}]){
  const f=fixture(),original=f.dependencies.verifyCurrent;f.dependencies.verifyCurrent=async r=>({...await original(r),...change});
  expect((await f.receive()).items[0].state).toBe('request_stage');
 }
 const f=fixture({verifyCurrent:undefined});expect((await f.receive()).items[0].state).toBe('hold');
});
it('counts duplicate source families once and one bad item never changes package HOLD',async()=>{
 const f=fixture();f.request.items.push(item(),{...item(),original_quote:'bad'});f.request.receipt.candidate_refs.push(candidate,candidate);
 const r=await f.receive();expect(r.items.map(x=>x.state)).toEqual(['accept','accept','quarantine']);
 expect(r.independent_family_count).toBe(1);expect(r.state).toBe('HOLD');
});
it('does not leak raw callback errors and holds a stalled callback within one shared deadline',async()=>{
 const f=fixture({readOriginal:async()=>{throw Error('private SQL credential + body');}});
 const r=await f.receive();expect(r.items[0].state).toBe('hold');expect(JSON.stringify(r)).not.toContain('private SQL');
 const g=fixture({readOriginal:vi.fn(()=>new Promise(()=>{})),timeoutMs:25});g.request.items.push(item());g.request.receipt.candidate_refs.push(candidate);
 const started=Date.now(),slow=await g.receive();expect(Date.now()-started).toBeLessThan(500);
 expect(slow.items.every(i=>i.state==='hold')).toBe(true);expect(g.dependencies.readOriginal).toHaveBeenCalledTimes(1);
});
it('bounds the batch and timeout before invoking dependencies',async()=>{
 const f=fixture();f.request.items=Array.from({length:17},item);
 await expect(f.receive()).rejects.toThrow('STUDIO_RECEIVE_LIMIT');
 expect(()=>receiverModule.createStudioCandidateReceiver({timeoutMs:10001})).toThrow('STUDIO_RECEIVE_TIMEOUT_INVALID');
});
it('does not start another callback after the shared timer fires before the wall clock deadline',async()=>{
 vi.useFakeTimers();
 const now=Date.now();const clock=vi.spyOn(Date,'now').mockReturnValue(now);
 try{
  const f=fixture({readOriginal:vi.fn(()=>new Promise(()=>{})),timeoutMs:25});
  f.request.items.push(item());f.request.receipt.candidate_refs.push({...candidate});
  const pending=f.receive();await vi.runAllTimersAsync();const result=await pending;
  expect(result.items.every(i=>i.state==='hold')).toBe(true);
  expect(f.dependencies.readOriginal).toHaveBeenCalledTimes(1);
 }finally{clock.mockRestore();vi.useRealTimers();}
});
it('withdraws earlier acceptance if a later item exhausts the shared timer with a steady wall clock',async()=>{
 vi.useFakeTimers();const clock=vi.spyOn(Date,'now').mockReturnValue(Date.now());
 try{
  const f=fixture({timeoutMs:25}),read=f.dependencies.readOriginal;
  f.dependencies.readOriginal=vi.fn().mockImplementationOnce(read).mockImplementation(()=>new Promise(()=>{}));
  f.request.items.push(item());f.request.receipt.candidate_refs.push({...candidate});
  const pending=f.receive();await vi.runAllTimersAsync();const result=await pending;
  expect(result.items.every(i=>i.state==='hold')).toBe(true);expect(result.independent_family_count).toBe(0);
 }finally{clock.mockRestore();vi.useRealTimers();}
});
it.each([25,10000])('T7 timeout %s also exhausts the shared budget before another item reads bytes',async timeoutMs=>{
 vi.useFakeTimers();const clock=vi.spyOn(Date,'now').mockReturnValue(Date.now());
 try{
  const f=fixture({verifyCurrent:vi.fn(()=>new Promise(()=>{})),timeoutMs});
  f.dependencies.readOriginal=vi.fn(f.dependencies.readOriginal);
  f.request.items.push(item());f.request.receipt.candidate_refs.push({...candidate});
  const pending=f.receive();await vi.runAllTimersAsync();const result=await pending;
  expect(result.items.every(i=>i.state==='hold')).toBe(true);
  expect(f.dependencies.readOriginal).toHaveBeenCalledTimes(1);expect(f.dependencies.verifyCurrent).toHaveBeenCalledTimes(1);
 }finally{clock.mockRestore();vi.useRealTimers();}
});
it('does not count conflicting family labels for the same source as independent witnesses',async()=>{
 const f=fixture(),resolve=f.dependencies.resolveLineage;let call=0;
 f.dependencies.resolveLineage=async r=>({...await resolve(r),family_id:'family-'+(++call)});
 f.request.items.push(item());f.request.receipt.candidate_refs.push({...candidate});
 const r=await f.receive();expect(r.items.every(i=>i.state==='accept')).toBe(true);
 expect(r.independent_family_count).toBe(1);
});
it('rechecks earlier T7 qualification expiry when a later item completes',async()=>{
 vi.useFakeTimers();
 try{
  vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  const f=fixture(),verify=f.dependencies.verifyCurrent;let call=0;
  f.dependencies.verifyCurrent=async r=>{
   const proof=await verify(r);
   if(++call===1)return {...proof,valid_until:new Date(Date.now()+10).toISOString()};
   vi.setSystemTime(new Date(Date.now()+20));return proof;
  };
  f.request.items.push(item());f.request.receipt.candidate_refs.push({...candidate});
  const result=await f.receive();
  expect(result.items.map(i=>i.state)).toEqual(['hold','accept']);
  expect(result.items[0].acceptance).toBe(null);
  expect(result.items[0].code).toBe('CURRENT_EVIDENCE_EXPIRED');
 }finally{vi.useRealTimers();}
});
