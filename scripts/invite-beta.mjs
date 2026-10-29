// 10 位邀请用户的自动化冒烟（非真人 beta）：注册→登录→首页/搜索/作品/空间/建会话/资料台。
// 用法：node scripts/invite-beta.mjs [baseUrl] [inviteCode] [count]
import fs from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3100";
const INVITE = process.argv[3] || "mohen-dev-invite-2026";
const COUNT = Number(process.argv[4] || 10);

async function req(path, { method = "GET", body, cookie } = {}) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  const sc = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, json, text: text.slice(0, 120), cookie: sc.map((c) => c.split(";")[0]).join("; ") };
}

const ts = Date.now();
const users = [];
for (let i = 0; i < COUNT; i++) {
  const email = `beta_${ts}_${i}@test.local`;
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: { email, username: `beta${i}`, password: "test123456", invite_code: INVITE },
  });
  if (reg.status !== 200) { users.push({ email, register: reg.status, reason: reg.json?.reason }); continue; }
  const c = reg.cookie;
  const home = await req("/", { cookie: c });
  const search = await req("/api/search?q=%E9%87%91%E6%B3%BD", { cookie: c });
  const works = await req("/api/works/published", { cookie: c });
  const spatial = await req("/api/explore/spatial", { cookie: c });
  const session = await req("/api/explore/sessions", { method: "POST", cookie: c, body: { intent: "第一次探索" } });
  const desk = await req("/studio/desk", { cookie: c });
  users.push({
    email,
    register: reg.status,
    home: home.status,
    search: search.status,
    works: works.status,
    spatial: spatial.status,
    session: session.status,
    desk: desk.status,
  });
}

const ok = users.filter((u) => u.register === 200 && u.home === 200 && u.search === 200 && u.works === 200 && u.spatial === 200 && u.session === 200 && u.desk === 200);
const out = {
  generated_at: new Date().toISOString(),
  base: BASE,
  count: COUNT,
  ok: ok.length,
  note: "自动化邀请用户冒烟，用于权限/多用户回归；不代表真人可用性测试。",
  users,
};
fs.mkdirSync("tasks/results", { recursive: true });
fs.writeFileSync("tasks/results/P1_beta10_20261029.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify({ count: COUNT, ok: ok.length, out: "tasks/results/P1_beta10_20261029.json" }, null, 2));
