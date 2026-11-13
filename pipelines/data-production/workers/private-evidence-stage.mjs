// MAB-ENG-01: private D01-D05 candidate bridge to the existing six-stage chain.
// Not a second producer, not a Gate signer, and not a replacement for source L0/L1 rows.
// D02-D05 persist candidates only; every disposition stays UNASSESSED until an
// independent Gate signs it.
import { createHash } from 'node:crypto';
import { assertStageExecutionAuthorized, consumeAuthorizedStageHandoff } from '../orchestrator/execution-authority.mjs';
import { buildMethodPlanRefs, inspectMethodPlanRef, isMethodPlanRef } from '../../../packages/data-access/src/method-plan-ref.mjs';
import { diagnoseSourceNeed } from './source-need-diagnosis.mjs';
import { deriveIntakeCatalogEntry } from './source-catalog-observation.mjs';
import { deriveIntakeCandidateVerification } from './source-candidate-verification.mjs';
import { deriveIntakeCoverage } from './source-coverage-conclusion.mjs';
import { deriveOriginalProviderTrace } from './source-provider-trace.mjs';
import { deriveSourceIdentityStratification } from './source-identity-stratification.mjs';
import { deriveIntakePriority } from './source-priority-assessment.mjs';
import { deriveIntakeAcquisitionRecord } from './source-acquisition-record.mjs';
import { deriveValidatedAssetReceipt } from './source-asset-receipt.mjs';

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
  recordSourceNeed,readProjectStock,registerAcquisitionMethod,appendAcquisitionAttempt,
  recordCatalogEntry,recordProviderTrace,recordAcquisitionCoverage,recordCandidateVerification,recordPriorityAssessment,
  readVolumeCoverage,
  submitGateCandidate,readGateAudit,readApprovedMethodPlan}={}) {
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
  // 用途口径按 specs/data-production/gates/gate-contracts.v3.json 的 purpose_rule：
  // - G3/G4 必须保留原语义命名空间（G3.world.v1 → world.*，G4 → 人文五用途）；
  // - G0/G1/G2/G5 走显式版本化 profile（data-production/m5-remediation/v1）。
  // 未知用途映射按合同一律 deny（unknown_purpose_mapping）。
  const DEFAULT_PURPOSE = {namespace:'data-production',code:'m5-remediation',version:'v1'};
  const D03_PURPOSE = {namespace:'world',code:'explain_bounded',version:'v1'};

  async function submitStageCandidate({run,stage,gateCode,objectType,objectId,artifactRevision,
    projectId,evidenceRefs,upstreamGate,upstreamObjectType,upstreamObjectId,requestDigest,purpose}) {
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
      purpose:purpose??DEFAULT_PURPOSE,
      allowedScope:{project_id:projectId},consumer:'producer',
      dependencySnapshot,evidenceRefs:refs,inputFingerprint:requestDigest});
  }

  // D00-C/D01：消费者方法预选经独立 G0 批准后，D01 的读法由该批准计划决定，
  // 不再只按载体猜方法。计划缺失、引用不自洽、或未覆盖本次动作的方法一律失败关闭，
  // 且必须在读取任何原件字节之前抛出（不先消费再报错）。
  const D01_METHOD_BY_ACTION={readScannedPage:'C02',draftTextReading:'C01'};
  async function requireApprovedMethodPlan({action,sourceVersionId,carriedPlan}) {
    if(typeof readApprovedMethodPlan!=='function')throw Error('PRIVATE_D01_METHOD_PLAN_READ_REQUIRED');
    const approved=await readApprovedMethodPlan({gateCode:'G0',objectType:'source_version',objectId:sourceVersionId});
    if(!approved||!Array.isArray(approved.refs)||approved.refs.length===0)
      throw Error('PRIVATE_D01_G0_METHOD_PLAN_NOT_APPROVED');
    if(!approved.refs.every(isMethodPlanRef))throw Error('PRIVATE_D01_METHOD_PLAN_REF_INVALID');
    const inspected=[];
    for(const ref of approved.refs){
      const result=inspectMethodPlanRef(ref);
      if(!result.ok)throw Error(`PRIVATE_D01_METHOD_PLAN_REF_INVALID:${result.reason}`);
      if(inspected.some(item=>item.id===result.id))throw Error(`PRIVATE_D01_METHOD_PLAN_REF_DUPLICATE:${result.id}`);
      inspected.push(result);
    }
    const methodId=D01_METHOD_BY_ACTION[action];
    const planned=inspected.find(item=>item.methodId===methodId);
    if(!planned)throw Error(`PRIVATE_D01_METHOD_NOT_PLANNED:${methodId}`);
    // D00 原样带下来的预选必须与 G0 批准的计划逐条一致；不一致说明交接被改过。
    if(carriedPlan!=null){
      if(!Array.isArray(carriedPlan)||!carriedPlan.every(isMethodPlanRef))
        throw Error('PRIVATE_D01_METHOD_PLAN_MISMATCH');
      const carriedIds=carriedPlan.map(ref=>`${String(ref.method_id??'')}@${String(ref.method_version??'')}`).sort().join(',');
      const approvedIds=inspected.map(item=>item.id).sort().join(',');
      if(carriedIds!==approvedIds)throw Error('PRIVATE_D01_METHOD_PLAN_MISMATCH');
    }
    return {gate_audit_id:String(approved.gate_audit_id??''),method_id:planned.methodId,
      method_version:planned.methodVersion,planned_methods:inspected.map(item=>item.id)};
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
      // input_fingerprint 必须与 orchestrator 的 executionDigest(input) 一致，
      // 只读取证服务据此把资格绑定到本次 stage 的精确输入。
      const requestDigest=digestOf(input);
      // The G0 candidate must bind the source_version revision, not the raw_item revision.
      const sourceRevision=registration?.source_version_artifact_revision;
      if(typeof sourceRevision!=='string'||!/^[0-9a-f]{64}$/.test(sourceRevision))
        throw Error('PRIVATE_SOURCE_REGISTRATION_REVISION_INVALID');
      // Y01：D00 是唯一"已有项目作用域 + 已核对原件 + 已核验绑定"的位置，
      // 需求回执在此登记才不是无生产者的空表。缺写入口即失败关闭，
      // 不允许"看起来跑了 D00 却没有需求回执"。
      if(typeof recordSourceNeed!=='function')throw Error('PRIVATE_SOURCE_NEED_RECORDING_REQUIRED');
      // Y01 的职责是"需求 + 存量缺口诊断"，缺口必须由本工序从真实存量算出，
      // 不抄调用方给的空对象。读不到存量就失败关闭（D00 HOLD），不写"看起来做过诊断"的回执。
      if(typeof readProjectStock!=='function')throw Error('PRIVATE_SOURCE_STOCK_READ_REQUIRED');
      const stock=await readProjectStock({projectId,token});
      const diagnosis=diagnoseSourceNeed({researchIntent,
        stock,requestedDimensions:input?.coverage_dimensions});
      const need=await recordSourceNeed({projectId,researchIntent,
        scope:input?.research_scope,coverageDimensions:diagnosis.coverage_dimensions,
        existingStockGap:diagnosis.existing_stock_gap,rightsBoundary:registration.rights,
        producedBy:'D00/Y01'});
      if(!UUID.test(need?.need_id??''))throw Error('PRIVATE_SOURCE_NEED_NOT_RECORDED');
      // Y02：把本次准入已核验的来源登记为资源目录条目。条目由工序自己从登记真值
      // 派生（含馆方目录号），不抄调用方；缺写入口或登记与原件不复核即失败关闭，
      // 不允许"看起来跑了 D00 却没有目录观察"。调用方另外看到的候选（未取得的
      // 线索等）仍可经 input.catalog 补充登记，与本观察并存。
      if(typeof recordCatalogEntry!=='function')throw Error('PRIVATE_SOURCE_CATALOG_RECORDING_REQUIRED');
      const savedIntakeEntry=await recordCatalogEntry({projectId,needId:need.need_id,
        ...deriveIntakeCatalogEntry({registration,record})});
      if(!UUID.test(savedIntakeEntry?.catalog_entry_id??''))throw Error('PRIVATE_SOURCE_CATALOG_NOT_RECORDED');
      const intakeCatalogEntryId=savedIntakeEntry.catalog_entry_id;
      // Y03：候选核查紧接准入目录条目就地进行。能真判的（身份/目录号/溯源/权利现状）
      // 由本次登记真值算出；判不了的（异名词源、适用时代、语言）如实写 unassessed
      // 并给 needs_owner，绝不给"看起来能用"的 admissible。缺写入口即失败关闭，
      // 不允许"看起来跑了 D00 却没有核查记录"。
      if(typeof recordCandidateVerification!=='function')throw Error('PRIVATE_SOURCE_VERIFICATIONS_RECORDING_REQUIRED');
      const intakeVerification=deriveIntakeCandidateVerification({registration,record,
        expansions:input?.candidate_expansion});
      const savedIntakeVerification=await recordCandidateVerification({projectId,
        catalogEntryId:intakeCatalogEntryId,checks:intakeVerification.checks,
        verdict:intakeVerification.verdict,reasonCode:intakeVerification.reasonCode,
        methodKey:intakeVerification.methodKey,methodVersion:intakeVerification.methodVersion});
      if(!UUID.test(savedIntakeVerification?.verification_id??''))
        throw Error('PRIVATE_SOURCE_VERIFICATION_NOT_RECORDED');
      // Y05：身份分层（提供方/收藏/目录记录/作品/版本/藏所/数字资产）从准入真值
      // 派生，逐层标 known/unknown 与证据；按迁移 D00-C4 不落新表——分层结论随
      // 候选输出存证，后续 Y07 的 candidate_ref/dependency_refs 与 Y08 取得回执
      // 都从这一份派生，不另造第二套身份。
      const sourceIdentity=deriveSourceIdentityStratification({registration,record});
      // Y06：取得优先级处置紧跟 Y03 核查结论就地进行。五维标准各带依据、未评估
      // 如实 unknown；处置由 Y03 结论决定（admissible→selected、needs_owner→deferred、
      // rejected→excluded），绝不把未 Owner 判定的来源放宽成 selected（库内触发器
      // 同样把关）。处置写不进去即失败关闭，不允许"核查完了却没有处置账"。
      if(typeof recordPriorityAssessment!=='function')throw Error('PRIVATE_PRIORITY_ASSESSMENT_RECORDING_REQUIRED');
      const intakePriority=deriveIntakePriority({registration,verification:intakeVerification});
      const savedIntakePriority=await recordPriorityAssessment({projectId,
        needId:need.need_id,catalogEntryId:intakeCatalogEntryId,
        criteria:intakePriority.criteria,decision:intakePriority.decision,
        rationale:intakePriority.rationale,methodKey:intakePriority.methodKey,
        methodVersion:intakePriority.methodVersion});
      if(!UUID.test(savedIntakePriority?.assessment_id??''))
        throw Error('PRIVATE_PRIORITY_ASSESSMENT_NOT_RECORDED');
      // Y07：获取是 D00 的硬前提——原件既然在库，就必须有"怎么来的"获取账；
      // 没有 acquisition 输入即失败关闭，不允许来源不明地躺在库里。方法与尝试
      // 字段由工序逐项校验（M#### 方法键、64hex 请求摘要、可解析时间、
      // acquired_verified 必须字节与哈希同库存原件一致，不一致即伪造）；
      // candidate_ref/dependency_refs 由 Y05 身份分层派生，不抄调用方。
      const intakeAcquisition=deriveIntakeAcquisitionRecord({registration,record,
        identity:sourceIdentity,acquisition:input?.acquisition});
      if(typeof registerAcquisitionMethod!=='function'||typeof appendAcquisitionAttempt!=='function')
        throw Error('PRIVATE_ACQUISITION_RECORDING_REQUIRED');
      const registered=await registerAcquisitionMethod(intakeAcquisition.method);
      if(!registered||registered.method_key!==intakeAcquisition.method.methodKey||
         registered.method_version!==intakeAcquisition.method.methodVersion)
        throw Error('PRIVATE_ACQUISITION_METHOD_MISMATCH');
      const appended=await appendAcquisitionAttempt({projectId,needId:need.need_id,
        candidateRef:intakeAcquisition.candidateRef,
        methodKey:registered.method_key,methodVersion:registered.method_version,
        ...intakeAcquisition.attempt,dependencyRefs:intakeAcquisition.dependencyRefs});
      if(!UUID.test(appended?.attempt_id??''))throw Error('PRIVATE_ACQUISITION_ATTEMPT_NOT_RECORDED');
      const acquisitionAttemptId=appended.attempt_id;
      // Y08：取得范围与缺失部件结论紧跟本次获取尝试就地进行（规范原文把 extent/missing_parts
      // 归 Y08；Y04 的产出是原机构回溯链，见下面的 Y04 段）。结论由工序从准入
      // 真值与刚落库的尝试派生：本页字节必须与本页库存一致（分页整卷尝试只看本页
      // 明细，不拿整卷摘要冒充本页哈希）；本来源若已有整卷覆盖结论，分母用它核实的
      // 真实页数，缺页逐页列出；否则总量如实写 unknown，不冒充 partial/complete。
      // 写不进去即失败关闭，不允许"看起来取得了却没有覆盖账"。
      if(typeof recordAcquisitionCoverage!=='function')throw Error('PRIVATE_SOURCE_COVERAGE_RECORDING_REQUIRED');
      // 分母真值：本来源若已做过整卷取件，Y08 用它的真实页数作分母并逐页列出缺件；
      // 没做过（或读不到）就仍写 unknown，绝不按页数猜。
      const volumeCoverage=typeof readVolumeCoverage==='function'
        ? await readVolumeCoverage({sourceId:registration.source_id,token}) : null;
      const intakeCoverage=deriveIntakeCoverage({registration,record,
        attempt:{attempt_id:acquisitionAttemptId,
          result_state:intakeAcquisition.attempt.resultState,
          asset_sha256:intakeAcquisition.attempt.assetSha256,
          byte_size:intakeAcquisition.attempt.byteSize},
        pageNumber,volume:volumeCoverage});
      const savedIntakeCoverage=await recordAcquisitionCoverage({projectId,
        attemptId:acquisitionAttemptId,catalogEntryId:intakeCatalogEntryId,
        coverageScope:intakeCoverage.coverage_scope,missingParts:intakeCoverage.missing_parts,
        completenessState:intakeCoverage.completeness_state,
        verifiedAgainst:intakeCoverage.verified_against});
      if(!UUID.test(savedIntakeCoverage?.coverage_id??''))throw Error('PRIVATE_SOURCE_COVERAGE_NOT_RECORDED');
      const intakeCoverageId=savedIntakeCoverage.coverage_id;
      // Y08：取得回执是本次准入的存证小结——库存回读哈希、登记一致、身份分层、
      // 获取尝试已核验、覆盖结论已核对、核查结论原样带回（needs_owner 不升级）。
      // 缺任一道工序的存证即失败关闭；回执不是资格，G0 签署仍是独立 Gate 的事。
      const {receipt:assetReceipt,evidenceRefs:chainRefs}=deriveValidatedAssetReceipt({
        registration,record,identity:sourceIdentity,
        attempt:{attempt_id:acquisitionAttemptId,...intakeAcquisition.attempt},
        coverage:{coverage_id:intakeCoverageId,verifiedAgainst:intakeCoverage.verified_against},
        verification:{verification_id:savedIntakeVerification.verification_id,
          verdict:intakeVerification.verdict},
        needId:need.need_id,catalogEntryId:intakeCatalogEntryId,pageNumber});
      // Y02/Y04/Y03/Y06：只在调用方确实给出判断材料时落库；没给就不写，
      // 绝不替研究者编造目录、回溯链、覆盖结论、核查意见或优先级。
      // 目录可按下标引用本次刚登记的条目，也可直接给已存在的条目 id。
      const catalogEntryIds=[];
      if(input?.catalog!=null){
        if(!Array.isArray(input.catalog))throw Error('PRIVATE_SOURCE_CATALOG_INVALID');
        if(typeof recordCatalogEntry!=='function')throw Error('PRIVATE_SOURCE_CATALOG_RECORDING_REQUIRED');
        for(const entry of input.catalog){
          const saved=await recordCatalogEntry({projectId,needId:need.need_id,
            provider:entry?.provider,catalogTitle:entry?.catalog_title,
            catalogIdentifier:entry?.catalog_identifier,carrierHint:entry?.carrier_hint,
            language:entry?.language,coverageHint:entry?.coverage_hint,rightsHint:entry?.rights_hint,
            availabilityState:entry?.availability_state,discoveredByMethod:entry?.discovered_by_method,
            methodVersion:entry?.method_version,evidenceRef:entry?.evidence_ref,
            correctionOf:entry?.correction_of});
          if(!UUID.test(saved?.catalog_entry_id??''))throw Error('PRIVATE_SOURCE_CATALOG_NOT_RECORDED');
          catalogEntryIds.push(saved.catalog_entry_id);
        }
      }
      const resolveCatalogEntry=(ref,code)=>{
        if(ref==null)return null;
        if(Number.isSafeInteger(ref)&&catalogEntryIds[ref])return catalogEntryIds[ref];
        if(typeof ref==='string'&&UUID.test(ref))return ref;
        throw Error(code);
      };
      const coverageIds=[];
      if(input?.coverage!=null){
        if(!Array.isArray(input.coverage))throw Error('PRIVATE_SOURCE_COVERAGE_INVALID');
        if(typeof recordAcquisitionCoverage!=='function')throw Error('PRIVATE_SOURCE_COVERAGE_RECORDING_REQUIRED');
        for(const item of input.coverage){
          // 覆盖是"某次尝试拿到了什么"，没有尝试就没有覆盖结论可写。
          const attemptId=item?.attempt_id??acquisitionAttemptId;
          if(!UUID.test(attemptId??''))throw Error('PRIVATE_SOURCE_COVERAGE_ATTEMPT_REQUIRED');
          const saved=await recordAcquisitionCoverage({projectId,attemptId,
            catalogEntryId:resolveCatalogEntry(item?.catalog_index??item?.catalog_entry_id,
              'PRIVATE_SOURCE_COVERAGE_CATALOG_INVALID'),
            coverageScope:item?.coverage_scope,missingParts:item?.missing_parts,
            completenessState:item?.completeness_state,verifiedAgainst:item?.verified_against,
            note:item?.note,correctionOf:item?.correction_of});
          if(!UUID.test(saved?.coverage_id??''))throw Error('PRIVATE_SOURCE_COVERAGE_NOT_RECORDED');
          coverageIds.push(saved.coverage_id);
        }
      }
      // Y04：聚合目录原机构回溯——只有调用方真的查过才落库。每跳必须带 URI、核查时刻
      // 与结果；回不到原馆就只能是 ORIGIN_UNRESOLVED，且不得携带任何馆藏身份值
      // （规范反例：聚合元数据许可当图像许可、镜像 PDF 冒原馆授权、404 断言对象不存在）。
      // 派生失败即失败关闭，不落"像是查过"的链。
      const originTraceIds=[];
      if(input?.origin_trace!=null){
        if(typeof recordProviderTrace!=='function')throw Error('PRIVATE_PROVIDER_TRACE_RECORDING_REQUIRED');
        const traces=Array.isArray(input.origin_trace)?input.origin_trace:[input.origin_trace];
        for(const item of traces){
          const trace=deriveOriginalProviderTrace({
            catalogEntryId:resolveCatalogEntry(item?.catalog_index??item?.catalog_entry_id,
              'PRIVATE_PROVIDER_TRACE_CATALOG_INVALID')??intakeCatalogEntryId,
            aggregatedRecord:item?.aggregated_record,originalProvider:item?.original_provider,
            holdingRef:item?.holding_ref,hops:item?.hops,rightsLayers:item?.rights_layers,
            checkedAt:item?.checked_at,correctionOf:item?.correction_of});
          const saved=await recordProviderTrace({projectId,
            catalogEntryId:trace.catalog_entry_id,originState:trace.origin_state,
            aggregatedRecord:trace.aggregated_record,originalProvider:trace.original_provider,
            holdingRef:trace.holding_ref,rightsLayers:trace.rights_layers,
            provenance:trace.provenance,checkedAt:trace.checked_at,
            methodKey:trace.method.key,methodVersion:trace.method.version,
            producedBy:'Y04',correctionOf:trace.correction_of});
          if(!UUID.test(saved?.trace_id??''))throw Error('PRIVATE_PROVIDER_TRACE_NOT_RECORDED');
          originTraceIds.push(saved.trace_id);
        }
      }
      const verificationIds=[];
      if(input?.verifications!=null){
        if(!Array.isArray(input.verifications))throw Error('PRIVATE_SOURCE_VERIFICATIONS_INVALID');
        if(typeof recordCandidateVerification!=='function')throw Error('PRIVATE_SOURCE_VERIFICATIONS_RECORDING_REQUIRED');
        for(const item of input.verifications){
          const saved=await recordCandidateVerification({projectId,
            catalogEntryId:resolveCatalogEntry(item?.catalog_index??item?.catalog_entry_id,
              'PRIVATE_SOURCE_VERIFICATION_CATALOG_INVALID'),
            checks:item?.checks,verdict:item?.verdict,reasonCode:item?.reason_code,
            methodKey:item?.method_key,methodVersion:item?.method_version,
            correctionOf:item?.correction_of});
          if(!UUID.test(saved?.verification_id??''))throw Error('PRIVATE_SOURCE_VERIFICATION_NOT_RECORDED');
          verificationIds.push(saved.verification_id);
        }
      }
      const assessmentIds=[];
      if(input?.priorities!=null){
        if(!Array.isArray(input.priorities))throw Error('PRIVATE_SOURCE_PRIORITIES_INVALID');
        if(typeof recordPriorityAssessment!=='function')throw Error('PRIVATE_SOURCE_PRIORITIES_RECORDING_REQUIRED');
        for(const item of input.priorities){
          const saved=await recordPriorityAssessment({projectId,needId:need.need_id,
            catalogEntryId:resolveCatalogEntry(item?.catalog_index??item?.catalog_entry_id,
              'PRIVATE_SOURCE_PRIORITY_CATALOG_INVALID'),
            criteria:item?.criteria,decision:item?.decision,rationale:item?.rationale,
            methodKey:item?.method_key,methodVersion:item?.method_version,
            correctionOf:item?.correction_of});
          if(!UUID.test(saved?.assessment_id??''))throw Error('PRIVATE_SOURCE_PRIORITY_NOT_RECORDED');
          assessmentIds.push(saved.assessment_id);
        }
      }
      // D00-B：C 方法预选（消费者方法计划）以类型化引用随 G0 候选存证，零 DDL。
      // 调用方没给计划就不构造引用、也不补默认方法：G0 会因缺计划失败关闭，
      // 而不是由生产者替消费者决定 D01 用什么读法。
      const methodPlan=input?.consumer_method_plan==null?null
        :buildMethodPlanRefs({methods:input.consumer_method_plan});
      // Durable L0 candidate refs; professional G0 qualification stays independent.
      const gateCandidateId=await submitStageCandidate({run,stage:'D00',gateCode:'G0',
        objectType:'source_version',objectId:registration.source_version_id,
        artifactRevision:sourceRevision,projectId,
        evidenceRefs:[{kind:'source_version',id:registration.source_version_id,
          artifact_revision:sourceRevision},...chainRefs,...(methodPlan??[])],
        requestDigest});
      return {stage:'D00',candidate_kind:'private_source_intake',
        original_id:originalId,project_id:projectId,page_number:pageNumber,
        source_id:registration.source_id,source_version_id:registration.source_version_id,
        raw_item_id:registration.raw_item_id,sha256:record.sha256,byte_size:record.byte_size,
        content_type:record.content_type,rights:registration.rights,provider:registration.provider,
        title:registration.title,source_type:registration.source_type,carrier_type:registration.carrier_type,
        asset_revision_id:registration.asset_revision_id,need_id:need.need_id,
        stock_gap:diagnosis.existing_stock_gap,
        acquisition_attempt_id:acquisitionAttemptId,method_plan:methodPlan??[],
        intake_catalog_entry_id:intakeCatalogEntryId,
        intake_verification_id:savedIntakeVerification.verification_id,
        intake_verification_verdict:intakeVerification.verdict,
        intake_coverage_id:intakeCoverageId,source_identity:sourceIdentity,
        asset_receipt:assetReceipt,
        intake_priority_id:savedIntakePriority.assessment_id,
        intake_priority_decision:intakePriority.decision,
        catalog_entry_ids:catalogEntryIds,coverage_ids:coverageIds,origin_trace_ids:originTraceIds,
        verification_ids:verificationIds,assessment_ids:assessmentIds,
        artifact_revision:sourceRevision,
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
      // G0 必须先批准 C02 才能读这一页；未经批准不消费原件字节。
      const methodPlanApproval=await requireApprovedMethodPlan({action:'readScannedPage',
        sourceVersionId:page.source_version_id,carriedPlan:input?.method_plan});
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
        // input_fingerprint 必须与 orchestrator 的 executionDigest(input) 一致：
        // 各 stage 的 input 是上一阶段的 contract output，只读取证据此绑定。
        requestDigest:digestOf(input)});
      return {stage:'D01',candidate_kind:'private_scanned_page_reading',
        original_id:originalId,source_version_id:page.source_version_id,
        raw_item_id:page.raw_item_id,raw_sha256:record.sha256,
        read_run_id:saved.read_run_id,read_unit_id:saved.read_unit_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        page,method_plan_approval:methodPlanApproval,gate_candidate_id:gateCandidateId,
        gate_candidate_status:'SUBMITTED',
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
      // G0 必须先批准 C01 才能读这段正文；未经批准不消费原件字节。
      const methodPlanApproval=await requireApprovedMethodPlan({action:'draftTextReading',
        sourceVersionId:extent.source_version_id,carriedPlan:input?.method_plan});
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
        // input_fingerprint 必须与 orchestrator 的 executionDigest(input) 一致：
        // 各 stage 的 input 是上一阶段的 contract output，只读取证据此绑定。
        requestDigest:digestOf(input)});
      return {stage:'D01',candidate_kind:'private_text_reading',
        original_id:originalId,source_version_id:extent.source_version_id,
        raw_item_id:extent.raw_item_id,raw_sha256:record.sha256,
        read_run_id:saved.read_run_id,read_unit_id:saved.read_unit_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        extent,quote,method_plan_approval:methodPlanApproval,gate_candidate_id:gateCandidateId,
        gate_candidate_status:'SUBMITTED',
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
        // input_fingerprint 必须与 orchestrator 的 executionDigest(input) 一致：
        // 各 stage 的 input 是上一阶段的 contract output，只读取证据此绑定。
        requestDigest:digestOf(input)});
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
        // G3 是世界门：按 gate-contracts.v3.json G3.purpose_codes 必须绑世界用途，
        // 不能沿用 G0/G1/G2 的生产用途（purpose_rule: G3/G4 保留原语义命名空间）。
        purpose:D03_PURPOSE,
        // input_fingerprint 必须与 orchestrator 的 executionDigest(input) 一致：
        // 各 stage 的 input 是上一阶段的 contract output，只读取证据此绑定。
        requestDigest:digestOf(input)});
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
        // input_fingerprint 必须与 orchestrator 的 executionDigest(input) 一致：
        // 各 stage 的 input 是上一阶段的 contract output，只读取证据此绑定。
        requestDigest:digestOf(input)});
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
        // input_fingerprint 必须与 orchestrator 的 executionDigest(input) 一致：
        // 各 stage 的 input 是上一阶段的 contract output，只读取证据此绑定。
        requestDigest:digestOf(input)});
      return {stage:'D05',candidate_kind:'private_world_projection',
        original_id:originalId,projection_id:saved.projection_id,
        finding_id:saved.finding_id,
        artifact_revision:saved.artifact_revision,request_digest:saved.request_digest,
        gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',gate_code:'G5'};
    },
  };
}
