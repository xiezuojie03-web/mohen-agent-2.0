// MAB-ENG-01: private D01-D05 candidate bridge to the existing six-stage chain.
// Not a second producer, not a Gate signer, and not a replacement for source L0/L1 rows.
// D02-D05 persist candidates only; every disposition stays UNASSESSED until an
// independent Gate signs it.
import { createHash } from 'node:crypto';
import { assertStageExecutionAuthorized, consumeAuthorizedStageHandoff } from '../orchestrator/execution-authority.mjs';

const HEX=/^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const IMAGE_TYPE=/^image\/(png|jpeg|webp)$/;
// SQL 侧白名单的镜像；D02 观察 source_voice 与 D03 support_type 必须在此集合内。
const SOURCE_VOICES=new Set(['official_gazetteer','institutional_record','private_note']);
const SUPPORT_TYPES=new Set(['supports','contradicts','contextualizes']);
const isStringArray=v=>Array.isArray(v)&&v.every(item=>typeof item==='string');
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
export function createPrivateEvidenceStageWorker({readOriginal,bridge,verifySourceBinding,persistReading,readRegistration,persistPageReading,
  persistMaterialObservation,persistWorldClaim,persistHumanisticFinding,persistWorldProjection,
  submitGateCandidate,readGateAudit}={}) {
  if(typeof readOriginal!=='function'||typeof verifySourceBinding!=='function'||
     typeof bridge?.linkReading!=='function'||typeof bridge?.linkClaim!=='function')throw Error('PRIVATE_EVIDENCE_BRIDGE_REQUIRED');
  // A real stage must never silently skip candidate submission: the existing
  // control.gate_candidates insert is the only path an independent Gate can
  // review. Missing deps fail at construction, not after persistence.
  if(typeof submitGateCandidate!=='function')throw Error('PRIVATE_GATE_CANDIDATE_SUBMISSION_REQUIRED');
  if(typeof readGateAudit!=='function')throw Error('PRIVATE_GATE_AUDIT_READ_REQUIRED');

  // Candidate only: no result, no qualification, no dependency invention.
  // An unsigned upstream yields an empty dependency_snapshot and signing will
  // legitimately fail closed instead of a Producer-fabricated ancestor.
  async function submitStageCandidate({run,stage,gateCode,objectType,objectId,artifactRevision,
    projectId,evidenceRefs,upstreamGate,upstreamObjectType,upstreamObjectId,requestDigest}) {
    if(typeof projectId!=='string'||!UUID.test(projectId))throw Error('PRIVATE_GATE_CANDIDATE_SCOPE_INVALID');
    if(!HEX.test(artifactRevision??''))throw Error('PRIVATE_GATE_CANDIDATE_REVISION_REQUIRED');
    const refs=Array.isArray(evidenceRefs)?evidenceRefs.filter(ref=>ref&&typeof ref.id==='string'&&ref.id):[];
    if(refs.length===0)throw Error('PRIVATE_GATE_CANDIDATE_EVIDENCE_REQUIRED');
    let dependencySnapshot=[];
    if(upstreamGate){
      const audit=await readGateAudit({gateCode:upstreamGate,objectType:upstreamObjectType,objectId:upstreamObjectId});
      dependencySnapshot=audit?[{gate_audit_id:audit.gate_audit_id,
        qualification_digest:audit.qualification_digest,artifact_revision:audit.artifact_revision}]:[];
    }
    return submitGateCandidate({runId:run.run_id,stage,gateCode,objectType,objectId,artifactRevision,
      purpose:{namespace:'data-production',code:'m5-remediation',version:'v1'},
      allowedScope:{project_id:projectId},consumer:'producer',
      dependencySnapshot,evidenceRefs:refs,inputFingerprint:requestDigest});
  }

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
      // D00 是"来源准入"，不挑载体：图片、文本、音频、视频、混合件都能进。
      // 载体由 D01 的具体读法各自声明前提（扫页要图、文本要文……），
      // 没有可用读法时由 D01 如实报 NO_READING_METHOD_FOR_CARRIER，不在入口拒收。
      if(record?.state!=='STORED_VERIFIED'||typeof record?.content_type!=='string'||!record.content_type||
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
      // The G0 candidate must bind the source_version revision, not the raw_item revision.
      const sourceRevision=registration?.source_version_artifact_revision;
      if(typeof sourceRevision!=='string'||!/^[0-9a-f]{64}$/.test(sourceRevision))
        throw Error('PRIVATE_SOURCE_REGISTRATION_REVISION_INVALID');
      // Durable L0 candidate refs; professional G0 qualification stays independent.
      const gateCandidateId=await submitStageCandidate({run,stage:'D00',gateCode:'G0',
        objectType:'source_version',objectId:registration.source_version_id,
        artifactRevision:sourceRevision,projectId,
        evidenceRefs:[{kind:'source_version',id:registration.source_version_id,
          artifact_revision:sourceRevision}],
        requestDigest});
      return {stage:'D00',candidate_kind:'private_source_intake',
        original_id:originalId,project_id:projectId,page_number:pageNumber,
        source_id:registration.source_id,source_version_id:registration.source_version_id,
        raw_item_id:registration.raw_item_id,sha256:record.sha256,byte_size:record.byte_size,
        content_type:record.content_type,rights:registration.rights,provider:registration.provider,
        title:registration.title,source_type:registration.source_type,carrier_type:registration.carrier_type,
        asset_revision_id:registration.asset_revision_id,artifact_revision:sourceRevision,
        request_digest:requestDigest,gate_candidate_id:gateCandidateId,
        gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',gate_code:'G0'};
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
      const gateCandidateId=await submitStageCandidate({run,stage:'D01',gateCode:'G1',
        objectType:'read_unit',objectId:saved.read_unit_id,artifactRevision:saved.artifact_revision,
        projectId:run?.scope?.project_id,
        evidenceRefs:[{kind:'read_unit',id:saved.read_unit_id,artifact_revision:saved.artifact_revision},
          {kind:'source_version',id:page.source_version_id}],
        upstreamGate:'G0',upstreamObjectType:'source_version',upstreamObjectId:page.source_version_id,
        requestDigest:saved.request_digest});
      return {stage:'D01',candidate_kind:'private_scanned_page_reading',
        original_id:originalId,source_version_id:page.source_version_id,
        raw_item_id:page.raw_item_id,raw_sha256:record.sha256,
        read_run_id:saved.read_run_id,read_unit_id:saved.read_unit_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        page,gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',
        qualification:'UNASSESSED',gate_code:'G1'};
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
      const gateCandidateId=await submitStageCandidate({run,stage:'D01',gateCode:'G1',
        objectType:'read_unit',objectId:saved.read_unit_id,artifactRevision:saved.artifact_revision,
        projectId:run?.scope?.project_id,
        evidenceRefs:[{kind:'read_unit',id:saved.read_unit_id,artifact_revision:saved.artifact_revision},
          {kind:'source_version',id:extent.source_version_id}],
        upstreamGate:'G0',upstreamObjectType:'source_version',upstreamObjectId:extent.source_version_id,
        requestDigest:saved.request_digest});
      return {stage:'D01',candidate_kind:'private_text_reading',
        original_id:originalId,source_version_id:extent.source_version_id,
        raw_item_id:extent.raw_item_id,raw_sha256:record.sha256,
        read_run_id:saved.read_run_id,read_unit_id:saved.read_unit_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        extent,quote,gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',
        qualification:'UNASSESSED',gate_code:'G1'};
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

    async observeMaterial({run,job,registry,context={},input,token}) {
      await authorized({stage:'D02',run,job,registry,context,input,token});
      if(typeof persistMaterialObservation!=='function')throw Error('PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED');
      const {originalId,readUnitId,observation}=input??{};
      if(typeof originalId!=='string'||!UUID.test(originalId)||
         typeof readUnitId!=='string'||!UUID.test(readUnitId)||
         !observation||typeof observation!=='object'||
         observation.h_type!=='H05'||
         typeof observation.literal_reading!=='string'||!observation.literal_reading||
         Buffer.byteLength(observation.literal_reading)>32768||
         !SOURCE_VOICES.has(observation.source_voice)||
         typeof observation.evidence_type!=='string'||!observation.evidence_type||
         observation.evidence_type.length>200||
         !observation.uncertainty||typeof observation.uncertainty!=='object'||
         observation.uncertainty?.qualification!=='UNASSESSED'||
         (observation.normalized_text!=null&&(typeof observation.normalized_text!=='string'||Buffer.byteLength(observation.normalized_text)>32768))||
         (observation.research_proposition!=null&&(typeof observation.research_proposition!=='string'||Buffer.byteLength(observation.research_proposition)>2000)))
        throw Error('PRIVATE_MATERIAL_OBSERVATION_INVALID');
      const saved=await persistMaterialObservation({runId:run.run_id,originalId,readUnitId,observation},token);
      if(!UUID.test(saved?.evidence_id??'')||!UUID.test(saved?.reading_unit_id??'')||
         !UUID.test(saved?.link_id??'')||!UUID.test(saved?.read_unit_id??'')||
         !UUID.test(saved?.read_run_id??'')||!HEX.test(saved?.artifact_revision??'')||
         !HEX.test(saved?.request_digest??''))
        throw Error('PRIVATE_MATERIAL_OBSERVATION_NOT_PERSISTED');
      // Durable L2 candidate; professional qualification remains independent.
      const gateCandidateId=await submitStageCandidate({run,stage:'D02',gateCode:'G2',
        objectType:'material_evidence',objectId:saved.evidence_id,artifactRevision:saved.artifact_revision,
        projectId:run?.scope?.project_id,
        evidenceRefs:[{kind:'material_evidence',id:saved.evidence_id,artifact_revision:saved.artifact_revision},
          {kind:'read_unit',id:readUnitId}],
        upstreamGate:'G1',upstreamObjectType:'read_unit',upstreamObjectId:readUnitId,
        requestDigest:saved.request_digest});
      return {stage:'D02',candidate_kind:'private_material_observation',
        original_id:originalId,evidence_id:saved.evidence_id,
        reading_unit_id:saved.reading_unit_id,link_id:saved.link_id,
        read_unit_id:saved.read_unit_id,read_run_id:saved.read_run_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',gate_code:'G2'};
    },

    async assertWorldClaim({run,job,registry,context={},input,token}) {
      await authorized({stage:'D03',run,job,registry,context,input,token});
      if(typeof persistWorldClaim!=='function')throw Error('PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED');
      const {originalId,evidenceId,claim}=input??{};
      if(typeof originalId!=='string'||!UUID.test(originalId)||
         typeof evidenceId!=='string'||!UUID.test(evidenceId)||
         !claim||typeof claim!=='object'||
         typeof claim.assertion!=='string'||!claim.assertion||Buffer.byteLength(claim.assertion)>2000||
         typeof claim.change_type!=='string'||!claim.change_type||claim.change_type.length>200||
         !claim.time_scope||typeof claim.time_scope!=='object'||
         !SUPPORT_TYPES.has(claim.support_type))
        throw Error('PRIVATE_WORLD_CLAIM_INVALID');
      const saved=await persistWorldClaim({runId:run.run_id,originalId,evidenceId,claim},token);
      if(!UUID.test(saved?.change_id??'')||!UUID.test(saved?.claim_revision_id??'')||
         !UUID.test(saved?.claim_evidence_link_id??'')||!UUID.test(saved?.evidence_id??'')||
         !HEX.test(saved?.artifact_revision??'')||!HEX.test(saved?.request_digest??''))
        throw Error('PRIVATE_WORLD_CLAIM_NOT_PERSISTED');
      // Durable L3 candidate; professional qualification remains independent.
      const gateCandidateId=await submitStageCandidate({run,stage:'D03',gateCode:'G3',
        objectType:'claim_revision',objectId:saved.claim_revision_id,
        artifactRevision:saved.artifact_revision,projectId:run?.scope?.project_id,
        evidenceRefs:[{kind:'claim_revision',id:saved.claim_revision_id,artifact_revision:saved.artifact_revision},
          {kind:'material_evidence',id:evidenceId}],
        upstreamGate:'G2',upstreamObjectType:'material_evidence',upstreamObjectId:evidenceId,
        requestDigest:saved.request_digest});
      return {stage:'D03',candidate_kind:'private_world_claim',
        original_id:originalId,change_id:saved.change_id,
        claim_revision_id:saved.claim_revision_id,
        claim_evidence_link_id:saved.claim_evidence_link_id,evidence_id:saved.evidence_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',gate_code:'G3'};
    },

    async recordHumanisticFinding({run,job,registry,context={},input,token}) {
      await authorized({stage:'D04',run,job,registry,context,input,token});
      if(typeof persistHumanisticFinding!=='function')throw Error('PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED');
      const {originalId,claimRevisionId,finding}=input??{};
      if(typeof originalId!=='string'||!UUID.test(originalId)||
         typeof claimRevisionId!=='string'||!UUID.test(claimRevisionId)||
         !finding||typeof finding!=='object'||
         finding.finding_type!=='institutional_mechanism'||
         typeof finding.human_question!=='string'||!finding.human_question||Buffer.byteLength(finding.human_question)>2000||
         typeof finding.interpretive_statement!=='string'||!finding.interpretive_statement||Buffer.byteLength(finding.interpretive_statement)>5000||
         (finding.understanding_delta!=null&&typeof finding.understanding_delta!=='string')||
         !isStringArray(finding.counter_view_or_alternative)||
         !isStringArray(finding.missing_evidence)||
         !finding.uncertainty||typeof finding.uncertainty!=='object'||
         finding.uncertainty?.qualification!=='UNASSESSED')
        throw Error('PRIVATE_HUMANISTIC_FINDING_INVALID');
      const saved=await persistHumanisticFinding({runId:run.run_id,originalId,claimRevisionId,finding},token);
      if(!UUID.test(saved?.finding_id??'')||!UUID.test(saved?.claim_revision_id??'')||
         !HEX.test(saved?.artifact_revision??'')||!HEX.test(saved?.request_digest??''))
        throw Error('PRIVATE_HUMANISTIC_FINDING_NOT_PERSISTED');
      // Durable L4 candidate; professional qualification remains independent.
      const gateCandidateId=await submitStageCandidate({run,stage:'D04',gateCode:'G4',
        objectType:'finding',objectId:saved.finding_id,artifactRevision:saved.artifact_revision,
        projectId:run?.scope?.project_id,
        evidenceRefs:[{kind:'finding',id:saved.finding_id,artifact_revision:saved.artifact_revision},
          {kind:'claim_revision',id:claimRevisionId}],
        upstreamGate:'G3',upstreamObjectType:'claim_revision',upstreamObjectId:claimRevisionId,
        requestDigest:saved.request_digest});
      return {stage:'D04',candidate_kind:'private_humanistic_finding',
        original_id:originalId,finding_id:saved.finding_id,
        claim_revision_id:saved.claim_revision_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',gate_code:'G4'};
    },

    async projectWorld({run,job,registry,context={},input,token}) {
      await authorized({stage:'D05',run,job,registry,context,input,token});
      if(typeof persistWorldProjection!=='function')throw Error('PRIVATE_CANDIDATE_PERSISTENCE_REQUIRED');
      const {originalId,findingId,projection}=input??{};
      if(typeof originalId!=='string'||!UUID.test(originalId)||
         typeof findingId!=='string'||!UUID.test(findingId)||
         !projection||typeof projection!=='object'||
         typeof projection.projection_key!=='string'||!projection.projection_key||projection.projection_key.length>200||
         !projection.payload||typeof projection.payload!=='object')
        throw Error('PRIVATE_WORLD_PROJECTION_INVALID');
      const saved=await persistWorldProjection({runId:run.run_id,originalId,findingId,projection},token);
      if(!UUID.test(saved?.projection_id??'')||!UUID.test(saved?.finding_id??'')||
         !HEX.test(saved?.artifact_revision??'')||!HEX.test(saved?.request_digest??''))
        throw Error('PRIVATE_WORLD_PROJECTION_NOT_PERSISTED');
      // Durable L5 candidate; professional qualification remains independent.
      const gateCandidateId=await submitStageCandidate({run,stage:'D05',gateCode:'G5',
        objectType:'world_projection',objectId:saved.projection_id,
        artifactRevision:saved.artifact_revision,projectId:run?.scope?.project_id,
        evidenceRefs:[{kind:'world_projection',id:saved.projection_id,artifact_revision:saved.artifact_revision},
          {kind:'finding',id:findingId}],
        upstreamGate:'G4',upstreamObjectType:'finding',upstreamObjectId:findingId,
        requestDigest:saved.request_digest});
      return {stage:'D05',candidate_kind:'private_world_projection',
        original_id:originalId,projection_id:saved.projection_id,
        finding_id:saved.finding_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',gate_code:'G5'};
    },
  };
}
