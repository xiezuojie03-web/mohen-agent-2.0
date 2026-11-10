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
  };
}
