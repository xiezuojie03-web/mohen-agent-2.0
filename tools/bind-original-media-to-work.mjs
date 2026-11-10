#!/usr/bin/env node
// M5（本地隔离）：把**库里既有的真实原件媒资**绑定成作品的观看画面，并重签 G5(watch)、
// 重新发布。全程复用既有唯一通道，不自造第二套 Gate：
//   · 修订写入   → apps/web/lib/studio-director.ts 的 commitWorkRevision（含哈希/CAS/防并发）
//   · G5(watch)  → 与 tools/verify-5m-watch-eligibility.mjs 同一口径：复制批次 H 的候选模板，
//                  机器评审身份经 gate-authority.mjs decide 签发（不等于 Owner 人文背书）
//   · 发布       → apps/web/lib/publication.ts 的 submitWork / publishWork（每次重验 G5）
//
// 严格边界：
//   · media 每个字段只取 public.assets / source.* / studio.private_originals 的真实值，
//     缺什么就省略，绝不编造；不伪造 artifact_ref / qualification_ref；
//   · 任一校验不成立即失败退出，不降级、不跳过 G5；
//   · 幂等：最新修订的 media 已等于目标值时不再产生新修订。
//
// 运行：node --experimental-transform-types tools/bind-original-media-to-work.mjs [--assert-revocation]
//       （--experimental-transform-types 用于让 .mjs 直接 import 应用层 .ts 模块）

import module from "node:module";
import crypto, { randomUUID } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

// tools/ 是 .mjs，应用层是 .ts：用同步解析钩子补扩展名，再动态 import。
module.registerHooks({
  resolve(specifier, context, nextResolve) {
    const attempts = [];
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) attempts.push(`${specifier}.ts`);
    attempts.push(`${specifier}.js`);
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      for (const attempt of attempts) {
        try {
          return nextResolve(attempt, context);
        } catch {
          /* 继续尝试下一个候选 */
        }
      }
      throw error;
    }
  },
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATE_AUTHORITY = path.join(ROOT, "packages", "data-access", "scripts", "gate-authority.mjs");

const WORK_ID = process.env.MOHEN_BIND_WORK_ID ?? "5b42577e-a4d6-4024-b1f9-99d0d788c9ec";
const OWNER_UID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
// 批次 H 的 G5(watch) 候选模板（同 verify-5m 使用的既有模板，不新建 Gate 对象）。
const WATCH_G5_TEMPLATE = "bbe5c657-7263-4317-baa4-e4c1c49a97cc";
const WATCH_PURPOSE = { namespace: "mohen.watch", code: "display", version: "1" };
const WATCH_SCOPE = { mode: "public_watch" };
const G5_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const { queryRows, queryValue, run, workContentDigest } = await import("../packages/data-access/src/index.mjs");
const { commitWorkRevision } = await import("../apps/web/lib/studio-director.ts");
const { submitWork, publishWork, listWatchEligible, getLatestRevision } = await import("../apps/web/lib/publication.ts");
const { signWorkPublication } = await import("../apps/web/lib/gate-review.ts");
const { MACHINE_REVIEWER_USER_ID, MACHINE_REVIEWER_EMAIL, mintMachineSessionToken } =
  await import("./machine-reviewer-session.mjs");

const fail = (reason) => {
  throw new Error(reason);
};
const flag = (value) => value === true || value === "t" || value === "true";

// ---- 1. 真实媒资（只认库里已核权利 + 已验证原件的扫描页） ----------------------
async function loadAsset() {
  const rows = await queryRows(
    `select a.asset_id::text as asset_id, a.title, a.kind, a.license, a.status,
        a.content_sha256, a.page_locator::text as page_locator, a.source_url,
        a.source_id::text as source_id, a.original_id::text as original_id,
        a.rights_by_action->>'display' as display_right,
        o.storage_key, o.sha256 as original_sha256, o.byte_size, o.content_type, o.state as original_state,
        s.provider, s.title as source_title,
        v.source_version_id::text as source_version_id, v.version_label, v.checksum_sha256 as version_sha256,
        s.rights_evidence->'work'->>'title' as work_title,
        s.rights_evidence->'work'->>'edition' as edition,
        (select r->>'url' from jsonb_array_elements(s.rights_evidence->'references') r
          where r->>'kind' = 'wikimedia_commons_file' limit 1) as commons_url
      from public.assets a
      join source.sources s on s.source_id = a.source_id
      join studio.private_originals o on o.original_id = a.original_id
      left join source.source_versions v
        on v.source_id = a.source_id and v.checksum_sha256 = a.content_sha256
      where a.status = 'verified'
        and a.kind = 'scan_page'
        and a.rights_by_action->>'display' = 'allowed'
        and nullif(btrim(coalesce(a.license, '')), '') is not null
        and a.content_sha256 is not null
        and o.state = 'STORED_VERIFIED'
        and o.sha256 = a.content_sha256
      order by a.created_at desc`
  );
  if (rows.length !== 1) {
    fail(
      `REAL_MEDIA_ASSET_NOT_UNIQUE:count=${rows.length}:` +
        JSON.stringify(rows.map((row) => row.asset_id))
    );
  }
  const asset = rows[0];
  if (!UUID.test(String(asset.original_id)) || !UUID.test(String(asset.source_id))) fail("REAL_MEDIA_ASSET_BINDING_INVALID");
  if (!/^image\/(png|jpeg|webp)$/.test(String(asset.content_type))) fail(`REAL_MEDIA_NOT_IMAGE:${asset.content_type}`);
  const page = asset.page_locator ? JSON.parse(asset.page_locator) : {};
  const pageNo = Number(page?.page_no);
  if (!Number.isSafeInteger(pageNo) || pageNo < 1) fail("REAL_MEDIA_PAGE_NO_MISSING");
  return { ...asset, page_no: pageNo };
}

// 每一栏都来自库；缺失即不写该字段（不补默认值、不编造）。
function buildMediaItem(asset) {
  const provenance = {
    source_id: String(asset.source_id),
    content_sha256: String(asset.content_sha256),
    page_no: asset.page_no,
  };
  if (asset.source_version_id) provenance.source_version_id = String(asset.source_version_id);
  if (asset.version_label) provenance.catalog_no = String(asset.version_label);
  if (asset.provider) provenance.held_by = String(asset.provider);
  if (asset.work_title) provenance.work_title = String(asset.work_title);
  if (asset.edition) provenance.edition = String(asset.edition);
  if (asset.commons_url) provenance.source_url = String(asset.commons_url);
  return {
    asset_id: String(asset.asset_id),
    kind: String(asset.kind),
    title: String(asset.title),
    license: String(asset.license),
    rights_status: "cleared",
    src: `/api/works/media/${asset.asset_id}`,
    caption: String(asset.title),
    provenance,
  };
}

// ---- 2. 作品现状与「除 media 外原样保留」的前置校验 ----------------------------
async function loadLatestRevision() {
  const rows = await queryRows(
    `select revision_id::text as revision_id, revision_no, title, description, status, content::text as content
       from publication.work_revisions where work_id = :'wid'
      order by revision_no desc limit 1`,
    { wid: WORK_ID }
  );
  const row = rows[0];
  if (!row) fail("WORK_REVISION_MISSING");
  return {
    revisionId: String(row.revision_id),
    revisionNo: Number(row.revision_no),
    title: String(row.title),
    description: String(row.description),
    status: String(row.status),
    content: JSON.parse(row.content),
  };
}

// commitWorkRevision 从 director_plans 重新组装内容，因此必须先证明"源计划未漂移"，
// 否则新修订会夹带计划侧改动，而不是只替换 media。
async function assertPlanNotDrifted(content) {
  const source = content?.director_source;
  const planId = source?.plan_id;
  const selected = source?.selected;
  if (!UUID.test(String(planId)) || (selected !== "A" && selected !== "B")) fail("DIRECTOR_SOURCE_MISSING");
  const rows = await queryRows(
    `select (case when :'which' = 'B' then plan_b else plan_a end)::text as plan, beats::text as beats, finding::text as finding
       from public.director_plans where plan_id = :'pid'::uuid`,
    { pid: planId, which: selected }
  );
  const row = rows[0];
  if (!row) fail("DIRECTOR_PLAN_MISSING");
  const plan = JSON.parse(row.plan);
  const projected = {
    angle: plan?.angle ?? "",
    points: plan?.points ?? [],
    cover: plan?.cover ?? "",
    directorDecisions: plan?.directorDecisions ?? [],
  };
  const drift = [];
  if (workContentDigest(projected) !== workContentDigest(content.plan)) drift.push("plan");
  if (workContentDigest(JSON.parse(row.beats)) !== workContentDigest(content.beats)) drift.push("beats");
  if (workContentDigest(JSON.parse(row.finding)) !== workContentDigest(content.h1Finding)) drift.push("h1Finding");
  if (drift.length) fail(`DIRECTOR_PLAN_DRIFTED:${drift.join(",")}`);
  return String(planId);
}

function withoutMedia(content) {
  const copy = { ...content };
  delete copy.media;
  delete copy.rights_acknowledged;
  delete copy.content_hash;
  return copy;
}

// ---- 3. G5(watch) 重签（批次 H / verify-5m 的既有口径） ------------------------
async function readCandidate(candidateId) {
  const rows = await queryRows(
    `select candidate_id::text as candidate_id, run_id::text as run_id, stage, gate_code,
        object_type, object_id::text as object_id, artifact_revision::text as artifact_revision,
        purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope::text as allowed_scope,
        dependency_snapshot::text as dependency_snapshot, evidence_refs::text as evidence_refs
       from control.gate_candidates where candidate_id = :'cid'::uuid`,
    { cid: candidateId }
  );
  const row = rows[0];
  if (!row) fail(`GATE_CANDIDATE_TEMPLATE_MISSING:${candidateId}`);
  return row;
}

function gateAuthority(decision, sessionToken) {
  const machineUrl = process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
  if (!machineUrl) fail("MACHINE_GATE_DATABASE_URL_REQUIRED");
  const result = spawnSync(process.execPath, [GATE_AUTHORITY, "decide"], {
    input: JSON.stringify({ decision, sessionToken }),
    env: { ...process.env, MOHEN_GATE_DATABASE_URL: machineUrl },
    encoding: "utf8",
    timeout: 90000,
  });
  if (result.status !== 0) fail(`GATE_DECISION_FAILED:${(result.stderr || "").trim()}`);
  const parsed = JSON.parse(result.stdout.trim() || "{}");
  if (!parsed.gate_audit_id) fail("GATE_DECISION_NOT_PERSISTED");
  return parsed.gate_audit_id;
}

// 依赖与 CAS 期望值：当前资格审计（若有）+ 最近已签发的同键审计（撤权后恢复时用）。
async function upstreamDependency(template) {
  const key = {
    ot: template.object_type,
    oid: template.object_id,
    ns: WATCH_PURPOSE.namespace,
    code: WATCH_PURPOSE.code,
    ver: WATCH_PURPOSE.version,
  };
  const current = await queryRows(
    `select gate_audit_id::text as audit_id from control.qualification_current
      where gate_code = 'G5' and object_type = :'ot' and object_id = :'oid'::uuid
        and purpose_namespace = :'ns' and purpose_code = :'code' and purpose_version = :'ver'
        and consumer = 'watch'
      order by valid_until desc limit 1`,
    key
  );
  const previousAuditId = current[0] ? String(current[0].audit_id) : null;
  const audits = await queryRows(
    `select gate_audit_id::text as audit_id, dependency_snapshot::text as deps
       from control.gate_audits
      where gate_code = 'G5' and object_type = :'ot' and object_id = :'oid'::uuid
        and consumer = 'watch' and result = 'PASS'
      order by checked_at desc limit 5`,
    key
  );
  for (const audit of audits) {
    let dependencies = [];
    try {
      dependencies = JSON.parse(audit.deps ?? "[]");
    } catch {
      continue;
    }
    for (const dependency of dependencies) {
      if (!dependency?.gate_audit_id) continue;
      const parents = await queryRows(
        `select gate_code, artifact_revision::text as artifact_revision, qualification_digest,
            control.current_qualification_is_valid(gate_audit_id) as current
           from control.gate_audits where gate_audit_id = :'id'::uuid`,
        { id: dependency.gate_audit_id }
      );
      const parent = parents[0];
      if (parent && parent.gate_code === "G4" && flag(parent.current) &&
          parent.artifact_revision === dependency.artifact_revision) {
        return {
          previousAuditId,
          dependency: {
            gate_audit_id: String(dependency.gate_audit_id),
            qualification_digest: String(parent.qualification_digest),
            artifact_revision: String(parent.artifact_revision),
          },
        };
      }
    }
  }
  fail("CURRENT_G4_DEPENDENCY_MISSING");
}

async function signWatchG5(revision) {
  const template = await readCandidate(WATCH_G5_TEMPLATE);
  const artifactRevision = await queryValue(
    `select control.artifact_revision_for(:'ot', :'oid'::uuid)::text as rev`,
    { ot: template.object_type, oid: template.object_id }
  );
  if (!artifactRevision) fail("ARTIFACT_REVISION_UNAVAILABLE");
  const { previousAuditId, dependency } = await upstreamDependency(template);
  const binding = {
    schema: "mohen.work-revision-g5-binding.v1",
    work_id: WORK_ID,
    revision_id: revision.revisionId,
    content_sha256: workContentDigest(revision.content),
    complete_work: true,
    consumer: "watch",
    purpose: WATCH_PURPOSE,
    scope: WATCH_SCOPE,
    rights_by_action: { display: "allowed" },
    title: revision.title,
    description: revision.description,
  };
  const validUntil = new Date(Date.now() + G5_VALIDITY_MS).toISOString();
  binding.rights_valid_until = validUntil;
  const candidateId = randomUUID();
  // 同一门/对象/消费者下的历史 SUBMITTED 候选置 HOLD，避免评审器"取最新"语义含糊。
  await run(
    `update control.gate_candidates set candidate_status = 'HOLD'
      where gate_code = :'gate' and object_type = :'ot' and object_id = :'oid'::uuid
        and consumer = :'consumer' and candidate_status = 'SUBMITTED'`,
    { gate: "G5", ot: template.object_type, oid: template.object_id, consumer: template.consumer }
  );
  await run(
    `insert into control.gate_candidates(candidate_id, run_id, stage, gate_code, object_type, object_id,
        artifact_revision, purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope,
        input_fingerprint, dependency_snapshot, evidence_refs, candidate_status, producer_identity)
     values (:'cid'::uuid, :'run'::uuid, :'stage', 'G5', :'ot', :'oid'::uuid, :'arev',
        :'ns', :'code', :'ver', 'watch', :'scope'::jsonb, :'fp', :'deps'::jsonb, :'refs'::jsonb,
        'SUBMITTED', 'mohen_private_worker')`,
    {
      cid: candidateId,
      run: template.run_id,
      stage: template.stage,
      ot: template.object_type,
      oid: template.object_id,
      arev: artifactRevision,
      ns: WATCH_PURPOSE.namespace,
      code: WATCH_PURPOSE.code,
      ver: WATCH_PURPOSE.version,
      scope: JSON.stringify(WATCH_SCOPE),
      fp: crypto.createHash("sha256").update(JSON.stringify({
        gate: "G5", object: template.object_id, revision: artifactRevision,
        work_revision: revision.revisionId, consumer: "watch", at: validUntil,
      })).digest("hex"),
      deps: JSON.stringify([dependency]),
      refs: template.evidence_refs,
    }
  );
  const token = mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID });
  const auditId = gateAuthority(
    {
      candidateId,
      requestId: randomUUID(),
      result: "PASS",
      ruleVersion: "v1",
      validUntil,
      expectedAuditId: previousAuditId,
      receipt: {
        checks: { work_revision_binding: true, rights_by_operation: true },
        work_revision_binding: binding,
        rationale:
          "M5 原件画面绑定：已发布修订逐字段绑定（content_sha256/标题/描述/完整作品）+ 逐动作权利核验；" +
          "机器规则签发，人文背书仍以 Owner 体验为准。",
        evidence_refs: JSON.parse(template.evidence_refs),
      },
    },
    token
  );
  const signed = await queryRows(
    `select result, decision_origin, consumer, reviewer_db_identity,
        details->'work_revision_binding'->>'content_sha256' as digest,
        details->'work_revision_binding'->>'revision_id' as revision_id,
        control.current_qualification_is_valid(gate_audit_id) as current
       from control.gate_audits where gate_audit_id = :'id'::uuid`,
    { id: auditId }
  );
  const row = signed[0];
  if (!row || row.result !== "PASS" || row.decision_origin !== "independent_gate" || row.consumer !== "watch" ||
      !flag(row.current) || row.revision_id !== revision.revisionId || row.digest !== binding.content_sha256) {
    fail(`SIGNED_G5_WATCH_MISMATCH:${auditId}`);
  }
  return { auditId, candidateId, binding, validUntil };
}

// ---- 4. 撤权反证：撤掉 G5 后同一请求必须不再返回该作品，随后恢复签发 ------------------
async function assertRevocation(target, auditId) {
  const machineUrl = process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
  const token = mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID });
  const revoked = spawnSync(process.execPath, [GATE_AUTHORITY, "revoke"], {
    input: JSON.stringify({
      decision: { auditId, requestId: randomUUID(), reason: "M5 原件画面绑定：撤权即时拒绝断言（本地隔离）" },
      sessionToken: token,
    }),
    env: { ...process.env, MOHEN_GATE_DATABASE_URL: machineUrl },
    encoding: "utf8",
    timeout: 90000,
  });
  if (revoked.status !== 0) fail(`G5_REVOKE_FAILED:${(revoked.stderr || "").trim()}`);
  const afterRevoke = await listWatchEligible();
  const stillListed = afterRevoke.some((work) => work.work_id === WORK_ID);
  // 断言后必须恢复资格，否则本作会停在不可消费状态（恢复同样是真实签发，不放宽）。
  const restored = await signWatchG5(target);
  const afterRestore = await listWatchEligible();
  const restoredListed = afterRestore.some((work) => work.work_id === WORK_ID && work.revision_id === target.revisionId);
  if (!restoredListed) fail("WATCH_NOT_RESTORED_AFTER_RESIGN");
  return {
    revoked: JSON.parse(revoked.stdout.trim() || "{}"),
    listed_after_revoke: stillListed,
    restored_audit_id: restored.auditId,
    restored_listed: restoredListed,
  };
}

async function main() {
  const asset = await loadAsset();
  const media = [buildMediaItem(asset)];
  const before = await loadLatestRevision();
  const steps = { work_id: WORK_ID, asset_id: asset.asset_id };

  // 幂等：最新修订已带同一条真实媒资时不再产生新修订；若它已可被 WATCH 消费则到此为止，
  // 否则（上次中途失败）继续走提交/签发/发布，仍然不新建修订。
  const alreadyBound = Array.isArray(before.content.media) && before.content.media.length > 0 &&
    workContentDigest(before.content.media) === workContentDigest(media);
  if (alreadyBound) {
    const listed = await listWatchEligible();
    if (listed.some((work) => work.work_id === WORK_ID && work.revision_id === before.revisionId)) {
      console.log(JSON.stringify({
        status: "ALREADY_BOUND",
        ...steps,
        revision_id: before.revisionId,
        revision_no: before.revisionNo,
        watch_listed: true,
      }, null, 2));
      return;
    }
  }

  let target = before;
  if (!alreadyBound) {
    const planId = await assertPlanNotDrifted(before.content);
    // 1) 新修订：唯一写入路径 commitWorkRevision，只把 media 换成真实原件。
    const committed = await commitWorkRevision(WORK_ID, planId, undefined, { media });
    if (!committed || committed.conflict) fail(`WORK_REVISION_COMMIT_FAILED:${JSON.stringify(committed)}`);
    target = await loadLatestRevision();
    if (target.revisionId !== committed.revisionId) fail("WORK_REVISION_HEAD_MISMATCH");
    if (workContentDigest(target.content.media) !== workContentDigest(media)) fail("WORK_MEDIA_NOT_PERSISTED");
    if (workContentDigest(withoutMedia(target.content)) !== workContentDigest(withoutMedia(before.content))) {
      fail("WORK_CONTENT_CHANGED_BEYOND_MEDIA");
    }
  }

  // 2) 重签 G5(watch)（绑定该修订完整内容摘要）→ 3) 提交审核 + 机器独立评审 → 4) 发布。
  const g5 = await signWatchG5(target);
  if (target.status === "published") {
    const listedAfter = await listWatchEligible();
    if (!listedAfter.some((work) => work.work_id === WORK_ID && work.revision_id === target.revisionId)) {
      fail("WATCH_NOT_ELIGIBLE_AFTER_RESIGN");
    }
  } else {
    const submitted = await submitWork(WORK_ID, target.revisionId);
    if (!submitted.ok) fail(`WORK_SUBMIT_FAILED:${submitted.reason}`);
    const decision = await signWorkPublication(
      WORK_ID, target.revisionId, "approved", MACHINE_REVIEWER_EMAIL,
      "M5 原件画面绑定：机器规则化编辑签发（绑定真实原件媒资）；人文背书以 Owner 体验为准。"
    );
    if (!decision.ok) fail(`WORK_REVIEW_DECISION_FAILED:${decision.reason}`);
    const published = await publishWork(WORK_ID, OWNER_UID);
    if (!published.ok) fail(`WORK_PUBLISH_FAILED:${published.reason}`);
  }

  const listed = await listWatchEligible();
  const work = listed.find((item) => item.work_id === WORK_ID);
  if (!work || work.revision_id !== target.revisionId) fail("WATCH_NOT_ELIGIBLE_AFTER_PUBLISH");
  const stored = await getLatestRevision(WORK_ID);
  const storedContent = JSON.parse(String(stored?.[0]?.content ?? "{}"));

  const result = {
    status: "BOUND_AND_PUBLISHED",
    ...steps,
    revision_id: target.revisionId,
    revision_no: target.revisionNo,
    replaced_revision_id: alreadyBound ? null : before.revisionId,
    g5_watch_audit_id: g5.auditId,
    g5_candidate_id: g5.candidateId,
    g5_valid_until: g5.validUntil,
    binding_content_sha256: g5.binding.content_sha256,
    media: storedContent.media,
    watch_listed: true,
  };
  if (process.argv.includes("--assert-revocation")) {
    const revocation = await assertRevocation(target, g5.auditId);
    result.revocation = revocation;
    if (revocation.listed_after_revoke) fail("REVOCATION_NOT_ENFORCED");
  }
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    const detail = String(error?.stderr ?? "").trim().split(/\r?\n/).slice(-3).join(" | ");
    console.log(`BIND_ORIGINAL_MEDIA_FAILED ${String(error?.message ?? error).split("\n")[0]}${detail ? ` :: ${detail}` : ""}`);
    process.exitCode = 1;
  }
}
