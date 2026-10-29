// scripts/test-director-plans.mjs — E1-3 导演方案闭环验证
const BASE = "http://localhost:3100";
async function post(url, body) {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function get(url) {
  const res = await fetch(BASE + url);
  return { status: res.status, body: await res.json().catch(() => null) };
}

const c = await post("/api/studio/director-plans", { brief: "做一部关于金泽古桥与寺院的作品", topic: "jinze" });
console.log("1 生成方案:", c.status, "plan_id=", c.body?.plan_id ? "有" : "无",
  "planA.angle=", c.body?.planA?.angle?.slice(0, 18) + "…");
const pid = c.body?.plan_id;

const g = await get(`/api/studio/director-plans/${pid}`);
console.log("2 方案详情:", g.status, "brief=", g.body?.plan?.brief);

const s = await post(`/api/studio/director-plans/${pid}/select`, { which: "A" });
console.log("3 选定方案A生成章节:", s.status, "beats=", (s.body?.beats || []).length);

const g2 = await get(`/api/studio/director-plans/${pid}`);
console.log("4 选定后详情 selected=", g2.body?.plan?.selected, "beats=", (JSON.parse(g2.body?.plan?.beats || "[]")).length);
