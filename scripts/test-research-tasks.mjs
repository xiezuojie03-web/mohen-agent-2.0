// scripts/test-research-tasks.mjs — E1-2 研究任务闭环验证
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

const c = await post("/api/studio/research-tasks", { prompt: "万安桥和普济桥是什么关系？", topic: "jinze" });
console.log("1 创建研究任务:", c.status, "task_id=", c.body?.task_id ? "有" : "无");
const tid = c.body?.task_id;

const s = await get(`/api/studio/research-tasks/${tid}/status`);
console.log(
  "2 状态:", s.status,
  "status=", s.body?.task?.status,
  "verdict=", s.body?.task?.checkpoint?.decision?.verdict
);

const e = await get(`/api/studio/research-tasks/${tid}/events`);
console.log("3 事件:", e.status, "count=", (e.body?.events || []).length,
  "events=", (e.body?.events || []).map((x) => x.event).join(","));

const st = await get(`/api/studio/research-tasks/${tid}/stages/D04`);
console.log("4 阶段D04事件:", st.status, "count=", (st.body?.events || []).length);

const m = await post(`/api/studio/research-tasks/${tid}/messages`, { message: "为什么叫姐妹桥？" });
console.log("5 追加消息:", m.status);

const r = await post(`/api/studio/research-tasks/${tid}/resume`, {});
console.log("6 恢复:", r.status);

const e2 = await get(`/api/studio/research-tasks/${tid}/events`);
console.log("7 事件总数(追加+恢复后):", (e2.body?.events || []).length);
