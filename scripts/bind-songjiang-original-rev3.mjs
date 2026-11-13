#!/usr/bin/env node
/**
 * bind-songjiang-original-rev3.mjs —— 为「松江府田赋」出 rev3，绑定松江府志7第35页扫描页，
 * 然后重走 ST-08 投稿冻结 → ST-09 运营核签 → 发布。publish_exact_revision 会原子地把
 * 公开指针从 rev2 切到 rev3（同一 work_id on conflict do update），旧合法稿不受影响。
 *
 * 不伪造任何东西：同一 director_plan / 同一 finding / 同一原件，只在 content 里追加
 * media 字段（取自 public.assets 已 verified 且 display=allowed 的扫描页）。
 * G5 走与 ST-10 完全相同的机器评审通道；核签走运营角色。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}
process.env.DATABASE_URL = env.DATABASE_URL;

const STUDIO_USER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const OPERATOR = "editorial-operator-st10@mohen";
const projectId = "b0a11000-0000-4000-8000-000000000001";
const runId = "c0a12000-0000-4000-8000-000000000030";
const findingId = "b31f534e-33eb-5b80-3034-e6ecde9e2b20";
const g4AuditId = "fc3645f6-1fde-457d-abf2-4a7dcceda991";
const planTitle = "松江府田赋科则机制导演方案·H1H2H3";

const uuidFrom = (label) => {
  const h = crypto.createHash("sha256").update(`mab-private-st10:${label}`).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const workId = uuidFrom(`work:${projectId}`);
const planId = uuidFrom(`plan:${projectId}:${planTitle}`);
const revisionId = uuidFrom(`work-revision:${workId}:rev3`);

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs }))
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
const machineToken = mintSessionToken(MACHINE_SIGNER_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET);

const decideGate = async (d) => {
  await db.query("begin");
  try {
    await db.query("set role mohen_gate_signer_m5_machine");
    await db.query(`SET mohen.session_token = '` + machineToken + `'`);
    const res = await db.query(
      `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
      [d.candidateId, d.requestId, d.result, d.ruleVersion, d.validUntil,
       JSON.stringify(d.receipt), d.expectedAuditId]);
    await db.query("commit");
    return res.rows[0].gate_audit_id;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  } finally {
    await db.query("select set_config('mohen.session_token',null,true)").catch(() => {});
    await db.query("reset role").catch(() => {});
  }
};

async function runAsOperator(sql, params) {
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL ROLE mohen_editorial_operator");
    const res = await db.query(sql, params);
    await db.query("COMMIT");
    return res.rows[0].d ?? res.rows[0].p;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  }
}

// ---- 前置：rev2 必须存在且当前指针指向 rev2 ----
const pre = (await db.query(
  `select (select count(*)::int from studio.work_revisions where work_id=$1::uuid and revision_no=2) rev2,
          (select studio_revision_id::text from publication.published_pointers where work_id=$1::uuid) ptr_rev`,
  [workId])).rows[0];
console.log(`前置：rev2=${pre.rev2} 当前指针=${pre.ptr_rev}`);
if (pre.rev2 !== 1) throw new Error("rev2 不存在，链接不成立");
if (pre.ptr_rev !== "6caec62b-1d7a-dc88-7a1d-e6ed527e40cf") throw new Error("当前指针不是 rev2");

// ---- 读取 rev2 内容，确保只追加 media 不改其他字段 ----
const rev2 = (await db.query(
  `select content, beats, source_and_rights_refs from studio.work_revisions
    where revision_id='6caec62b-1d7a-dc88-7a1d-e6ed527e40cf'::uuid`)).rows[0];
const rev2Content = rev2.content;
if (!rev2Content.frames || !Array.isArray(rev2Content.frames)) throw new Error("rev2 content 缺 frames");
if (rev2Content.media) throw new Error("rev2 已有 media，本脚本不应再跑");

// ---- 真实媒资：松江府志7 第35页（public.assets verified, display=allowed） ----
const asset = (await db.query(
  `select a.asset_id::text as asset_id, a.title, a.kind, a.license,
          a.content_sha256, a.page_locator::text as page_locator,
          a.source_id::text as source_id,
          s.provider, s.title as source_title,
          v.source_version_id::text as source_version_id, v.version_label,
          s.rights_evidence->'work'->>'title' as work_title,
          s.rights_evidence->'work'->>'edition' as edition,
          (select r->>'url' from jsonb_array_elements(s.rights_evidence->'references') r
            where r->>'kind' = 'wikimedia_commons_file' limit 1) as commons_url
     from public.assets a
     join source.sources s on s.source_id = a.source_id
     left join source.source_versions v on v.source_id = a.source_id and v.checksum_sha256 = a.content_sha256
    where a.asset_id = 'dd0ffa3b-db10-4673-9fa8-eed17e7e3246'::uuid
      and a.status = 'verified' and a.kind = 'scan_page'
      and a.rights_by_action->>'display' = 'allowed'`)).rows[0];
if (!asset) throw new Error("REAL_MEDIA_ASSET_NOT_FOUND_OR_NOT_DISPLAYABLE");
const page = JSON.parse(asset.page_locator);
const mediaItem = {
  asset_id: asset.asset_id,
  kind: asset.kind,
  title: asset.title,
  license: asset.license,
  rights_status: "cleared",
  src: `/api/works/media/${asset.asset_id}`,
  caption: asset.title,
  provenance: {
    source_id: asset.source_id,
    content_sha256: asset.content_sha256,
    page_no: page.page_no,
    ...(asset.source_version_id ? { source_version_id: asset.source_version_id } : {}),
    ...(asset.version_label ? { catalog_no: asset.version_label } : {}),
    ...(asset.provider ? { held_by: asset.provider } : {}),
    ...(asset.work_title ? { work_title: asset.work_title } : {}),
    ...(asset.edition ? { edition: asset.edition } : {}),
    ...(asset.commons_url ? { source_url: asset.commons_url } : {}),
  },
};
const rev3Content = { ...rev2Content, media: [mediaItem] };
console.log(`媒资：${asset.title}（page ${page.page_no}，${asset.license}）`);

// ---- rev3（幂等：已存在则跳过创建，仅校验内容） ----
const existingRev3 = (await db.query(
  `select revision_id::text, content, beats, source_and_rights_refs
     from studio.work_revisions where revision_id=$1::uuid`, [revisionId])).rows[0];

if (existingRev3) {
  console.log(`rev3 已存在，跳过创建：${existingRev3.revision_id}`);
} else {
  await db.query("BEGIN");
  await db.query("SET LOCAL ROLE mohen_app_runtime");
  await db.query(`SET LOCAL mohen.session_token = '` + mintSessionToken(STUDIO_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET) + `'`);
  const wr = (await db.query(
    `select studio.persist_private_work_revision(
       $1::uuid,$2::uuid,$3::integer,$4::integer,
       $5::uuid,$6::text,$7::text,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid) as r`,
    [workId, revisionId, 3, 2, projectId, STUDIO_USER_ID, "松江府田赋·低田科则与准熟起科·修订3",
     JSON.stringify(rev3Content),
     JSON.stringify(rev2.beats),
     JSON.stringify(rev2.source_and_rights_refs),
     planId])).rows[0].r;
  await db.query("COMMIT");
  console.log(`rev3=${wr.revision_id} content_hash=${String(wr.content_hash).slice(0, 12)}…`);
}

// 校验 rev3 除 media 外与 rev2 结构一致，media 与预期一致
const rev3 = (await db.query(
  `select content from studio.work_revisions where revision_id=$1::uuid`, [revisionId])).rows[0];
const rev3WithoutMedia = { ...rev3.content }; delete rev3WithoutMedia.media;
const norm = (o) => {
  if (o === null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(norm);
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = norm(o[k]);
  return out;
};
if (JSON.stringify(norm(rev3WithoutMedia)) !== JSON.stringify(norm(rev2Content))) {
  throw new Error("REV3_CONTENT_CHANGED_BEYOND_MEDIA");
}
if (JSON.stringify(norm(rev3.content.media)) !== JSON.stringify(norm([mediaItem]))) {
  throw new Error("REV3_MEDIA_MISMATCH");
}
console.log("rev3 内容校验通过：仅追加 media，其余与 rev2 结构一致");

// ---- G5（幂等：已有当前 G5 PASS 则跳过签发） ----
const existingG5 = (await db.query(
  `select gate_audit_id::text from control.gate_audits
    where gate_code='G5' and object_type='work_revision' and object_id=$1::uuid
      and result='PASS' and current_valid
      and (valid_until is null or now() < valid_until)
    order by signed_at desc limit 1`, [revisionId])).rows[0];

let g5AuditId;
if (existingG5) {
  g5AuditId = existingG5.gate_audit_id;
  console.log(`rev3 已有当前 G5 PASS，跳过签发：${g5AuditId}`);
} else {
const g4 = (await db.query(
  `select gate_audit_id::text, object_type, object_id::text, artifact_revision, qualification_digest
   from control.gate_audits where gate_audit_id=$1::uuid`, [g4AuditId])).rows[0];
const planG5 = (await db.query(
  `select gate_audit_id::text, object_type, object_id::text, artifact_revision, qualification_digest
   from control.gate_audits where object_type='director_plan' and object_id=$1::uuid
     and gate_code='G5' and result='PASS' and current_valid order by signed_at desc limit 1`, [planId])).rows[0];
const artifactRevision = (await db.query(
  `select control.artifact_revision_for('work_revision',$1::uuid) as rev`, [revisionId])).rows[0].rev;
const deps = [g4, planG5].filter(Boolean).map((r) => ({
  gate_code: r === g4 ? "G4" : "G5", stage: r === g4 ? "D04" : "D05",
  object_type: r.object_type, object_id: r.object_id, artifact_revision: r.artifact_revision,
  gate_audit_id: r.gate_audit_id, qualification_digest: r.qualification_digest,
}));
const candidateId = uuidFrom(`candidate-rev3:G5:work_revision:${revisionId}`);
await db.query(`delete from control.gate_candidates where gate_code='G5' and object_type='work_revision'
                and object_id=$1::uuid and candidate_status='SUBMITTED'`, [revisionId]);
await db.query(
  `insert into control.gate_candidates(
     candidate_id, run_id, stage, gate_code, object_type, object_id, artifact_revision,
     purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer,
     dependency_snapshot, evidence_refs, input_fingerprint, submitted_at, producer_identity, candidate_status)
   values ($1::uuid,$2::uuid,'D05','G5','work_revision',$3::uuid,$4,
     'data-production','m5-remediation','v1',$5::jsonb,'producer',
     $6::jsonb,$7::jsonb,$8,now(),'private-evidence-worker','SUBMITTED')`,
  [candidateId, runId, revisionId, artifactRevision,
   JSON.stringify({ project_id: projectId }), JSON.stringify(deps),
   JSON.stringify([{ kind: "director_plan_ref", ref: planId }, { kind: "finding_ref", ref: findingId }]),
   sha(`${projectId}:work_revision:${revisionId}:${artifactRevision}`)]);
const reviewer = createRuleGateReviewer({
  query: queryRows, decide: decideGate, projectId, log: (l) => console.log(`  ${l}`),
});
const dry = await reviewer.review({ gate: "G5", dryRun: true });
if (dry.status !== "DRY_RUN_PASS") throw new Error(`dryRun 失败：${dry.failed?.join(",") || dry.status}`);
const signed = await reviewer.review({ gate: "G5", dryRun: false });
if (signed.status !== "PASS") throw new Error(`签发失败：${signed.failed?.join(",") || signed.status}`);
g5AuditId = signed.auditId;
console.log(`G5=${g5AuditId}`);
}

// ---- ST-08 快照（幂等：已存在则跳过） ----
const existingSnap = (await db.query(
  `select snapshot_id::text from studio.submission_snapshots where revision_id=$1::uuid`, [revisionId])).rows[0];
let snapshotId;
if (existingSnap) {
  snapshotId = existingSnap.snapshot_id;
  console.log(`rev3 已有 submission snapshot，跳过：${snapshotId}`);
} else {
await db.query("BEGIN");
await db.query("SET LOCAL ROLE mohen_app_runtime");
await db.query(`SET LOCAL mohen.session_token = '` + mintSessionToken(STUDIO_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET) + `'`);
const snap = (await db.query(
  `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4::text) as r`,
  [uuidFrom(`snapshot-rev3:${revisionId}`), revisionId, projectId, STUDIO_USER_ID])).rows[0].r;
await db.query("COMMIT");
snapshotId = snap.snapshot_id;
console.log(`snapshot=${snapshotId} gaps=${(snap.gaps || []).length}`);
}

// ---- 核签（幂等：已有 APPROVED 决策则跳过） + 发布 ----
const existingDecision = (await db.query(
  `select decision_id::text, decision from publication.editorial_decisions
    where revision_id=$1::uuid order by created_at desc limit 1`, [revisionId])).rows[0];
let decision;
if (existingDecision && existingDecision.decision === "APPROVED") {
  console.log(`rev3 已有 APPROVED 决策，跳过核签：${existingDecision.decision_id}`);
} else {
decision = await runAsOperator(
  "select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text) as d",
  [uuidFrom(`decision-rev3:${workId}:${revisionId}`), workId, revisionId, "APPROVED", OPERATOR,
   "rev3 绑定原件扫描页后重新公开", `st10-decide-rev3-${workId}`]);
console.log(`核签=${decision.decision} 可发布=${decision.publishable} 权利缺口=${(decision.rights_gaps || []).length}`);
if (decision.decision !== "APPROVED" || (decision.rights_gaps || []).length) throw new Error("核签未通过");
}

const existingPub = (await db.query(
  `select studio_revision_id::text from publication.published_pointers where work_id=$1::uuid`, [workId])).rows[0];
let pub;
if (existingPub && existingPub.studio_revision_id === revisionId) {
  console.log(`rev3 已是当前发布指针，跳过发布`);
  pub = { publication_id: (await db.query(
    `select publication_id::text from publication.published_pointers where work_id=$1::uuid`, [workId])).rows[0].publication_id };
} else {
pub = await runAsOperator(
  "select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as p",
  [uuidFrom(`publication-rev3:${workId}:${revisionId}`), workId, revisionId, OPERATOR, `st10-publish-rev3-${workId}`]);
}
const ptr = (await db.query(
  `select source_schema, studio_revision_id::text as revision_id, publication_id::text
     from publication.published_pointers where work_id=$1::uuid`, [workId])).rows[0];
console.log(`发布=${pub.publication_id} 指针=${JSON.stringify(ptr)}`);
if (!ptr || ptr.source_schema !== "studio" || ptr.revision_id !== revisionId) throw new Error("指针未指向 rev3");

console.log(JSON.stringify({
  workId, revisionId, publicationId: pub.publication_id,
  g5AuditId, snapshotId,
  replacedRevision: "6caec62b-1d7a-dc88-7a1d-e6ed527e40cf",
  media: { asset_id: asset.asset_id, title: asset.title, page_no: page.page_no },
}, null, 1));
await db.end();
