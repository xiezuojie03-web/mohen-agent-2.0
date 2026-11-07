// MAB-ENG-01: private D01-D03 candidate bridge to the existing six-stage chain.
// Not a second producer, not a Gate signer, and not a replacement for source L0/L1 rows.
import { createHash } from 'node:crypto';
import { assertStageExecutionAuthorized, consumeAuthorizedStageHandoff } from '../orchestrator/execution-authority.mjs';

const HEX=/^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const IMAGE_TYPE=/^image\/(png|jpeg|webp)$/;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
const digestOf=value=>createHash('sha256').update(canonical(value)).digest('hex');
function requireBoundStage(stage, job) {
  if(job?.stage!==stage)throw Error('PRIVATE_STAGE_MISMATCH');
}
function requireToken(token) {
  if(typeof token!=='string'||token.length===0)throw Error('PRIVATE_STAGE_SESSION_REQUIRED');
}
export function createPrivateEvidenceStageWorker({readOriginal,bridge,verifySourceBinding,persistReading,readRegistration,persistPageReading}={}) {
  if(typeof readOriginal!=='function'||typeof verifySourceBinding!=='function'||
     typeof bridge?.linkReading!=='function'||typeof bridge?.linkClaim!=='function')throw Error('PRIVATE_EVIDENCE_BRIDGE_REQUIRED');

  async function authorized({stage,run,job,registry,context,input,token}) {
    requireBoundStage(stage,job);
    requireToken(token);
    // The existing independent execution-authority check verifies stage, job,
    // registry hash, exact input hash, nonce and revocation at the trusted verifier.
    // This is before any DB mutation or privileged original read.
    // Runner already performed one-time signed grant and nonce verification.
    // Re-verifying here would consume the same nonce a second time and break
    // legitimate private work. Direct isolated worker calls still require the
    // original live authorization path and immediately consume its handoff.
    if (!consumeAuthorizedStageHandoff({run,job,registry,input})) {
      await assertStageExecutionAuthorized({run,job,registry,context,input});
      if (!consumeAuthorizedStageHandoff({run,job,registry,input})) {
        throw Error('PRIVATE_STAGE_AUTHORIZATION_HANDOFF_INVALID');
      }
    }
  }

  return {
    async verifySourceIntake({run,job,registry,context={},input,token}) {
      await authorized({stage:'D00',run,job,registry,context,input,token});
      const {research_intent:researchIntent,scope}=input??{};
      const originalId=scope?.original_id,projectId=scope?.project_id,pageNumber=scope?.page_number;
      if(typeof researchIntent!=='string'||!researchIntent.trim()||researchIntent.length>2000||
         typeof originalId!=='string'||!UUID.test(originalId)||
         typeof projectId!=='string'||!UUID.test(projectId)||
         !Number.isSafeInteger(pageNumber)||pageNumber<1||pageNumber>10000)
        throw Error('PRIVATE_SOURCE_INTAKE_SCOPE_INVALID');
      if(typeof readRegistration!=='function')throw Error('PRIVATE_SOURCE_REGISTRATION_REQUIRED');
      const {record,bytes}=await readOriginal(originalId,token);
      if(record?.state!=='STORED_VERIFIED'||!IMAGE_TYPE.test(record?.content_type??'')||
         !HEX.test(record?.sha256??'')||hash(bytes)!==record.sha256||
         record?.project_id!==projectId)
        throw Error('PRIVATE_SOURCE_INTAKE_ORIGINAL_UNVERIFIED');
      const registration=await readRegistration(originalId,token);
      if(registration?.project_id!==projectId||registration?.original_id!==originalId||
         registration?.sha256!==record.sha256||registration?.content_type!==record.content_type||
         registration?.byte_size!==record.byte_size)
        throw Error('PRIVATE_SOURCE_REGISTRATION_INVALID');
      const bound=await verifySourceBinding({originalId,
        sourceVersionId:registration.source_version_id,rawItemId:registration.raw_item_id,
        rawSha256:record.sha256},token);
      if(bound!==true)throw Error('PRIVATE_READING_SOURCE_NOT_BOUND');
      const requestDigest=digestOf({runId:run.run_id,originalId,pageNumber,researchIntent});
      // Durable L0 candidate refs; professional G0 qualification stays independent.
      return {stage:'D00',candidate_kind:'private_source_intake',
        original_id:originalId,project_id:projectId,page_number:pageNumber,
        source_id:registration.source_id,source_version_id:registration.source_version_id,
        raw_item_id:registration.raw_item_id,sha256:record.sha256,byte_size:record.byte_size,
        content_type:record.content_type,rights:registration.rights,provider:registration.provider,
        title:registration.title,source_type:registration.source_type,carrier_type:registration.carrier_type,
        asset_revision_id:registration.asset_revision_id,artifact_revision:registration.artifact_revision,
        request_digest:requestDigest,qualification:'UNASSESSED',gate_code:'G0'};
    },

    async readScannedPage({run,job,registry,context={},input,token}) {
      await authorized({stage:'D01',run,job,registry,context,input,token});
      if(typeof persistPageReading!=='function')throw Error('PRIVATE_PAGE_READING_PERSISTENCE_REQUIRED');
      const {originalId,page}=input??{};
      if(typeof originalId!=='string'||!UUID.test(originalId)||page?.kind!=='scanned_page/v1'||
         !UUID.test(page.source_version_id??'')||!UUID.test(page.raw_item_id??'')||
         !Number.isSafeInteger(page.page_number)||page.page_number<1||page.page_number>10000||
         page.raw_sha256!==page.page_sha256||!HEX.test(page.raw_sha256??''))
        throw Error('PRIVATE_PAGE_READING_LOCATOR_INVALID');
      const bound=await verifySourceBinding({originalId,sourceVersionId:page.source_version_id,
        rawItemId:page.raw_item_id,rawSha256:page.raw_sha256},token);
      if(bound!==true)throw Error('PRIVATE_READING_SOURCE_NOT_BOUND');
      const {record,bytes}=await readOriginal(originalId,token);
      if(record?.state!=='STORED_VERIFIED'||!IMAGE_TYPE.test(record?.content_type??'')||
         !HEX.test(record?.sha256??'')||hash(bytes)!==record.sha256||
         page.raw_sha256!==record.sha256)
        throw Error('PRIVATE_PAGE_READING_ORIGINAL_UNVERIFIED');
      const saved=await persistPageReading({runId:run.run_id,originalId,page,record,bytes},token);
      if(saved?.qualification!=='UNASSESSED'||!UUID.test(saved?.read_run_id??'')||
        !UUID.test(saved?.read_unit_id??'')||!HEX.test(saved?.artifact_revision??'')||!HEX.test(saved?.request_digest??''))
        throw Error('PRIVATE_PAGE_READING_NOT_PERSISTED');
      // Durable L1 candidate; professional qualification remains independent.
      return {stage:'D01',candidate_kind:'private_scanned_page_reading',
        original_id:originalId,source_version_id:page.source_version_id,
        raw_item_id:page.raw_item_id,raw_sha256:record.sha256,
        read_run_id:saved.read_run_id,read_unit_id:saved.read_unit_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        page,qualification:'UNASSESSED',gate_code:'G1'};
    },

    async draftTextReading({run,job,registry,context={},input,token}) {
      await authorized({stage:'D01',run,job,registry,context,input,token});
      if(typeof persistReading!=='function')throw Error('PRIVATE_READING_PERSISTENCE_REQUIRED');
      const {originalId,extent,quote}=input??{};
      if(typeof originalId!=='string'||!UUID.test(originalId)||!extent||
         !UUID.test(extent.source_version_id??'')||!UUID.test(extent.raw_item_id??'')||
         extent.kind!=='utf8_byte_range/v1'||
         !Number.isSafeInteger(extent.start_byte)||!Number.isSafeInteger(extent.end_byte)||
         extent.start_byte<0||extent.end_byte<=extent.start_byte||
         typeof quote!=='string'||Buffer.byteLength(quote)>32768)throw Error('PRIVATE_READING_LOCATOR_INVALID');
      // Exact source and version must already be registered against this immutable
      // original; a matching quote in some unrelated source is not provenance.
      const bound=await verifySourceBinding({originalId,
        sourceVersionId:extent.source_version_id,rawItemId:extent.raw_item_id,
        rawSha256:extent.raw_sha256},token);
      if(bound!==true)throw Error('PRIVATE_READING_SOURCE_NOT_BOUND');
      const {record,bytes}=await readOriginal(originalId,token);
      if(record?.state!=='STORED_VERIFIED'||record?.content_type!=='text/plain'||
         !HEX.test(record?.sha256??'')||hash(bytes)!==record.sha256||
         extent.end_byte>bytes.length||extent.raw_sha256!==record.sha256)
        throw Error('PRIVATE_READING_ORIGINAL_UNVERIFIED');
      const selected=bytes.subarray(extent.start_byte,extent.end_byte);
      if(!Buffer.from(quote,'utf8').equals(selected)||
         !Buffer.from(selected.toString('utf8'),'utf8').equals(selected)||
         extent.quote_sha256!==hash(selected))
        throw Error('PRIVATE_READING_QUOTE_MISMATCH');
      const saved=await persistReading({runId:run.run_id,originalId,extent,quote,record,bytes},token);
      if(saved?.qualification!=='UNASSESSED'||!UUID.test(saved?.read_run_id??'')||
        !UUID.test(saved?.read_unit_id??'')||!HEX.test(saved?.artifact_revision??'')||!HEX.test(saved?.request_digest??''))
        throw Error('PRIVATE_READING_NOT_PERSISTED');
      // Durable L1 candidate; professional qualification remains independent.
      return {stage:'D01',candidate_kind:'private_text_reading',
        original_id:originalId,source_version_id:extent.source_version_id,
        raw_item_id:extent.raw_item_id,raw_sha256:record.sha256,
        read_run_id:saved.read_run_id,read_unit_id:saved.read_unit_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        extent,quote,qualification:'UNASSESSED',gate_code:'G1'};
    },

    async linkReading({run,job,registry,context={},input,token}) {
      await authorized({stage:'D02',run,job,registry,context,input,token});
      const {originalId,evidenceId,readUnitId,extent,quote,extentOrder}=input??{};
      const linked=await bridge.linkReading({originalId,evidenceId,readUnitId,extent,quote,extentOrder},token);
      if(linked?.qualification!=='UNASSESSED'||!linked.link_id)throw Error('PRIVATE_BRIDGE_INVALID_RESULT');
      return {stage:'D02',candidate_kind:'private_read_evidence_link',
        link_id:linked.link_id,qualification:'UNASSESSED',gate_code:'G2'};
    },

    async linkClaim({run,job,registry,context={},input,token}) {
      await authorized({stage:'D03',run,job,registry,context,input,token});
      const {originalId,evidenceId,claimRevisionId,supportType}=input??{};
      const linked=await bridge.linkClaim({originalId,evidenceId,claimRevisionId,supportType},token);
      if(linked?.qualification!=='UNASSESSED'||!linked.link_id)throw Error('PRIVATE_BRIDGE_INVALID_RESULT');
      return {stage:'D03',candidate_kind:'private_claim_revision_evidence_link',
        link_id:linked.link_id,claim_revision_id:claimRevisionId,
        qualification:'UNASSESSED',gate_code:'G3'};
    },
  };
}
