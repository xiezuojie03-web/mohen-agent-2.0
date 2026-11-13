#!/usr/bin/env node
/**
 * test-st07-work-revision-g5-isolation.mjs —— ST-07 SaveWorkRevision + G5 机器评审
 *
 * 阶段口径：ST-07 属于 M5 Studio 业务任务轴，不是 D 轴的新阶段；
 *           作品修订上游引用 ST-05 director_plan（G5 PASS） + D05 P04 story_seed/agent_context
 *           + D04 finding；由 G5（stage=D05, layer=L5）签发消费资格。
 *
 * 两个题材（复用 ST-05 已验证的 director_plan UUID）：
 *  - 「朱家角」 project_id=d9d48901 director_plan_uuid=473bb944... (ST-05 G5 audit=5a6a50b3)
 *  - 「七宝」   project_id=b1ecefa4 director_plan_uuid=979836db... (ST-05 G5 audit=f964e629)
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

const STUDIO_USER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";

// director_plan UUID 来自 ST-05 隔离验证已派生/签发的值
const TOPICS = [
  {
    name: "朱家角",
    projectId: "d9d48901-3aa3-4424-b50f-965d6749ee8e",
    findingId: "749414aa-9539-78a5-0a4e-007abedfbd9d",
    runId: "ffb4430e-bc11-4e18-824e-4e6f492ea432",
    originalId: "f474b91b-07f0-47ab-94dc-20dc7f55e518",
    // ST-05 已签发的 director_plan
    directorPlanUuid: "473bb944-5a02-997a-4628-ea41188090e7",
    dpG5AuditId: "5a6a50b3-280a-4a3c-897a-2e53274fabae",
    // work_revision 输入
    workId: "2c8a6f10-e4b2-4b55-9a7e-1d3e5f9a0c22",
    revisionNo: 1,
    workTitle: "朱家角漕运米市网络｜多层身份与空间锁合·修订1",
    expectedRevisionNo: 0,
    creatorId: STUDIO_USER_ID,
    // 内容：H1 发现 + H3 节拍的序列化
    content: {
      narrative_arc: {
        opening: "明中叶（1522-1644）漕粮转口制度确立西栅米市为区域网络锚点",
        development: "漕夫-米商-乡绅三角博弈形成空间锁合：西栅为交易、东栅为加工、南栅为仓储",
        turning: "民国中期（1912-1937）米业衰退，放生池从网络节点退化为社会互动残余锚点",
        contemporary: "当代朱家角旅游开发将米市叙事包装为文化遗产，真实米业网络已消失"
      },
      frames: [
        { index: 1, kind: "establishing", location: "西栅米市桥", time_scope: "明中叶", material_refs: ["read_unit:d26163e9"] },
        { index: 2, kind: "detail", location: "东栅米行", time_scope: "清乾隆", material_refs: ["evidence:ec737b0a"] },
        { index: 3, kind: "contrast", location: "放生池", time_scope: "民国 vs 当代", material_refs: ["projection:zhujiajiao_canal_rice_market_network"] }
      ]
    },
    beats: [
      { kind: "opening", content: "漕粮转口西栅米市", duration_ms: 30000, refs: { story_seed: true } },
      { kind: "tension", content: "三角博弈与空间锁合", duration_ms: 45000, refs: { story_seed: true, finding: true } },
      { kind: "turning", content: "米业衰退放生池残余锚点", duration_ms: 40000, refs: { story_seed: true, projection: true } }
    ],
    sourceAndRightsRefs: {
      originals: ["f474b91b-07f0-47ab-94dc-20dc7f55e518"],
      rights_snapshot: { basis: "owner_authorization", actions: { machine_read: "allowed", retain: "allowed" } }
    }
  },
  {
    name: "七宝",
    projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c",
    findingId: "3cffc174-fc69-ba33-09de-148022e818e6",
    runId: "abc3251e-aa65-4e4f-9cae-9d61621ca98b",
    originalId: "1cc126eb-7aac-42ce-b5d5-61c7a0d6ac53",
    directorPlanUuid: "979836db-a6dc-bbb6-baf2-7b4e8c662a49",
    dpG5AuditId: "f964e629-5da2-4a72-91e4-40083a184719",
    workId: "5e12a8f3-bc9d-4b4e-9a1f-3c5d6e7b8a91",
    revisionNo: 1,
    workTitle: "七宝古镇多层身份｜叠压-冲突-此消彼长·修订1",
    expectedRevisionNo: 0,
    creatorId: STUDIO_USER_ID,
    content: {
      narrative_arc: {
        opening: "北宋（960-1127）七宝教寺建镇确立宗教锚点，地名即源于佛典",
        development: "明清（1368-1911）漕运开埠叠加商贸层与宗教层竞争，庙会与米市成为双核心",
        compression: "清末民初（1840-1949）文教层兴起，学校-商会-寺庙三方力量此消彼长",
        contemporary: "当代七宝老街旅游开发将宗教-商贸-文教三层身份扁平化包装"
      },
      frames: [
        { index: 1, kind: "establishing", location: "七宝教寺", time_scope: "北宋", material_refs: ["read_unit:4086564e"] },
        { index: 2, kind: "overlay", location: "七宝老街米市", time_scope: "清康熙", material_refs: ["evidence:fb50e834"] },
        { index: 3, kind: "compression", location: "七宝明强小学", time_scope: "民国", material_refs: ["projection:qibao_town_multilayer_identity_projection"] }
      ]
    },
    beats: [
      { kind: "origin", content: "教寺建镇宗教锚点", duration_ms: 25000, refs: { story_seed: true } },
      { kind: "multiplication", content: "漕运开埠商贸层叠加竞争", duration_ms: 40000, refs: { story_seed: true, finding: true } },
      { kind: "compression", content: "文教层兴起三方此消彼长", duration_ms: 45000, refs: { story_seed: true, projection: true } }
    ],
    sourceAndRightsRefs: {
      originals: ["1cc126eb-7aac-42ce-b5d5-61c7a0d6ac53"],
      rights_snapshot: { basis: "owner_authorization", actions: { machine_read: "allowed", retain: "allowed" } }
    }
  }
];

function derivedWorkRevisionUuid(topic) {
  const h = crypto.createHash("sha256")
    .update(`mab-private-work-revision:${topic.projectId}:${topic.workId}:rev${topic.revisionNo}`)
    .digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function mintSessionToken(userId, secret, expiresMs = 3600_000) {
  const payloadRaw = JSON.stringify({ uid: userId, r: [], exp: Date.now() + expiresMs });
  const payload = Buffer.from(payloadRaw)
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", secret).update(payload)
    .digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${sig}`;
}

async function main() {
  console.log("=".repeat(72));
  console.log("ST-07 SaveWorkRevision + G5 机器评审 —— 本地隔离验证");
  console.log("两题材（朱家角 A05 / 七宝 A09）+ work_revision method=H1H2H3");
  console.log("=".repeat(72));

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const secret = env.MOHEN_DATABASE_SESSION_SECRET;
  const studioToken = mintSessionToken(STUDIO_USER_ID, secret);
  const machineToken = mintSessionToken(MACHINE_SIGNER_USER_ID, secret);

  // ======= Step 0: 应用迁移 =======
  console.log("\n  --- Step 0: 应用迁移 ST-07 work_revision ---\n");
  const migrationSql = fs.readFileSync(
    path.join(ROOT, "supabase/migrations/20261114150000_mab_m5_st07_work_revision.sql"), "utf8"
  );
  await db.query(migrationSql);
  console.log("  ✅ migration applied");

  const results = { PASS: [], FAIL: [] };

  for (const topic of TOPICS) {
    console.log(`\n${"─".repeat(72)}`);
    console.log(`\n  ▶ 题材：${topic.name} (project=${topic.projectId.slice(0,8)}…)`);

    // 确保原始角色（SET ROLE 是会话级的，前一个题材可能改了）
    try {
      const cr = await db.query("select current_setting('role', true) as cur_role");
      const curRole = cr.rows[0].cur_role;
      if (curRole && curRole !== 'none') {
        try { await db.query(`RESET ROLE`); } catch {}
      }
    } catch {}
    try { await db.query("RESET ALL"); } catch {}

    // ======= Step 1: 上游 G5/G4 审计查询 =======
    console.log("\n  --- Step 1: 上游审计查询（director_plan G5 + finding G4）---");
    let depSnapshot = [];
    try {
      // director_plan G5 audit（直接上游）
      const dpG5 = await db.query(
        `select gate_audit_id, artifact_revision, qualification_digest,
                object_type, object_id::text, gate_code
         from control.gate_audits
         where gate_audit_id = $1`,
        [topic.dpG5AuditId]
      );
      if (!dpG5.rows[0]) throw new Error(`director_plan G5 audit not found: ${topic.dpG5AuditId}`);
      depSnapshot.push({
        gate_code: dpG5.rows[0].gate_code,
        gate_audit_id: dpG5.rows[0].gate_audit_id,
        object_type: dpG5.rows[0].object_type,
        object_id: dpG5.rows[0].object_id,
        artifact_revision: dpG5.rows[0].artifact_revision,
        qualification_digest: dpG5.rows[0].qualification_digest,
      });
      console.log(`  ✅ director_plan G5: audit=${dpG5.rows[0].gate_audit_id.slice(0,8)}… rev=${dpG5.rows[0].artifact_revision.slice(0,12)}…`);

      // 从 director_plan.payload 里拿 story_seeds/agent_contexts/projections
      const dp = await db.query(
        `select d.payload::text as payload,
                array_to_string(d.depends_on_story_seeds,',') as seeds,
                array_to_string(d.depends_on_projections,',') as projs
         from studio.director_plans d where d.plan_id = $1`,
        [topic.directorPlanUuid]
      );
      if (!dp.rows[0]) throw new Error(`director_plan not found: ${topic.directorPlanUuid}`);
      const seedIds = (dp.rows[0].seeds || "").split(",").filter(Boolean);
      const projIds = (dp.rows[0].projs || "").split(",").filter(Boolean);

      // story_seed G5 audit（间接上游）
      for (const sid of seedIds) {
        const seedG5 = await db.query(
          `select gate_audit_id, artifact_revision, qualification_digest,
                  object_type, object_id::text, gate_code
           from control.gate_audits
           where object_type='story_seed' and object_id=$1 and gate_code='G5' and result='PASS' and current_valid
           order by signed_at desc limit 1`,
          [sid]
        );
        if (seedG5.rows[0]) {
          depSnapshot.push({
            gate_code: seedG5.rows[0].gate_code,
            gate_audit_id: seedG5.rows[0].gate_audit_id,
            object_type: seedG5.rows[0].object_type,
            object_id: seedG5.rows[0].object_id,
            artifact_revision: seedG5.rows[0].artifact_revision,
            qualification_digest: seedG5.rows[0].qualification_digest,
          });
          console.log(`  ✅ story_seed G5 (${sid.slice(0,8)}…): audit=${seedG5.rows[0].gate_audit_id.slice(0,8)}…`);
        }
      }

      // projection G5 audit
      for (const pid of projIds) {
        const projG5 = await db.query(
          `select gate_audit_id, artifact_revision, qualification_digest,
                  object_type, object_id::text, gate_code
           from control.gate_audits
           where object_type='world_projection' and object_id=$1 and gate_code='G5' and result='PASS' and current_valid
           order by signed_at desc limit 1`,
          [pid]
        );
        if (projG5.rows[0]) {
          depSnapshot.push({
            gate_code: projG5.rows[0].gate_code,
            gate_audit_id: projG5.rows[0].gate_audit_id,
            object_type: projG5.rows[0].object_type,
            object_id: projG5.rows[0].object_id,
            artifact_revision: projG5.rows[0].artifact_revision,
            qualification_digest: projG5.rows[0].qualification_digest,
          });
          console.log(`  ✅ projection G5 (${pid.slice(0,8)}…): audit=${projG5.rows[0].gate_audit_id.slice(0,8)}…`);
        }
      }

      // finding G4 audit（满足 G5→G4 先序）
      const findingG4 = await db.query(
        `select gate_audit_id, artifact_revision, qualification_digest,
                object_type, object_id::text, gate_code
         from control.gate_audits
         where object_type='finding' and object_id=$1 and gate_code='G4' and result='PASS' and current_valid
         order by signed_at desc limit 1`,
        [topic.findingId]
      );
      if (findingG4.rows[0]) {
        depSnapshot.push({
          gate_code: findingG4.rows[0].gate_code,
          gate_audit_id: findingG4.rows[0].gate_audit_id,
          object_type: findingG4.rows[0].object_type,
          object_id: findingG4.rows[0].object_id,
          artifact_revision: findingG4.rows[0].artifact_revision,
          qualification_digest: findingG4.rows[0].qualification_digest,
        });
        console.log(`  ✅ finding G4: audit=${findingG4.rows[0].gate_audit_id.slice(0,8)}…`);
      }

      // 校验 dep_snapshot 至少有一条 G4 + 一条 G5
      const hasG4 = depSnapshot.some(d => d.gate_code === "G4");
      const hasG5 = depSnapshot.some(d => d.gate_code === "G5");
      if (!hasG4) throw new Error("dep_snapshot 缺少 G4（checkGateOrder 需要至少一条 G4 满足先序）");
      if (!hasG5) throw new Error("dep_snapshot 缺少 G5");
      results.PASS.push(`${topic.name}_upstream_verified`);
      console.log(`  ✅ dep_snapshot: ${depSnapshot.length} items (G4=${hasG4}, G5=${hasG5})`);
    } catch (err) {
      console.log(`  ❌ Step 1 FAILED: ${err.message}`);
      results.FAIL.push(`${topic.name}_upstream_verified`);
      continue;
    }

    // ======= Step 2: persist work_revision =======
    console.log("\n  --- Step 2: persist_private_work_revision ---");
    const workRevisionUuid = derivedWorkRevisionUuid(topic);
    try {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE mohen_app_runtime");
      await db.query(`SET mohen.session_token = '` + studioToken + `'`);
      // 清掉旧记录（隔离验证重跑）——在事务内用 app_runtime 身份
      await db.query("delete from studio.work_revisions where work_id = $1", [topic.workId]);
      const persRes = await db.query(
        `select studio.persist_private_work_revision(
           $1::uuid, $2::uuid, $3::integer, $4::integer,
           $5::uuid, $6::text, $7::text,
           $8::jsonb, $9::jsonb, $10::jsonb,
           $11::uuid) as saved`,
        [
          topic.workId, workRevisionUuid, topic.revisionNo, topic.expectedRevisionNo,
          topic.projectId, topic.creatorId, topic.workTitle,
          JSON.stringify(topic.content), JSON.stringify(topic.beats),
          JSON.stringify(topic.sourceAndRightsRefs),
          topic.directorPlanUuid,
        ]
      );
      await db.query("commit");
      const saved = persRes.rows[0]?.saved;
      console.log(`  ✅ persisted: revision_id=${saved.revision_id?.slice(0,8)}… content_hash=${saved.content_hash?.slice(0,12)}…`);
      console.log(`     artifact_revision=${saved.artifact_revision?.slice(0,12)}…`);
      results.PASS.push(`${topic.name}_work_revision_persisted`);
    } catch (err) {
      await db.query("rollback").catch(() => {});
      console.log(`  ❌ persist FAILED: ${err.message}`);
      results.FAIL.push(`${topic.name}_work_revision_persisted`);
      continue;
    }

    // ======= Step 3: 验证 work_revision 在 studio.work_revisions =======
    console.log("\n  --- Step 3: verify work_revision in studio.work_revisions ---");
    try {
      const wr = await db.query(
        `select w.revision_id::text as rev_id, w.title, w.content_hash, w.qualification,
                w.payload::text as payload,
                w.depends_on_director_plan::text as dp,
                array_length(w.depends_on_story_seeds,1) as n_seeds,
                array_length(w.depends_on_projections,1) as n_projs
         from studio.work_revisions w where w.revision_id = $1`,
        [workRevisionUuid]
      );
      if (!wr.rows[0]) throw new Error("work_revision not found");
      const wrPayload = JSON.parse(wr.rows[0].payload || '{}');
      console.log(`  ✅ title=${wr.rows[0].title}`);
      console.log(`     method_id=${wrPayload.method_id} qual=${wr.rows[0].qualification}`);
      console.log(`     content_hash=${wr.rows[0].content_hash.slice(0,16)}...`);
      console.log(`     depends_on_director_plan=${wr.rows[0].dp.slice(0,8)}... seeds=${wr.rows[0].n_seeds} projs=${wr.rows[0].n_projs}`);
      results.PASS.push(`${topic.name}_work_revision_verified`);
    } catch (err) {
      console.log(`  ❌ verify FAILED: ${err.message}`);
      results.FAIL.push(`${topic.name}_work_revision_verified`);
      continue;
    }

    // ======= Step 4: artifact_revision_for('work_revision') =======
    console.log("\n  --- Step 4: artifact_revision_for('work_revision') ---");
    let artifactRevision;
    try {
      const revRes = await db.query(
        `select control.artifact_revision_for('work_revision',$1::uuid) as revision`,
        [workRevisionUuid]
      );
      artifactRevision = revRes.rows[0]?.revision;
      if (!artifactRevision) throw new Error("artifact_revision is null");
      console.log(`  ✅ artifact_revision=${artifactRevision.slice(0,12)}...`);
      results.PASS.push(`${topic.name}_artifact_revision`);
    } catch (err) {
      console.log(`  ❌ artifact_revision FAILED: ${err.message}`);
      results.FAIL.push(`${topic.name}_artifact_revision`);
      continue;
    }

    // ======= Step 5: dependency_snapshot 已在 Step 1 构建 =======
    console.log("\n  --- Step 5: dependency_snapshot (复用 Step 1) ---");
    console.log(`  depSnapshot = ${depSnapshot.length} items:`);
    for (const d of depSnapshot) {
      console.log(`    ${d.gate_code}/${d.object_type} audit=${d.gate_audit_id.slice(0,8)}… rev=${d.artifact_revision.slice(0,8)}…`);
    }
    results.PASS.push(`${topic.name}_dep_snapshot_built`);

    // ======= Step 6: gate_candidate =======
    console.log("\n  --- Step 6: gate_candidate ---");
    const candUuid = crypto.randomUUID();
    const evidenceRefs = [
      { kind: "director_plan_ref", ref: topic.directorPlanUuid },
      { kind: "finding_ref", ref: topic.findingId },
    ];
    const allowedScope = { scope_kind: "studio_project", project_id: topic.projectId };
    const planInputFp = crypto.createHash("sha256")
      .update(`${topic.projectId}:${workRevisionUuid}:${artifactRevision}:${Date.now()}`).digest("hex");

    try {
      // DELETE 旧 SUBMITTED candidate
      await db.query(
        `delete from control.gate_candidates where gate_code='G5' and object_type='work_revision' and object_id=$1 and candidate_status='SUBMITTED'`,
        [workRevisionUuid]
      );
      await db.query(
        `insert into control.gate_candidates(
           candidate_id, run_id, stage, gate_code, object_type, object_id,
           artifact_revision, purpose_namespace, purpose_code, purpose_version,
           allowed_scope, consumer, dependency_snapshot, evidence_refs,
           input_fingerprint, submitted_at, producer_identity, candidate_status
         ) values (
           $1::uuid, $2::uuid, 'D05', 'G5', 'work_revision', $3::uuid,
           $4, 'data-production', 'm5-remediation', 'v1',
           $5::jsonb, 'producer', $6::jsonb, $7::jsonb,
           $8, now(), 'private-evidence-worker', 'SUBMITTED'
         )
         on conflict (candidate_id) do update set dependency_snapshot = excluded.dependency_snapshot,
           evidence_refs = excluded.evidence_refs, artifact_revision = excluded.artifact_revision,
           candidate_status = 'SUBMITTED'`,
        [candUuid, topic.runId, workRevisionUuid, artifactRevision,
         JSON.stringify(allowedScope), JSON.stringify(depSnapshot),
         JSON.stringify(evidenceRefs), planInputFp]
      );
      console.log(`  ✅ gate_candidate submitted: ${candUuid}`);
      results.PASS.push(`${topic.name}_candidate_submitted`);
    } catch (err) {
      console.log(`  ❌ gate_candidate FAILED: ${err.message}`);
      results.FAIL.push(`${topic.name}_candidate_submitted`);
      continue;
    }

    // ======= Step 7: G5 reviewer dryRun + sign =======
    console.log("\n  --- Step 7: G5 machine review ---");
    try {
      let originalRole = null;
      try {
        const roleRes = await db.query("select current_role() as cur_role");
        originalRole = roleRes.rows[0].cur_role;
      } catch {}

      const decideGate = async (decision, sessionToken) => {
        if (!sessionToken) sessionToken = machineToken;
        if (decision.dryRun) return null;
        await db.query(`SET mohen.session_token = '` + sessionToken + `'`);
        await db.query("SET ROLE mohen_gate_signer_m5_machine");
        await db.query("BEGIN");
        const res = await db.query(
          `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
          [decision.candidateId, decision.requestId, decision.result,
           decision.ruleVersion, decision.validUntil,
           JSON.stringify(decision.receipt), decision.expectedAuditId]
        );
        await db.query("commit");
        return res.rows[0].gate_audit_id;
      };

      const reviewer = createRuleGateReviewer({
        query: queryRows,
        decide: decideGate,
        projectId: topic.projectId,
        log: line => console.log(`    ${line}`)
      });

      const dryRun = await reviewer.review({ gate: "G5", dryRun: true });
      console.log(`  dryRun status = ${dryRun.status}`);
      if (dryRun.status !== "DRY_RUN_PASS") {
        console.log(`  ❌ dryRun FAIL: ${dryRun.failed?.join(",")}`);
        results.FAIL.push(`${topic.name}_g5_dryrun`);
        continue;
      }
      results.PASS.push(`${topic.name}_g5_dryrun`);
      console.log(`  ✅ dryRun PASS → 正式签发`);

      const signed = await reviewer.review({ gate: "G5", dryRun: false });
      console.log(`  signed status = ${signed.status}`);
      if (signed.status === "PASS") {
        console.log(`  ✅ G5 PASS! audit_id=${signed.auditId}`);
        results.PASS.push(`${topic.name}_g5_signed`);
      } else {
        console.log(`  ❌ signed FAIL: ${signed.status}`);
        results.FAIL.push(`${topic.name}_g5_signed`);
      }

      // 恢复原始角色（SET ROLE 是会话级的，持久到下一个题材）
      if (originalRole) {
        try { await db.query(`SET ROLE ${originalRole}`); } catch {}
      }
    } catch (err) {
      console.log(`  ❌ Step 7 FAILED: ${err.message}`);
      results.FAIL.push(`${topic.name}_g5_signed`);
    }
  }

  await db.end();

  // ======= 汇总报告 =======
  console.log(`\n${"=".repeat(72)}`);
  console.log(`VERIFIED_ISOLATED REPORT —— ST-07 work_revision + G5`);
  console.log("=".repeat(72));
  const total = results.PASS.length + results.FAIL.length;
  console.log(`\n✅ PASS (${results.PASS.length}):`);
  for (const p of results.PASS) console.log(`   ${p}`);
  if (results.FAIL.length) {
    console.log(`\n❌ FAIL (${results.FAIL.length}):`);
    for (const f of results.FAIL) console.log(`   ${f}`);
  }
  console.log(`\n${results.FAIL.length === 0 ? "✅ VERIFIED_ISOLATED" : "❌ NOT PASS"}`);
  console.log(`关键验证：work_revision persist + artifact_revision_for + G5 reviewer 双路由扩展`);
  console.log(`   checkWorkRevisionBinding(work_revision) → method=H1H2H3 + content_hash + depends_on_director_plan(有G5 PASS)`);
  console.log(`   checkRightsByOperation(work_revision) → payload.original_ids 回溯 originals`);
  console.log(`   两题材：朱家角(A05) / 七宝(A09) 均为非 A06 finding（泛化验证）`);
  console.log("=".repeat(72));
  process.exit(results.FAIL.length === 0 ? 0 : 1);
}

main().catch(err => { console.error("FATAL:", err); process.exit(2); });
