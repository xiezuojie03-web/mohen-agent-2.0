// MAB-ENG-01 M2: one server-side composition root for verified original
// readback and the existing RLS/byte-attested bridge. Never a new producer
// or a shortcut around execution authorization / independent Gate review.
import {
  createPrivateOriginalRepository,
  createPrivateOriginalWorkflow,
  createEvidenceBridgeRepository,
  createPrivateOriginalSourceVerifier,
  createPrivateTextReadingRepository,
  createPrivateScannedPageReadingRepository,
  createPrivateSourceRegistrationRepository,
  createPrivateCandidateRepository,
  createSourceDiscoveryRepository,
} from '../../../packages/data-access/src/index.mjs';
import { createDataProductionRepository } from '../../../packages/data-access/src/data-production-repository.mjs';
import { createPrivateEvidenceStageWorker } from './private-evidence-stage.mjs';

// D01 消费预选：只从"已签、当前、Producer 可消费"的 G0 审计里读方法预选。
// 计划取自审计自身不可变的 details->evidence_refs（签署时固化），而不是可变候选行——
// 生产者自述的计划不构成批准。读不到即 null，由 D01 失败关闭，不补默认方法。
export function createApprovedMethodPlanReader(pool, {gateCode: defaultGate='G0'}={}) {
  return async function readApprovedMethodPlan({gateCode=defaultGate,objectType,objectId}={}) {
    const {rows}=await pool.query(
      `select a.gate_audit_id::text as gate_audit_id, a.details->'evidence_refs' as evidence_refs
       from control.qualification_current q
       join control.gate_audits a on a.gate_audit_id=q.gate_audit_id
       where q.gate_code=$1 and q.object_type=$2 and q.object_id=$3::uuid
         and a.result='PASS' and a.decision_origin='independent_gate' and a.consumer='producer'
         and control.current_qualification_is_valid(a.gate_audit_id)
       limit 1`,
      [gateCode,objectType,objectId]);
    const row=rows[0];
    if(!row||typeof row.gate_audit_id!=='string')return null;
    let refs=row.evidence_refs;
    if(typeof refs==='string'){try{refs=JSON.parse(refs);}catch{return null;}}
    if(!Array.isArray(refs))return null;
    return {gate_audit_id:row.gate_audit_id,refs};
  };
}

// Y08 分母真值：本次准入的这一件属于某来源时，读取该来源最近一次"整卷覆盖结论"。
// 只有已落库、带真实分母（manifest canvas 总数）与整卷摘要的结论才会被采纳；
// 没做过整卷取件就返回 null，D00 继续如实写 unknown，绝不按页数猜。
// 以 source_id 为键（登记回执自带），因此不需要 worker 直接读 source.source_versions。
export function createVolumeCoverageReader(pool) {
  return async function readVolumeCoverage({ sourceId } = {}) {
    const { rows } = await pool.query(
      `select c.coverage_id::text as coverage_id, c.completeness_state,
              c.coverage_scope, c.missing_parts, c.verified_against, c.created_at,
              a.acquired_extent
         from source.acquisition_coverages c
         left join source.acquisition_attempts a
           on a.attempt_id = (c.verified_against->>'attempt_id')::uuid
        where c.coverage_scope->>'target'='source_volume'
          and c.coverage_scope->>'source_id'=$1
        order by c.created_at desc limit 1`, [sourceId]);
    const row = rows[0];
    if (!row) return null;
    const scope = typeof row.coverage_scope === 'string' ? JSON.parse(row.coverage_scope) : row.coverage_scope;
    const total = Number(scope?.denominator?.total_pages);
    const acquired = Array.isArray(scope?.acquired_pages) ? scope.acquired_pages.map(Number) : [];
    if (!Number.isSafeInteger(total) || total < 1 || acquired.length === 0) return null;
    const extent = typeof row.acquired_extent === 'string' ? JSON.parse(row.acquired_extent) : row.acquired_extent;
    const pages = (Array.isArray(extent?.pages) ? extent.pages : []).map((item) => ({
      page: Number(item?.page), sha256: item?.sha256 ?? null, byte_size: Number(item?.byte_size),
    }));
    return {
      coverage_id: row.coverage_id, source_id: sourceId,
      completeness_state: row.completeness_state,
      denominator: scope.denominator, acquired_pages: acquired,
      total_pages: total, volume_digest: scope.volume_digest ?? null,
      // 每页摘要用于核对"手上的这一页"是否正是整卷里那一页（同一份字节）。
      pages,
    };
  };
}

export function createBoundPrivateEvidenceStageWorker({ pool, storage, verificationKey, keyVersion='mab-original-bridge-v1',
} = {}) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error('PRIVATE_STAGE_DATABASE_REQUIRED');
  }
  if (!storage || typeof storage.readVerified !== 'function') {
    throw new Error('PRIVATE_STAGE_VERIFIED_STORAGE_REQUIRED');
  }
  if (typeof verificationKey !== 'string' || verificationKey.length < 32) {
    throw new Error('PRIVATE_STAGE_BRIDGE_VERIFIER_REQUIRED');
  }
  // The repository enforces project/Owner RLS via transaction-local identity.
  // The same readback is used for D00 registration lookup, D01 reads and
  // D02-D05 candidate persistence.
  const repository = createPrivateOriginalRepository(pool);
  const original = createPrivateOriginalWorkflow({ repository, storage });
  const readOriginal = (originalId, token) => original.download(originalId, token);
  const bridge = createEvidenceBridgeRepository(pool, {
    readOriginal, verificationKey, keyVersion,
  });
  const verifySourceBinding=createPrivateOriginalSourceVerifier(pool);
  const readings=createPrivateTextReadingRepository(pool,{verificationKey,keyVersion});
  const pageReadings=createPrivateScannedPageReadingRepository(pool,{verificationKey,keyVersion});
  const registrations=createPrivateSourceRegistrationRepository(pool);
  const candidates=createPrivateCandidateRepository(pool,{verificationKey,keyVersion});
  // Y01/Y07 的唯一写入口（source.source_needs / acquisition_methods / acquisition_attempts）。
  // 它只写 L0 候选与事件，不提交 Gate 候选、不写 Gate 审计。
  const sourceDiscovery=createSourceDiscoveryRepository({query:(text,values)=>pool.query(text,values)});
  // The one existing producer-side candidate writer. It only inserts a
  // SUBMITTED candidate; no Gate decision, signer role or audit write exists
  // in the Producer process.
  const gateCandidates=createDataProductionRepository({query:(text,values)=>pool.query(text,values)});
  const submitGateCandidate=metadata=>gateCandidates.recordGate(metadata);
  // Read-only projection of an already signed, current, Producer-consumable
  // upstream audit. A missing or unsigned upstream yields null and the stage
  // candidate keeps an empty dependency_snapshot instead of a faked ancestor.
  async function readGateAudit({gateCode,objectType,objectId}={}) {
    const {rows}=await pool.query(
      `select a.gate_audit_id::text as gate_audit_id, a.qualification_digest, a.artifact_revision
       from control.qualification_current q
       join control.gate_audits a on a.gate_audit_id=q.gate_audit_id
       where q.gate_code=$1 and q.object_type=$2 and q.object_id=$3::uuid
         and a.result='PASS' and a.decision_origin='independent_gate' and a.consumer='producer'
         and control.current_qualification_is_valid(a.gate_audit_id)
       limit 1`,
      [gateCode,objectType,objectId]);
    const row=rows[0];
    if(!row||typeof row.gate_audit_id!=='string'||typeof row.qualification_digest!=='string'||
      typeof row.artifact_revision!=='string')return null;
    return {gate_audit_id:row.gate_audit_id,qualification_digest:row.qualification_digest,
      artifact_revision:row.artifact_revision};
  }
  const readApprovedMethodPlan = createApprovedMethodPlanReader(pool);
  // Y01 的存量清点与原件读回走同一个 Owner RLS 作用域，不另开一条读取通道。
  const readProjectStock = ({projectId, token}) => repository.projectStock(projectId, token);
  return createPrivateEvidenceStageWorker({ readOriginal, bridge, verifySourceBinding,
    persistReading:readings.save, readRegistration:registrations.lookup,
    persistPageReading:pageReadings.save,
    persistMaterialObservation:candidates.saveMaterialObservation,
    persistWorldClaim:candidates.saveWorldClaim,
    persistHumanisticFinding:candidates.saveHumanisticFinding,
    persistWorldProjection:candidates.saveWorldProjection,
    recordSourceNeed:sourceDiscovery.recordSourceNeed,
    readProjectStock,
    registerAcquisitionMethod:sourceDiscovery.registerAcquisitionMethod,
    appendAcquisitionAttempt:sourceDiscovery.appendAcquisitionAttempt,
    recordCatalogEntry:sourceDiscovery.recordCatalogEntry,
    recordProviderTrace:sourceDiscovery.recordProviderTrace,
    recordAcquisitionCoverage:sourceDiscovery.recordAcquisitionCoverage,
    recordCandidateVerification:sourceDiscovery.recordCandidateVerification,
    recordPriorityAssessment:sourceDiscovery.recordPriorityAssessment,
    readVolumeCoverage:createVolumeCoverageReader(pool),
    submitGateCandidate, readGateAudit, readApprovedMethodPlan });
}
