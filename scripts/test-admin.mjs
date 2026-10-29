// scripts/test-admin.mjs — E1-4 Admin 闭环验证
const BASE = "http://localhost:3100";
let cookie = "";
async function post(url, body) {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function get(url) {
  const res = await fetch(BASE + url, { headers: cookie ? { cookie } : {} });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const login = await post("/api/auth/login", { username: "admin", password: "mohen-ops-2026" });
console.log("1 登录:", login.status);

const assets = await get("/api/admin/assets");
console.log("2 资产台账:", assets.status, "count=", (assets.body?.assets || []).length);

const metrics = await get("/api/admin/metrics");
console.log("3 指标:", metrics.status, JSON.stringify(metrics.body?.metrics));

const work = await post("/api/works", { title: "E1-4验证作品" + Date.now().toString().slice(-4), creator: "测试", content: { beats: [] } });
const wid = work.body?.work_id;
await post(`/api/works/${wid}/submit`, {});

const sub = await get("/api/admin/submissions");
console.log("4 审核队列:", sub.status, "count=", (sub.body?.submissions || []).length);

const dec = await post(`/api/admin/submissions/${wid}/decision`, { decision: "approve" });
console.log("5 审核通过(发布):", dec.status, JSON.stringify(dec.body));

const pub = await get("/api/admin/publications");
console.log("6 已发布列表:", pub.status, "count=", (pub.body?.publications || []).length);

const audits = await get("/api/admin/gates/audits");
console.log("7 门禁审计:", audits.status, "count=", (audits.body?.audits || []).length);
