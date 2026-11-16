// Actual disposable PG17 G0 handoff: one synthetic Owner/Project/Root/Run,
// persisted D00 C01 original + source + candidate, dedicated independent machine
// signer, immutable exact stage binding, read-only current Gate projection and
// the very same current-qualification validator invoked by the Runner.
// No official Storage bytes, browser, paid model or cloud writes are claimed.
import assert from "node:assert/strict";
import { randomUUID,randomBytes,createHash,createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  createStudioAssetRepository,createPrivateOriginalRepository,
} from "../../packages/data-access/src/index.mjs";
import { createDataProductionRepository } from "../../packages/data-access/src/data-production-repository.mjs";
import { createGateAuthorityRepository } from "../../packages/data-access/src/gate-authority-repository.mjs";
import { createIndependentGateService } from "../../pipelines/data-production/orchestrator/independent-gate-service.mjs";
import { buildMethodPlanRefs } from "../../packages/data-access/src/method-plan-ref.mjs";
import { createRuleGateReviewer } from "../../tools/rule-gate-reviewer.mjs";
import {
  MACHINE_REVIEWER_USER_ID,MACHINE_SIGNER_LOGIN,mintMachineSessionToken,
} from "../../tools/machine-reviewer-session.mjs";
import { selectExactStageCandidate } from "../../tools/gate-stage-candidate-selection.mjs";
import { attestG0TextStageOutput } from "../../tools/gate-stage-output-attestation.mjs";
import { buildSourceIntakeInput } from "../../pipelines/data-production/orchestrator/orchestrator.mjs";
import { createRunState } from "../../pipelines/data-production/orchestrator/run-state.mjs";
import { requireIndependentStageQualification } from "../../pipelines/data-production/orchestrator/independent-stage-qualification.mjs";
import { executionDigest } from "../../pipelines/data-production/orchestrator/execution-authority.mjs";

const psql=process.env.MOHEN_TEST_PSQL,database=process.env.MOHEN_TEST_DATABASE;
const localHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:null;
const socket=localHost??process.env.MOHEN_TEST_SOCKET;
if(!psql||!(localHost||socket?.startsWith("/workspace/"))||
   !/^mohen_k3_[a-z0-9_]*test$/.test(database??""))throw Error("ISOLATED_TEST_DATABASE_REQUIRED");
const args=["-X","-q","-h",socket,"-p",process.env.MOHEN_TEST_PORT??"55432",
  "-U","k3_admin","-d",database,"-At","-v","ON_ERROR_STOP=1"];
const sql=text=>execFileSync(psql,args,{input:text,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),"codex-k3-isolated");
const {Pool}=createRequire(new URL("../../packages/data-access/package.json",import.meta.url))("pg");
const conn={host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),database,max:2};
const admin=new Pool({...conn,user:"k3_admin"});
const producerLogin="m5_root_producer_"+randomUUID().replaceAll("-","");
const readerLogin="m5_root_reader_"+randomUUID().replaceAll("-","");
const producer=new Pool({...conn,user:producerLogin,options:"-c role=mohen_producer"});
const machine=new Pool({...conn,user:MACHINE_SIGNER_LOGIN});
const reader=new Pool({...conn,user:readerLogin});
const uuid=()=>randomUUID();
const owner=uuid(),project=uuid(),root=uuid(),runId=uuid(),
  original=uuid(),asset=uuid(),source=uuid(),version=uuid(),raw=uuid();
const bytes=Buffer.from("Synthetic historical-text fixture: river crossing, no factual claims.\n","utf8");
const sha=createHash("sha256").update(bytes).digest("hex");
const key="m5-root-real-pg17-machine-session-key-2026";
const payload=Buffer.from(JSON.stringify({uid:owner,r:[],exp:Date.now()+600000})).toString("base64url");
const token=payload+"."+createHmac("sha256",key).update(payload).digest("base64url");
const machineToken=()=>mintMachineSessionToken({uid:MACHINE_REVIEWER_USER_ID,secret:key});
const methodPlan=buildMethodPlanRefs({methods:[{method_id:"C01",method_version:"v1"}]});
const scope={project_id:project,root_task_id:root,original_id:original,page_number:1};
const input=buildSourceIntakeInput({research_intent:"isolated same-root C01 Gate handoff",scope,
  consumer_method_plan:{methods:[{method_id:"C01",method_version:"v1"}]}});
const registry={
  status:"ACTIVE_AUTHORIZED",activation:{enabled:true},
  jobs:[{stage:"D00",exit_gate:"G0",job_id:"d00.source-intake",
    implementation:{gate_reviewer_binding:"m5-owner-reviewer-g0g1-producer"}}],
};
const job=registry.jobs[0],purpose={namespace:"data-production",code:"m5-remediation",version:"v1"};
function bind(sqlText,params={}){
  const values=[];
  const text=sqlText.replace(/:'([^']+)'/g,(_found,name)=>{
    values.push(params[name]);return "$"+values.length;
  });
  return {text,values};
}
const machineQuery=async(sqlText,params)=>{
  const b=bind(sqlText,params);
  return (await machine.query(b.text,b.values)).rows;
};
const authority=createGateAuthorityRepository(machine);
const stageOutput={schema:"mohen.private-evidence-stage-request.v1",stage:"D01",originalId:original,
  method_plan:methodPlan,text:{kind:"verified_utf8_full/v1",
    source_version_id:version,raw_item_id:raw,raw_sha256:sha}};
const reviewRequest={
  schema:"mohen.independent-gate-current-check.v1",run_id:runId,
  job_id:job.job_id,stage:"D00",gate_code:"G0",
  reviewer_binding_ref:job.implementation.gate_reviewer_binding,
  consumer:"producer",input_digest:executionDigest(input),output_digest:executionDigest(stageOutput),
};
const gateService=createIndependentGateService({signerPool:machine,readerPool:reader,databaseSessionKey:key});
const consumeCredential=randomBytes(32).toString("base64url");
const foreignCredential=randomBytes(32).toString("base64url");
const credentialHash=value=>createHash("sha256").update(value).digest("hex");
const consume=async(request,credential=consumeCredential)=>gateService(new Request("https://fixture.invalid/current",{
  method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+credential},
  body:JSON.stringify(request),
}));
const verify=async(request)=>{
  const response=await consume(request);
  if(response.status===200)return response.json();
  if(response.status===409||response.status===403)return null;
  throw Error("GATE_CONSUME_UNEXPECTED:"+response.status+":"+await response.text());
};
const stageCheck=({run,job,stage,gate,input_digest,output_digest})=>
  verify({...reviewRequest,run_id:run.run_id,job_id:job.job_id,stage,gate_code:gate,
    input_digest,output_digest,reviewer_binding_ref:job.implementation.gate_reviewer_binding});
const run=createRunState({research_intent:input.research_intent,scope,run_id:runId});
const runnerResult={disposition:"PASS",outputs:{qualified_source:stageOutput}};
const assertRunner=()=>requireIndependentStageQualification({
  context:{verifyStageQualification:stageCheck},run,stage:"D00",job,input,result:runnerResult,
});
try{
  sql("create role "+producerLogin+" login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;"+
    "grant mohen_producer to "+producerLogin+";"+
    "create role "+readerLogin+" login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;"+
    "grant mohen_gate_reader to "+readerLogin+";");
  await admin.query("insert into public.users(user_id,email,username,password_hash)values($1,$2,$3,'synthetic')",
    [owner,owner+"@example.invalid","isolated Root Owner"]);
  await admin.query("insert into control.session_verification_keys(verification_key)values($1) on conflict(key_slot) do update set verification_key=excluded.verification_key",[key]);
  const assets=createStudioAssetRepository(admin),originals=createPrivateOriginalRepository(admin);
  await assets.createProject({projectId:project,title:"Synthetic same-root M5 project",scope:{}},token);
  const rec=await originals.reserve({projectId:project,originalId:original,assetId:asset,
    idempotencyKey:"m5-root-g0-positive",sha256:sha,byteSize:bytes.length,
    fileName:"synthetic-original.txt",contentType:"text/plain"},token);
  assert.equal(rec.state,"PENDING");
  const stored=await originals.finalize(original,sha,token);
  assert.equal(stored.state,"STORED_VERIFIED");
  // This is real PG provenance, not real Storage-object verification.
  await admin.query("insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability) values($1,'TEST_ONLY','Synthetic original','synthetic','digital_text','full_content')",[source]);
  await admin.query("update source.sources set rights_by_action=$1::jsonb,rights_evidence=$2::jsonb where source_id=$3",
    [JSON.stringify({machine_read:"allowed",retain:"allowed"}),
      JSON.stringify({basis:"TEST_ONLY authorized synthetic local test"}),source]);
  await admin.query("insert into source.source_versions(source_version_id,source_id,checksum_sha256)values($1,$2,$3)",[version,source,sha]);
  await admin.query("insert into source.raw_items(raw_item_id,source_version_id,storage_ref,checksum_sha256,byte_size)values($1,$2,$3,$4,$5)",
    [raw,version,"mohen-private-originals/"+project+"/"+original+".bin",sha,bytes.length]);
  await admin.query("insert into control.production_runs(run_id,research_intent,scope,execution_mode,status)values($1,$2,$3::jsonb,'attended','RUNNING')",
    [runId,input.research_intent,JSON.stringify(scope)]);
  const rev=(await admin.query("select control.artifact_revision_for('source_version',$1) as revision",[version])).rows[0]?.revision;
  assert.match(rev,/^[a-f0-9]{64}$/);
  await admin.query("insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)values('G0','m5-local-v1',array['identity_version','rights_by_operation'],interval '7 days','TEST_ONLY:M5_ROOT_G0',true)on conflict(gate_code,rule_version)do nothing");
  const bindingId=(await admin.query("insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)values($1,$2,'G0','data-production','m5-remediation','v1','producer',$3::jsonb,now()+interval '1 day','TEST_ONLY:M5_ROOT_G0') returning binding_id",
    [MACHINE_REVIEWER_USER_ID,MACHINE_SIGNER_LOGIN,JSON.stringify({project_id:project})])).rows[0].binding_id;
  for(const [credential,allowedScope] of [
    [consumeCredential,{project_id:project}],[foreignCredential,{project_id:uuid()}]
  ])await admin.query("insert into control.gate_service_credentials(token_hash,capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)values($1,'consume',$2,$3,$4,$5,$6,'G0','data-production','m5-remediation','v1','producer',$7::jsonb,now()+interval '1 day','TEST_ONLY:M5_ROOT_G0')",
    [credentialHash(credential),MACHINE_REVIEWER_USER_ID,readerLogin,bindingId,job.job_id,
      job.implementation.gate_reviewer_binding,JSON.stringify(allowedScope)]);
  const c=await createDataProductionRepository(producer).recordGate({
    runId,stage:"D00",gateCode:"G0",objectType:"source_version",objectId:version,
    artifactRevision:rev,purpose,allowedScope:{project_id:project},
    consumer:"producer",dependencySnapshot:[],
    evidenceRefs:[{kind:"source_version",id:version,artifact_revision:rev},...methodPlan],
    inputFingerprint:reviewRequest.input_digest,
  });
  assert.match(c,/^[0-9a-f-]{36}$/);
  const selected=await selectExactStageCandidate(machineQuery,reviewRequest);
  assert.deepEqual(selected,{candidateId:c,projectId:project});
  const machineReview=createRuleGateReviewer({
    query:machineQuery,projectId:project,
    decide:(decision,sessionToken)=>authority.decide(decision,sessionToken),
    mintToken:({uid})=>mintMachineSessionToken({uid,secret:key}),
    attestStageOutput:({candidate,request})=>attestG0TextStageOutput({
      query:machineQuery,candidate,request,registry,projectId:project,
    }),log:()=>{},
  });
  assert.equal(await verify(reviewRequest),null,"unsigned production candidate cannot authorize Runner");
  await assert.rejects(assertRunner(),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/,
    "Runner must HOLD before the independent signer completes");
  const signed=await machineReview.review({gate:"G0",candidateId:c,stageRequest:reviewRequest});
  assert.equal(signed.status,"PASS",JSON.stringify(signed.failed??[]));
  const receipt=await verify(reviewRequest);
  assert.equal(receipt?.gate_audit_id,signed.auditId);
  assert.equal(receipt?.output_digest,reviewRequest.output_digest);
  assert.equal((await assertRunner()).gate_audit_id,signed.auditId,
    "Runner's actual exact current-qualification validator must consume this PG-backed G0");
  assert.equal(stageOutput.stage,"D01","signed D00 output becomes the typed D01 input");
  const evilResult={...runnerResult,outputs:{qualified_source:{...stageOutput,originalId:uuid()}}};
  await assert.rejects(()=>requireIndependentStageQualification({
    context:{verifyStageQualification:stageCheck},run,stage:"D00",job,input,result:evilResult,
  }),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/,"tampered D01 input must be denied");
  const foreignRequest={...reviewRequest,run_id:uuid()};
  assert.equal(await verify(foreignRequest),null,"foreign root cannot consume signed G0");
  assert.equal((await consume(reviewRequest,foreignCredential)).status,403,
    "a foreign-project consume credential cannot bypass server-owned scope");
  const revoked=await authority.revoke({auditId:signed.auditId,requestId:uuid(),reason:"TEST_ONLY M5 root G0 revoke"},machineToken());
  assert.ok(revoked>=1);
  assert.equal(await verify(reviewRequest),null,"revoked Gate must disappear from read-only current view");
  await assert.rejects(assertRunner(),/INDEPENDENT_STAGE_QUALIFICATION_INVALID/,
    "Runner must HOLD immediately after revocation");
  assert.equal((await admin.query("select scope->>'root_task_id' as root from control.production_runs where run_id=$1",[runId])).rows[0].root,root);
  console.log("M5_ROOT_G0_PG_HANDOFF_PASS real-PG17 Owner-Project-Root-Run persisted C01 original/source/candidate separate-machine-G0-signature signed-exact-output independent-reader Runner-current-consume wrong-root-project-digest-denied revocation-HOLD; official-Storage-NOT_RUN cloud-NOT_RUN");
}finally{
  await Promise.allSettled([producer.end(),machine.end(),reader.end(),admin.end()]);
}
