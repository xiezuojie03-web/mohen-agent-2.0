#!/usr/bin/env node
// MAB step 4 (M4 B线)：受控 Provider 派发的真实隔离验证，仅本地隔离环境。
//
// 证明的事（全部经真实 PG + 真实 provider 小调用，Owner 预授权 ≤¥20 范围内）：
// 1. 真实委托（GRANTED + USD 预算 0.02）+ NAJ 公域来源 → 授权通过；
// 2. 真实 DeepSeek 极小调用成功 → ACCEPT_AS_CANDIDATE + ESTIMATED 回执
//    （真实 usage × 版本化价格表，含 input/output hash，费用 < 0.02 USD）；
// 3. 同输入再授权 → 回放，不再发起请求、不新增回执、不重复扣费；
// 4. 权利为 {} 的来源 → TRANSFER_DENIED（无回执）；
// 5. 零预算委托 → HOLD_BUDGET（无回执）。
// 本工具不印出任何密钥；全部输出只有判定与哈希。
import crypto from "node:crypto";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const NAJ_SOURCE = "b0a11000-0000-4000-8000-000000000004";

// 委托系列号按 6 小时桶确定性派生（series+revision 唯一约束：桶内复用，跨桶新系列）。
function bucketSeriesUuid(bucket) {
  const hex = crypto.createHash("sha256").update(`verify-4-series-${bucket}`).digest("hex");
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
  // 加载 .env.local（data-access import 副作用）。
  const dataAccess = await import("../packages/data-access/src/index.mjs");
  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
  if (!process.env.DEEPSEEK_API_KEY && !process.env.MOHEN_LLM_API_KEY) throw new Error("DEEPSEEK_API_KEY missing");
  const token = makeToken(OWNER, secret);

  const dispatcher = await import("../apps/web/lib/studio/provider-dispatcher.ts");
  const deps = await dispatcher.createStudioDispatcherDeps();

  // 身份自检：会话 token 必须解析为 Owner。
  const who = await dataAccess.queryRows(
    `select control.current_app_user_id()::text as uid
     from (select set_config('mohen.session_token', :'token', false)) s`, { token });
  record("VERIFY_4_IDENTITY", who[0]?.uid === OWNER, `uid=${who[0]?.uid}`);

  // 真实委托：GRANTED + USD 预算 0.02（6 小时桶内幂等复用；桶过期自动开新委托）。
  const bucket = new Date().toISOString().slice(0, 13).replace("T", "-") + "h";
  const SERIES = bucketSeriesUuid(bucket);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const delegationInput = {
    projectId: PROJECT, seriesId: SERIES, revisionNo: 1,
    rootTaskRef: "m4-verify-4-provider-dispatch",
    rootTaskSnapshot: { purpose: "verify-4", scope: "local-isolated" },
    subtaskRef: "llm-director-h1", executor: "mohen-studio", provider: "deepseek",
    engineVersion: dispatcher.currentPriceTable().priceRef,
    inputManifest: { purpose: "verify-4-provider-dispatch" },
    allowedActions: ["llm_director_h1"],
    transferRightsDecision: { external_processing: "GRANTED" },
    policyVersion: "m4.1", expiresAt,
    budgetLimit: "0.02", currency: "USD",
    outputSchema: "mohen.studio-director-h1.v1",
    idempotencyKey: `verify-4-provider-dispatch-${bucket}`,
  };
  const existing = await deps.delegations.getDelegationForPlan(
    PROJECT, delegationInput.rootTaskRef, delegationInput.idempotencyKey, token);
  const delegation = existing ?? await deps.delegations.saveDelegation(delegationInput, token);
  record("VERIFY_4_DELEGATION", !!delegation?.delegation_id,
    `delegation=${delegation?.delegation_id} budget=0.02 USD reused=${!!existing}`);

  const call = {
    system: "你是墨痕验证器。只输出两个字：收到。",
    user: "来源：NAJ《松江府田赋》页（公域二次使用）。这是本地隔离验证调用。",
    temperature: 0.1,
    maxTokens: 200,
  };
  const authInput = {
    delegationId: delegation.delegation_id, action: "llm_director_h1",
    model: "deepseek-flash", call, sourceIds: [NAJ_SOURCE], sessionToken: token,
  };

  // 1+2) 授权 + 真实派发（或当日幂等回放）。
  const before = (await deps.delegations.listReceipts(delegation.delegation_id, token)).length;
  const handle = await dispatcher.authorizeProviderDispatch(deps, authInput);
  record("VERIFY_4_POSITIVE_AUTHORIZED", true, `handle replay=${handle.replay}`);
  const result = await dispatcher.dispatchAuthorizedCall(deps, handle, call);
  const afterPositive = (await deps.delegations.listReceipts(delegation.delegation_id, token)).length;
  const receipt = result.receipt;
  const manifest = receipt.result_manifest ?? {};
  const cost = Number(receipt.cost);
  record("VERIFY_4_POSITIVE_DISPATCH",
    typeof result.text === "string" && result.text.length > 0
    && receipt.acceptance_state === "ACCEPT_AS_CANDIDATE"
    && receipt.cost_confidence === "ESTIMATED"
    && Number.isFinite(cost) && cost >= 0 && cost < 0.02
    && manifest.price_ref === dispatcher.currentPriceTable().priceRef
    && manifest.rate_window === "peak"
    && Number.isSafeInteger(manifest.usage?.prompt_tokens)
    && /^[a-f0-9]{64}$/.test(manifest.input_hash ?? "")
    && /^[a-f0-9]{64}$/.test(manifest.output_hash ?? ""),
    `replay=${result.replay} text=${JSON.stringify(result.text)} cost=$${receipt.cost} receipts=${before}->${afterPositive}`);

  // 3) 回放：同输入再授权必须 replay，且不新增回执。
  const replayHandle = await dispatcher.authorizeProviderDispatch(deps, authInput);
  const replayResult = await dispatcher.dispatchAuthorizedCall(deps, replayHandle, call);
  const afterReplay = (await deps.delegations.listReceipts(delegation.delegation_id, token)).length;
  record("VERIFY_4_REPLAY_NO_RECHARGE",
    replayHandle.replay === true && replayResult.replay === true
    && replayResult.text === result.text && afterReplay === afterPositive,
    `replay=${replayResult.replay} receipts=${afterPositive}->${afterReplay}`);

  // 4) 权利 {} 来源 → TRANSFER_DENIED，且无任何回执。
  const deniedRows = await dataAccess.queryRows(
    `select s.source_id::text as source_id from source.sources s,
       (select set_config('mohen.session_token', :'token', false)) cfg
     where s.rights = '{}'::jsonb and s.source_id <> :'naj'::uuid limit 1`,
    { token, naj: NAJ_SOURCE });
  if (deniedRows.length !== 1) {
    record("VERIFY_4_NEGATIVE_TRANSFER_DENIED", false, "no rights={} source fixture found");
  } else {
    const deniedSource = deniedRows[0].source_id;
    let deniedCode = "";
    try {
      await dispatcher.authorizeProviderDispatch(deps, { ...authInput, sourceIds: [deniedSource] });
    } catch (error) { deniedCode = errCode(error); }
    const afterDenied = (await deps.delegations.listReceipts(delegation.delegation_id, token)).length;
    record("VERIFY_4_NEGATIVE_TRANSFER_DENIED",
      deniedCode === "TRANSFER_DENIED" && afterDenied === afterReplay,
      `source=${deniedSource} code=${deniedCode} receipts_unchanged=${afterDenied}==${afterReplay}`);
  }

  // 5) 零预算委托 → HOLD_BUDGET，且无任何回执。
  const zeroInput = {
    projectId: PROJECT, seriesId: SERIES, revisionNo: 2,
    rootTaskRef: "m4-verify-4-provider-dispatch-zero-budget",
    rootTaskSnapshot: { purpose: "verify-4-negative", scope: "local-isolated" },
    subtaskRef: "llm-director-h1", executor: "mohen-studio", provider: "deepseek",
    engineVersion: dispatcher.currentPriceTable().priceRef,
    inputManifest: { purpose: "verify-4-provider-dispatch-zero-budget" },
    allowedActions: ["llm_director_h1"],
    transferRightsDecision: { external_processing: "GRANTED" },
    policyVersion: "m4.1", expiresAt,
    budgetLimit: "0", currency: "USD",
    outputSchema: "mohen.studio-director-h1.v1",
    idempotencyKey: `verify-4-provider-dispatch-zero-budget-${bucket}`,
  };
  const zeroDelegation = await deps.delegations.getDelegationForPlan(
    PROJECT, zeroInput.rootTaskRef, zeroInput.idempotencyKey, token)
    ?? await deps.delegations.saveDelegation(zeroInput, token);
  let budgetCode = "";
  try {
    await dispatcher.authorizeProviderDispatch(deps, { ...authInput, delegationId: zeroDelegation.delegation_id });
  } catch (error) { budgetCode = errCode(error); }
  const zeroReceipts = (await deps.delegations.listReceipts(zeroDelegation.delegation_id, token)).length;
  record("VERIFY_4_NEGATIVE_HOLD_BUDGET",
    budgetCode === "HOLD_BUDGET" && zeroReceipts === 0,
    `code=${budgetCode} receipts=${zeroReceipts}`);
}

try {
  await main();
} catch (error) {
  record("VERIFY_4_FATAL", false, String(error?.message ?? error).split("\n")[0]);
}
let failed = 0;
for (const line of lines) {
  if (!line.ok) failed += 1;
  console.log(`${line.ok ? "PASS" : "FAIL"} ${line.label}${line.detail ? ` — ${line.detail}` : ""}`);
}
if (failed === 0 && lines.length > 0) {
  console.log("VERIFY_4_ALL_PASS");
} else {
  console.log(`VERIFY_4_FAILED failures=${failed}`);
  process.exitCode = 1;
}
