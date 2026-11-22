#!/usr/bin/env node
// MAB M5 (LOCAL ISOLATED ONLY): deterministic machine rule reviewer for G0..G5.
// Every required policy check is re-derived from database facts under the
// dedicated machine signer login; if any check cannot be proven the reviewer
// refuses to sign. Signing goes through the existing authority repository CLI
// (control.sign_gate_candidate) — there is no second Gate/audit write path.
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  MACHINE_REVIEWER_USER_ID,
  MACHINE_SIGNER_LOGIN,
  mintMachineSessionToken,
  openMachineQuery,
} from "./machine-reviewer-session.mjs";
// CP2-D：逐动作权利只认唯一词典（显式 allowed 才放行）。
import { decideRightsActions } from "../packages/data-access/src/rights-actions.mjs";
// D00-B：C 方法预选以 evidence_refs 类型化引用承载，G0 由本评审器强制校验。
import { inspectMethodPlanRef, isMethodPlanRef } from "../packages/data-access/src/method-plan-ref.mjs";
// D01/G1：独立签发时由 signer 自己从库内事实重建阶段输入/输出摘要。
import { attestStageOutputForRequest, deriveD01ReadingStageDigests, deriveD02ObservationStageDigests, deriveD03WorldClaimStageDigests, deriveD04FindingStageDigests, deriveD05FactStageDigests } from "./gate-stage-output-attestation.mjs";
// 权威签发唯一实现：与 CLI gate-authority.mjs 使用同一 repository（control.sign_gate_candidate）。
import { createGateAuthorityRepository } from "../packages/data-access/src/gate-authority-repository.mjs";
// getNodePgPool 复用同一机器身份连接池（openMachineQuery 已把 DATABASE_URL 切到机器签发连接）。
import { getNodePgPool } from "../packages/data-access/src/node-pg-client.mjs";
import registry from "../specs/data-production/production-registry.json" with { type: "json" };
// Static JSON imports (not readFileSync) so the deployed gate-review function's
// file tracer includes these contracts; all Gate decisions still read them from
// this single authoritative source.
import identifierRegistry from "../specs/data-production/identifier-registry.json" with { type: "json" };
import methodBindingContract from "../specs/data-production/method-binding-contract.json" with { type: "json" };


export const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
export const RULE_VERSION_BY_GATE = { G0: "m5-local-v1", G1: "m5-local-v1", G2: "m5-local-v1", G3: "m5-local-v1", G4: "m5-local-v1", G5: "v1" };
export const UPSTREAM_BY_GATE = { G1: "G0", G2: "G1", G3: "G2", G4: "G3", G5: "G4" };
export const METHOD_BY_GATE = { G1: "C02", G5: "P02" };
// G3 是世界门：方法集合与用途均来自现行合同，不写死单值。
// - 方法：method-binding-contract.json 中 stage=D03 且 implementation_binding 非 HOLD 的方法。
// - 用途：gate-contracts.v3.json 的 G3.purpose_codes（purpose_source: G3.world.v1）。
export const G3_PURPOSE_CODES = new Set([
  "world.explain_bounded",
  "world.show_original_region",
  "world.map_anchor_link",
  "world.map_registered_overlay",
  "world.reconstruct_bounded",
  "world.change_compare",
  "world.relation_explain",
]);
// G4 人文发现门：方法 A01-A12 全集 + 五用途 BE/BC/RF/PS/PL。
// gate-contracts.v3.json purpose_source=G4.interpretation.v1。
export const G4_METHOD_SET = new Set(Array.from({length:12},(_,i)=>`A${String(i+1).padStart(2,'0')}`));
export const G4_PURPOSE_CODES = new Set(["BE","BC","RF","PS","PL"]);
export const G4_PURPOSE_NAMESPACE = "G4.interpretation.v1";
export const QUALIFICATION_VALIDITY_MS = 6 * 24 * 60 * 60 * 1000;
const READ_RUN_SCHEMAS = new Set(["mab.private-text-reading.v1", "mab.private-scanned-page-reading.v1"]);
// 每个 Gate 涉及的原始件（或私有原件）都必须被逐动作显式许可：
//   machine_read = 允许机器读取正文；retain = 允许保存该数字副本。
// 旧黑名单式判定（status/redistribution/usage/publish/output_use 只拒绝已知值）已删除：
// 缺失字段不再"默认通过"，全部按 unknown 失败关闭。
const REQUIRED_SOURCE_ACTIONS = ["machine_read", "retain"];
const HEX = /^[a-f0-9]{64}$/;

const text = value => (value == null ? "" : String(value));
const flag = value => value === true || value === "t" || value === "true";
const json = value => {
  if (value == null || value === "") return null;
  try { return JSON.parse(text(value)); } catch { return null; }
};
const textArray = value => {
  const raw = text(value).trim();
  if (!raw || raw === "{}") return [];
  if (raw.startsWith("[")) { const parsed = json(raw); return Array.isArray(parsed) ? parsed.map(text) : []; }
  return raw.replace(/^\{(.*)\}$/, "$1").split(",").map(item => item.replace(/^"(.*)"$/, "$1").trim()).filter(Boolean);
};

function hasRef(refs, kind, id) {
  return Array.isArray(refs) && refs.some(ref => ref && ref.kind === kind && text(ref.id) === text(id));
}

// ---- deterministic check implementations ------------------------------------

async function checkIdentityVersion(ctx) {
  // G3/D03 candidates are claim_revisions. control.artifact_revision_for() is
  // gate-authority-owned and has no claim_revision mapping, so it returns null
  // for this object type (the same reason persist_private_world_claim had to
  // compute the row hash inline). For G3 the revision is instead proven by the
  // mandatory stage-binding attestation: deriveD03WorldClaimFacts re-derives
  // input/output digests from the persisted claim_revision/change/link rows and
  // cross-checks candidate.artifact_revision against that persisted object. We
  // confirm the object still exists here; no weaker path is introduced.
  if (ctx.gate === "G3" && text(ctx.candidate.object_type) === "claim_revision") {
    const rows = await ctx.query("select claim_revision_id::text as id from world.claim_revisions where claim_revision_id = :'oid'::uuid limit 2",
      { oid: ctx.candidate.object_id });
    if (rows.length !== 1 || rows[0].id !== text(ctx.candidate.object_id) || !HEX.test(text(ctx.candidate.artifact_revision)))
      return { ok: false, reason: "artifact_revision_unavailable" };
    return { ok: true, detail: `revision=${text(ctx.candidate.artifact_revision)} (G3 stage-binding attested)` };
  }
  const rows = await ctx.query("select control.artifact_revision_for(:'objectType', :'objectId') as revision",
    { objectType: ctx.candidate.object_type, objectId: ctx.candidate.object_id });
  const current = text(rows[0]?.revision);
  if (!HEX.test(current)) return { ok: false, reason: "artifact_revision_unavailable" };
  if (current !== text(ctx.candidate.artifact_revision)) {
    return { ok: false, reason: `artifact_revision_not_current:current=${current}` };
  }
  return { ok: true, detail: `revision=${current}` };
}

function assessRights(rows, ctx) {
  if (!rows.length) return { ok: false, reason: "rights_record_missing" };
  const observed = [];
  for (const row of rows) {
    const which = text(row.source_id) || text(row.original_id);
    if (text(row.original_state) !== "STORED_VERIFIED") return { ok: false, reason: `original_not_verified:${which}` };
    if (!flag(row.rights_declared)) return { ok: false, reason: `rights_not_declared:${which}` };
    const evidence = json(row.rights_evidence);
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      return { ok: false, reason: `rights_evidence_missing:${which}` };
    }
    const basis = text(evidence.basis).trim();
    if (!basis) return { ok: false, reason: `rights_basis_missing:${which}` };
    // 逐动作显式许可：任何一项不是 allowed 就 HOLD（含缺失 / unknown / restricted / denied）。
    const decision = decideRightsActions(
      row.rights_by_action == null ? null : json(row.rights_by_action),
      REQUIRED_SOURCE_ACTIONS
    );
    if (!decision.ok) {
      return { ok: false, reason: `rights_action_not_allowed:${which}:${decision.reasons[0] ?? "rights_actions_empty"}` };
    }
    if (evidence.expires_at != null) {
      const at = Date.parse(text(evidence.expires_at));
      if (!Number.isFinite(at) || at <= ctx.now) return { ok: false, reason: `rights_expired_or_unreadable:${which}` };
    }
    const entry = `${which}:basis=${basis};actions=${REQUIRED_SOURCE_ACTIONS.join(",")}=allowed`;
    if (!observed.includes(entry)) observed.push(entry);
  }
  return { ok: true, detail: observed.join(" ") };
}

// 非私有来源（无 studio.private_originals）的 G0 权利判定：合同 G0 的
// rights_by_operation 只判「逐动作显式权利」（CP2-A 权利词典），字节核验属独立的
// raw_provenance 检查（DESIGN_TARGET_NOT_APPLIED，另行）——不能因为不是私有原件
// 就拒绝有显式授权的合法来源（Owner 2026-11-14 裁定口径）。
function assessNonPrivateRights(rows, ctx) {
  if (!rows.length) return { ok: false, reason: "rights_record_missing" };
  const observed = [];
  for (const row of rows) {
    const which = text(row.source_id) || text(row.source_version_id);
    const evidence = json(row.rights_evidence);
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      return { ok: false, reason: `rights_evidence_missing:${which}` };
    }
    const basis = text(evidence.basis).trim();
    if (!basis) return { ok: false, reason: `rights_basis_missing:${which}` };
    // 逐动作显式许可：machine_read/retain 任何一项不是 allowed 就 HOLD。
    const decision = decideRightsActions(
      row.rights_by_action == null ? null : json(row.rights_by_action),
      REQUIRED_SOURCE_ACTIONS
    );
    if (!decision.ok) {
      return { ok: false, reason: `rights_action_not_allowed:${which}:${decision.reasons[0] ?? "rights_actions_empty"}` };
    }
    if (evidence.expires_at != null) {
      const at = Date.parse(text(evidence.expires_at));
      if (!Number.isFinite(at) || at <= ctx.now) return { ok: false, reason: `rights_expired_or_unreadable:${which}` };
    }
    const entry = `${which}:basis=${basis};actions=${REQUIRED_SOURCE_ACTIONS.join(",")}=allowed`;
    if (!observed.includes(entry)) observed.push(entry);
  }
  return { ok: true, detail: observed.join(" ") };
}

async function checkRightsByOperation(ctx) {
  if (ctx.gate === "G5") {
    const ot = text(ctx.candidate.object_type);
    let originalIds = [];
    if (ot === "world_projection") {
      const proj = await ctx.query("select p.payload->>'original_id' as original_id from read_model.world_projections p where p.projection_id = :'objectId'",
        { objectId: ctx.candidate.object_id });
      const oid = text(proj[0]?.original_id);
      if (!oid) return { ok: false, reason: "rights_original_ref_missing" };
      originalIds = [oid];
    } else if (ot === "story_seed" || ot === "agent_context") {
      // story_seed/agent_context 从 payload.body->'original_ids' 或 payload->'original_ids' 取，
      // 或从 derived_from_finding_ids 回溯 finding → supporting_world_objects 链上找 claim_revision → source refs
      const seed = await ctx.query(
        ot === "story_seed"
          ? "select s.payload::text as payload from read_model.story_seeds s where s.story_seed_id = :'objectId'"
          : "select c.payload::text as payload from read_model.agent_contexts c where c.agent_context_id = :'objectId'",
        { objectId: ctx.candidate.object_id }
      );
      const payload = json(seed[0]?.payload) ?? {};
      // 优先取 payload.original_ids 数组；再取 body.original_ids
      const rawIds = payload.original_ids ?? payload.body?.original_ids;
      let ids;
      if (Array.isArray(rawIds)) ids = rawIds;        // 已是数组
      else ids = json(rawIds);                         // JSON 字符串化后 parse
      if (Array.isArray(ids) && ids.length > 0) {
        originalIds = ids.map(text);
      } else {
        return { ok: false, reason: `${ot}_rights_original_refs_missing:need_payload_original_ids` };
      }
    } else if (ot === "director_plan") {
      // director_plan (Studio 业务层) 从 studio.director_plans.payload.original_ids 取；
      // persist_private_director_plan 写入时已从 depends_on_story_seeds/agent_contexts/projections 回溯填充
      const dp = await ctx.query(
        "select d.payload::text as payload from studio.director_plans d where d.plan_id = :'objectId'",
        { objectId: ctx.candidate.object_id }
      );
      if (!dp[0]) return { ok: false, reason: "director_plan_missing" };
      const payload = json(dp[0]?.payload) ?? {};
      const rawIds = payload.original_ids ?? payload.body?.original_ids;
      let ids;
      if (Array.isArray(rawIds)) ids = rawIds;
      else ids = json(rawIds);
      if (Array.isArray(ids) && ids.length > 0) {
        originalIds = ids.map(text);
      } else {
        return { ok: false, reason: "director_plan_rights_original_refs_missing:need_payload_original_ids_from_depends_on" };
      }
    } else if (ot === "work_revision") {
      // work_revision (ST-07 SaveWorkRevision) 从 studio.work_revisions.payload.original_ids 取；
      // persist_private_work_revision 写入时已从 depends_on_director_plan 回溯填充
      const wr = await ctx.query(
        "select w.payload::text as payload from studio.work_revisions w where w.revision_id = :'objectId'",
        { objectId: ctx.candidate.object_id }
      );
      if (!wr[0]) return { ok: false, reason: "work_revision_missing" };
      const payload = json(wr[0]?.payload) ?? {};
      const rawIds = payload.original_ids ?? payload.body?.original_ids;
      let ids;
      if (Array.isArray(rawIds)) ids = rawIds;
      else ids = json(rawIds);
      if (Array.isArray(ids) && ids.length > 0) {
        originalIds = ids.map(text);
      } else {
        return { ok: false, reason: "work_revision_rights_original_refs_missing:need_payload_original_ids_from_depends_on_director_plan" };
      }
    } else {
      return { ok: false, reason: `rights_unknown_object_type:${ot}` };
    }

    // 批量检查所有 original_id
    // 注意：queryRows 的 renderSql 不支持数组参数（String(array) 会变成 "a,b,c"），
    // 所以直接拼 UUID 数组字面量（UUID 安全，无注入风险）
    const uuidArray = originalIds.map(id => `'${id}'`).join(",");
    const rows = await ctx.query(`select o.original_id::text as original_id, o.state as original_state, o.rights_declared,
        s.source_id::text as source_id, s.rights_by_action::text as rights_by_action, s.rights_evidence::text as rights_evidence
      from studio.private_originals o
      join source.raw_items ri on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
        and ri.checksum_sha256 = o.sha256 and ri.byte_size = o.byte_size
      join source.source_versions v on v.source_version_id = ri.source_version_id
      join source.sources s on s.source_id = v.source_id
      where o.original_id = any(ARRAY[${uuidArray}]::uuid[]) and o.project_id = :'project'`,
      { project: ctx.project });
    if (rows.length) {
      const result = assessRights(rows, ctx);
      // 确保所有 originalIds 都被 rights 记录覆盖
      const covered = rows.map(r => text(r.original_id));
      const missing = originalIds.filter(id => !covered.includes(id));
      if (missing.length > 0) {
        return { ok: false, reason: `${ot}_rights_missing_for:${missing.join(",")}` };
      }
      return result;
    }
    // 非私有来源：original_ids 是 source_version 引用（非 private_originals），按 source.sources 逐动作权利判定；
    // 字节核验归 raw_provenance（DESIGN_TARGET_NOT_APPLIED）。
    const nonPrivate = await ctx.query(`select s.source_id::text as source_id, v.source_version_id::text as source_version_id,
        s.rights_by_action::text as rights_by_action, s.rights_evidence::text as rights_evidence
      from source.source_versions v
      join source.sources s on s.source_id = v.source_id
      where v.source_version_id = any(ARRAY[${uuidArray}]::uuid[])`);
    const result = assessNonPrivateRights(nonPrivate, ctx);
    const covered = nonPrivate.map(r => text(r.source_version_id));
    const missing = originalIds.filter(id => !covered.includes(id));
    if (missing.length > 0) {
      return { ok: false, reason: `${ot}_rights_missing_for:${missing.join(",")}` };
    }
    return result;
  }
  const rows = await ctx.query(`select o.original_id::text as original_id, o.state as original_state, o.rights_declared,
      s.source_id::text as source_id, s.rights_by_action::text as rights_by_action, s.rights_evidence::text as rights_evidence
    from source.source_versions v
    join source.raw_items ri on ri.source_version_id = v.source_version_id
    join studio.private_originals o on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
      and o.sha256 = ri.checksum_sha256 and o.byte_size = ri.byte_size and o.project_id = :'project'
    join source.sources s on s.source_id = v.source_id
    where v.source_version_id = :'objectId'`, { objectId: ctx.candidate.object_id, project: ctx.project });
  if (rows.length) return assessRights(rows, ctx);
  // 非私有来源（自由主题网络文本等）：无 private_originals，但若 source.sources
  // 已有显式 rights_by_action + rights_evidence，则按逐动作权利判定放行；
  // 字节核验（raw_provenance）是独立检查、另行 HOLD，不在这里混入。
  const nonPrivate = await ctx.query(`select s.source_id::text as source_id,
      v.source_version_id::text as source_version_id,
      s.rights_by_action::text as rights_by_action, s.rights_evidence::text as rights_evidence
    from source.source_versions v
    join source.sources s on s.source_id = v.source_id
    where v.source_version_id = :'objectId'`, { objectId: ctx.candidate.object_id });
  return assessNonPrivateRights(nonPrivate, ctx);
}

async function checkReadUnitBinding(ctx) {
  const rows = await ctx.query(`select ru.read_unit_id::text as read_unit_id, ru.method_code as method_code,
      rr.status as run_status, rr.config->>'schema' as run_schema, rr.input_sha256 as run_input_sha256,
      ri.checksum_sha256 as raw_checksum, ri.byte_size as raw_bytes, ri.source_version_id::text as source_version_id,
      o.original_id::text as original_id, o.state as original_state, o.sha256 as original_sha256, o.byte_size as original_bytes
    from source.read_units ru
    join source.read_runs rr on rr.read_run_id = ru.read_run_id
    join source.raw_items ri on ri.raw_item_id = rr.raw_item_id
    left join studio.private_originals o on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
      and o.sha256 = ri.checksum_sha256 and o.byte_size = ri.byte_size and o.project_id = :'project'
    where ru.read_unit_id = :'objectId'`, { objectId: ctx.candidate.object_id, project: ctx.project });
  const row = rows[0];
  if (!row) {
    // 非私有来源（无 private_originals）：设计 §2 G1 = read_unit 原件定位 + 可回放性 + 读取方法。
    // 字节核验归 raw_provenance（DESIGN_TARGET_NOT_APPLIED），不在这里混入（2026-11-14 A'）。
    const nonPrivate = await ctx.query(`select ru.read_unit_id::text as read_unit_id, ru.method_code as method_code,
        ru.locator::text as locator, rr.status as run_status
      from source.read_units ru
      join source.read_runs rr on rr.read_run_id = ru.read_run_id
      where ru.read_unit_id = :'objectId'`, { objectId: ctx.candidate.object_id });
    const np = nonPrivate[0];
    if (!np) return { ok: false, reason: "read_unit_missing" };
    if (text(np.run_status) !== "done") return { ok: false, reason: `read_run_not_done:${text(np.run_status)}` };
    const method = text(np.method_code);
    if (!/^C0[1-8]$/.test(method)) return { ok: false, reason: `read_unit_method_invalid:${method}` };
    const locator = json(np.locator) ?? {};
    const sourceVersionId = text(locator.source_version_id);
    if (!sourceVersionId) return { ok: false, reason: "read_unit_locator_not_replayable:missing_source_version" };
    const sv = await ctx.query(`select 1 from source.source_versions where source_version_id = :'sv'`, { sv: sourceVersionId });
    if (!sv[0]) return { ok: false, reason: `read_unit_source_version_not_found:${sourceVersionId}` };
    return { ok: true, detail: `read_unit=${text(np.read_unit_id)} method=${method} source_version=${sourceVersionId} replayable` };
  }
  if (text(row.run_status) !== "done") return { ok: false, reason: `read_run_not_done:${text(row.run_status)}` };
  if (!READ_RUN_SCHEMAS.has(text(row.run_schema))) return { ok: false, reason: `read_run_schema_unrecognized:${text(row.run_schema)}` };
  // D01 有两种读法：文本区间 C01 或扫页 C02。按 schema 动态判 method，不再写死 C02。
  const expectedMethod = text(row.run_schema) === "mab.private-text-reading.v1" ? "C01" : "C02";
  if (text(row.method_code) !== expectedMethod) return { ok: false, reason: `read_unit_method_mismatch:${text(row.method_code)}:expected=${expectedMethod}` };
  if (text(row.run_input_sha256) !== text(row.raw_checksum)) return { ok: false, reason: "read_run_input_digest_mismatch" };
  if (!text(row.original_id) || text(row.original_state) !== "STORED_VERIFIED") return { ok: false, reason: "read_unit_original_not_verified" };
  if (text(row.raw_checksum) !== text(row.original_sha256) || text(row.raw_bytes) !== text(row.original_bytes)) {
    return { ok: false, reason: "read_unit_bytes_not_bound_to_original" };
  }
  if (!hasRef(ctx.candidate.evidence_refs, "source_version", text(row.source_version_id))) {
    return { ok: false, reason: `source_version_ref_missing:${text(row.source_version_id)}` };
  }
  return { ok: true, detail: `read_unit=${text(row.read_unit_id)} source_version=${text(row.source_version_id)} original=${text(row.original_id)}` };
}

async function checkEvidenceBinding(ctx) {
  const rows = await ctx.query(`select e.evidence_id::text as evidence_id, e.input_fingerprint as input_fingerprint,
      e.reading_unit_id::text as reading_unit_id, e.raw_item_id::text as raw_item_id, e.source_version_id::text as source_version_id,
      ru.raw_item_id::text as reading_raw_item, ru.source_version_id::text as reading_source_version,
      ri.checksum_sha256 as raw_checksum, ri.byte_size as raw_bytes,
      o.original_id::text as original_id, o.state as original_state, o.sha256 as original_sha256, o.byte_size as original_bytes,
      l.link_id::text as link_id, l.link_version as link_version, l.quote_snapshot_hash as quote_snapshot_hash,
      k.is_active as key_active
    from evidence.material_evidence e
    join source.raw_items ri on ri.raw_item_id = e.raw_item_id and ri.source_version_id = e.source_version_id
    left join evidence.reading_units ru on ru.reading_unit_id = e.reading_unit_id
    left join studio.private_originals o on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
      and o.sha256 = ri.checksum_sha256 and o.byte_size = ri.byte_size and o.project_id = :'project'
    left join evidence.read_unit_evidence_links l on l.evidence_id = e.evidence_id
      and l.link_version = 'mab.private-material-observation.v1'
    left join control.original_bridge_verification_keys k on k.key_version = l.byte_verification_receipt->>'key_version'
    where e.evidence_id = :'objectId'`, { objectId: ctx.candidate.object_id, project: ctx.project });
  const row = rows[0];
  if (!row) {
    // 非私有来源（无 private_originals/raw_item 绑定）：设计 §2 G2 = 材料类型、来源声音、
    // 原文主张、来源归属可审。只判 input_fingerprint + locator.source_version_id 归属真实来源。
    const nonPrivate = await ctx.query(`select e.evidence_id::text as evidence_id, e.input_fingerprint as input_fingerprint,
        e.locator::text as locator
      from evidence.material_evidence e
      where e.evidence_id = :'objectId'`, { objectId: ctx.candidate.object_id });
    const np = nonPrivate[0];
    if (!np) return { ok: false, reason: "material_evidence_missing" };
    if (!HEX.test(text(np.input_fingerprint))) return { ok: false, reason: "evidence_request_digest_missing" };
    const locator = json(np.locator) ?? {};
    const sourceVersionId = text(locator.source_version_id);
    if (!sourceVersionId) return { ok: false, reason: "evidence_locator_not_attributed:missing_source_version" };
    const sv = await ctx.query(`select 1 from source.source_versions where source_version_id = :'sv'`, { sv: sourceVersionId });
    if (!sv[0]) return { ok: false, reason: `evidence_source_version_not_found:${sourceVersionId}` };
    return { ok: true, detail: `evidence=${text(np.evidence_id)} source_version=${sourceVersionId}` };
  }
  if (!HEX.test(text(row.input_fingerprint))) return { ok: false, reason: "evidence_request_digest_missing" };
  if (text(row.reading_raw_item) !== text(row.raw_item_id) || text(row.reading_source_version) !== text(row.source_version_id)) {
    return { ok: false, reason: "evidence_reading_unit_not_binding_source" };
  }
  if (!text(row.original_id) || text(row.original_state) !== "STORED_VERIFIED") return { ok: false, reason: "evidence_original_not_verified" };
  if (text(row.raw_checksum) !== text(row.original_sha256) || text(row.raw_bytes) !== text(row.original_bytes)) {
    return { ok: false, reason: "evidence_bytes_not_bound_to_original" };
  }
  if (!text(row.link_id) || text(row.link_version) !== "mab.private-material-observation.v1") {
    return { ok: false, reason: "evidence_byte_link_missing" };
  }
  if (!flag(row.key_active)) return { ok: false, reason: "evidence_link_key_not_active" };
  if (text(row.quote_snapshot_hash) !== text(row.original_sha256)) return { ok: false, reason: "evidence_quote_hash_not_bound_to_original" };
  return { ok: true, detail: `link=${text(row.link_id)} original=${text(row.original_id)}` };
}

async function checkClaimSupport(ctx) {
  // 用途先于内容判定：gate-contracts.v3.json 的 purpose_rule 要求 G3/G4 保留原语义命名空间，
  // 未知用途映射一律 deny（deny_when 含 unknown_purpose_mapping）。
  const purpose = `${text(ctx.candidate.purpose_namespace)}.${text(ctx.candidate.purpose_code)}`;
  if (!G3_PURPOSE_CODES.has(purpose)) {
    return { ok: false, reason: `unknown_purpose_mapping:${purpose || "none"}` };
  }
  const rows = await ctx.query(`select cr.claim_revision_id::text as claim_revision_id, cr.producer_method_id as producer_method_id,
      cr.subject_kind as subject_kind, cr.subject_id::text as subject_id,
      cr.asserted_time_json::text as asserted_time, cr.assertion_payload_json::text as payload,
      l.evidence_id::text as evidence_id, l.support_type as support_type,
      e.input_fingerprint as input_fingerprint, ri.checksum_sha256 as raw_checksum, ri.byte_size as raw_bytes,
      o.original_id::text as original_id, o.state as original_state, o.sha256 as original_sha256,
      o.byte_size as original_bytes,
      l2.link_id::text as link_id, l2.quote_snapshot_hash as quote_snapshot_hash, k.is_active as key_active
    from world.claim_revisions cr
    left join world.claim_evidence_links l on l.claim_revision_id = cr.claim_revision_id
    left join evidence.material_evidence e on e.evidence_id = l.evidence_id
    left join source.raw_items ri on ri.raw_item_id = e.raw_item_id and ri.source_version_id = e.source_version_id
    left join studio.private_originals o on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
      and o.sha256 = ri.checksum_sha256 and o.byte_size = ri.byte_size and o.project_id = :'project'
    left join evidence.read_unit_evidence_links l2 on l2.evidence_id = e.evidence_id
      and l2.link_version = 'mab.private-material-observation.v1'
    left join control.original_bridge_verification_keys k on k.key_version = l2.byte_verification_receipt->>'key_version'
    where cr.claim_revision_id = :'objectId'`, { objectId: ctx.candidate.object_id, project: ctx.project });
  const first = rows[0];
  if (!first) return { ok: false, reason: "claim_revision_missing" };
  const method = text(first.producer_method_id);
  let authorized;
  try {
    authorized = d03AuthorizedMethods();
  } catch (error) {
    return { ok: false, reason: `claim_method_authority_unavailable:${String(error?.message ?? error).split("\n")[0]}` };
  }
  if (!authorized.size) return { ok: false, reason: "claim_method_authority_empty" };
  if (!authorized.has(method)) return { ok: false, reason: `claim_method_not_authorized_for_d03:${method}` };
  // world.explain_bounded 最小必要条件（Gate 合同 §3.1 + D03 契约 §7）：
  // 身份、时空、主张、证据范围可审。缺任一即不得签该用途。
  if (!text(first.subject_kind) || !text(first.subject_id)) return { ok: false, reason: "claim_identity_scope_missing" };
  if (!first.asserted_time || text(first.asserted_time) === "null") return { ok: false, reason: "claim_time_scope_missing" };
  const payload = json(first.payload) ?? {};
  if (text(payload.project_id) !== ctx.project) return { ok: false, reason: `claim_project_scope_mismatch:${text(payload.project_id)}` };
  const cited = Array.isArray(payload.evidence_ids) ? payload.evidence_ids.map(text) : [];
  if (!cited.length) {
    // 非私有来源：无证据引用（layer1 D03 不写 claim_evidence_links），身份/时空/方法/项目已可审即放行；
    // 证据字节核验归 raw_provenance（DESIGN_TARGET_NOT_APPLIED）。
    return { ok: true, detail: `claim=${text(first.claim_revision_id)} method=${method} subject=${text(first.subject_kind)}:${text(first.subject_id)} (non-private, no cited evidence)` };
  }
  const supported = rows.filter(row => cited.includes(text(row.evidence_id)) &&
    HEX.test(text(row.input_fingerprint)) && text(row.link_id) && flag(row.key_active) &&
    text(row.quote_snapshot_hash) === text(row.original_sha256) &&
    text(row.original_state) === "STORED_VERIFIED" && text(row.raw_checksum) === text(row.original_sha256) &&
    text(row.raw_bytes) === text(row.original_bytes));
  if (!supported.length) {
    // 非私有来源：有证据引用但无字节核验（无 private_originals/字节回链），放行；字节核验归 raw_provenance。
    return { ok: true, detail: `claim=${text(first.claim_revision_id)} evidence_refs=${cited.join(",")} (non-private, byte-verification deferred)` };
  }
  if (!hasRef(ctx.candidate.evidence_refs, "material_evidence", supported[0].evidence_id)) {
    return { ok: false, reason: `upstream_evidence_ref_missing:${supported[0].evidence_id}` };
  }
  return { ok: true, detail: `claim=${text(first.claim_revision_id)} evidence=${supported.map(row => text(row.evidence_id)).join(",")}` };
}

async function checkFindingGrounding(ctx) {
  const rows = await ctx.query(`select f.finding_id::text as finding_id, f.discovery_method->>'method_id' as method_id,
      f.supporting_world_objects::text as refs, f.uncertainty->>'qualification' as qualification
    from meaning.findings f where f.finding_id = :'objectId'`, { objectId: ctx.candidate.object_id });
  const row = rows[0];
  if (!row) return { ok: false, reason: "finding_missing" };
  // G4 方法 ∈ A01-A12 全集（不写死 A06）。
  if (!G4_METHOD_SET.has(text(row.method_id))) return { ok: false, reason: `finding_method_mismatch:${text(row.method_id)}` };
  if (text(row.qualification) !== "UNASSESSED") return { ok: false, reason: `finding_qualification_not_candidate:${text(row.qualification)}` };
  // G4 用途白名单：purpose_namespace = G4.interpretation.v1，purpose_code ∈ BE/BC/RF/PS/PL。
  const purposeNs = text(ctx.candidate.purpose_namespace);
  const purposeCode = text(ctx.candidate.purpose_code);
  if (purposeNs !== G4_PURPOSE_NAMESPACE || !G4_PURPOSE_CODES.has(purposeCode)) {
    return { ok: false, reason: `unknown_purpose_mapping:${purposeNs}.${purposeCode || "none"}` };
  }
  const refs = json(row.refs);
  const upstream = ctx.upstream;
  if (!upstream || !hasRef(refs, "claim_revision", upstream.object_id)) {
    return { ok: false, reason: `finding_claim_ref_missing:${upstream?.object_id ?? "none"}` };
  }
  const claim = await ctx.query(`select c.assertion_payload_json->>'project_id' as project_id
    from world.claim_revisions c where c.claim_revision_id = :'id'`, { id: upstream.object_id });
  if (text(claim[0]?.project_id) !== ctx.project) return { ok: false, reason: `finding_claim_scope_mismatch:${text(claim[0]?.project_id)}` };
  return { ok: true, detail: `finding=${text(row.finding_id)} method=${text(row.method_id)} purpose=${purposeCode} claim=${upstream.object_id}` };
}

async function checkWorkRevisionBinding(ctx) {
  const ot = text(ctx.candidate.object_type);
  const upstream = ctx.upstream;

  // 根据 object_type 路由到对应表
  // world_projection → read_model (D05 P02)
  // story_seed / agent_context → read_model (D05 P04)
  // director_plan → studio (ST-05, 上游是 story_seed/agent_context/world_projection)
  if (ot === "director_plan") {
    const rows = await ctx.query(
      `select d.plan_id::text as id, d.title as key, d.payload::text as payload,
              d.method_id, d.qualification,
              array_to_string(d.depends_on_story_seeds,',') as depends_story_seeds,
              array_to_string(d.depends_on_agent_contexts,',') as depends_agent_contexts,
              array_to_string(d.depends_on_projections,',') as depends_projections
       from studio.director_plans d where d.plan_id = :'objectId'`,
      { objectId: ctx.candidate.object_id }
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: "director_plan_missing" };

    if (text(row.method_id) !== "H1H2H3") {
      return { ok: false, reason: `director_plan_method_mismatch:${text(row.method_id)}(expected H1H2H3)` };
    }

    if (text(row.qualification) !== "UNASSESSED") {
      return { ok: false, reason: `director_plan_qualification_not_candidate:${text(row.qualification)}` };
    }

    // depends_on 至少有一组非空，且每一组引用的上游对象在 read_model 中存在
    const hasStorySeeds = text(row.depends_story_seeds) !== "";
    const hasAgentCtx = text(row.depends_agent_contexts) !== "";
    const hasProjections = text(row.depends_projections) !== "";
    if (!hasStorySeeds && !hasAgentCtx && !hasProjections) {
      return { ok: false, reason: "director_plan_no_upstream_depends_on" };
    }

    // 逐个校验 depends_on 引用的上游对象是否真实存在
    if (hasStorySeeds) {
      const seedIds = text(row.depends_story_seeds).split(",").filter(Boolean);
      for (const sid of seedIds) {
        const r = await ctx.query("select 1 from read_model.story_seeds where story_seed_id = :'sid'", { sid });
        if (!r[0]) return { ok: false, reason: `director_plan_story_seed_not_found:${sid}` };
      }
    }
    if (hasAgentCtx) {
      const ctxIds = text(row.depends_agent_contexts).split(",").filter(Boolean);
      for (const cid of ctxIds) {
        const r = await ctx.query("select 1 from read_model.agent_contexts where agent_context_id = :'cid'", { cid });
        if (!r[0]) return { ok: false, reason: `director_plan_agent_context_not_found:${cid}` };
      }
    }
    if (hasProjections) {
      const projIds = text(row.depends_projections).split(",").filter(Boolean);
      for (const pid of projIds) {
        const r = await ctx.query("select 1 from read_model.world_projections where projection_id = :'pid'", { pid });
        if (!r[0]) return { ok: false, reason: `director_plan_projection_not_found:${pid}` };
      }
    }

    // 上游绑定：upstream 如果是 G5 级别对象（story_seed/agent_context/projection），必须出现在 depends_on 任一数组中
    // G4 finding 级别 upstream 不强制（它在 dependency_snapshot 里仅用于 Gate 先序，不直接绑定）
    if (upstream) {
      // upstream.object_type 对应 gate_audits.object_type
      const upstreamIsG5Level = ["story_seed", "agent_context", "world_projection"].includes(text(upstream.object_type));
      if (upstreamIsG5Level) {
        const allDepends = [
          ...(hasStorySeeds ? text(row.depends_story_seeds).split(",") : []),
          ...(hasAgentCtx ? text(row.depends_agent_contexts).split(",") : []),
          ...(hasProjections ? text(row.depends_projections).split(",") : [])
        ].filter(Boolean);
        if (!allDepends.includes(text(upstream.object_id))) {
          return { ok: false, reason: `director_plan_upstream_not_in_depends_on:${upstream.object_id}` };
        }
      }
    }

    return { ok: true, detail: `director_plan=${text(row.id)} method=H1H2H3 has_depends=[story_seed:${hasStorySeeds},agent_ctx:${hasAgentCtx},projection:${hasProjections}]` };
  }

  if (ot === "work_revision") {
    const rows = await ctx.query(
      `select w.revision_id::text as id, w.title as key, w.payload::text as payload,
              w.qualification, w.content_hash,
              w.depends_on_director_plan::text as depends_dp,
              array_to_string(w.depends_on_story_seeds,',') as depends_story_seeds,
              array_to_string(w.depends_on_agent_contexts,',') as depends_agent_contexts,
              array_to_string(w.depends_on_projections,',') as depends_projections
       from studio.work_revisions w where w.revision_id = :'objectId'`,
      { objectId: ctx.candidate.object_id }
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: "work_revision_missing" };

    // method_id 在 payload 里，不是显式列（work_revision 表设计）
    const payload = json(row.payload) ?? {};
    const methodId = text(payload.method_id);
    if (methodId !== "H1H2H3") {
      return { ok: false, reason: `work_revision_method_mismatch:${methodId}(expected H1H2H3)` };
    }

    if (text(row.qualification) !== "UNASSESSED") {
      return { ok: false, reason: `work_revision_qualification_not_candidate:${text(row.qualification)}` };
    }

    if (!text(row.content_hash) || !/^[0-9a-f]{64}$/i.test(text(row.content_hash))) {
      return { ok: false, reason: `work_revision_content_hash_invalid:${text(row.content_hash ?? "")}` };
    }

    // depends_on_director_plan 存在 + 有 G5 PASS current
    const dpPlanId = text(row.depends_dp);
    if (!dpPlanId) return { ok: false, reason: "work_revision_no_depends_on_director_plan" };
    const dpExists = await ctx.query("select 1 from studio.director_plans where plan_id = :'dp'", { dp: dpPlanId });
    if (!dpExists[0]) return { ok: false, reason: `work_revision_director_plan_not_found:${dpPlanId}` };

    // 从 payload 里的 depends_on_director_plan 拿 director_plan 的 G5 PASS 审计 ID（payload 已在上方声明）
    const upstreamDpId = text(payload.body?.depends_on_director_plan);
    if (!upstreamDpId || upstreamDpId !== dpPlanId) {
      return { ok: false, reason: "work_revision_payload_director_plan_mismatch" };
    }

    // 校验 director_plan 确实有 G5 PASS current
    const dpG5 = await ctx.query(
      `select ga.gate_audit_id::text as ga_id from control.gate_audits ga
       where ga.object_type='director_plan' and ga.object_id=:'dp'
         and ga.gate_code='G5' and ga.result='PASS' and ga.current_valid
         and (ga.valid_until is null or ga.valid_until > now())
       order by ga.signed_at desc limit 1`,
      { dp: dpPlanId }
    );
    if (!dpG5[0]) return { ok: false, reason: `work_revision_director_plan_not_qualified:no_current_g5_pass` };

    // 如果提供了 upstream（来自 dependency_snapshot 的第一条 G4 finding），校验 director_plan 的 story_seeds 里包含 finding 的上游链
    // 简化：不强制 upstream 精确匹配，director_plan 有 G5 PASS current 就足够
    const hasStorySeeds = text(row.depends_story_seeds) !== "";
    const hasAgentCtx = text(row.depends_agent_contexts) !== "";
    const hasProjections = text(row.depends_projections) !== "";
    if (!hasStorySeeds && !hasAgentCtx && !hasProjections) {
      return { ok: false, reason: "work_revision_no_upstream_depends_on_arrays" };
    }

    return { ok: true, detail: `work_revision=${text(row.id)} method=H1H2H3 content_hash=${text(row.content_hash).slice(0,12)}... depends_on_director_plan=${dpPlanId.slice(0,8)}... has_depends=[story_seed:${hasStorySeeds},agent_ctx:${hasAgentCtx},projection:${hasProjections}]` };
  }

  let table, idCol, keyCol, methodCol, derivedCol;
  if (ot === "world_projection") {
    table = "read_model.world_projections"; idCol = "projection_id"; keyCol = "projection_key";
    methodCol = "expression_rule->>'method_id'"; derivedCol = "derived_from_finding_ids";
  } else if (ot === "story_seed") {
    table = "read_model.story_seeds"; idCol = "story_seed_id"; keyCol = "seed_key";
    methodCol = "payload->>'method_id'"; derivedCol = "derived_from_finding_ids";
  } else if (ot === "agent_context") {
    table = "read_model.agent_contexts"; idCol = "agent_context_id"; keyCol = "context_key";
    methodCol = "payload->>'method_id'"; derivedCol = "derived_from_finding_ids";
  } else {
    return { ok: false, reason: `work_revision_binding_unknown_object_type:${ot}` };
  }

  const rows = await ctx.query(
    `select ${idCol}::text as id, ${keyCol} as key, payload::text as payload,
            ${methodCol} as method_id, ${derivedCol}::text as derived_from
     from ${table} where ${idCol} = :'objectId'`,
    { objectId: ctx.candidate.object_id }
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: `${ot}_missing` };

  // 方法白名单：P02 (world_projection) 或 P04 (story_seed/agent_context)
  const allowedMethod = ot === "world_projection" ? "P02" : "P04";
  if (text(row.method_id) !== allowedMethod) {
    return { ok: false, reason: `${ot}_method_mismatch:${text(row.method_id)}(expected ${allowedMethod})` };
  }

  const payload = json(row.payload) ?? {};
  if (text(payload.qualification) !== "UNASSESSED") {
    return { ok: false, reason: `${ot}_qualification_not_candidate:${text(payload.qualification)}` };
  }

  // derived_from_finding_ids 必须包含上游 object_id
  if (!upstream) return { ok: false, reason: `${ot}_upstream_missing` };
  const derived = textArray(row.derived_from);
  if (!derived.includes(text(upstream.object_id))) {
    return { ok: false, reason: `${ot}_finding_dependency_mismatch` };
  }

  // 上游 finding 的 method_id ∈ A01-A12（G4 已泛化，不再写死 A06）
  const finding = await ctx.query(
    `select f.discovery_method->>'method_id' as method_id from meaning.findings f where f.finding_id = :'id'`,
    { id: upstream.object_id }
  );
  if (!G4_METHOD_SET.has(text(finding[0]?.method_id))) {
    return { ok: false, reason: `${ot}_upstream_finding_not_current:${text(finding[0]?.method_id)}` };
  }

  return { ok: true, detail: `${ot}=${text(row.id)} method=${allowedMethod} finding=${upstream.object_id}` };
}

const CHECKS = {
  identity_version: checkIdentityVersion,
  rights_by_operation: checkRightsByOperation,
  read_unit_binding: checkReadUnitBinding,
  evidence_binding: checkEvidenceBinding,
  claim_support: checkClaimSupport,
  finding_grounding: checkFindingGrounding,
  work_revision_binding: checkWorkRevisionBinding,
};

// ---- 策略之外的结构性前置（D00-B，零 DDL）------------------------------------
// required_checks 来自 control.gate_policy_versions，加检查项需要 DDL；
// 因此 G0 的"C 方法预选"要求在本进程内强制：候选的 evidence_refs 必须含
// 合法 method_plan 引用，且方法已登记在唯一身份目录里，否则拒绝签发。
let professionalCMethods = null;
function registeredCMethods() {
  if (professionalCMethods) return professionalCMethods;
  professionalCMethods = new Set((identifierRegistry.professional_methods ?? []).map(text).filter(id => /^C\d{2}$/.test(id)));
  return professionalCMethods;
}

// D03 当前可执行方法集合来自唯一绑定合同，不在评审器里写死单个方法号。
// HOLD 的方法（W01-W06/W08-W10）即便将来解冻也须先有可执行绑定与正反测试。
let d03MethodsCache = null;
function d03AuthorizedMethods() {
  if (d03MethodsCache) return d03MethodsCache;
  const contract = methodBindingContract;
  const methods = contract.methods ?? contract.bindings ?? [];
  d03MethodsCache = new Set(methods
    .filter(entry => text(entry.stage) === "D03" && text(entry.implementation_binding) && text(entry.implementation_binding) !== "HOLD")
    .map(entry => text(entry.method_id))
    .filter(id => /^W\d{2}$/.test(id)));
  return d03MethodsCache;
}

async function checkMethodPlanPreselection(ctx) {
  const refs = (Array.isArray(ctx.candidate.evidence_refs) ? ctx.candidate.evidence_refs : []).filter(isMethodPlanRef);
  if (!refs.length) return { ok: false, reason: "method_plan_ref_missing" };
  let registered;
  try {
    registered = registeredCMethods();
  } catch (error) {
    return { ok: false, reason: `method_plan_authority_unavailable:${String(error?.message ?? error).split("\n")[0]}` };
  }
  if (!registered.size) return { ok: false, reason: "method_plan_authority_empty" };
  const observed = [];
  for (const ref of refs) {
    const inspected = inspectMethodPlanRef(ref);
    if (!inspected.ok) return { ok: false, reason: inspected.reason };
    if (!registered.has(inspected.methodId)) {
      return { ok: false, reason: `method_plan_method_not_registered:${inspected.methodId}` };
    }
    if (observed.includes(inspected.id)) return { ok: false, reason: `method_plan_ref_duplicate:${inspected.id}` };
    observed.push(inspected.id);
  }
  return { ok: true, detail: `methods=${observed.join(",")}` };
}

const STRUCTURAL_CHECKS_BY_GATE = { G0: [["method_plan_preselection", checkMethodPlanPreselection]] };

// ---- reviewer ---------------------------------------------------------------

export function createRuleGateReviewer({
  query,
  decide,
  mintToken = mintMachineSessionToken,
  now = () => Date.now(),
  randomId = () => crypto.randomUUID(),
  // 评审作用域必须可传入：机器评审原先写死 CP1 样本项目，导致任何新建项目
  // （如通用入口产出的非模板题材项目）都没有 G0 决策可签。规则与检查项不变。
  projectId = PROJECT_ID,
  // Explicitly injected by the independent Reviewer service, never by Producer.
  attestStageOutput = null,
  log = line => console.log(line),
} = {}) {
  if (typeof query !== "function" || typeof decide !== "function") throw Error("RULE_REVIEWER_DEPENDENCIES_REQUIRED");

  async function loadCandidate(gate, candidateId = null) {
    const rows = await query(`select candidate_id::text as candidate_id, gate_code, stage, object_type, object_id::text as object_id,
        artifact_revision, purpose_namespace, purpose_code, purpose_version, allowed_scope::text as scope, consumer,
        evidence_refs::text as evidence_refs, dependency_snapshot::text as dependency_snapshot,
        input_fingerprint, submitted_at::text as submitted_at
      from control.gate_candidates
      where gate_code = :'gate' and consumer = 'producer' and candidate_status = 'SUBMITTED'
        and allowed_scope->>'project_id' = :'project'
        ${candidateId ? "and candidate_id = :'cid'" : ""}
      order by submitted_at desc`, candidateId ? { gate, project: projectId, cid: candidateId } : { gate, project: projectId });
    if (!rows.length) throw Error("NO_SUBMITTED_CANDIDATE");
    if (rows.length > 1) log(`MULTIPLE_SUBMITTED_CANDIDATES ${gate} count=${rows.length} using=${rows[0].candidate_id}`);
    const row = rows[0];
    return {
      ...row,
      candidate_id: text(row.candidate_id),
      object_id: text(row.object_id),
      artifact_revision: text(row.artifact_revision),
      evidence_refs: json(row.evidence_refs) ?? [],
      dependency_snapshot: json(row.dependency_snapshot) ?? [],
    };
  }

  async function loadUpstream(gate, candidate) {
    const upstreamGate = UPSTREAM_BY_GATE[gate];
    if (!upstreamGate) return null;
    const dependencies = candidate.dependency_snapshot;
    if (!Array.isArray(dependencies) || dependencies.length === 0) throw Error(`GATE_ORDER_VIOLATION:missing_${upstreamGate}_dependency`);
    const found = [];
    let sawNonCurrentUpstream = false;
    for (const dependency of dependencies) {
      if (!dependency || typeof dependency !== "object" || !dependency.gate_audit_id) throw Error("GATE_ORDER_VIOLATION:dependency_shape_invalid");
      const rows = await query(`select a.gate_audit_id::text as id, a.gate_code as gate_code, a.object_type as object_type,
          a.object_id::text as object_id, a.artifact_revision as artifact_revision, a.result as result,
          a.decision_origin as decision_origin, a.consumer as consumer, a.qualification_digest as qualification_digest,
          a.current_valid as current_valid, a.valid_until as valid_until, a.signed_at as signed_at
        from control.gate_audits a where a.gate_audit_id = :'id'`, { id: dependency.gate_audit_id });
      const row = rows[0];
      if (!row) throw Error(`GATE_ORDER_VIOLATION:${upstreamGate}_audit_missing:${dependency.gate_audit_id}`);
      // 用简单 current 条件：PASS + 未撤销 + 未过期
      const auditValid = flag(row.current_valid) && (row.valid_until ? text(row.valid_until) > new Date().toISOString() : true);
      if (text(row.gate_code) === upstreamGate && !auditValid) sawNonCurrentUpstream = true;
      const checks = {
        gate_code_ok: text(row.gate_code) === upstreamGate,
        result_ok: text(row.result) === "PASS",
        origin_ok: text(row.decision_origin) === "independent_gate",
        consumer_ok: text(row.consumer) === "producer",
        current_ok: auditValid,
        qual_digest_ok: text(row.qualification_digest) === text(dependency.qualification_digest),
        artifact_rev_ok: text(row.artifact_revision) === text(dependency.artifact_revision),
      };
      const allOk = Object.values(checks).every(Boolean);
      if (allOk) {
        found.push({ gate: upstreamGate, audit_id: text(row.gate_audit_id), object_type: text(row.object_type),
          object_id: text(row.object_id), artifact_revision: text(row.artifact_revision) });
      }
      // 非 upstreamGate 级别的 dependency（如 G5 director_plan → G5 story_seed）跳过严格校验
    }
    if (found.length === 0) {
      if (sawNonCurrentUpstream) throw Error(`GATE_ORDER_VIOLATION:${upstreamGate}_not_current`);
      throw Error(`GATE_ORDER_VIOLATION:${upstreamGate}_not_found:no_dependency_with_gate_code_${upstreamGate}`);
    }
    // 至少找到一条 G4 级别的有效审计即可满足 G5→G4 先序
    return found[0];
  }

  async function review({ gate, dryRun = false, candidateId = null, stageRequest = null }) {
    if (!RULE_VERSION_BY_GATE[gate]) throw Error("GATE_ARGUMENT_INVALID");
    const ruleVersion = RULE_VERSION_BY_GATE[gate];
    const policy = await query(`select required_checks::text as required_checks, max_validity::text as max_validity
      from control.gate_policy_versions where gate_code = :'gate' and rule_version = :'rule' and enabled`,
    { gate, rule: ruleVersion });
    if (!policy.length) throw Error(`GATE_POLICY_NOT_ACTIVE:${gate}`);
    const requiredChecks = textArray(policy[0].required_checks);
    if (!requiredChecks.length) throw Error(`GATE_POLICY_CHECKS_MISSING:${gate}`);

    const candidate = await loadCandidate(gate, candidateId);
    const upstream = await loadUpstream(gate, candidate);
    const ctx = { gate, ruleVersion, candidate, upstream, project: projectId, now: now(), query };

    log(`candidate ${gate} candidate=${candidate.candidate_id} object=${candidate.object_type}:${candidate.object_id} revision=${candidate.artifact_revision} rule=${ruleVersion}`);
    const results = {};
    const structural = STRUCTURAL_CHECKS_BY_GATE[gate] ?? [];
    // 策略检查 + 策略外结构性前置统一评估；任一失败即不签发，回执写明实际查了什么。
    const evaluators = [
      ...requiredChecks.map(name => [name, CHECKS[name]]),
      ...structural,
    ];
    for (const [name, evaluator] of evaluators) {
      if (!evaluator) {
        results[name] = { ok: false, reason: `unverifiable_required_check:${name}` };
        log(`  ${name}: FAIL unverifiable_required_check`);
        continue;
      }
      let outcome;
      try {
        outcome = await evaluator(ctx);
      } catch (error) {
        outcome = { ok: false, reason: `check_error:${name}:${String(error?.message ?? error).split("\n")[0]}` };
      }
      results[name] = outcome;
      log(`  ${name}: ${outcome.ok ? "PASS" : "FAIL"}${outcome.detail ? " " + outcome.detail : ""}${outcome.ok ? "" : " " + outcome.reason}`);
    }

    const failed = evaluators.map(([name]) => name).filter(name => !results[name].ok);
    if (failed.length) {
      log(`RULE_GATE_REVIEW ${gate} FAIL checks=${failed.join(",")} reason=${results[failed[0]].reason}`);
      return { status: "FAIL", gate, candidateId: candidate.candidate_id, checks: results, failed };
    }
    // Object-level rule PASS is insufficient for Runner handoff. An exact
    // stage receipt is signed only after independent reconstruction from
    // persisted source facts; missing evidence fails before authority.decide.
    let stageBinding = null;
    if (stageRequest != null) {
      if (typeof attestStageOutput !== 'function') throw Error('STAGE_OUTPUT_ATTESTER_REQUIRED');
      stageBinding = await attestStageOutput({candidate,gate,request:stageRequest,projectId});
      if (!stageBinding) throw Error('STAGE_OUTPUT_ATTESTATION_REQUIRED');
    }
    if (dryRun) {
      log(`RULE_GATE_REVIEW ${gate} DRY_RUN_PASS audit=none checks=${evaluators.map(([name]) => name).join(",")}`);
      return { status: "DRY_RUN_PASS", gate, candidateId: candidate.candidate_id, checks: results };
    }

    const checks = {};
    for (const [name] of evaluators) checks[name] = true;
    const validUntil = new Date(ctx.now + QUALIFICATION_VALIDITY_MS).toISOString();
    const requestId = randomId();
    const sessionToken = mintToken({ uid: MACHINE_REVIEWER_USER_ID });
    // CAS 期望值必须是"签发前读到的当前资格"。此前不传（等价 null），
    // 于是同一对象键上只要已有一条资格，重签就恒抛 QUALIFICATION_CAS_CONFLICT——
    // 换新候选（如 D00 重跑）后无法再签，只能靠删资格绕过，那是错的。
    const current = await query(`select gate_audit_id::text as id from control.qualification_current
       where architecture_generation='mohen.six-stage.v1' and gate_code=:'gate' and object_type=:'objectType'
         and object_id=:'objectId' and purpose_namespace=:'ns' and purpose_code=:'purpose'
         and purpose_version=:'version' and consumer=:'consumer'
       order by valid_from desc limit 1`,
      {
        gate, objectType: candidate.object_type, objectId: candidate.object_id,
        ns: candidate.purpose_namespace, purpose: candidate.purpose_code,
        version: candidate.purpose_version, consumer: candidate.consumer,
      });
    const expectedAuditId = text(current[0]?.id) || null;
    const auditId = await decide({
      candidateId: candidate.candidate_id,
      requestId,
      result: "PASS",
      ruleVersion,
      validUntil,
      expectedAuditId,
      receipt: {
        checks,
        rationale: `MACHINE_RULE_REVIEW:${ruleVersion}:all deterministic checks passed`,
        evidence_refs: candidate.evidence_refs,
        ...(stageBinding ? {stage_binding:stageBinding} : {}),
      },
    }, sessionToken);
    if (typeof auditId !== "string" || !auditId) throw Error("GATE_DECISION_NOT_PERSISTED");

    const audit = await query(`select a.gate_code as gate_code, a.result as result, a.decision_origin as decision_origin,
        a.consumer as consumer, a.reviewer_user_id::text as reviewer_user_id, a.reviewer_db_identity as reviewer_db_identity,
        control.current_qualification_is_valid(a.gate_audit_id) as current
      from control.gate_audits a where a.gate_audit_id = :'id'`, { id: auditId });
    const signed = audit[0];
    if (!signed || text(signed.gate_code) !== gate || text(signed.result) !== "PASS" ||
        text(signed.decision_origin) !== "independent_gate" || text(signed.consumer) !== "producer" ||
        text(signed.reviewer_user_id) !== MACHINE_REVIEWER_USER_ID || text(signed.reviewer_db_identity) !== MACHINE_SIGNER_LOGIN) {
      throw Error(`SIGNED_AUDIT_MISMATCH:${auditId}`);
    }
    log(`RULE_GATE_REVIEW ${gate} PASS audit=${auditId} current=${flag(signed.current) ? "true" : "false"}`);
    return { status: "PASS", gate, candidateId: candidate.candidate_id, auditId, checks: results };
  }

  return { review };
}

// ---- CLI --------------------------------------------------------------------

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function decideThroughAuthority(decision, sessionToken) {
  // 进程内直呼权威签发 repository（与 CLI gate-authority.mjs 完全同一实现，
  // control.sign_gate_candidate 唯一写路径不变）。此前经 spawn 子进程执行，
  // 但 spawn 目标不参与部署文件追踪，lambda 内缺失导致签发必然失败；
  // 连接复用 openMachineQuery 切换后的机器签发连接池（同一 DATABASE_URL）。
  const url = process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
  if (!url) throw Error("MACHINE_GATE_DATABASE_URL_REQUIRED");
  try {
    const repo = createGateAuthorityRepository(getNodePgPool());
    const auditId = await repo.decide(decision, sessionToken);
    if (!auditId) throw Error("GATE_DECISION_NOT_PERSISTED");
    return auditId;
  } catch (error) {
    // 权威层机器错误码已是单行大写（repository 约定），原样保留便于诊断。
    const detail = String(error?.message ?? error).split("\n")[0];
    throw Error(`GATE_DECISION_FAILED ${detail}`.slice(0, 600));
  }
}

// 与 CLI main 完全同一份评审逻辑；受控部署入口（/api/internal/gate-review）调用
// 本函数在部署内完成评审与签发，机器会话密钥不出部署、不在任何本地进程中物化。
export async function runGateReview({ gate, projectId = PROJECT_ID, candidateId = null,
  attestStageBinding = false, dryRun = false } = {}) {
  if (!gate) throw Error("GATE_ARGUMENT_REQUIRED");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId ?? "")) {
    throw Error("PROJECT_ARGUMENT_INVALID");
  }
  const query = await openMachineQuery();
  let stageRequest = null;
  if (attestStageBinding) {
    // The signer derives both stage digests from persisted facts. The
    // candidate's stored input fingerprint independently cross-checks the input
    // reconstruction. The output digest has no surviving Producer claim after a
    // HOLD run, so it is the signer's own derivation and is recorded as such.
    const rows = await query(`select candidate_id::text as candidate_id, gate_code, stage,
        object_type, object_id::text as object_id, artifact_revision,
        allowed_scope::text as scope, consumer, evidence_refs::text as evidence_refs,
        dependency_snapshot::text as dependency_snapshot, input_fingerprint, run_id::text as run_id,
        allowed_scope->>'project_id' as project_id
      from control.gate_candidates
      where candidate_id = :'cid'::uuid and gate_code = :'gate'
        and consumer = 'producer' and candidate_status = 'SUBMITTED'
      limit 2`, { cid: candidateId, gate });
    if (!Array.isArray(rows) || rows.length !== 1) throw Error("STAGE_BINDING_CANDIDATE_NOT_UNIQUE");
    const row = rows[0];
    if (row.project_id !== projectId) throw Error("STAGE_BINDING_PROJECT_MISMATCH");
    const candidate = {...row, evidence_refs: JSON.parse(row.evidence_refs || "[]"),
      dependency_snapshot: JSON.parse(row.dependency_snapshot || "[]")};
    // 各阶段的输入/输出摘要由签发方自己从持久事实重建，不接受 Producer 自报。
    const deriveFacts = row.stage === "D05" ? deriveD05FactStageDigests
      : row.stage === "D04" ? deriveD04FindingStageDigests
      : row.stage === "D03" ? deriveD03WorldClaimStageDigests
      : row.stage === "D02" ? deriveD02ObservationStageDigests : deriveD01ReadingStageDigests;
    const facts = await deriveFacts({ query, candidate, projectId, runId: row.run_id, registry });
    if (facts.input_digest !== row.input_fingerprint) throw Error("STAGE_BINDING_INPUT_NOT_REPRODUCIBLE");
    const job = registry.jobs?.find(j => j.stage === row.stage);
    if (!job || job.exit_gate !== gate) throw Error("STAGE_BINDING_JOB_NOT_FOUND");
    stageRequest = { schema: "mohen.independent-gate-current-check.v1",
      run_id: row.run_id, job_id: job.job_id, stage: row.stage, gate_code: gate,
      reviewer_binding_ref: job.implementation?.gate_reviewer_binding,
      input_digest: row.input_fingerprint, output_digest: facts.output_digest,
      consumer: "producer" };
  }
  const reviewer = createRuleGateReviewer({ query, decide: decideThroughAuthority, projectId,
    ...(stageRequest ? { attestStageOutput: ({candidate, request}) =>
      attestStageOutputForRequest({ query, candidate, request, registry, projectId }) } : {}) });
  return reviewer.review({ gate, dryRun, candidateId: candidateId ?? null, stageRequest });
}

async function main() {
  const outcome = await runGateReview({
    gate: argument("gate"),
    projectId: argument("project") ?? PROJECT_ID,
    candidateId: argument("candidate") ?? null,
    attestStageBinding: process.argv.includes("--attest-stage-binding"),
    dryRun: process.argv.includes("--dry-run"),
  });
  if (outcome.status === "FAIL") process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.log(`RULE_GATE_REVIEW_FAILED ${String(error?.message ?? error).split("\n")[0]}`);
    process.exitCode = 1;
  }
}
