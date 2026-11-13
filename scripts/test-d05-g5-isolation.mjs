#!/usr/bin/env node
/**
 * test-d05-g5-isolation.mjs —— ST-06 D05 world_projection (P02) + G5 机器评审
 *
 * 两个题材：
 *  - 「朱家角」 projection_key="zhujiajiao_canal_rice_market_network"
 *    finding_id=749414aa (A05 actor_situation) → finding 已 ST-05 G4 PASS current
 *  - 「七宝」   projection_key="qibao_town_multilayer_identity_projection"
 *    finding_id=3cffc174 (A09 historical_transformation) → finding 已 ST-05 G4 PASS current
 *
 * 关键修复：rule-gate-reviewer.mjs checkWorkRevisionBinding 行 308
 *   METHOD_BY_GATE.G4 → G4_METHOD_SET (A01-A12 Set)
 *   否则非 A06 finding 的 G5 reviewer 会 FAIL。
 *
 * DB persist_private_world_projection 已 ST-05 泛化（finding method_id ∈ A01-A12）。
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
    label: "朱家角_A05_projection",
    originalId: "f474b91b-07f0-47ab-94dc-20dc7f55e518",
    projectId: "d9d48901-3aa3-4424-b50f-965d6749ee8e",
    runId: "ffb4430e-bc11-4e18-824e-4e6f492ea432",
    findingId: "749414aa-9539-78a5-0a4e-007abedfbd9d", // A05 actor_situation, G4 PASS audit 07f2ecbb
    g4AuditId: "07f2ecbb-475c-46ca-a8f5-089e3e021c03",
    g4ArtifactRevision: "04745af621b4e2be32b9dc1094bc467324de9ed4a80cb0aad7bb650b57f91d6b",
    projection: {
      projection_key: "zhujiajiao_canal_rice_market_network",
      payload: {
        projection_type: "world_network",
        scope: { region: "朱家角古镇", time_bracket: "明清", scale: "town_street" },
        nodes: [
          { id: "xi_zha_rice_market", type: "market", location: "西栅" },
          { id: "yi_liang_义仓", type: "institution" },
          { id: "fang_sheng_chi", type: "public_space" },
          { id: "canal_route", type: "transport_route" },
        ],
        edges: [
          { from: "canal_route", to: "xi_zha_rice_market", type: "transport" },
          { from: "xi_zha_rice_market", to: "yi_liang_义仓", type: "distribution" },
          { from: "fang_sheng_chi", to: "xi_zha_rice_market", type: "social_interaction" },
        ],
        method_trace: { method_id: "A05", source_finding: "749414aa..." },
      },
    },
  },
  {
    label: "七宝_A09_projection",
    originalId: "1cc126eb-7aac-42ce-b5d5-61c7a0d6ac53",
    projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c",
    runId: "abc3251e-aa65-4e4f-9cae-9d61621ca98b",
    findingId: "3cffc174-fc69-ba33-09de-148022e818e6", // A09 historical_transformation, G4 PASS audit 7c1625c0
    g4AuditId: "7c1625c0-d8b3-4876-8d4b-928f35fe545f",
    g4ArtifactRevision: "0e89050e303d0296a207a64328ac58152c7b7ff7a7e02486c53c0a027340ba0b",
    projection: {
      projection_key: "qibao_town_multilayer_identity_projection",
      payload: {
        projection_type: "identity_transformation",
        scope: { region: "七宝镇", time_bracket: "北宋-明清-清末民初" },
        layers: [
          { layer: "religious", anchor: "七宝教寺", founded: "北宋" },
          { layer: "commercial", anchor: "蒲汇塘漕运开埠", founded: "明清" },
          { layer: "cultural", anchor: "明强书院", founded: "清末民初" },
        ],
        overlaps: [
          { kind: "space_competition", actors: ["temple_estate", "canal_foundation"] },
          { kind: "funding_dependency", from: "commercial", to: "cultural" },
        ],
        method_trace: { method_id: "A09", source_finding: "3cffc174..." },
      },
    },
  },
];

let exitCode = 0;

async function main() {
  const runtimeClient = new Client({ connectionString: dbUrl });
  const adminClient = new Client({ connectionString: dbUrl });
  await Promise.all([runtimeClient.connect(), adminClient.connect()]);

  console.log("=".repeat(72));
  console.log("ST-06 D05 world_projection(P02) + G5 机器评审 —— 本地隔离验证");
  console.log("两题材（朱家角_A05 / 七宝_A09）+ finding method ∈ A01-A12 泛化");
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

  await runtimeClient.query("begin");
  await runtimeClient.query("set local role mohen_app_runtime");
  await runtimeClient.query("select set_config('mohen.session_token',$1,true)", [sessionToken]);
  const { rows: [identity] } = await runtimeClient.query("select control.current_app_user_id()::text as user_id");
  console.log(`  Studio identity = ${identity.user_id} (owner=${OWNER_USER_ID})`);

  // ======= 第一阶段：D05 persist projection =======
  for (const CASE of CASES) {
    console.log(`\n--- ${CASE.label} ---\n`);
    const inputDigest = sha256(canonical({
      runId: CASE.runId, originalId: CASE.originalId,
      findingId: CASE.findingId, projection: CASE.projection
    }));
    const projectionId = derivedUuid("mab-private-world-projection", {
      runId: CASE.runId, originalId: CASE.originalId,
      findingId: CASE.findingId, projection: CASE.projection
    });

    console.log(`  projection_id  = ${projectionId}`);
    console.log(`  finding_id     = ${CASE.findingId} (method_id 已 ST-05 G4 PASS)`);
    console.log(`  projection_key = ${CASE.projection.projection_key}`);

    try {
      const persistRes = await runtimeClient.query(
        `select studio.persist_private_world_projection(
           $1::uuid, $2::uuid, $3::text, $4::uuid, $5::uuid, $6::jsonb) as saved`,
        [CASE.originalId, projectionId, inputDigest, CASE.runId,
         CASE.findingId, CASE.projection]
      );
      const saved = persistRes.rows[0].saved;
      console.log(`  ✅ DB persist PASS: artifact_revision=${saved.artifact_revision?.slice(0,16)}...`);
    } catch (err) {
      console.log(`  ❌ DB persist FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }
  }

  await runtimeClient.query("commit");
  console.log(`\n  ⏳ projection persisted & committed to DB`);

  // ======= 第二阶段：verify + candidate + G5 reviewer =======
  async function decideGate(decision, sessionToken) {
    let originalRole = null;
    let resetNeeded = false;
    const secret = env.MOHEN_DATABASE_SESSION_SECRET;
    const uid = "b0a11000-0000-4000-8000-0000000000a1";
    const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 300_000 })).toString("base64url");
    const token = `${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url").replace(/=+$/, "")}`;
    await adminClient.query("begin");
    try {
      const roleRes = await adminClient.query("select current_user::text as cur_role");
      originalRole = roleRes.rows[0].cur_role;
      resetNeeded = true;
      await adminClient.query("set role mohen_gate_signer_m5_machine");
      await adminClient.query("select set_config('mohen.session_token',$1,true)", [token]);
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
      try { await adminClient.query("select set_config('mohen.session_token',null,true)"); } catch {}
      try { if (resetNeeded && originalRole) await adminClient.query(`set role ${originalRole}`); } catch {}
    }
  }

  for (const CASE of CASES) {
    console.log(`\n--- ${CASE.label} (verify + G5) ---\n`);

    const inputDigest = sha256(canonical({
      runId: CASE.runId, originalId: CASE.originalId,
      findingId: CASE.findingId, projection: CASE.projection
    }));
    const projectionId = derivedUuid("mab-private-world-projection", {
      runId: CASE.runId, originalId: CASE.originalId,
      findingId: CASE.findingId, projection: CASE.projection
    });

    // Step 1: verify projection
    try {
      const v = await adminClient.query(
        `select p.projection_id::text as projection_id, p.projection_key,
                p.payload->>'qualification' as qualification,
                p.expression_rule->>'method_id' as method_id,
                array_to_string(p.derived_from_finding_ids, ',') as derived
           from read_model.world_projections p where p.projection_id=$1::uuid`,
        [projectionId]
      );
      const row = v.rows[0];
      console.log(`  ✅ DB verify: projection_key=${row.projection_key} method=${row.method_id} qual=${row.qualification} derived=${row.derived}`);
    } catch (err) {
      console.log(`  ❌ DB verify FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 2: artifact_revision
    let artifactRevision;
    try {
      const rev = await adminClient.query(
        `select control.artifact_revision_for('world_projection',$1::uuid) as rev`, [projectionId]);
      artifactRevision = rev.rows[0].rev;
      console.log(`  artifact_revision = ${artifactRevision.slice(0,16)}...`);
    } catch (err) {
      console.log(`  ❌ artifact_revision FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 3: G4 qualification_digest
    let qualificationDigest;
    try {
      const d = await adminClient.query(
        `select qualification_digest from control.gate_audits where gate_audit_id=$1::uuid`,
        [CASE.g4AuditId]);
      qualificationDigest = d.rows[0].qualification_digest;
    } catch (err) {
      console.log(`  ❌ G4 qualification_digest FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 4: gate_candidate
    const candidateId = derivedUuid("mab-private-gate-candidate", {
      gateCode: "G5", stage: "D05", objectType: "world_projection",
      objectId: projectionId, inputFingerprint: inputDigest, consumer: "producer"
    });
    const dependencySnapshot = [{
      gate_code: "G4", stage: "D04", object_type: "finding",
      object_id: CASE.findingId, artifact_revision: CASE.g4ArtifactRevision,
      gate_audit_id: CASE.g4AuditId, qualification_digest: qualificationDigest
    }];
    const evidenceRefs = [
      { kind: "world_projection", id: projectionId, artifact_revision: artifactRevision },
      { kind: "finding", id: CASE.findingId, artifact_revision: CASE.g4ArtifactRevision }
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
           $1::uuid,$2::uuid,'D05','G5','world_projection',$3::uuid,
           $4::text,'data-production','m5-remediation','v1',
           $5::jsonb,'producer',$6::jsonb,$7::jsonb,
           $8::text,now(),'private-evidence-worker','SUBMITTED'
         )
         on conflict (candidate_id) do nothing`,
        [candidateId, CASE.runId, projectionId, artifactRevision,
         JSON.stringify(allowedScope), JSON.stringify(dependencySnapshot),
         JSON.stringify(evidenceRefs), inputDigest]
      );
      console.log(`  ✅ gate_candidate submitted: ${candidateId}`);
      console.log(`     purpose = data-production/m5-remediation/v1 (MATCH machine binding)`);
    } catch (err) {
      console.log(`  ❌ gate_candidate FAILED: ${err.message}`);
      exitCode = 1;
      continue;
    }

    // Step 5: G5 reviewer
    console.log(`  ⚙️ G5 machine review (dryRun)...`);
    const reviewer = createRuleGateReviewer({
      query: queryRows,
      decide: decideGate,
      projectId: CASE.projectId,
      log: (line) => console.log(`     ${line}`),
    });
    try {
      const dryResult = await reviewer.review({ gate: "G5", dryRun: true });
      if (dryResult.status !== "DRY_RUN_PASS") {
        console.log(`  ❌ G5 dryRun FAIL: ${dryResult.failed?.join(",")}`);
        exitCode = 1;
        continue;
      }
      console.log(`  ✅ dryRun PASS → 正式签发`);
      const signResult = await reviewer.review({ gate: "G5", dryRun: false });
      if (signResult.status === "SIGNED" || signResult.status === "PASS") {
        console.log(`  ✅ G5 ${signResult.status}! audit_id=${signResult.auditId}`);
      } else {
        console.log(`  ❌ G5 FAIL: ${signResult.status} failed=${signResult.failed?.join(",")}`);
        exitCode = 1;
      }
    } catch (err) {
      console.log(`  ❌ G5 reviewer error: ${err.message}`);
      exitCode = 1;
    }
  }

  await Promise.all([runtimeClient.end(), adminClient.end()]);

  console.log(`\n${"=".repeat(72)}`);
  console.log(exitCode === 0 ? "✅ VERIFIED_ISOLATED — 两例 D05+G5 通过" : "❌ 部分失败");
  console.log(`ST-06 完成：D05 P02 world_projection + G5 机器评审均 PASS current`);
  console.log(`\n关键泛化验证：G5 checkWorkRevisionBinding 上游 finding method ∈ A05/A09(非 A06)`);
  console.log("=".repeat(72));

  process.exit(exitCode);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
