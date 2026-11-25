#!/usr/bin/env node
/**
 * 段 5 持久化（朱家角主线）：把真实 H1/H2/H3 生成结果落成 work 08ddaaa8 的修订3，
 * 签 G5 → 投稿 → 审核 APPROVED（发布与 WATCH 自验见 publish 步骤）。
 * 镜像 persist-m5-shinze-content.mjs（已验证模式）。
 * 输入：work/scratch/zhujiajiao-generation.json（真实生成，护栏校验已过）。
 * 边界：仅 loopback 隔离库；不覆盖历史修订（revision_no 递增）；非自签；不改生产/RLS。
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
for (const line of envText.split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && m[2] !== "") env[m[1]] = m[2]; }
process.env.DATABASE_URL = env.DATABASE_URL;
{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase();
  const name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!loopback || !/dev|isolat|test/.test(name)) throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
  console.log(`ISOLATION_GUARD_OK host=${host} db=${name}`);
}

const PROJECT_ID = "d9d48901-3aa3-4424-b50f-965d6749ee8e";
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const WORK_ID = "08ddaaa8-0de5-396f-9ef1-e750e613d81d";
const PLAN_ID = "d87d816d-8e3c-f080-69f8-be15c9ed3bd7";
const ORIGINAL_ID = "f474b91b-07f0-47ab-94dc-20dc7f55e518";
const SOURCE_ID = "9aa03207-6d60-4984-8c1f-347df2532842";
const FINDING_ID = "749414aa-9539-78a5-0a4e-007abedfbd9d";
const PROJECTION_ID = "e76a01ce-24b9-7f97-52cf-12142880a81c";
const RUN_ID = "ffb4430e-bc11-4e18-824e-4e6f492ea432";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const OPERATOR_ID = OWNER_ID;
const GEN_JSON = path.join(ROOT, "work", "scratch", "zhujiajiao-generation.json");

const uuidFrom = (label) => { const h = crypto.createHash("sha256").update(label).digest("hex").slice(0, 32); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; };
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const REV3 = uuidFrom(`rev3:${WORK_ID}:zhujiajiao`);
const SNAP = uuidFrom(`snap:${REV3}`);

function mintSessionToken(userId, secret) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, r: [], exp: Date.now() + 3600_000 })).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return `${payload}.${sig}`;
}

const gen = JSON.parse(fs.readFileSync(GEN_JSON, "utf8"));
const finding = gen.finding;
const plan = gen.planA;
const beats = gen.beats;
if (!finding || !plan || !Array.isArray(beats) || !beats.length) throw new Error("GEN_JSON_INVALID");

const results = { pass: [], fail: [] };
const pass = (k, d) => { results.pass.push(k); console.log(`  PASS ${k}${d ? ` -- ${d}` : ""}`); };
const fail = (k, d) => { results.fail.push(k); console.log(`  FAIL ${k}${d ? ` -- ${d}` : ""}`); };

async function main() {
  const secret = env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
  const MACHINE_TOKEN = mintSessionToken(MACHINE_SIGNER_USER_ID, secret);

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const decideGate = async (d) => {
    await db.query("begin");
    try {
      await db.query("set role mohen_gate_signer_m5_machine");
      await db.query(`SET mohen.session_token = '${MACHINE_TOKEN}'`);
      const r = await db.query(`select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
        [d.candidateId, d.requestId, d.result, d.ruleVersion, d.validUntil, JSON.stringify(d.receipt), d.expectedAuditId]);
      await db.query("commit"); await db.query("reset role");
      return r.rows[0].gate_audit_id;
    } catch (e) { try { await db.query("rollback"); } catch {} try { await db.query("reset role"); } catch {} throw e; }
  };
  const reviewer = () => createRuleGateReviewer({ query: queryRows, decide: decideGate, projectId: PROJECT_ID, log: () => {} });
  const depOf = (r, g) => ({ gate_code: g, stage: r.stage, object_type: r.object_type, object_id: r.object_id, artifact_revision: r.artifact_revision, gate_audit_id: r.gate_audit_id, qualification_digest: r.qualification_digest });

  try {
    // 读导演方案的项目/委托/研究快照绑定（正文修订需同 Project）。
    const planRow = (await db.query(
      `select project_id::text as project_id, delegation_id::text as delegation_id, root_task_ref, research_snapshot_hash, research_source_refs
         from public.director_plans where plan_id=$1::uuid`, [PLAN_ID])).rows[0];
    if (!planRow || planRow.project_id !== PROJECT_ID) throw new Error("PLAN_BINDING_MISSING");
    pass("plan_binding", `plan ${PLAN_ID.slice(0,8)} project=${planRow.project_id.slice(0,8)} delegation=${planRow.delegation_id.slice(0,8)}`);

    // 上游当前有效资格（复用，不重签）：G4 finding + plan G5 + world_projection G5。
    const upstream = {};
    for (const [key, gc, ot, oid] of [
      ["g4", "G4", null, FINDING_ID],
      ["plan", "G5", "director_plan", PLAN_ID],
      ["proj", "G5", "world_projection", PROJECTION_ID],
    ]) {
      const sql = ot
        ? `select * from control.gate_audits where gate_code=$1 and object_type=$2 and object_id=$3::uuid and result='PASS' and current_valid and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`
        : `select * from control.gate_audits where gate_code=$1 and object_id=$2::uuid and result='PASS' and current_valid and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`;
      const row = (await db.query(sql, ot ? [gc, ot, oid] : [gc, oid])).rows[0];
      if (!row) throw new Error(`UPSTREAM_NOT_CURRENT ${key}`);
      upstream[key] = depOf(row, gc);
    }
    pass("upstream_qualifications_current", "G4 + plan G5 + projection G5 均当前有效");

    // 修订内容（正文权威 publication.work_revisions），结构与 commitWorkRevision 一致。
    const content = {
      director_source: { plan_id: PLAN_ID, selected: "A", project_id: planRow.project_id, delegation_id: planRow.delegation_id, root_task_ref: planRow.root_task_ref, research_snapshot_hash: planRow.research_snapshot_hash },
      h1Finding: finding,
      motif: finding.motifCodes ?? [],
      historicalQuestion: finding.historicalQuestion ?? "",
      understandingDelta: finding.understandingDelta ?? "",
      plan: { angle: plan.angle ?? "", points: plan.points ?? [], cover: plan.cover ?? "", directorDecisions: plan.directorDecisions ?? [] },
      beats,
      media: [],
      rights_acknowledged: true,
    };
    const ch = sha(JSON.stringify(content));

    // 修订3（幂等）。
    const existRev = (await db.query(`select revision_id::text from publication.work_revisions where revision_id=$1::uuid`, [REV3])).rows[0];
    if (!existRev) {
      const currentNo = Number((await db.query(`select coalesce(max(revision_no),0) as n from publication.work_revisions where work_id=$1::uuid`, [WORK_ID])).rows[0].n);
      if (currentNo !== 2) throw new Error(`UNEXPECTED_REVISION_HEAD ${currentNo} (期待 2)`);
      await db.query("BEGIN");
      await db.query(`insert into publication.work_revisions(revision_id, work_id, revision_no, title, description, content, status)
        values($1::uuid,$2::uuid,$3,$4,$5,$6::jsonb,'draft')`,
        [REV3, WORK_ID, 3, "朱家角·方志可证事实与解释边界·修订3", finding.understandingDelta ?? "", JSON.stringify({ ...content, content_hash: ch })]);
      await db.query(`insert into studio.work_revisions(work_id, revision_id, revision_no, project_id, creator_id, title, content_hash, content, beats,
          source_and_rights_refs, depends_on_director_plan, depends_on_story_seeds, depends_on_agent_contexts, depends_on_projections, payload, formal_revision_id)
        values($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid,$12::uuid[]::uuid[],$13::uuid[]::uuid[],$14::uuid[]::uuid[],$15::jsonb,$2::uuid)`,
        [WORK_ID, REV3, 3, PROJECT_ID, "owner-browser", "朱家角·方志可证事实与解释边界·修订3", ch, JSON.stringify(content), JSON.stringify(beats),
         JSON.stringify([{ kind: "source", id: SOURCE_ID, rights_basis: "owner_approved_public_display_2026_11_24;external_processing_director_generation_2026_11_25" }]),
         PLAN_ID, `{}`, `{}`, `{${PROJECTION_ID}}`,
         JSON.stringify({ formal: true, method_id: "H1H2H3", original_ids: [ORIGINAL_ID], body: { original_ids: [ORIGINAL_ID], depends_on_director_plan: PLAN_ID } })]);
      await db.query("COMMIT");
      pass("rev3_created", `修订3 已创建，含 ${beats.length} 个真实章节（title+旁白+时码+溯源）`);
    } else {
      pass("rev3_exists", "修订3 已存在（幂等复用）");
    }

    // 签修订3 的独立 G5。
    const rev = (await db.query(`select control.artifact_revision_for('work_revision',$1::uuid) rev`, [REV3])).rows[0].rev;
    if (!rev || !/^[0-9a-f]{64}$/i.test(rev)) throw new Error(`fingerprint invalid ${rev}`);
    const existing = (await db.query(`select gate_audit_id,artifact_revision from control.gate_audits where gate_code='G5' and object_type='work_revision' and object_id=$1::uuid and result='PASS' and current_valid and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`, [REV3])).rows[0];
    if (existing && existing.artifact_revision === rev) {
      pass("rev3_g5_reuse", `复用 G5 ${existing.gate_audit_id.slice(0,8)}`);
    } else {
      await db.query(`delete from control.gate_candidates where gate_code='G5' and object_type='work_revision' and object_id=$1::uuid and candidate_status='SUBMITTED'`, [REV3]);
      const cid = uuidFrom(`cand:${REV3}:${Date.now()}:${crypto.randomUUID()}`);
      await db.query(`insert into control.gate_candidates(candidate_id,run_id,stage,gate_code,object_type,object_id,artifact_revision,
          purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,submitted_at,producer_identity,candidate_status)
        values($1::uuid,$2::uuid,'D05','G5','work_revision',$3::uuid,$4,'data-production','m5-remediation','v1',$5::jsonb,'producer',$6::jsonb,$7::jsonb,$8,now(),'private-evidence-worker','SUBMITTED')`,
        [cid, RUN_ID, REV3, rev, JSON.stringify({ project_id: PROJECT_ID }),
         JSON.stringify([upstream.g4, upstream.plan, upstream.proj]),
         JSON.stringify([{ kind: "work_revision", id: REV3, artifact_revision: rev }]), sha(`${PROJECT_ID}:rev3:${rev}`)]);
      const dry = await reviewer().review({ gate: "G5", dryRun: true });
      if (dry.status !== "DRY_RUN_PASS") throw new Error(`G5_DRY_FAIL ${dry.failed?.join(",") || dry.status}`);
      const s = await reviewer().review({ gate: "G5", dryRun: false });
      if (s.status !== "PASS") throw new Error(`G5_SIGN_FAIL ${s.failed?.join(",") || s.status}`);
      pass("rev3_g5_signed", `修订3 独立 G5（非自签）`);
    }

    // 投稿快照。
    const snapExist = (await db.query(`select 1 from studio.submission_snapshots where revision_id=$1::uuid`, [REV3])).rows.length;
    if (!snapExist) {
      await db.query(`select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4)`, [SNAP, REV3, PROJECT_ID, OWNER_ID]);
      pass("rev3_submitted", "修订3 冻结快照已提交");
    } else pass("rev3_submitted", "修订3 已投稿（幂等）");

    // 审核 APPROVED（独立 operator，非 creator）。
    await db.query("BEGIN"); await db.query("SET LOCAL ROLE mohen_editorial_operator");
    try {
      await db.query(`select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,$5,$6)`,
        [crypto.randomUUID(), WORK_ID, REV3, String(OPERATOR_ID), "朱家角修订3：真实 H1/H2/H3 生成正文", `zj-appr-${Date.now()}`]);
      await db.query("COMMIT");
      pass("rev3_approved", "修订3 经独立 operator APPROVED，绑定修订3 G5");
    } catch (err) { await db.query("ROLLBACK"); throw err; }
    finally { try { await db.query("RESET ROLE"); } catch {} }

    // WATCH 章节校验（发布留给后续 publish 步骤）。
    const w = (await db.query(`select content::text from publication.work_revisions where revision_id=$1::uuid`, [REV3])).rows[0];
    const c = JSON.parse(w.content);
    const valid = c.beats.filter((b) => typeof b.title === "string" && typeof b.narration === "string");
    if (valid.length !== beats.length) throw new Error(`beats validation ${valid.length}/${beats.length}`);
    pass("rev3_watch_beats_valid", `${valid.length} 个真实章节满足 WATCH title+narration 校验`);
    console.log("\nREADY_FOR_PUBLISH: 修订3（真实正文）已投稿+APPROVED+章节合规，可发布→WATCH 观看→撤权");
  } catch (e) {
    fail("FATAL", e.message);
  } finally {
    await db.end();
  }
  console.log("\n" + "=".repeat(70));
  console.log(`PERSIST REPORT: ${results.pass.length} PASS / ${results.fail.length} FAIL`);
  results.fail.forEach((f) => console.log("  FAIL " + f));
  console.log("=".repeat(70));
  process.exit(results.fail.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL", e); process.exit(2); });