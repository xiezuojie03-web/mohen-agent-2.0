// scripts/test-watch.mjs — E1-5 WATCH 闭环验证
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

const list = await get("/api/public/works");
console.log("1 作品目录:", list.status, "count=", (list.body?.works || []).length);
const wid = list.body?.works?.[0]?.work_id;

if (wid) {
  const detail = await get(`/api/public/works/${wid}`);
  console.log("2 作品详情:", detail.status, "title=", detail.body?.work?.title);

  const prog = await get(`/api/public/works/${wid}/program`);
  console.log("3 节目单:", prog.status, "content=", prog.body?.program?.slice(0, 30));

  const elig = await get(`/api/public/works/${wid}/eligibility`);
  console.log("4 资格:", elig.status, JSON.stringify(elig.body));

  const sess = await post("/api/watch/sessions", { work_id: wid, playhead: 42 });
  console.log("5 存观看进度:", sess.status);

  const resume = await get(`/api/watch/sessions?work_id=${wid}`);
  console.log("6 恢复进度:", resume.status, "playhead=", resume.body?.playhead);
} else {
  console.log("（无已发布作品，跳过详情/节目单/进度验证）");
}
