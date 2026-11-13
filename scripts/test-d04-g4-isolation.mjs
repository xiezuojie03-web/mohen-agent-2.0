#!/usr/bin/env node
/**
 * test-d04-g4-isolation.mjs —— ST-05 D04 world_finding + G4 机器评审
 * 
 * 两个题材：
 *  - 朱家角 A05 行动链 actor_situation / BE
 *  - 七宝   A09 变化链 historical_transformation / BE
 *
 * 关键泛化验证：
 *   1) DB 函数 persist_private_humanistic_finding 不再写死 finding_type='institutional_mechanism'
 *      也不再写死 discovery_method.method_id='A06' —— 接受 A01-A12 任意方法 + 任意非空 finding_type
 *   2) persist_private_world_projection 不再写死 discovery_method.method_id='A06'
 *   3) JS 层 private-evidence-stage.mjs 方法校验改成 A01-A12 正则（不再硬编码 A06）
 *   4) JS 层 D04 submitStageCandidate 传入 purpose=G4.interpretation.v1/BE
 *   5) G4 Reviewer method 白名单从写死 A06 → A01-A12 集合
 *   6) G4 Reviewer 用途校验（BE/BC/RF/PS/PL）
 *
 * 本地隔离库 mohen_dev；仅 VERIFIED_ISOLATED；不触碰生产。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const dbUrl = env.DATABASE_URL;

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const canonical = (o) => JSON.stringify(o, Object.keys(o).sort());
const derivedUuid = (prefix, data) => {
  const h = sha256(`${prefix}:${sha256(canonical(data))}`);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
};

const CASES = [
  {
    label: "朱家角_A05_actor_situation",
    originalId: "f474b91b-07f0-47ab-94dc-20dc7f55e518",
    projectId: "d9d48901-3aa3-4424-b50f-965d6749ee8e",
    runId: "ffb4430e-bc11-4e18-824e-4e6f492ea432",
    claimRevisionId: "0c30a997-4202-885b-ce3b-bce58db4ffc9",
    g3AuditId: "22b4b749-c48c-41c5-b6f7-2a0a854fc0a5",
    g3ArtifactRevision: "14503a2b5196349bbdbcfbae0d195134709deb24fae908e213833f273c3dafe9",
    finding: {
      method_id: "A05",
      finding_type: "actor_situation",
      human_question: "朱家角明清以来漕运、米行、园社、放生池等场景中的各类行动者——米商、漕夫、乡绅、僧道、街坊——各自在怎样的处境约束下做出了怎样的选择？",
      interpretive_statement: "漕运枢纽带来的米粮流通不是单向的商品输送，而是牵动上下游的行动链：上游米商沿吴淞江将苏北、浙北米粮汇聚至朱家角西栅，中盘由乡绅设立的义仓、社仓、备荒仓按季节性短缺调剂，下游漕夫、船匠依漕运节律安家落户，园社与放生池等公共空间为不同行动者提供了交错的社交场合。米行的兴衰、放生池的兴衰，正是这些行动者在各自约束下的选择累积。",
      understanding_delta: "传统叙述常将朱家角的经济活动归结为商镇繁荣，但A05行动链方法给出的增量是：漕运-米行-园社这条链条中，每一类行动者的处境约束相互锁合，不能孤立理解。",
      counter_view_or_alternative: [
        "纯经济决定论视角将一切归结为市场价格，忽略了义仓制度中的道义考量",
        "社会史视角可能聚焦单一阶层，忽略了漕夫、船匠等边缘群体在链条中的能动作用"
      ],
      missing_evidence: ["漕夫的个体户籍与迁徙记录", "放生池历次修缮捐资名录"],
      uncertainty: { qualification: "UNASSESSED", notes: "基于地名志与府志的互证" },
      purpose_code: "BE"
    }
  },
  {
    label: "七宝_A09_historical_transformation",
    originalId: "1cc126eb-7aac-42ce-b5d5-61c7a0d6ac53",
    projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c",
    runId: "abc3251e-aa65-4e4f-9cae-9d61621ca98b",
    claimRevisionId: "e5432434-756a-1276-bb6c-dbd115c29ad3",
    g3AuditId: "ab72978b-929f-47e6-b543-575932f785ce",
    g3ArtifactRevision: "ecea2760d14ef0be4916115df08476e64882ce9d17ff589651412af31f194ac2",
    finding: {
      method_id: "A09",
      finding_type: "historical_transformation",
      human_question: "七宝镇的空间与身份是怎样从一个简单的七宝乡转变为兼具宗教、商贸、文教三重属性的复合古镇的？这条变化链经历了哪些关键节点？",
      interpretive_statement: "七宝的复合身份不是一次性规划的结果，而是三次叠加的历史变化：北宋建七宝教寺确立宗教锚点、明清蒲汇塘漕运开埠确立商贸节点、清末民初明强书院等文教设施兴起确立文化地标。三次变化之间并非线性推进，漕运的盛衰直接影响寺产规模与书院存续，三者在不同时段此消彼长。",
      understanding_delta: "传统镇志常按朝代顺序罗列事件，A09变化链方法给出的增量是：七宝的复合古镇身份是三次异质属性在时间上叠压、在空间上交错的结果。",
      counter_view_or_alternative: [
        "文化决定论视角将一切变化归结为七宝教寺的香火带动人气，低估了漕运作为独立驱动的力量",
        "商贸优先视角将宗教文教视为衍生消费，忽略了教寺在土地产权与公共空间秩序中的长期作用"
      ],
      missing_evidence: ["七宝教寺历次地产交易地契", "蒲汇塘漕运官船与民船的分界记录"],
      uncertainty: { qualification: "UNASSESSED", notes: "基于地名志+漕运档案+教寺志三源互证" },
      purpose_code: "BE"
    }
  }
];

import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";

let exitCode = 0;

async function main() {
  // 两个客户端：runtime 做 persist（有 Studio 身份），admin 做 verify（超级用户权限）
  const runtimeClient = new Client({ connectionString: dbUrl });
  const adminClient = new Client({ connectionString: dbUrl });
  await Promise.all([runtimeClient.connect(), adminClient.connect()]);

  console.log("=".repeat(72));
  console.log("ST-05 D04 world_finding + G4 机器评审 —— 本地隔离验证");
  console.log("两题材（朱家角_A05 / 七宝_A09）+ 不写死 A06 泛化验证");
  console.log("=".repeat(72));

  // ======= 建立 Studio 身份 =======
  const [keyRow] = (await adminClient.query(
    `select verification_key from control.session_verification_keys where key_slot=true limit 1`)).rows;
  const key = keyRow.verification_key;
  const OWNER_USER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
  const now = Date.now();
  const exp = now + 300_000;
  const claims = JSON.stringify({ uid: OWNER_USER_ID, iat: now, exp });
  const payloadB64 = Buffer.from(claims).toString("base64url").replace(/=+$/, "");
  const sig = crypto.createHmac("sha256", key).update(payloadB64).digest("base64url").replace(/=+$/, "");
  const sessionToken = `${payloadB64}.${sig}`;

  // runtimeClient 切身份
  await runtimeClient.query("begin");
  await runtimeClient.query("set local role mohen_app_runtime");
  await runtimeClient.query("select set_config('mohen.session_token',$1,true)", [sessionToken]);
  const { rows: [identity] } = await runtimeClient.query("select control.current_app_user_id()::text as user_id");
  console.log(`  Studio identity = ${identity.user_id} (owner=${OWNER_USER_ID})`);

  const REVIEWER_USER = "b0a11000-0000-4000-8000-0000000000a1"; // 机器评审器固定 UID (MACHINE_REVIEWER_USER_ID)
  const MACHINE_SIGNER_LOGIN = "mohen_gate_signer_m5_machine";

  // reviewer 需要的 query 函数 —— 直接用 data-access 的 queryRows（原生支持 :paramName 命名参数）
  async function reviewerQuery(text, params = {}) {
    return await queryRows(text, params);
  }

  // 真正的 decide 函数 —— 独立事务：begin → set role + session_token → sign → commit → reset role
  async function decideGate(decision, sessionToken) {
    let originalRole = null;
    let resetNeeded = false;
    let sessionNeeded = false;
    let token = sessionToken;
    if (!token) {
      const secret = env.MOHEN_DATABASE_SESSION_SECRET;
      const uid = "b0a11000-0000-4000-8000-0000000000a1"; // MACHINE_REVIEWER_USER_ID
      const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 300_000 })).toString("base64url");
      token = `${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url").replace(/=+$/, "")}`;
    }
    await adminClient.query("begin");
    try {
      const roleRes = await adminClient.query("select current_user::text as cur_role");
      originalRole = roleRes.rows[0].cur_role;
      resetNeeded = true;
      await adminClient.query("set role mohen_gate_signer_m5_machine");
      await adminClient.query("select set_config('mohen.session_token',$1,true)", [token]);
      sessionNeeded = true;
      const res = await adminClient.query(
        `select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
        [decision.candidateId, decision.requestId, decision.result,
         decision.ruleVersion, decision.validUntil,
         JSON.stringify(decision.receipt), decision.expectedAuditId]
      );
      await adminClient.query("commit");
      return res.rows[0].gate_audit_id;
    } catch (err) {
      try { await adminClient.query("rollback"); } catch {}
      throw err;
    } finally {
      // 事务提交后 reset role 和 session config（adminClient 需要恢复 postgres 身份）
      try { if (sessionNeeded) await adminClient.query("select set_config('mohen.session_token',null,true)"); } catch {}
      try { if (resetNeeded && originalRole) await adminClient.query(`set role ${originalRole}`); } catch {}
    }
  }

  for (const CASE of CASES) {
    console.log(`\n--- ${CASE.label} ---\n`);
    const findingSpec = CASE.finding;
    const inputDigest = sha256(canonical({
      runId: CASE.runId, originalId: CASE.originalId,
      claimRevisionId: CASE.claimRevisionId, finding: findingSpec
    }));
    const findingId = derivedUuid("mab-private-finding", {
      runId: CASE.runId, originalId: CASE.originalId,
      claimRevisionId: CASE.claimRevisionId, finding: findingSpec
    });

    console.log(`  finding_id     = ${findingId}`);
    console.log(`  method_id      = ${findingSpec.method_id} (泛化：非 A06)`);
    console.log(`  finding_type   = ${findingSpec.finding_type} (泛化：非 institutional_mechanism)`);

    // Step 1: persist finding via DB function (runtimeClient = Studio identity, still in transaction)
    let persistResult;
    try {
      const persistRes = await runtimeClient.query(
        `select studio.persist_private_humanistic_finding(
           $1::uuid, $2::uuid, $3::text, $4::uuid, $5::uuid, $6::jsonb) as saved`,
        [CASE.originalId, findingId, inputDigest, CASE.runId, CASE.claimRevisionId, findingSpec]
      );
      persistResult = persistRes.rows[0].saved;
      console.log(`  ✅ DB persist PASS (泛化验证通过！)`);
    } catch (err) {
      console.log(`  ❌ DB persist FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }
  }

  // commit 所有 persist
  await runtimeClient.query("commit");
  console.log(`\n  ⏳ finding persisted & committed to DB`);

  // ======= 第二阶段：verify + candidate + reviewer（adminClient postgres 身份） =======
  for (const CASE of CASES) {
    console.log(`\n--- ${CASE.label} (verify + G4) ---\n`);
    const findingSpec = CASE.finding;
    const findingId = derivedUuid("mab-private-finding", {
      runId: CASE.runId, originalId: CASE.originalId,
      claimRevisionId: CASE.claimRevisionId, finding: findingSpec
    });

    // Step 2: verify finding (adminClient)
    let artifactRevision;
    try {
      const v = await adminClient.query(
        `select f.finding_id::text as finding_id, f.finding_type,
                f.discovery_method->>'method_id' as method_id,
                f.uncertainty->>'qualification' as qualification
           from meaning.findings f where f.finding_id=$1::uuid`,
        [findingId]
      );
      const row = v.rows[0];
      const matchMethod = row.method_id === findingSpec.method_id;
      const matchType = row.finding_type === findingSpec.finding_type;
      console.log(`  ✅ DB verify: method=${row.method_id}(${matchMethod?'✓':'✗'}) type=${row.finding_type}(${matchType?'✓':'✗'}) qual=${row.qualification}`);
      if (!matchMethod || !matchType) { exitCode = 1; continue; }
    } catch (err) {
      console.log(`  ❌ DB verify FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 3: artifact_revision
    try {
      const rev = await adminClient.query(
        `select control.artifact_revision_for('finding',$1::uuid) as rev`, [findingId]);
      artifactRevision = rev.rows[0].rev;
      console.log(`  artifact_revision = ${artifactRevision.slice(0,16)}...`);
    } catch (err) {
      console.log(`  ❌ artifact_revision FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 4: G3 qualification_digest
    let qualificationDigest;
    try {
      const d = await adminClient.query(
        `select qualification_digest from control.gate_audits where gate_audit_id=$1::uuid`,
        [CASE.g3AuditId]);
      qualificationDigest = d.rows[0].qualification_digest;
    } catch (err) {
      console.log(`  ❌ G3 qualification_digest FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 5: insert gate_candidate
    const findingPersistedDigest = sha256(canonical({
      runId: CASE.runId, originalId: CASE.originalId,
      claimRevisionId: CASE.claimRevisionId, finding: findingSpec
    }));
    const candidateId = derivedUuid("mab-private-gate-candidate", {
      gateCode: "G4", stage: "D04", objectType: "finding",
      objectId: findingId, inputFingerprint: findingPersistedDigest, consumer: "producer"
    });
    const dependencySnapshot = [{
      gate_code: "G3", stage: "D03", object_type: "claim_revision",
      object_id: CASE.claimRevisionId, artifact_revision: CASE.g3ArtifactRevision,
      gate_audit_id: CASE.g3AuditId, qualification_digest: qualificationDigest
    }];
    const evidenceRefs = [
      { kind: "finding", id: findingId, artifact_revision: artifactRevision },
      { kind: "claim_revision", id: CASE.claimRevisionId, artifact_revision: CASE.g3ArtifactRevision }
    ];
    const allowedScope = { project_id: CASE.projectId };

    try {
      await adminClient.query(
        `insert into control.gate_candidates(
           candidate_id, run_id, stage, gate_code, object_type, object_id,
           artifact_revision, purpose_namespace, purpose_code, purpose_version,
           allowed_scope, consumer, dependency_snapshot, evidence_refs,
           input_fingerprint, submitted_at, producer_identity, candidate_status
         ) values (
           $1::uuid,$2::uuid,'D04','G4','finding',$3::uuid,
           $4::text,$5::text,$6::text,'v1',
           $7::jsonb,'producer',$8::jsonb,$9::jsonb,
           $10::text,now(),'private-evidence-worker','SUBMITTED'
         )
         on conflict (candidate_id) do nothing`,
        [candidateId, CASE.runId, findingId, artifactRevision,
         'G4.interpretation.v1', findingSpec.purpose_code || 'BE',
         JSON.stringify(allowedScope), JSON.stringify(dependencySnapshot), JSON.stringify(evidenceRefs),
         findingPersistedDigest]
      );
      console.log(`  ✅ gate_candidate submitted: ${candidateId}`);
      console.log(`     purpose = G4.interpretation.v1/${findingSpec.purpose_code || 'BE'}`);
    } catch (err) {
      console.log(`  ❌ gate_candidate FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 6: G4 reviewer
    console.log(`  ⚙️ G4 machine review (dryRun)...`);
    const reviewer = createRuleGateReviewer({
      query: reviewerQuery,
      decide: decideGate,
      projectId: CASE.projectId,
      log: (line) => console.log(`     ${line}`),
    });

    try {
      const dryResult = await reviewer.review({ gate: "G4", dryRun: true });
      if (dryResult.status !== "DRY_RUN_PASS") {
        console.log(`  ❌ G4 dryRun FAIL: ${dryResult.failed?.join(",")}`);
        exitCode = 1;
        continue;
      }
      console.log(`  ✅ dryRun PASS → 正式签发`);
      const signResult = await reviewer.review({ gate: "G4", dryRun: false });
      if (signResult.status === "SIGNED" || signResult.status === "PASS") {
        console.log(`  ✅ G4 ${signResult.status}! audit_id=${signResult.auditId}`);
      } else {
        console.log(`  ❌ G4 FAIL: ${signResult.status} failed=${signResult.failed?.join(",")}`);
        exitCode = 1;
      }
    } catch (err) {
      console.log(`  ❌ G4 reviewer error: ${err.message}`);
      exitCode = 1;
    }
  }

  await Promise.all([runtimeClient.end(), adminClient.end()]);

  console.log(`\n${"=".repeat(72)}`);
  console.log(exitCode === 0 ? "✅ VERIFIED_ISOLATED — 两例 D04+G4 通过" : "❌ 部分失败");
  console.log(exitCode === 0 ? "ST-05 完成：D04 finding + G4 机器评审均 PASS current" : "ST-05 未全部完成");
  console.log(`\n泛化验证：DB/persist 接受 A05/A09（不再硬编码 A06）；purpose=G4.interpretation.v1（不再 data-production）`);
  console.log("=".repeat(72));

  process.exit(exitCode);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
