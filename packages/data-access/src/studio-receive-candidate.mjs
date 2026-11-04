// Server-only, read-only ReceiveCandidate. This never signs a Gate, writes a
// knowledge layer, dispatches a provider, or grants execution/consumption.
import {assessStudioReceiptCandidates} from './studio-candidate-assessment.mjs';
import {originalHash,MAX_ORIGINAL_BYTES} from './private-original-storage.mjs';
import {requireQualifiedReadContext} from './qualification-read-context.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const field=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128;
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v!==null&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const digest=v=>originalHash(Buffer.from(canonical(v),'utf8'));
const same=(a,b)=>canonical(a)===canonical(b);
function frozen(v){if(v&&typeof v==='object'){Object.values(v).forEach(frozen);Object.freeze(v);}return v;}
function snapshot(value){
 try{const text=JSON.stringify(value);if(!text||Buffer.byteLength(text)>1_000_000)throw Error();return frozen(JSON.parse(text));}
 catch{throw Error('STUDIO_RECEIVE_INVALID');}
}
const validSource=s=>s&&[s.original_id,s.source_version_id,s.raw_item_id].every(x=>typeof x==='string'&&UUID.test(x))&&SHA.test(s.raw_sha256??'')&&Object.keys(s).length===4;
const future=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&Date.parse(x)>Date.now();
const voice=(v,kind)=>v===null||(v&&v.kind===kind&&typeof v.text==='string'&&Buffer.byteLength(v.text)<=32768&&Object.keys(v).length===2);
function contextSnapshot(context){
 const safe=snapshot({actor_id:context?.actor_id,project_id:context?.project_id,consumer:context?.consumer,
  purpose:context?.purpose,scope:context?.scope,policy_version:context?.policy_version,profile_version:context?.profile_version});
 try{requireQualifiedReadContext(safe);}catch{return null;}
 if(!UUID.test(safe.actor_id??'')||!UUID.test(safe.project_id??'')||safe.consumer!=='producer'||!field(safe.policy_version)||!field(safe.profile_version))return null;
 return safe;
}

/** Dependencies must be server constructed current authorities. Envelopes may
 * supply claims, never authority callbacks. See receive-report.md for evidence. */
export function createStudioCandidateReceiver(dependencies={}){
 const {readOriginal,verifySource,checkRights,resolveLineage,verifySemantics,verifyCurrent,timeoutMs=5000}=dependencies;
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('STUDIO_RECEIVE_TIMEOUT_INVALID');
 return {async receive(input,context){
  if(!Array.isArray(input?.items))throw Error('STUDIO_RECEIVE_INVALID');
  if(input.items.length>16)throw Error('STUDIO_RECEIVE_LIMIT');
  const deadline=Date.now()+timeoutMs;
  const {delegation,receipt,items}=snapshot(input);
  if(!delegation||!receipt||!Array.isArray(receipt.candidate_refs)||receipt.candidate_refs.length>16)throw Error('STUDIO_RECEIVE_INVALID');
  const safe=contextSnapshot(context),callbackContext=frozen({...safe,...(context?.token!==undefined?{token:context.token}:{})});
  const inputFingerprint=digest({delegation,receipt,items});
  const requestFingerprint=digest({input_fingerprint:inputFingerprint,context:safe});
  const output=[],expiries=[],lineages=new Map();let timedOut=false;
  async function call(fn,...args){
   if(typeof fn!=='function'||timedOut||Date.now()>=deadline)return null;
   let timer;
   try{return await Promise.race([Promise.resolve().then(()=>fn(...args)),new Promise(resolve=>{timer=setTimeout(()=>{timedOut=true;resolve(null);},Math.max(1,deadline-Date.now()));})]);}
   catch{return null;}finally{clearTimeout(timer);}
  }
  for(let index=0;index<items.length;index++){
   const item=items[index],checks={T1:'SOURCE_UNVERIFIED',T2:'NOT_VERIFIED',T3:'NOT_VERIFIED',T4:'NOT_VERIFIED',T5:'NOT_VERIFIED',T6:'NOT_VERIFIED',T7:'NOT_VERIFIED'};
   const row={index,state:'hold',acceptance:null,knowledge_use_authorized:false,checks,evidence_refs:{},item_fingerprint:digest(item)};
   output.push(row);
   const fail=(state,code)=>{row.state=state;row.code=code;};
   if(timedOut||Date.now()>=deadline){fail('hold','RECEIVE_DEADLINE');continue;}
   const source=item?.source,sourceRefs=delegation.input_manifest?.source_refs;
   const bound=safe&&UUID.test(receipt.receipt_id??'')&&delegation.requester===safe.actor_id&&delegation.project_id===safe.project_id&&
    delegation.policy_version===safe.policy_version&&future(delegation.expires_at)&&field(delegation.provider)&&field(delegation.engine_version)&&
    item?.schema==='mohen.studio-receive-item.v1'&&validSource(source)&&Array.isArray(sourceRefs)&&sourceRefs.length<=16&&
    sourceRefs.every(validSource)&&sourceRefs.some(s=>same(s,source))&&items.length===receipt.candidate_refs.length&&
    same(item.candidate_ref,receipt.candidate_refs[index])&&item.provenance?.kind==='tool_candidate'&&
    item.provenance.provider===delegation.provider&&item.provenance.engine_version===delegation.engine_version&&
    ['internal_candidate_read','thirdparty_transfer'].includes(item.operation)&&
    Array.isArray(delegation.allowed_actions)&&delegation.allowed_actions.includes(item.operation)&&
    (item.operation!=='thirdparty_transfer'||(field(item.transfer_target?.provider)&&field(item.transfer_target?.purpose)));
   if(!bound){fail('reject','BINDING_NOT_VERIFIED');continue;}
   // Reuse T7's existing candidate-ref schema/delegation binding validation even
   // before byte reads. No new parallel definition of Gate candidate validity.
   const preflight=await assessStudioReceiptCandidates({delegation,receipt:{...receipt,candidate_refs:[item.candidate_ref]},timeoutMs:Math.max(1,deadline-Date.now())});
   if(preflight.items[0]?.checks.T1!=='BINDING_MATCHED'){fail('reject','BINDING_NOT_VERIFIED');continue;}
   const makeRequest=check=>{
    const request={check,delegation_id:delegation.delegation_id,receipt_id:receipt.receipt_id,delegation_request_hash:delegation.request_hash,
     ...safe,source,operation:item.operation,transfer_target:item.transfer_target??null,candidate_ref:item.candidate_ref,item_fingerprint:row.item_fingerprint};
    return frozen({...request,request_fingerprint:digest(request)});
   };
   const validEvidence=(proof,schema,request)=>proof?.schema===schema&&proof.request_fingerprint===request.request_fingerprint&&
    UUID.test(proof.decision_id??'')&&proof.current===true&&future(proof.valid_until)&&future(delegation.expires_at)&&Date.now()<deadline;
   const audit=(check,proof,request)=>{row.evidence_refs[check]={decision_id:proof.decision_id,request_fingerprint:request.request_fingerprint,valid_until:proof.valid_until};expiries.push({row,until:proof.valid_until});};
   const sourceRequest=makeRequest('source'),sourceProof=await call(verifySource,sourceRequest,callbackContext);
   if(!validEvidence(sourceProof,'mohen.studio-source-current.v1',sourceRequest)||sourceProof.matches!==true){fail('hold','SOURCE_UNVERIFIED');continue;}
   audit('T1',sourceProof,sourceRequest);checks.T1='SOURCE_VERIFIED';
   if(typeof item.original_quote!=='string'||Buffer.byteLength(item.original_quote)<1||Buffer.byteLength(item.original_quote)>32768||
     !voice(item.transcription_candidate,'transcription_candidate')||!voice(item.interpretation,'interpretation')){
    checks.T4='VOICE_COLLISION';fail('quarantine','VOICE_COLLISION');continue;
   }
   checks.T4='VOICES_SEPARATED';
   const read=await call(readOriginal,source.original_id,callbackContext);
   if(!read){fail('hold','ORIGINAL_UNAVAILABLE');continue;}
   const record=read.record;
   if(record?.content_type!=='text/plain'){fail('hold','SOURCE_MEDIA_UNSUPPORTED');continue;}
   if(record.original_id!==source.original_id||record.project_id!==safe.project_id||record.state!=='STORED_VERIFIED'||
     !Buffer.isBuffer(read.bytes)||read.bytes.length<1||read.bytes.length>MAX_ORIGINAL_BYTES||record.byte_size!==read.bytes.length||
     record.sha256!==source.raw_sha256||originalHash(read.bytes)!==source.raw_sha256){
    checks.T2='ORIGINAL_INTEGRITY_FAILED';fail('quarantine','ORIGINAL_INTEGRITY_FAILED');continue;
   }
   const bytes=Buffer.from(read.bytes),extent=item.extent;
   if(extent?.kind!=='utf8_byte_range/v1'||!Number.isSafeInteger(extent.start_byte)||!Number.isSafeInteger(extent.end_byte)||extent.start_byte<0||
     extent.end_byte<=extent.start_byte||extent.end_byte>bytes.length||extent.end_byte-extent.start_byte>32768){
    checks.T2='LOCATOR_UNVERIFIED';fail('quarantine','LOCATOR_UNVERIFIED');continue;
   }
   const selected=bytes.subarray(extent.start_byte,extent.end_byte);
   if(!Buffer.from(selected.toString('utf8'),'utf8').equals(selected)||!Buffer.from(item.original_quote,'utf8').equals(selected)||originalHash(selected)!==extent.quote_sha256){
    checks.T2='QUOTE_MISMATCH';fail('quarantine','QUOTE_MISMATCH');continue;
   }
   checks.T2='BYTES_LOCATOR_VERIFIED';
   const rightsRequest=makeRequest('rights'),rights=await call(checkRights,rightsRequest,callbackContext);
   if(!validEvidence(rights,'mohen.studio-rights-current.v1',rightsRequest)||!['ALLOW','DENY','UNKNOWN'].includes(rights.decision)||typeof rights.explicit_transfer!=='boolean'){
    checks.T3='RIGHTS_UNKNOWN';fail('hold','RIGHTS_UNKNOWN');continue;
   }
   audit('T3',rights,rightsRequest);
   if(rights.decision==='DENY'||(item.operation==='thirdparty_transfer'&&rights.explicit_transfer!==true)){
    checks.T3='RIGHTS_DENIED';fail('reject','RIGHTS_DENIED');continue;
   }
   if(rights.decision!=='ALLOW'){checks.T3='RIGHTS_UNKNOWN';fail('hold','RIGHTS_UNKNOWN');continue;}
   checks.T3='RIGHTS_VERIFIED';
   const lineageRequest=makeRequest('lineage'),lineage=await call(resolveLineage,lineageRequest,callbackContext);
   if(!validEvidence(lineage,'mohen.studio-lineage-current.v1',lineageRequest)||!field(lineage.family_id)||!Array.isArray(lineage.lineage_refs)||
     lineage.lineage_refs.length<1||lineage.lineage_refs.length>16||!lineage.lineage_refs.every(validSource)||!lineage.lineage_refs.some(s=>same(s,source))){
    checks.T5='DEPENDENCY_UNRESOLVED';fail('hold','DEPENDENCY_UNRESOLVED');continue;
   }
   audit('T5',lineage,lineageRequest);checks.T5='LINEAGE_VERIFIED';row.source_family_id=lineage.family_id;
   lineages.set(row,new Set(lineage.lineage_refs.map(digest)));
   const semanticRequest=makeRequest('semantics'),semantic=await call(verifySemantics,semanticRequest,callbackContext);
   if(!validEvidence(semantic,'mohen.studio-semantic-current.v1',semanticRequest)||!['PASS','CONFLICT','UNSUPPORTED'].includes(semantic.result)){
    checks.T6='NOT_VERIFIED';fail('hold','SEMANTIC_UNVERIFIED');continue;
   }
   audit('T6',semantic,semanticRequest);
   if(semantic.result==='CONFLICT'){checks.T6='SEMANTIC_CONFLICT';fail('quarantine','SEMANTIC_CONFLICT');continue;}
   if(semantic.result!=='PASS'){checks.T6='UNSUPPORTED';fail('hold','SEMANTIC_UNVERIFIED');continue;}
   checks.T6='SEMANTICS_VERIFIED';
   if(Date.now()>=deadline){fail('hold','RECEIVE_DEADLINE');continue;}
   let qualification;
   const assessment=await call(()=>assessStudioReceiptCandidates({delegation,receipt:{...receipt,candidate_refs:[item.candidate_ref]},
    verifyCurrent:typeof verifyCurrent==='function'?async request=>{
     const proof=await call(verifyCurrent,request,callbackContext);
     if(proof===null)return null;
     qualification=snapshot(proof);return qualification;
    }:undefined,
    // Authority I/O is bounded by the shared call() timer. Keep the inner
    // validator timer longer so it cannot expire without exhausting the batch.
    timeoutMs:10000}));
   if(!assessment||timedOut){fail('hold','RECEIVE_DEADLINE');continue;}
   checks.T7=assessment.items[0].checks.T7;
   if(checks.T7!=='VERIFIED_CURRENT'){fail(checks.T7==='NOT_VERIFIED'?'hold':'request_stage',checks.T7==='NOT_VERIFIED'?'QUALIFICATION_UNVERIFIED':'WAITING_GATE');continue;}
   row.evidence_refs.T7={gate_audit_id:qualification.gate_audit_id,valid_until:qualification.valid_until};
   expiries.push({row,until:qualification.valid_until});
   row.state='accept';row.acceptance='ACCEPT_AS_CANDIDATE';row.code='CANDIDATE_VERIFIED';
  }
  // A long later item must not leave an already-expired earlier proof accepted.
  for(const row of output){
   if(row.state==='accept'&&(timedOut||!future(delegation.expires_at)||Date.now()>=deadline||expiries.some(e=>e.row===row&&!future(e.until)))){
    row.state='hold';row.acceptance=null;row.code='CURRENT_EVIDENCE_EXPIRED';
   }
  }
  // A source appearing under inconsistent family labels still cannot become
  // multiple independent witnesses. Merge overlapping trusted lineages too.
  const families=[];
  for(const row of output.filter(r=>r.state==='accept')){
   const group={ids:new Set([row.source_family_id]),refs:new Set(lineages.get(row))};
   for(let i=families.length-1;i>=0;i--){
    const other=families[i];
    if([...group.ids].some(id=>other.ids.has(id))||[...group.refs].some(ref=>other.refs.has(ref))){
     other.ids.forEach(id=>group.ids.add(id));other.refs.forEach(ref=>group.refs.add(ref));families.splice(i,1);
    }
   }
   families.push(group);
  }
  const result={schema:'mohen.studio-receive-candidate-result.v1',receipt_id:UUID.test(receipt.receipt_id??'')?receipt.receipt_id:null,
   state:'HOLD',execution_authorized:false,knowledge_use_authorized:false,input_fingerprint:inputFingerprint,request_fingerprint:requestFingerprint,
   independent_family_count:families.length,items:output};
  return {...result,result_fingerprint:digest(result)};
 }};
}
