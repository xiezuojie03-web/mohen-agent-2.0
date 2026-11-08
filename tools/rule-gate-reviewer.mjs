#!/usr/bin/env node
// MAB M5 (LOCAL ISOLATED ONLY): deterministic machine rule reviewer for G0..G5.
// Every required policy check is re-derived from database facts under the
// dedicated machine signer login; if any check cannot be proven the reviewer
// refuses to sign. Signing goes through the existing authority repository CLI
// (control.sign_gate_candidate) — there is no second Gate/audit write path.
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  MACHINE_REVIEWER_USER_ID,
  MACHINE_SIGNER_LOGIN,
  mintMachineSessionToken,
  openMachineQuery,
} from "./machine-reviewer-session.mjs";
// CP2-D：逐动作权利只认唯一词典（显式 allowed 才放行）。
import { decideRightsActions } from "../packages/data-access/src/rights-actions.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const AUTHORITY_CLI = path.join(ROOT, "..", "packages", "data-access", "scripts", "gate-authority.mjs");

export const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
export const RULE_VERSION_BY_GATE = { G0: "m5-local-v1", G1: "m5-local-v1", G2: "m5-local-v1", G3: "m5-local-v1", G4: "m5-local-v1", G5: "v1" };
export const UPSTREAM_BY_GATE = { G1: "G0", G2: "G1", G3: "G2", G4: "G3", G5: "G4" };
export const METHOD_BY_GATE = { G1: "C02", G3: "W07", G4: "A06", G5: "P02" };
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

async function checkRightsByOperation(ctx) {
  if (ctx.gate === "G5") {
    const projection = await ctx.query("select p.payload->>'original_id' as original_id from read_model.world_projections p where p.projection_id = :'objectId'",
      { objectId: ctx.candidate.object_id });
    const originalId = text(projection[0]?.original_id);
    if (!originalId) return { ok: false, reason: "rights_original_ref_missing" };
    const rows = await ctx.query(`select o.original_id::text as original_id, o.state as original_state, o.rights_declared,
        s.source_id::text as source_id, s.rights_by_action::text as rights_by_action, s.rights_evidence::text as rights_evidence
      from studio.private_originals o
      join source.raw_items ri on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
        and ri.checksum_sha256 = o.sha256 and ri.byte_size = o.byte_size
      join source.source_versions v on v.source_version_id = ri.source_version_id
      join source.sources s on s.source_id = v.source_id
      where o.original_id = :'originalId' and o.project_id = :'project'`, { originalId, project: ctx.project });
    return assessRights(rows, ctx);
  }
  const rows = await ctx.query(`select o.original_id::text as original_id, o.state as original_state, o.rights_declared,
      s.source_id::text as source_id, s.rights_by_action::text as rights_by_action, s.rights_evidence::text as rights_evidence
    from source.source_versions v
    join source.raw_items ri on ri.source_version_id = v.source_version_id
    join studio.private_originals o on o.storage_bucket || '/' || o.storage_key = ri.storage_ref
      and o.sha256 = ri.checksum_sha256 and o.byte_size = ri.byte_size and o.project_id = :'project'
    join source.sources s on s.source_id = v.source_id
    where v.source_version_id = :'objectId'`, { objectId: ctx.candidate.object_id, project: ctx.project });
  return assessRights(rows, ctx);
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
  if (!row) return { ok: false, reason: "read_unit_missing" };
  if (text(row.method_code) !== METHOD_BY_GATE.G1) return { ok: false, reason: `read_unit_method_mismatch:${text(row.method_code)}` };
  if (text(row.run_status) !== "done") return { ok: false, reason: `read_run_not_done:${text(row.run_status)}` };
  if (!READ_RUN_SCHEMAS.has(text(row.run_schema))) return { ok: false, reason: `read_run_schema_unrecognized:${text(row.run_schema)}` };
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
  if (!row) return { ok: false, reason: "material_evidence_missing" };
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
  const rows = await ctx.query(`select cr.claim_revision_id::text as claim_revision_id, cr.producer_method_id as producer_method_id,
      cr.assertion_payload_json::text as payload, l.evidence_id::text as evidence_id,
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
  if (text(first.producer_method_id) !== METHOD_BY_GATE.G3) return { ok: false, reason: `claim_method_mismatch:${text(first.producer_method_id)}` };
  const payload = json(first.payload) ?? {};
  if (text(payload.project_id) !== ctx.project) return { ok: false, reason: `claim_project_scope_mismatch:${text(payload.project_id)}` };
  const cited = Array.isArray(payload.evidence_ids) ? payload.evidence_ids.map(text) : [];
  if (!cited.length) return { ok: false, reason: "claim_evidence_refs_missing" };
  const supported = rows.filter(row => cited.includes(text(row.evidence_id)) &&
    HEX.test(text(row.input_fingerprint)) && text(row.link_id) && flag(row.key_active) &&
    text(row.quote_snapshot_hash) === text(row.original_sha256) &&
    text(row.original_state) === "STORED_VERIFIED" && text(row.raw_checksum) === text(row.original_sha256) &&
    text(row.raw_bytes) === text(row.original_bytes));
  if (!supported.length) return { ok: false, reason: `claim_evidence_not_byte_verified:${cited.join(",")}` };
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
  if (text(row.method_id) !== METHOD_BY_GATE.G4) return { ok: false, reason: `finding_method_mismatch:${text(row.method_id)}` };
  if (text(row.qualification) !== "UNASSESSED") return { ok: false, reason: `finding_qualification_not_candidate:${text(row.qualification)}` };
  const refs = json(row.refs);
  const upstream = ctx.upstream;
  if (!upstream || !hasRef(refs, "claim_revision", upstream.object_id)) {
    return { ok: false, reason: `finding_claim_ref_missing:${upstream?.object_id ?? "none"}` };
  }
  const claim = await ctx.query(`select c.assertion_payload_json->>'project_id' as project_id
    from world.claim_revisions c where c.claim_revision_id = :'id'`, { id: upstream.object_id });
  if (text(claim[0]?.project_id) !== ctx.project) return { ok: false, reason: `finding_claim_scope_mismatch:${text(claim[0]?.project_id)}` };
  return { ok: true, detail: `finding=${text(row.finding_id)} claim=${upstream.object_id}` };
}

async function checkWorkRevisionBinding(ctx) {
  const rows = await ctx.query(`select p.projection_id::text as projection_id, p.payload::text as payload,
      p.derived_from_finding_ids::text as derived_from, p.expression_rule->>'method_id' as method_id
    from read_model.world_projections p where p.projection_id = :'objectId'`, { objectId: ctx.candidate.object_id });
  const row = rows[0];
  if (!row) return { ok: false, reason: "world_projection_missing" };
  if (text(row.method_id) !== METHOD_BY_GATE.G5) return { ok: false, reason: `projection_method_mismatch:${text(row.method_id)}` };
  const payload = json(row.payload) ?? {};
  if (text(payload.qualification) !== "UNASSESSED") return { ok: false, reason: `projection_qualification_not_candidate:${text(payload.qualification)}` };
  const upstream = ctx.upstream;
  if (!upstream || text(payload.finding_id) !== text(upstream.object_id)) {
    return { ok: false, reason: `projection_finding_not_upstream:${text(payload.finding_id)}` };
  }
  if (!textArray(row.derived_from).includes(text(upstream.object_id))) {
    return { ok: false, reason: "projection_finding_dependency_mismatch" };
  }
  const finding = await ctx.query(`select f.discovery_method->>'method_id' as method_id from meaning.findings f where f.finding_id = :'id'`,
    { id: upstream.object_id });
  if (text(finding[0]?.method_id) !== METHOD_BY_GATE.G4) return { ok: false, reason: `projection_upstream_finding_not_current:${text(finding[0]?.method_id)}` };
  return { ok: true, detail: `projection=${text(row.projection_id)} finding=${upstream.object_id}` };
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

// ---- reviewer ---------------------------------------------------------------

export function createRuleGateReviewer({
  query,
  decide,
  mintToken = mintMachineSessionToken,
  now = () => Date.now(),
  randomId = () => crypto.randomUUID(),
  log = line => console.log(line),
} = {}) {
  if (typeof query !== "function" || typeof decide !== "function") throw Error("RULE_REVIEWER_DEPENDENCIES_REQUIRED");

  async function loadCandidate(gate) {
    const rows = await query(`select candidate_id::text as candidate_id, gate_code, stage, object_type, object_id::text as object_id,
        artifact_revision, purpose_namespace, purpose_code, purpose_version, allowed_scope::text as scope, consumer,
        evidence_refs::text as evidence_refs, dependency_snapshot::text as dependency_snapshot,
        input_fingerprint, submitted_at::text as submitted_at
      from control.gate_candidates
      where gate_code = :'gate' and consumer = 'producer' and candidate_status = 'SUBMITTED'
        and allowed_scope->>'project_id' = :'project'
      order by submitted_at desc`, { gate, project: PROJECT_ID });
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
    let found = null;
    for (const dependency of dependencies) {
      if (!dependency || typeof dependency !== "object" || !dependency.gate_audit_id) throw Error("GATE_ORDER_VIOLATION:dependency_shape_invalid");
      const rows = await query(`select a.gate_audit_id::text as id, a.gate_code as gate_code, a.object_type as object_type,
          a.object_id::text as object_id, a.artifact_revision as artifact_revision, a.result as result,
          a.decision_origin as decision_origin, a.consumer as consumer, a.qualification_digest as qualification_digest,
          control.current_qualification_is_valid(a.gate_audit_id) as current
        from control.gate_audits a where a.gate_audit_id = :'id'`, { id: dependency.gate_audit_id });
      const row = rows[0];
      if (!row) throw Error(`GATE_ORDER_VIOLATION:${upstreamGate}_audit_missing:${dependency.gate_audit_id}`);
      if (text(row.gate_code) !== upstreamGate || text(row.result) !== "PASS" || text(row.decision_origin) !== "independent_gate" ||
          text(row.consumer) !== "producer" || !flag(row.current) ||
          text(row.qualification_digest) !== text(dependency.qualification_digest) ||
          text(row.artifact_revision) !== text(dependency.artifact_revision)) {
        throw Error(`GATE_ORDER_VIOLATION:${upstreamGate}_not_current:${dependency.gate_audit_id}`);
      }
      if (!hasRef(candidate.evidence_refs, text(row.object_type), text(row.object_id))) {
        throw Error(`GATE_ORDER_VIOLATION:${upstreamGate}_upstream_ref_missing:${text(row.object_id)}`);
      }
      found = { gate: upstreamGate, audit_id: text(row.gate_audit_id), object_type: text(row.object_type),
        object_id: text(row.object_id), artifact_revision: text(row.artifact_revision) };
    }
    return found;
  }

  async function review({ gate, dryRun = false }) {
    if (!RULE_VERSION_BY_GATE[gate]) throw Error("GATE_ARGUMENT_INVALID");
    const ruleVersion = RULE_VERSION_BY_GATE[gate];
    const policy = await query(`select required_checks::text as required_checks, max_validity::text as max_validity
      from control.gate_policy_versions where gate_code = :'gate' and rule_version = :'rule' and enabled`,
    { gate, rule: ruleVersion });
    if (!policy.length) throw Error(`GATE_POLICY_NOT_ACTIVE:${gate}`);
    const requiredChecks = textArray(policy[0].required_checks);
    if (!requiredChecks.length) throw Error(`GATE_POLICY_CHECKS_MISSING:${gate}`);

    const candidate = await loadCandidate(gate);
    const upstream = await loadUpstream(gate, candidate);
    const ctx = { gate, ruleVersion, candidate, upstream, project: PROJECT_ID, now: now(), query };

    log(`candidate ${gate} candidate=${candidate.candidate_id} object=${candidate.object_type}:${candidate.object_id} revision=${candidate.artifact_revision} rule=${ruleVersion}`);
    const results = {};
    for (const name of requiredChecks) {
      const evaluator = CHECKS[name];
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

    const failed = requiredChecks.filter(name => !results[name].ok);
    if (failed.length) {
      log(`RULE_GATE_REVIEW ${gate} FAIL checks=${failed.join(",")} reason=${results[failed[0]].reason}`);
      return { status: "FAIL", gate, candidateId: candidate.candidate_id, checks: results, failed };
    }
    if (dryRun) {
      log(`RULE_GATE_REVIEW ${gate} DRY_RUN_PASS audit=none checks=${requiredChecks.join(",")}`);
      return { status: "DRY_RUN_PASS", gate, candidateId: candidate.candidate_id, checks: results };
    }

    const checks = {};
    for (const name of requiredChecks) checks[name] = true;
    const validUntil = new Date(ctx.now + QUALIFICATION_VALIDITY_MS).toISOString();
    const requestId = randomId();
    const sessionToken = mintToken({ uid: MACHINE_REVIEWER_USER_ID });
    const auditId = await decide({
      candidateId: candidate.candidate_id,
      requestId,
      result: "PASS",
      ruleVersion,
      validUntil,
      receipt: {
        checks,
        rationale: `MACHINE_RULE_REVIEW:${ruleVersion}:all deterministic checks passed`,
        evidence_refs: candidate.evidence_refs,
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
  const url = process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
  if (!url) throw Error("MACHINE_GATE_DATABASE_URL_REQUIRED");
  const output = execFileSync(process.execPath, [AUTHORITY_CLI, "decide"], {
    input: JSON.stringify({ decision, sessionToken }),
    env: { ...process.env, MOHEN_GATE_DATABASE_URL: url },
    encoding: "utf8",
  });
  const parsed = JSON.parse(output.trim() || "{}");
  if (!parsed.gate_audit_id) throw Error("GATE_DECISION_NOT_PERSISTED");
  return parsed.gate_audit_id;
}

async function main() {
  const gate = argument("gate");
  if (!gate) throw Error("GATE_ARGUMENT_REQUIRED");
  const query = await openMachineQuery();
  const reviewer = createRuleGateReviewer({ query, decide: decideThroughAuthority });
  const outcome = await reviewer.review({ gate, dryRun: process.argv.includes("--dry-run") });
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
