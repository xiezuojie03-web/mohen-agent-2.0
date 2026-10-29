// scripts/test-publication-flow.mjs — 端到端验证作品出版线闭环（本地临时测试）
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

const title = "金泽水乡测试作品 " + Date.now().toString().slice(-5);

const c = await post("/api/works", { title, creator: "测试创作者" });
console.log("1 创建作品:", c.status, JSON.stringify(c.body));

const wid = c.body?.work_id;
const s = await post(`/api/works/${wid}/submit`, {});
console.log("2 提交审核:", s.status, JSON.stringify(s.body));

const anon = await get("/api/works/submitted");
console.log("3 未登录看待审(应403):", anon.status);

const login = await post("/api/auth/login", { username: "admin", password: "mohen-ops-2026" });
console.log("4 登录:", login.status, "cookie=", cookie ? "已设置" : "无");

const sub = await get("/api/works/submitted");
console.log("5 待审列表(应含作品):", sub.status, "count=", (sub.body?.works || []).length);

const pub = await post(`/api/works/${wid}/publish`, {});
console.log("6 发布:", pub.status, JSON.stringify(pub.body));

const pubList = await get("/api/works/published");
console.log("7 已发布列表:", pubList.status, "count=", (pubList.body?.works || []).length);
const found = (pubList.body?.works || []).find((w) => w.title === title);
console.log("8 是否找到刚发布的作品:", found ? "是 ✓ 闭环打通" : "否 ✗");
