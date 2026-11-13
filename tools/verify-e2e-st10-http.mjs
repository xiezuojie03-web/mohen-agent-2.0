// M5 出口端到端：同一真实作品（WorkRevision 精确修订）在 WATCH 目录、Admin 运营视角、
// WATCH 观看进度三条 HTTP 路径上读到的必须是同一个 work_id/revision_id。
// 用真实 HMAC 会话 cookie、真实库、真实 dev server；不含任何 mock 或伪造数据。
const BASE = "http://127.0.0.1:3210";
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const WORK = "32217c75-5e4b-f86c-4c65-10af6366e12b";
const REV = "6caec62b-1d7a-dc88-7a1d-e6ed527e40cf";     // 当前公开修订（rev2）
const REV_SUPERSEDED = "f09c8431-6526-c5ab-099b-5b8ca760e8e4"; // rev1，已撤回、不得再被消费
import crypto from "node:crypto";

await import("../packages/data-access/src/index.mjs"); // 加载 .env.local
const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 32) { console.error("AUTH_SECRET missing"); process.exit(1); }
function mintCookie(uid, roles) {
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({ uid, r: roles, iat: now, jti: crypto.randomUUID(), exp: now + 3600_000 })).toString("base64url");
  return `mohen_role=${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
const ownerCookie = mintCookie(OWNER, ["member", "creator"]);
const operatorCookie = mintCookie(OWNER, ["member", "creator", "operator"]);

let failures = 0;
const evidence = [];
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
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
  evidence.push({ name, pass: cond, detail });
};

const deadline = Date.now() + 180_000;
for (;;) {
  try { const r = await fetch(BASE + "/api/works/published"); if (r.status) break; } catch { /* not ready */ }
  if (Date.now() > deadline) { console.error("server not ready in 180s"); process.exit(1); }
  await new Promise(r => setTimeout(r, 2000));
}
console.log("server ready\n");

function findExact(list, pick = (x) => x) {
  return (list || []).map(pick).find(w => w.work_id === WORK && w.revision_id === REV) || null;
}

// ---------- ① WATCH 目录（匿名、公开） ----------
const published = await hit("watch.published", "GET", "/api/works/published");
const watched = findExact(published.json?.works);
ok("watch.catalog_same_revision", published.status === 200 && !!watched,
  `status=${published.status}, work/revision 命中=${!!watched}`);

// ---------- ② Admin 运营视角 ----------
const adminAnon = await hit("admin.publications.anon", "GET", "/api/admin/publications");
ok("admin.forbidden_without_operator", adminAnon.status === 403 || adminAnon.status === 401, `status=${adminAnon.status}`);
const admin = await hit("admin.publications", "GET", "/api/admin/publications", { cookie: operatorCookie });
const adminRow = findExact(admin.json?.publications);
ok("admin.same_revision", admin.status === 200 && !!adminRow,
  `status=${admin.status}, work/revision 命中=${!!adminRow}`);

// ---------- ③ 负向：已撤回的 rev1 不得再出现在公开目录 ----------
const staleInCatalog = (published.json?.works || []).some(w => w.work_id === WORK && w.revision_id === REV_SUPERSEDED);
ok("watch.catalog_excludes_withdrawn_revision", staleInCatalog === false, `rev1 出现=${staleInCatalog}`);

// 观看进度（/api/watch/sessions）本环境不可评估：它依赖的 KAD1 迁移
// `202611020900_kad1_watch_revision_isolation.sql` 首行标注 "NOT APPLIED"，本地
// public.watch_sessions 仍只有 (work_id, playhead, updated_at)，路由必然 500。
// 这属 KAD1 采集代启用事项，本批不擅自启用，如实记为缺口而非"通过"。
// ---------- ⑤ 页面入口可打开（Owner 体验入口不自闭） ----------
for (const [name, p] of [["watch.page", "/watch"], ["studio.page", "/studio"]]) {
  const r = await hit(name, "GET", p);
  ok(name, r.status === 200, `status=${r.status}`);
}

// ---------- ⑥ 双面一致性汇总 ----------
const sameRevision = !!watched && !!adminRow
  && watched.work_id === adminRow.work_id && watched.revision_id === adminRow.revision_id
  && watched.revision_id === REV;
ok("e2e.two_surfaces_one_revision", sameRevision,
  `watch=${watched?.revision_id?.slice(0, 8)} admin=${adminRow?.revision_id?.slice(0, 8)} expected=${REV.slice(0, 8)}`);

console.log("\n未评估（不计入通过）：/api/watch/sessions 观看进度 —— KAD1 观看隔离迁移未启用");

console.log(`\n${failures === 0 ? "✅ E2E PASS" : `❌ E2E FAIL (${failures})`} —— ${evidence.filter(e => e.pass).length}/${evidence.length}`);
process.exit(failures === 0 ? 0 : 1);
