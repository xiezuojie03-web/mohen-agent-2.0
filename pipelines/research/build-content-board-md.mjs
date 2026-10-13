// pipelines/research/build-content-board-md.mjs — 把 content-board-data.json 转成可读 Markdown 看板
import fs from "node:fs";
import path from "node:path";
const DIR = "tasks/results/CONTENT-BOARD-20261005";
const d = JSON.parse(fs.readFileSync(path.join(DIR, "content-board-data.json"), "utf8"));
const esc = (s) => String(s || "").replace(/\n+/g, " ").trim();
const L = [];
L.push(`# 墨痕 · 读懂内容看板（Markdown 版）`);
L.push(`> 生成 ${d.generated} ｜ 离线 D01+D02+D03，零 Truth 写入 ｜ 共 ${d.summary.sources} 可读源 / ${d.summary.obs} 原文片段 / ${d.summary.mentions} 提及 ｜ 缺陷源 ${d.summary.defective}`);
L.push("");
L.push(`**怎么读这份看板**：每个来源 = 原始资料是什么（文件名+载体）→ AI 读出的原文（引用块）→ 发现的人物/地点（标签）。底部有"跨源叙事线索"帮你判断要不要做 D04 关联。`);
L.push("");
for (const cat of d.categories) {
  L.push(`## ${cat.name}（${cat.carriers.length} 源）`);
  L.push("");
  for (const s of cat.carriers) {
    const tag = s.readability === "defective" ? "⚠缺陷·未读" : (s.note.includes("OCR") ? "OCR·已读" : "已读");
    L.push(`### ${s.source}  〔${s.label}·${tag}·片段${s.n_obs}〕`);
    if (s.readability === "defective") { L.push(`> ${esc(s.note)}（库内缺失/损坏，仅登记缺口，建议补采）`); L.push(""); continue; }
    const ex = s.excerpts.slice(0, 5);
    if (ex.length) { for (const e of ex) L.push(`> ${esc(e).slice(0, 220)}`); if (s.n_excerpt > ex.length) L.push(`> _…（该源共展示 ${ex.length}/${s.n_excerpt} 条，全文见 HTML 看板）_`); }
    const chips = [];
    if (s.persons.length) chips.push("**人物**：" + s.persons.slice(0, 10).join("、"));
    if (s.places.length) chips.push("**地点**：" + s.places.slice(0, 12).join("、"));
    if (s.works.length) chips.push("**作品**：" + s.works.slice(0, 8).join("、"));
    if (s.orgs.length) chips.push("**机构**：" + s.orgs.slice(0, 8).join("、"));
    if (s.placeU || s.personU) chips.push(`（另有未解析候选：地名${s.placeU}/人物${s.personU}）`);
    if (chips.length) L.push("");
    for (const c of chips) L.push(c);
    L.push("");
  }
}
L.push(`## 跨源叙事线索（D04 预览：同一地名出现在多个来源 = 可交叉印证）`);
L.push("");
for (const t of d.story_threads) L.push(`- **${t.place}**（${t.sources.length} 源）：${t.sources.slice(0, 6).join("、")}${t.sources.length > 6 ? " …" : ""}`);
L.push("");
L.push(`---`);
L.push(`实体写入=0 ｜ 关系写入=0 ｜ 候选写入=0 ｜ Truth Promotion=0 ｜ 全部研究态读取，未落地事实层。`);
const out = L.join("\n");
fs.writeFileSync(path.join(DIR, "content-board.md"), out, "utf8");
console.log(`MD ${path.join(DIR, "content-board.md")}  bytes=${out.length}  lines=${L.length}`);
