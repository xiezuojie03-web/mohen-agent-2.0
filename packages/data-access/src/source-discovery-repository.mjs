// D00-C1 (2026-11-10): Y01 来源需求回执与 Y07 获取尝试日志的唯一写入口。
//
// 边界（与 Protocol §2.5、交付包 03_十类方法输出与L0资产承载.md 一致）：
//   * 本模块只写 L0 候选与事件，不写 source.sources / source_versions / raw_items，
//     不提交 G0 候选、不写 control.gate_audits——那些仍由各自的既有路径负责。
//   * 需求与方法定义不可改写，更正一律新增一行；获取尝试同样 append-only。
//   * 逐动作权利只认 packages/data-access/src/rights-actions.mjs 的九动作，
//     缺失动作不补默认值（裁决时等价 unknown = HOLD）。
//   * 成本未知保持 unknown，不填 0。
import { RIGHTS_ACTIONS, RIGHTS_VALUES, canonicalRightsAction } from './rights-actions.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const METHOD_KEY = /^M[0-9]{4}$/;

export const RESULT_STATES = Object.freeze([
  'not_found', 'catalog_found', 'metadata_only', 'bibliography_only', 'excerpt',
  'full_text', 'scan_or_image', 'restricted', 'unavailable',
  'acquired_unverified', 'acquired_verified',
]);

export const METHOD_STATES = Object.freeze([
  'DRAFT', 'HISTORICALLY_VALIDATED_CURRENT_UNVERIFIED', 'TESTED_SUCCESS',
  'TESTED_FAILURE', 'DEGRADED', 'RETIRED',
]);

// Y02 目录里的可用性只描述"目录层面看到了什么"，不等于取到了内容。
export const AVAILABILITY_STATES = Object.freeze([
  'catalog_found', 'catalog_listed_no_item', 'restricted', 'not_available', 'unknown',
]);

// Y04 覆盖结论只有三态；"完整"必须有一次已核验的取得做依据（库内触发器同样把关）。
export const COMPLETENESS_STATES = Object.freeze(['complete', 'partial', 'unknown']);

// Y03 核查结论；空依据不得给结论（库内 CHECK 同样把关）。
export const VERIFICATION_VERDICTS = Object.freeze(['admissible', 'rejected', 'needs_owner']);

// Y06 处置三态；selected 必须已有同一候选的 admissible 核查（库内触发器同样把关）。
export const PRIORITY_DECISIONS = Object.freeze(['selected', 'deferred', 'excluded']);


const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);

function requireProject(projectId) {
  if (typeof projectId !== 'string' || !UUID.test(projectId)) throw new Error('SOURCE_DISCOVERY_PROJECT_INVALID');
  return projectId;
}

/** 逐动作权利：未知键或越界取值一律拒绝，不做静默丢弃或补值。 */
export function assertRightsActions(raw, label = 'rights_actions') {
  const source = asObject(raw);
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    const action = canonicalRightsAction(key);
    if (!action || !RIGHTS_ACTIONS.includes(action)) {
      throw new Error(`SOURCE_DISCOVERY_RIGHTS_ACTION_UNKNOWN:${label}:${key}`);
    }
    if (!RIGHTS_VALUES.includes(value)) {
      throw new Error(`SOURCE_DISCOVERY_RIGHTS_VALUE_INVALID:${label}:${key}:${String(value)}`);
    }
    out[action] = value;
  }
  return out;
}

export function createSourceDiscoveryRepository(pool) {
  if (!pool || typeof pool.query !== 'function') throw new Error('SOURCE_DISCOVERY_POOL_REQUIRED');

  return {
    /** Y01：登记一次来源需求回执。返回新行，不改写历史。 */
    async recordSourceNeed({
      projectId, researchIntent, scope, coverageDimensions, existingStockGap,
      rightsBoundary, producedBy = 'Y01',
    } = {}) {
      requireProject(projectId);
      const intent = String(researchIntent ?? '').trim();
      if (!intent) throw new Error('SOURCE_DISCOVERY_INTENT_REQUIRED');
      if (intent.length > 2000) throw new Error('SOURCE_DISCOVERY_INTENT_TOO_LONG');
      if (typeof producedBy !== 'string' || !producedBy.trim()) throw new Error('SOURCE_DISCOVERY_PRODUCER_REQUIRED');
      const { rows } = await pool.query(
        `insert into source.source_needs
           (project_id, research_intent, scope, coverage_dimensions, existing_stock_gap, rights_boundary, produced_by)
         values ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7)
         returning need_id::text as need_id, project_id::text as project_id,
                   created_at`,
        [projectId, intent, JSON.stringify(asObject(scope)), JSON.stringify(asArray(coverageDimensions)),
         JSON.stringify(asObject(existingStockGap)), JSON.stringify(asObject(rightsBoundary)), producedBy.trim()]);
      const row = rows[0];
      return { need_id: row.need_id, project_id: row.project_id, produced_by: producedBy.trim(),
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at };
    },

    /** Y07 前置：登记一条获取路径身份（method_key@method_version）。重复登记不覆盖定义。 */
    async registerAcquisitionMethod({
      methodKey, methodVersion, resourceScope, accessMode, preconditions, steps,
      successCriteria, failureModes, alternatives, methodState = 'DRAFT', recommended = false,
    } = {}) {
      if (typeof methodKey !== 'string' || !METHOD_KEY.test(methodKey)) {
        throw new Error('ACQUISITION_METHOD_KEY_INVALID');
      }
      const version = String(methodVersion ?? '').trim();
      if (!version || version.length > 64) throw new Error('ACQUISITION_METHOD_VERSION_INVALID');
      const mode = String(accessMode ?? '').trim();
      if (!mode) throw new Error('ACQUISITION_METHOD_ACCESS_MODE_REQUIRED');
      if (!METHOD_STATES.includes(methodState)) throw new Error('ACQUISITION_METHOD_STATE_INVALID');
      const { rows } = await pool.query(
        `insert into source.acquisition_methods
           (method_key, method_version, resource_scope, access_mode, preconditions, steps,
            success_criteria, failure_modes, alternatives, method_state, recommended)
         values ($1,$2,$3::jsonb,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11)
         on conflict (method_key, method_version) do nothing
         returning method_key, method_version, method_state, recommended`,
        [methodKey, version, JSON.stringify(asObject(resourceScope)), mode,
         JSON.stringify(asObject(preconditions)), JSON.stringify(asArray(steps)),
         JSON.stringify(asArray(successCriteria)), JSON.stringify(asArray(failureModes)),
         JSON.stringify(asArray(alternatives)), methodState, recommended === true]);
      if (rows.length === 1) {
        return { method_key: rows[0].method_key, method_version: rows[0].method_version,
          method_state: rows[0].method_state, recommended: rows[0].recommended, created: true };
      }
      // 已存在：返回既有身份，绝不静默改写其定义。
      const existing = await pool.query(
        `select method_key, method_version, method_state, recommended
           from source.acquisition_methods where method_key=$1 and method_version=$2`,
        [methodKey, version]);
      const row = existing.rows[0];
      if (!row) throw new Error('ACQUISITION_METHOD_REGISTER_CONFLICT');
      return { method_key: row.method_key, method_version: row.method_version,
        method_state: row.method_state, recommended: row.recommended, created: false };
    },

    /**
     * Y07：推进一次方法的"当前有效性"。方法定义不可改写，只有状态与复核时间可推进；
     * 由此「上次成功」不会被当成「当前有效」，而是每次真实尝试后重新判定。
     */
    async recordAcquisitionMethodRevalidation({
      methodKey, methodVersion, methodState, revalidatedAt = new Date(), recommended,
    } = {}) {
      if (typeof methodKey !== 'string' || !METHOD_KEY.test(methodKey)) {
        throw new Error('ACQUISITION_METHOD_KEY_INVALID');
      }
      const version = String(methodVersion ?? '').trim();
      if (!version) throw new Error('ACQUISITION_METHOD_VERSION_INVALID');
      if (!METHOD_STATES.includes(methodState)) throw new Error('ACQUISITION_METHOD_STATE_INVALID');
      const at = revalidatedAt instanceof Date ? revalidatedAt : new Date(revalidatedAt);
      if (Number.isNaN(at.getTime())) throw new Error('ACQUISITION_METHOD_REVALIDATED_AT_INVALID');
      const { rows } = await pool.query(
        `update source.acquisition_methods
            set method_state=$3, last_revalidated_at=$4
                ${recommended === undefined ? '' : ', recommended=$5'}
          where method_key=$1 and method_version=$2
          returning method_key, method_version, method_state, recommended, last_revalidated_at`,
        recommended === undefined
          ? [methodKey, version, methodState, at]
          : [methodKey, version, methodState, at, recommended === true]);
      if (rows.length === 0) throw new Error('ACQUISITION_METHOD_NOT_REGISTERED');
      const row = rows[0];
      return { method_key: row.method_key, method_version: row.method_version,
        method_state: row.method_state, recommended: row.recommended,
        last_revalidated_at: row.last_revalidated_at instanceof Date
          ? row.last_revalidated_at.toISOString() : row.last_revalidated_at };
    },

    /** Y07：追加一次获取尝试。成功与失败都保留，更正另起一行。 */
    async appendAcquisitionAttempt({
      projectId, needId, candidateRef, methodKey, methodVersion, executionEnvironment,
      requestDigest, pagination, startedAt, finishedAt, resultState, failureCode,
      failureCertainty, acquiredExtent, byteSize, assetSha256, sourceLocator,
      rightsActions, accessRestrictions, dependencyRefs, alternatives,
      recoveryCondition, cost, correctionOf,
    } = {}) {
      requireProject(projectId);
      if (typeof needId !== 'string' || !UUID.test(needId)) throw new Error('ACQUISITION_ATTEMPT_NEED_INVALID');
      if (typeof methodKey !== 'string' || !METHOD_KEY.test(methodKey)) throw new Error('ACQUISITION_ATTEMPT_METHOD_INVALID');
      const version = String(methodVersion ?? '').trim();
      if (!version) throw new Error('ACQUISITION_ATTEMPT_METHOD_VERSION_REQUIRED');
      if (typeof requestDigest !== 'string' || !HASH.test(requestDigest)) {
        throw new Error('ACQUISITION_ATTEMPT_REQUEST_DIGEST_REQUIRED');
      }
      if (!RESULT_STATES.includes(resultState)) throw new Error('ACQUISITION_ATTEMPT_STATE_INVALID');
      const started = startedAt instanceof Date ? startedAt : new Date(startedAt ?? NaN);
      if (Number.isNaN(started.getTime())) throw new Error('ACQUISITION_ATTEMPT_STARTED_AT_INVALID');
      const finished = finishedAt == null ? null : (finishedAt instanceof Date ? finishedAt : new Date(finishedAt));
      if (finished && Number.isNaN(finished.getTime())) throw new Error('ACQUISITION_ATTEMPT_FINISHED_AT_INVALID');
      if (failureCertainty != null && !['CONFIRMED', 'HYPOTHESIS'].includes(failureCertainty)) {
        throw new Error('ACQUISITION_ATTEMPT_FAILURE_CERTAINTY_INVALID');
      }
      // 取得并已核验必须自带字节数与哈希；否则只是候选，不得冒充原件。
      const sha = typeof assetSha256 === 'string' && HASH.test(assetSha256) ? assetSha256 : null;
      if (assetSha256 != null && !sha) throw new Error('ACQUISITION_ATTEMPT_SHA256_INVALID');
      const size = byteSize == null ? null : Number(byteSize);
      if (size != null && (!Number.isSafeInteger(size) || size < 0)) throw new Error('ACQUISITION_ATTEMPT_BYTE_SIZE_INVALID');
      if (resultState === 'acquired_verified' && (sha == null || size == null)) {
        throw new Error('ACQUISITION_ATTEMPT_VERIFIED_REQUIRES_BYTES');
      }
      if (correctionOf != null && (typeof correctionOf !== 'string' || !UUID.test(correctionOf))) {
        throw new Error('ACQUISITION_ATTEMPT_CORRECTION_INVALID');
      }
      const costValue = cost == null ? { amount: null, currency: null, certainty: 'unknown' } : asObject(cost);
      if (!('certainty' in costValue)) costValue.certainty = 'unknown';
      const { rows } = await pool.query(
        `insert into source.acquisition_attempts
           (project_id, need_id, candidate_ref, method_key, method_version, execution_environment,
            request_digest, pagination, started_at, finished_at, result_state, failure_code,
            failure_certainty, acquired_extent, byte_size, asset_sha256, source_locator,
            rights_actions, access_restrictions, dependency_refs, alternatives,
            recovery_condition, cost, correction_of)
         values ($1,$2,$3::jsonb,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,
                 $17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22,$23::jsonb,$24)
         returning attempt_id::text as attempt_id, created_at`,
        [projectId, needId, JSON.stringify(asObject(candidateRef)), methodKey, version,
         JSON.stringify(asObject(executionEnvironment)), requestDigest, JSON.stringify(asObject(pagination)),
         started, finished, resultState, failureCode ?? null, failureCertainty ?? null,
         acquiredExtent == null ? null : JSON.stringify(acquiredExtent), size, sha,
         JSON.stringify(asObject(sourceLocator)), JSON.stringify(assertRightsActions(rightsActions)),
         JSON.stringify(asObject(accessRestrictions)), JSON.stringify(asArray(dependencyRefs)),
         JSON.stringify(asArray(alternatives)), recoveryCondition ?? null,
         JSON.stringify(costValue), correctionOf ?? null]);
      const row = rows[0];
      return { attempt_id: row.attempt_id, need_id: needId,
        method_key: methodKey, method_version: version, result_state: resultState,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at };
    },

    /** Y02：登记一条目录条目。看到什么就记什么，是否取到由 Y07/Y04 记。 */
    async recordCatalogEntry({
      projectId, needId, provider, catalogTitle, catalogIdentifier, carrierHint, language,
      coverageHint, rightsHint, availabilityState, discoveredByMethod, methodVersion,
      evidenceRef, correctionOf,
    } = {}) {
      requireProject(projectId);
      if (typeof needId !== 'string' || !UUID.test(needId)) throw new Error('CATALOG_ENTRY_NEED_INVALID');
      const owner = String(provider ?? '').trim();
      if (!owner) throw new Error('CATALOG_ENTRY_PROVIDER_REQUIRED');
      const title = String(catalogTitle ?? '').trim();
      if (!title) throw new Error('CATALOG_ENTRY_TITLE_REQUIRED');
      if (!AVAILABILITY_STATES.includes(availabilityState)) throw new Error('CATALOG_ENTRY_AVAILABILITY_INVALID');
      const method = String(discoveredByMethod ?? '').trim();
      const version = String(methodVersion ?? '').trim();
      if (!method) throw new Error('CATALOG_ENTRY_METHOD_REQUIRED');
      if (!version) throw new Error('CATALOG_ENTRY_METHOD_VERSION_REQUIRED');
      if (correctionOf != null && (typeof correctionOf !== 'string' || !UUID.test(correctionOf))) {
        throw new Error('CATALOG_ENTRY_CORRECTION_INVALID');
      }
      const identifier = String(catalogIdentifier ?? '').trim() || null;
      const { rows } = await pool.query(
        `insert into source.resource_catalog
           (project_id, need_id, provider, catalog_title, catalog_identifier, carrier_hint, language,
            coverage_hint, rights_hint, availability_state, discovered_by_method, method_version,
            evidence_ref, correction_of)
         values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13::jsonb,$14)
         returning catalog_entry_id::text as catalog_entry_id, created_at`,
        [projectId, needId, owner, title, identifier,
         String(carrierHint ?? '').trim() || null, String(language ?? '').trim() || null,
         JSON.stringify(asObject(coverageHint)), JSON.stringify(asObject(rightsHint)),
         availabilityState, method, version, JSON.stringify(asObject(evidenceRef)), correctionOf ?? null]);
      const row = rows[0];
      return { catalog_entry_id: row.catalog_entry_id, need_id: needId, availability_state: availabilityState,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at };
    },

    /** Y04：记录一次覆盖结论（拿到了什么、还缺什么）。完整与缺件互斥。 */
    async recordAcquisitionCoverage({
      projectId, attemptId, catalogEntryId, coverageScope, missingParts,
      completenessState, verifiedAgainst, note, correctionOf,
    } = {}) {
      requireProject(projectId);
      if (typeof attemptId !== 'string' || !UUID.test(attemptId)) throw new Error('COVERAGE_ATTEMPT_INVALID');
      if (catalogEntryId != null && (typeof catalogEntryId !== 'string' || !UUID.test(catalogEntryId))) {
        throw new Error('COVERAGE_CATALOG_ENTRY_INVALID');
      }
      if (!COMPLETENESS_STATES.includes(completenessState)) throw new Error('COVERAGE_COMPLETENESS_INVALID');
      const missing = asArray(missingParts);
      if (completenessState === 'complete' && missing.length > 0) {
        throw new Error('COVERAGE_COMPLETE_WITH_MISSING_PARTS');
      }
      if (correctionOf != null && (typeof correctionOf !== 'string' || !UUID.test(correctionOf))) {
        throw new Error('COVERAGE_CORRECTION_INVALID');
      }
      const { rows } = await pool.query(
        `insert into source.acquisition_coverages
           (project_id, attempt_id, catalog_entry_id, coverage_scope, missing_parts,
            completeness_state, verified_against, note, correction_of)
         values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::jsonb,$8,$9)
         returning coverage_id::text as coverage_id, created_at`,
        [projectId, attemptId, catalogEntryId ?? null, JSON.stringify(asObject(coverageScope)),
         JSON.stringify(missing), completenessState, JSON.stringify(asObject(verifiedAgainst)),
         note ?? null, correctionOf ?? null]);
      const row = rows[0];
      return { coverage_id: row.coverage_id, attempt_id: attemptId,
        completeness_state: completenessState, missing_parts: missing.length,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at };
    },

    /** Y03：登记候选核查结论，必须带逐项依据。 */
    async recordCandidateVerification({
      projectId, catalogEntryId, checks, verdict, reasonCode, methodKey, methodVersion, correctionOf,
    } = {}) {
      requireProject(projectId);
      if (typeof catalogEntryId !== 'string' || !UUID.test(catalogEntryId)) {
        throw new Error('VERIFICATION_CATALOG_ENTRY_INVALID');
      }
      const checkObject = asObject(checks);
      if (Object.keys(checkObject).length === 0) throw new Error('VERIFICATION_CHECKS_REQUIRED');
      if (!VERIFICATION_VERDICTS.includes(verdict)) throw new Error('VERIFICATION_VERDICT_INVALID');
      const reason = String(reasonCode ?? '').trim();
      if (!reason) throw new Error('VERIFICATION_REASON_REQUIRED');
      const method = String(methodKey ?? '').trim();
      const version = String(methodVersion ?? '').trim();
      if (!method || !version) throw new Error('VERIFICATION_METHOD_REQUIRED');
      if (correctionOf != null && (typeof correctionOf !== 'string' || !UUID.test(correctionOf))) {
        throw new Error('VERIFICATION_CORRECTION_INVALID');
      }
      const { rows } = await pool.query(
        `insert into source.candidate_verifications
           (project_id, catalog_entry_id, checks, verdict, reason_code, method_key, method_version, correction_of)
         values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
         returning verification_id::text as verification_id, created_at`,
        [projectId, catalogEntryId, JSON.stringify(checkObject), verdict, reason,
         method, version, correctionOf ?? null]);
      const row = rows[0];
      return { verification_id: row.verification_id, catalog_entry_id: catalogEntryId, verdict,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at };
    },

    /** Y06：登记优先级评估。未核不得入选由库内触发器与调用顺序共同保证。 */
    async recordPriorityAssessment({
      projectId, needId, catalogEntryId, criteria, decision, rationale,
      methodKey, methodVersion, correctionOf,
    } = {}) {
      requireProject(projectId);
      if (typeof needId !== 'string' || !UUID.test(needId)) throw new Error('PRIORITY_NEED_INVALID');
      if (typeof catalogEntryId !== 'string' || !UUID.test(catalogEntryId)) {
        throw new Error('PRIORITY_CATALOG_ENTRY_INVALID');
      }
      if (!PRIORITY_DECISIONS.includes(decision)) throw new Error('PRIORITY_DECISION_INVALID');
      const why = String(rationale ?? '').trim();
      if (!why) throw new Error('PRIORITY_RATIONALE_REQUIRED');
      const method = String(methodKey ?? '').trim();
      const version = String(methodVersion ?? '').trim();
      if (!method || !version) throw new Error('PRIORITY_METHOD_REQUIRED');
      if (correctionOf != null && (typeof correctionOf !== 'string' || !UUID.test(correctionOf))) {
        throw new Error('PRIORITY_CORRECTION_INVALID');
      }
      const { rows } = await pool.query(
        `insert into source.priority_assessments
           (project_id, need_id, catalog_entry_id, criteria, decision, rationale,
            method_key, method_version, correction_of)
         values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9)
         returning assessment_id::text as assessment_id, created_at`,
        [projectId, needId, catalogEntryId, JSON.stringify(asObject(criteria)), decision, why,
         method, version, correctionOf ?? null]);
      const row = rows[0];
      return { assessment_id: row.assessment_id, catalog_entry_id: catalogEntryId, decision,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at };
    },
  };
}
