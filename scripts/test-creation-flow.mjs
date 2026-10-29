// scripts/test-creation-flow.mjs — 端到端验证创作闭环：生成方案→章节→提交→发布→观看（含内容）
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

// 1. 生成 A/B 方案
const create = await post("/api/studio/create", { brief: "做一部关于金泽古桥与寺院的作品" });
console.log("1 生成方案:", create.status, "planA角=", create.body?.planA?.angle?.slice(0, 20) + "…", "facts=", (create.body?.facts || []).length);

// 2. 生成章节
const direct = await post("/api/studio/direct", { plan: create.body?.planA, facts: create.body?.facts });
console.log("2 生成章节:", direct.status, "beats=", (direct.body?.beats || []).length);

// 3. 创建作品（带 content）
const title = "创作闭环测试作品 " + Date.now().toString().slice(-4);
const content = { brief: "做一部关于金泽古桥与寺院的作品", plan: create.body?.planA, beats: direct.body?.beats ?? [] };
const work = await post("/api/works", { title, creator: "测试", content });
console.log("3 创建作品:", work.status, "work_id=", work.body?.work_id ? "有" : "无");

// 4. 提交审核
const wid = work.body?.work_id;
const submit = await post(`/api/works/${wid}/submit`, {});
console.log("4 提交审核:", submit.status);

// 5. 登录 + 发布
await post("/api/auth/login", { username: "admin", password: "mohen-ops-2026" });
const pub = await post(`/api/works/${wid}/publish`, {});
console.log("5 发布:", pub.status, JSON.stringify(pub.body));

// 6. 读已发布，确认 content 有 beats
const list = await get("/api/works/published");
const found = (list.body?.works || []).find((w) => w.title === title);
const beatsInContent = (() => {
  try { return (JSON.parse(found?.content || "{}").beats || []).length; } catch { return 0; }
})();
console.log("6 已发布作品 content.beats 数量:", beatsInContent);
console.log(beatsInContent > 0 ? "✓ 创作闭环打通：作品内容（章节）已贯通到观看端" : "✗ 内容未贯通");
