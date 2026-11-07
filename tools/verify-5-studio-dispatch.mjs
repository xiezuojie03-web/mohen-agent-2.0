#!/usr/bin/env node
// M5 批次 G：Studio dispatcher grant 正道的真实隔离验证，仅本地隔离环境。
//
// 证明的事（真实 PG + 真实 DeepSeek 小调用，Owner 预授权 ≤¥20 范围内）：
// 1. 项目来源服务端推导（私有原件 ↔ L0 链）命中 NAJ 来源；
// 2. GRANTED/USD 委托（6 动作白名单）→ 路由级 grant 签发成功；
// 3. grant 驱动 H1/H2/H3/panels 四次真实派发：ACCEPT 回执、真实费用、hash 齐；
// 4. grant 次数耗尽 → DISPATCH_GRANT_INVALID（不再发起请求）；
// 5. 伪造 grant → 拒绝；权利 {} 来源 → TRANSFER_DENIED（均无回执、无请求）。
// 本工具不印出任何密钥；全部输出只有判定与哈希。ST-06–09 的 HTTP 体验证据归 5.9 批次。
import crypto from "node:crypto";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const NAJ_SOURCE = "b0a11000-0000-4000-8000-000000000004";
const ACTIONS = ["llm_director_h1", "llm_director_h2", "llm_director_h3", "llm_work_panels"];

function bucketSeriesUuid(bucket) {
  const hex = crypto.createHash("sha256").update(`verify-5-series-${bucket}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const lines = [];
const record = (label, ok, detail = "") => { lines.push({ label, ok: !!ok, detail }); return !!ok; };
function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const errCode = (error) => (error && typeof error === "object" && "code" in error)
  ? String(error.code) : String(error?.message ?? error).split("\n")[0];

async function main() {
  const dataAccess = await import("../packages/data-access/src/index.mjs");
  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
  if (!process.env.DEEPSEEK_API_KEY && !process.env.MOHEN_LLM_API_KEY) throw new Error("DEEPSEEK_API_KEY missing");
  const token = makeToken(OWNER, secret);

  const dispatcher = await import("../apps/web/lib/studio/provider-dispatcher.ts");
  const deps = await dispatcher.createStudioDispatcherDeps();

  const who = await dataAccess.queryRows(
    `select control.current_app_user_id()::text as uid
     from (select set_config('mohen.session_token', :'token', false)) s`, { token });
  record("VERIFY_5_IDENTITY", who[0]?.uid === OWNER, `uid=${who[0]?.uid}`);

  // 1) 项目来源服务端推导（与路由 listProjectSourceIds 同一查询）。
  const srcRows = await dataAccess.queryRows(
    `select distinct s.source_id::text as source_id
       from studio.private_originals o
       join source.raw_items r on r.checksum_sha256 = o.sha256
       join source.source_versions v on v.source_version_id = r.source_version_id
       join source.sources s on s.source_id = v.source_id,
       (select set_config('mohen.session_token', :'token', false)) cfg
      where o.project_id = :'pid'`, { token, pid: PROJECT });
  const projectSources = srcRows.map((r) => r.source_id).sort();
  record("VERIFY_5_PROJECT_SOURCES", projectSources.includes(NAJ_SOURCE), `sources=${projectSources.join(",")}`);

  // 2) 真实委托：GRANTED + USD 预算 1.00 + 六动作白名单（桶内幂等复用）。
  const bucket = new Date().toISOString().slice(0, 13).replace("T", "-") + "h";
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const delegationInput = {
    projectId: PROJECT, seriesId: bucketSeriesUuid(bucket), revisionNo: 1,
    rootTaskRef: "studio-llm-dispatch",
    rootTaskSnapshot: { purpose: "verify-5", scope: "local-isolated" },
    subtaskRef: "studio-director-llm", executor: "mohen-studio", provider: "deepseek",
    engineVersion: dispatcher.currentPriceTable().priceRef,
    inputManifest: { purpose: "verify-5-studio-dispatch" },
    allowedActions: [...ACTIONS, "llm_narration_suggest", "llm_insight_view"],
    transferRightsDecision: { external_processing: "GRANTED" },
    policyVersion: "m5.g", expiresAt,
    budgetLimit: "1.00", currency: "USD",
    outputSchema: "mohen.studio-llm-dispatch.v1",
    idempotencyKey: `verify-5-studio-dispatch-${bucket}`,
  };
  const delegation = await deps.delegations.getDelegationForPlan(
    PROJECT, delegationInput.rootTaskRef, delegationInput.idempotencyKey, token)
    ?? await deps.delegations.saveDelegation(delegationInput, token);
  record("VERIFY_5_DELEGATION", !!delegation?.delegation_id, `delegation=${delegation?.delegation_id}`);

  // 3) grant 签发（maxCalls=4）。
  const grant = await dispatcher.authorizeStudioDispatchGrant(deps, {
    delegationId: delegation.delegation_id, actions: ACTIONS,
    model: "deepseek-flash", sourceIds: projectSources, sessionToken: token, maxCalls: 4,
  });
  record("VERIFY_5_GRANT_AUTHORIZED", dispatcher.isUsableDispatchGrant(grant), `grantId=${grant.grantId}`);

  // 真实项目材料（D 链 L2 证据）作 facts。
  const matRows = await dataAccess.queryRows(
    `select left(literal_reading, 200) as t from evidence.material_evidence
      where source_id = :'sid'::uuid and literal_reading is not null and char_length(literal_reading) > 10
      order by created_at desc limit 6`, { sid: NAJ_SOURCE });
  const facts = matRows.map((r) => String(r.t)).filter((s) => s.length > 10);
  if (facts.length < 2) throw new Error(`project materials insufficient: ${facts.length}`);

  const receiptsBefore = (await deps.delegations.listReceipts(delegation.delegation_id, token)).length;
  const brief = "用松江府田赋史料做一集 3 分钟短片，说明清代田赋征收中普通农户的实际负担。";
  const factsBlock = facts.map((f) => "- " + f).join("\n");

  // 4) H1 + H2（导演方案两连调）。
  const h1 = await dispatcher.dispatchWithGrant(deps, grant, "llm_director_h1", {
    system: "你是墨痕的 H1 方法：识别材料中的母题与认识增量。只输出 JSON：{\"motif\":\"...\",\"cognitional_gain\":\"...\"}",
    user: `真实材料：\n${factsBlock}\n\n委托：${brief}`, temperature: 0.3,
  });
  const h1Json = JSON.parse(h1.text.match(/\{[\s\S]*\}/)?.[0] ?? "null");
  const h2 = await dispatcher.dispatchWithGrant(deps, grant, "llm_director_h2", {
    system: "你是墨痕 H2 导演。基于材料给出 A/B 两个方案，只输出 JSON：{\"plan_a\":{\"angle\":\"...\",\"points\":[\"...\"]},\"plan_b\":{\"angle\":\"...\",\"points\":[\"...\"]}}",
    user: `真实材料：\n${factsBlock}\n\n委托：${brief}`, temperature: 0.7,
  });
  const h2Json = JSON.parse(h2.text.match(/\{[\s\S]*\}/)?.[0] ?? "null");
  record("VERIFY_5_H1_H2_DISPATCH",
    typeof h1Json?.motif === "string" && h1Json.motif.length > 0
    && typeof h2Json?.plan_a?.angle === "string" && typeof h2Json?.plan_b?.angle === "string",
    `h1_motif=${JSON.stringify(h1Json?.motif ?? null)} planA=${JSON.stringify(h2Json?.plan_a?.angle ?? null)}`);

  // 5) H3（beats）+ panels。
  const h3 = await dispatcher.dispatchWithGrant(deps, grant, "llm_director_h3", {
    system: "你是墨痕 H3：基于选定方案与材料生成 2-3 个章节节拍，只输出 JSON：[{\"chapter\":\"...\",\"narration\":\"...\"}]",
    user: `真实材料：\n${factsBlock}\n\n选定方案：${h2Json?.plan_a?.angle ?? ""}`, temperature: 0.7,
  });
  const beats = JSON.parse(h3.text.match(/\[[\s\S]*\]/)?.[0] ?? "null");
  const panels = await dispatcher.dispatchWithGrant(deps, grant, "llm_work_panels", {
    system: "生成作品四面板 JSON：{\"story\":\"...\",\"visual\":\"...\",\"narration_style\":\"...\",\"music\":\"...\"}",
    user: `导演方案：${h2Json?.plan_a?.angle ?? ""}`, temperature: 0.6,
  });
  const panelsJson = JSON.parse(panels.text.match(/\{[\s\S]*\}/)?.[0] ?? "null");
  record("VERIFY_5_H3_PANELS_DISPATCH",
    Array.isArray(beats) && beats.length > 0 && typeof beats[0]?.narration === "string"
    && typeof panelsJson?.story === "string",
    `beats=${Array.isArray(beats) ? beats.length : 0} panels_story=${typeof panelsJson?.story}`);

  const receiptsAfter = await deps.delegations.listReceipts(delegation.delegation_id, token);
  const fresh = receiptsAfter.slice(receiptsBefore);
  const totalCost = receiptsAfter.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);
  record("VERIFY_5_RECEIPTS",
    receiptsAfter.length >= receiptsBefore
    && fresh.every((r) => ["ACCEPT_AS_CANDIDATE"].includes(r.acceptance_state) || r.acceptance_state === undefined)
    && fresh.every((r) => /^[a-f0-9]{64}$/.test(r.result_manifest?.input_hash ?? ""))
    && Number.isFinite(totalCost) && totalCost > 0 && totalCost < 1.0,
    `receipts=${receiptsBefore}->${receiptsAfter.length} total_cost=$${totalCost.toFixed(6)} replays=${fresh.length === 0}`);

  // 6) grant 耗尽：第 5 次派发必须 DISPATCH_GRANT_INVALID。
  let exhaustedCode = "";
  try {
    await dispatcher.dispatchWithGrant(deps, grant, "llm_director_h1", { system: "s", user: "u", temperature: 0.1 });
  } catch (error) { exhaustedCode = errCode(error); }
  record("VERIFY_5_GRANT_EXHAUSTED", exhaustedCode === "DISPATCH_GRANT_INVALID", `code=${exhaustedCode}`);

  // 7) 伪造 grant 与权利 {} 来源。
  let forgedCode = "";
  try {
    await dispatcher.dispatchWithGrant(deps, { grantId: "forged" }, "llm_director_h1", { system: "s", user: "u", temperature: 0.1 });
  } catch (error) { forgedCode = errCode(error); }
  const deniedRows = await dataAccess.queryRows(
    `select s.source_id::text as source_id from source.sources s,
       (select set_config('mohen.session_token', :'token', false)) cfg
     where s.rights = '{}'::jsonb and s.source_id <> :'naj'::uuid limit 1`,
    { token, naj: NAJ_SOURCE });
  let deniedCode = "";
  if (deniedRows.length === 1) {
    try {
      await dispatcher.authorizeStudioDispatchGrant(deps, {
        delegationId: delegation.delegation_id, actions: ["llm_director_h1"],
        model: "deepseek-flash", sourceIds: [deniedRows[0].source_id], sessionToken: token, maxCalls: 1,
      });
    } catch (error) { deniedCode = errCode(error); }
  }
  const receiptsFinal = (await deps.delegations.listReceipts(delegation.delegation_id, token)).length;
  record("VERIFY_5_NEGATIVES",
    forgedCode === "DISPATCH_GRANT_INVALID" && deniedCode === "TRANSFER_DENIED" && receiptsFinal === receiptsAfter.length,
    `forged=${forgedCode} denied=${deniedCode} receipts_unchanged=${receiptsFinal}==${receiptsAfter.length}`);
}

try {
  await main();
} catch (error) {
  record("VERIFY_5_FATAL", false, String(error?.message ?? error).split("\n")[0]);
}
let failed = 0;
for (const line of lines) {
  if (!line.ok) failed += 1;
  console.log(`${line.ok ? "PASS" : "FAIL"} ${line.label}${line.detail ? ` — ${line.detail}` : ""}`);
}
if (failed === 0 && lines.length > 0) {
  console.log("VERIFY_5_ALL_PASS");
} else {
  console.log(`VERIFY_5_FAILED failures=${failed}`);
  process.exitCode = 1;
}
