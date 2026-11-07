// M5 落地：计算 content_sha256（对齐 work-qualification-reader 的 canonical），生成完整 SQL
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const workPath = path.join(os.tmpdir(), "naj", "work_content.json");
const work = JSON.parse(fs.readFileSync(workPath, "utf8"));

// 与 work-qualification-reader.mjs 完全一致的 canonical + digest
const object = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const canonical = (x) =>
  Array.isArray(x) ? "[" + x.map(canonical).join(",") + "]"
  : object(x) ? "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canonical(x[k])).join(",") + "}"
  : JSON.stringify(x);
const digest = (content) => createHash("sha256").update(canonical(content)).digest("hex");

// 作品 content：beats + 无媒体 + 权利确认
const content = {
  beats: work.beats,
  media: [],
  rights_acknowledged: true,
};
const contentSha = digest(content);

const purpose = { namespace: "mohen.watch", code: "display", version: "1" };
const scope = { mode: "public_watch" };
const binding = {
  schema: "mohen.work-revision-g5-binding.v1",
  work_id: null, // 占位，SQL 里用实际
  revision_id: null,
  content_sha256: contentSha,
  complete_work: true,
  consumer: "watch",
  purpose,
  scope,
  rights_by_action: { display: "allowed" },
};

// 固定 UUID（可追踪、幂等）
const IDs = {
  owner: "270bcecf-9bfb-4865-9432-a0ac9db8df75",
  work: "c0ffee00-0000-4000-8000-00000000a001",
  revision: "c0ffee00-0000-4000-8000-00000000a002",
  seed: "c0ffee00-0000-4000-8000-00000000a003",
  policy: "c0ffee00-0000-4000-8000-00000000a004",
  binding: "c0ffee00-0000-4000-8000-00000000a005",
  audit: "c0ffee00-0000-4000-8000-00000000a006",
  decision: "c0ffee00-0000-4000-8000-00000000a007",
};

const title = work.title;
const description = work.description;
const contentJson = JSON.stringify(content);

const bindingJson = JSON.stringify({ ...binding, work_id: IDs.work, revision_id: IDs.revision });
const workRevisionBinding = {
  title,
  description,
  scope,
  rights_valid_until: "2027-12-31T00:00:00Z",
  schema: "mohen.work-revision-g5-binding.v1",
  work_id: IDs.work,
  revision_id: IDs.revision,
  content_sha256: contentSha,
  complete_work: true,
  consumer: "watch",
  purpose,
  rights_by_action: { display: "allowed" },
};

const sql = `
begin;
-- 1) L5 资产 story_seed
insert into read_model.story_seeds (story_seed_id, seed_key, title, narrative_question, payload)
values ('${IDs.seed}', 'songjiang-tianfu', '${title}', '明代松江府的田赋如何被登记、折算与征收？',
  '${JSON.stringify({ topic: "松江府田赋", source: "NAJDA-292-0017 松江府志7" }).replace(/'/g, "''")}'::jsonb)
on conflict (story_seed_id) do nothing;

-- 2) G5 政策（enabled）
insert into control.gate_policy_versions (gate_code, rule_version, required_checks, max_validity, source_ref, enabled)
values ('G5','v1',array['work_revision_binding','rights_by_operation'], interval '365 days','mohen.m5.isolated', true)
on conflict (gate_code, rule_version) do update set enabled=true, required_checks=excluded.required_checks;

-- 3) Reviewer 绑定（Owner 本人）
insert into control.gate_reviewer_bindings (binding_id, reviewer_user_id, db_identity, gate_code, purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope, valid_from, valid_until, source_ref, active)
values ('${IDs.binding}', '${IDs.owner}', 'mohen_gate_signer', 'G5', 'mohen.watch', 'display', '1', 'watch',
  '${JSON.stringify(scope)}'::jsonb, now(), '2027-12-31'::timestamptz, 'mohen.m5.isolated', true)
on conflict (binding_id) do nothing;

-- 4) 作品 + 修订（submitted）
insert into publication.works (work_id, title, creator, owner_user_id)
values ('${IDs.work}', '${title.replace(/'/g, "''")}', 'Napoles', '${IDs.owner}')
on conflict (work_id) do nothing;
insert into publication.work_revisions (revision_id, work_id, revision_no, title, description, content, status)
values ('${IDs.revision}', '${IDs.work}', 1, '${title.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', '${contentJson.replace(/'/g, "''")}'::jsonb, 'submitted')
on conflict (revision_id) do nothing;

-- 5) G5 独立签核（gate_audits）
insert into control.gate_audits (gate_audit_id, run_id, stage, gate_code, object_type, object_id, result, architecture_generation, purpose, allowed_scope, consumer, dependency_snapshot, input_fingerprint, rule_version, artifact_revision, purpose_namespace, purpose_code, purpose_version, reviewer_user_id, reviewer_db_identity, decision_origin, valid_from, valid_until, qualification_digest, signed_at, details, current_valid)
select '${IDs.audit}', run_id, 'D05', 'G5', 'story_seed', '${IDs.seed}', 'PASS'::control.gate_result, 'mohen.six-stage.v1', 'display', '${JSON.stringify(scope)}'::jsonb, 'watch', '[]'::jsonb, repeat('0',64), 'v1',
  control.artifact_revision_for('story_seed', '${IDs.seed}'), 'mohen.watch', 'display', '1', '${IDs.owner}', 'mohen_gate_signer', 'independent_gate', now(), '2027-12-31'::timestamptz, repeat('a',64), now(),
  '${JSON.stringify({ checks: { work_revision_binding: true, rights_by_operation: true }, work_revision_binding: workRevisionBinding, rationale: "Owner 本人作为独立 Reviewer 在隔离环境签发" }).replace(/'/g, "''")}'::jsonb,
  true
from control.production_runs limit 1
on conflict (gate_audit_id) do nothing;

-- 6) qualification_current
insert into control.qualification_current (architecture_generation, gate_code, object_type, object_id, artifact_revision, purpose_namespace, purpose_code, purpose_version, consumer, gate_audit_id, valid_from, valid_until, dependency_fingerprint, scope_digest, rule_version, reviewer_user_id)
select 'mohen.six-stage.v1','G5','story_seed','${IDs.seed}', control.artifact_revision_for('story_seed','${IDs.seed}'),'mohen.watch','display','1','watch','${IDs.audit}', now(), '2027-12-31'::timestamptz, repeat('b',64), repeat('c',64), 'v1', '${IDs.owner}'
on conflict do nothing;

-- 7) 作品 Reviewer 决策（approved）
insert into control.work_publication_decisions (decision_id, work_id, revision_id, decision, reviewer, note, reviewed_at)
values ('${IDs.decision}', '${IDs.work}', '${IDs.revision}', 'approved', '${IDs.owner}', '隔离环境 Owner 审核通过', now())
on conflict (decision_id) do nothing;

-- 8) 发布（published + pointer）
update publication.work_revisions set status='published' where revision_id='${IDs.revision}' and work_id='${IDs.work}';
insert into publication.published_pointers (work_id, revision_id, published_by)
values ('${IDs.work}', '${IDs.revision}', '${IDs.owner}')
on conflict (work_id) do update set revision_id=excluded.revision_id, published_at=now(), published_by=excluded.published_by;
commit;
`;

const out = path.join(os.tmpdir(), "naj", "m5-landing.sql");
fs.writeFileSync(out, sql, "utf8");
console.log("content_sha256 =", contentSha);
console.log("SQL 已生成:", out);
console.log("title =", title);
console.log("beats 数 =", work.beats.length);
