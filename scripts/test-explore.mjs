// scripts/test-explore.mjs — E1-6 EXP 闭环验证
const BASE = "http://localhost:3100";
async function get(url) {
  const res = await fetch(BASE + url);
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function post(url, body) {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const s = await post("/api/explore/sessions", { intent: "探索金泽古桥" });
console.log("1 创建会话:", s.status, "session_id=", s.body?.session_id ? "有" : "无");
const sid = s.body?.session_id;

const g = await get(`/api/explore/sessions/${sid}`);
console.log("2 会话详情:", g.status, "intent=", g.body?.session?.intent);

const search = await get("/api/explore/search?q=" + encodeURIComponent("桥"));
console.log("3 检索:", search.status, "materials=", (search.body?.materials || []).length);

const spatial = await get("/api/explore/spatial");
console.log("4 空间投影:", spatial.status, "available=", spatial.body?.available, "entities=", (spatial.body?.entities || []).length);
