// M5 batch K: route-level HTTP positive/negative evidence against the local dev server (port 3210).
// Real browser-session cookies (HMAC, same algorithm as lib/auth.ts signSessionToken), real DB, one real
// DeepSeek H1 dispatch through the dispatcher grant path (tiny cost, within Owner ≤¥20 pre-authorization).
const BASE = "http://127.0.0.1:3210";
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const CROSS = "b0a11000-0000-4000-8000-0000000000a1"; // machine reviewer: real user, owns no project
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const PUBLISHED_WORK = "5b42577e-a4d6-4024-b1f9-99d0d788c9ec";
import crypto from "node:crypto";

const dataAccess = await import("../packages/data-access/src/index.mjs"); // also loads .env.local
const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 32) { console.error("AUTH_SECRET missing"); process.exit(1); }
function mintCookie(uid, roles) {
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({ uid, r: roles, iat: now, jti: crypto.randomUUID(), exp: now + 3600_000 })).toString("base64url");
  return `mohen_role=${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
const ownerCookie = mintCookie(OWNER, ["member", "creator"]);
const crossCookie = mintCookie(CROSS, ["member"]);

let failures = 0;
const results = [];
async function hit(name, method, path, { cookie, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { name, status: res.status, json };
}
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) failures++; };

// readiness wait
const deadline = Date.now() + 120_000;
for (;;) {
  try { const r = await fetch(BASE + "/api/works/published"); if (r.status) break; } catch { /* not ready */ }
  if (Date.now() > deadline) { console.error("server not ready in 120s"); process.exit(1); }
  await new Promise(r => setTimeout(r, 2000));
}
console.log("server ready\n");

// ---------- public WATCH ----------
const pub = await hit("watch.published", "GET", "/api/works/published");
function pubHitFind(j) {
  const text = JSON.stringify(j ?? {});
  return text.includes(PUBLISHED_WORK) && text.includes("科则");
}
ok("http.watch.published_lists_real_work", pub.status === 200 && pubHitFind(pub.json), `status=${pub.status}, contains work=${pubHitFind(pub.json)}`);
results.push(["GET /api/works/published (匿名)", pub.status, "公开只读已发布作品：含《松江府田赋》"]);

// ---------- studio projects ----------
const prjOwner = await hit("projects.owner", "GET", "/api/studio/projects", { cookie: ownerCookie });
const prjAnon = await hit("projects.anon", "GET", "/api/studio/projects");
const prjCross = await hit("projects.cross", "GET", "/api/studio/projects", { cookie: crossCookie });
const ownerHas = JSON.stringify(prjOwner.json ?? {}).includes(PROJECT);
ok("http.projects.owner_lists", prjOwner.status === 200 && ownerHas, `status=${prjOwner.status}`);
ok("http.projects.anon_401", prjAnon.status === 401, `status=${prjAnon.status}`);
ok("http.projects.cross_owner_empty", prjCross.status === 200 && !JSON.stringify(prjCross.json ?? {}).includes(PROJECT), `status=${prjCross.status}, cross-owner 不见本项目`);
results.push(["GET /api/studio/projects (Owner)", prjOwner.status, "列出《松江府田赋》项目"], ["GET /api/studio/projects (匿名)", prjAnon.status, "拒绝"], ["GET /api/studio/projects (跨Owner)", prjCross.status, "不见他人项目"]);

// ---------- studio assets (F05 browse) ----------
const asOwner = await hit("assets.owner", "GET", `/api/studio/assets?project_id=${PROJECT}`, { cookie: ownerCookie });
const asAnon = await hit("assets.anon", "GET", `/api/studio/assets?project_id=${PROJECT}`);
const asCross = await hit("assets.cross", "GET", `/api/studio/assets?project_id=${PROJECT}`, { cookie: crossCookie });
const assetCount = Array.isArray(asOwner.json?.assets) ? asOwner.json.assets.length : -1;
ok("http.assets.owner_5_rows", asOwner.status === 200 && assetCount === 5, `status=${asOwner.status}, assets=${assetCount}`);
ok("http.assets.anon_401", asAnon.status === 401, `status=${asAnon.status}`);
ok("http.assets.cross_owner_0", asCross.status === 200 && (asCross.json?.assets?.length ?? -1) === 0, `status=${asCross.status}`);
results.push(["GET /api/studio/assets (Owner)", asOwner.status, "5 条真实知识条目"], ["GET /api/studio/assets (匿名)", asAnon.status, "拒绝"], ["GET /api/studio/assets (跨Owner)", asCross.status, "0 行"]);

// ---------- dispatch authorization ----------
const daAnon = await hit("dispatch.anon", "POST", "/api/studio/dispatch-authorizations", { body: { project_id: PROJECT, idempotency_key: crypto.randomUUID(), actions: ["llm_director_h1"], budget_usd: 0.05 } });
ok("http.dispatch.anon_401", daAnon.status === 401, `status=${daAnon.status}`);
const daOwner = await hit("dispatch.owner", "POST", "/api/studio/dispatch-authorizations", { cookie: ownerCookie, body: { project_id: PROJECT, idempotency_key: crypto.randomUUID(), actions: ["llm_director_h1", "llm_director_h2"], budget_usd: 0.5, ttl_minutes: 30 } });
ok("http.dispatch.owner_granted", daOwner.status === 200 && daOwner.json?.ok === true && typeof daOwner.json?.delegation_id === "string",
  `status=${daOwner.status}, delegation=${daOwner.json?.delegation_id?.slice(0, 8)}, sources=${daOwner.json?.source_ids?.length}`);
results.push(["POST /api/studio/dispatch-authorizations (匿名)", daAnon.status, "拒绝"], ["POST /api/studio/dispatch-authorizations (Owner)", daOwner.status, `GRANTED 委托 ${daOwner.json?.delegation_id?.slice(0, 8)}…，预算 $0.5`]);

// ---------- director plans: negatives then one real positive through HTTP ----------
const dpNoDelegation = await hit("plans.no_delegation", "POST", "/api/studio/director-plans", { cookie: ownerCookie, body: { brief: "用松江府田赋史料做一集 3 分钟短片", project_id: PROJECT } });
ok("http.plans.no_delegation_409", dpNoDelegation.status === 409, `status=${dpNoDelegation.status}, reason=${dpNoDelegation.json?.reason ?? dpNoDelegation.json?.state}`);
const dpAnon = await hit("plans.anon", "POST", "/api/studio/director-plans", { body: { brief: "x", project_id: PROJECT } });
ok("http.plans.anon_401", dpAnon.status === 401, `status=${dpAnon.status}`);
results.push(["POST /api/studio/director-plans 无委托 (Owner)", dpNoDelegation.status, "维持 HOLD 绑定，不外发"], ["POST /api/studio/director-plans (匿名)", dpAnon.status, "拒绝"]);

let plansOk = false, planId = null, receiptNote = "";
if (daOwner.json?.delegation_id) {
  const dpReal = await hit("plans.real", "POST", "/api/studio/director-plans", { cookie: ownerCookie, body: { brief: "用松江府田赋史料做一集 3 分钟短片（HTTP 批次 K）", project_id: PROJECT, delegation_id: daOwner.json.delegation_id } });
  plansOk = dpReal.status === 200 && dpReal.json?.ok === true && typeof dpReal.json?.plan_id === "string";
  planId = dpReal.json?.plan_id;
  ok("http.plans.real_dispatch_200", plansOk, `status=${dpReal.status}, plan=${planId?.slice(0, 8)}, detail=${dpReal.json?.detail ?? dpReal.json?.reason}`);
  if (plansOk) {
    const p = Buffer.from(JSON.stringify({ uid: OWNER, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
    const dbToken = `${p}.${crypto.createHmac("sha256", process.env.MOHEN_DATABASE_SESSION_SECRET).update(p).digest("base64url")}`;
    const rows = await dataAccess.queryRows(
      "select jsonb_array_length(coalesce(source_ids,'[]'::jsonb))::text as n, (plan_a is not null and plan_b is not null) as ab from public.director_plans, (select set_config('mohen.session_token', :'token', false)) cfg where plan_id=:'pid'",
      { pid: planId, token: dbToken });
    ok("http.plans.persisted_with_sources", rows.length === 1 && (rows[0].ab === true || rows[0].ab === "t") && Number(rows[0].n) >= 1, `source_ids=${rows[0]?.n}, A/B=${rows[0]?.ab}`);
    const rc = await dataAccess.queryRows(
      "select acceptance_state, cost_confidence, cost::text as usd from studio.execution_receipts, (select set_config('mohen.session_token', :'token', false)) cfg where delegation_id=:'did' order by created_at desc limit 1",
      { did: daOwner.json.delegation_id, token: dbToken });
    receiptNote = rc.length ? `回执 ${rc[0].acceptance_state}/${rc[0].cost_confidence}/$${rc[0].usd}` : "无回执";
    ok("http.plans.real_receipt", rc.length >= 1 && rc[0].acceptance_state === "ACCEPT_AS_CANDIDATE", receiptNote);
    results.push(["POST /api/studio/director-plans 带委托 (Owner)", dpReal.status, `真实 DeepSeek 派发成功，${receiptNote}`]);
  }
}

console.log("\n--- HTTP evidence matrix ---");
for (const [route, status, note] of results) console.log(`${status} ${route} → ${note}`);
if (failures) { console.error(`\nVERIFY_5K_FAILED failures=${failures}`); process.exit(1); }
console.log("\nVERIFY_5K_ALL_PASS");
await dataAccess.getNodePgPool?.().end?.();
process.exit(0);
