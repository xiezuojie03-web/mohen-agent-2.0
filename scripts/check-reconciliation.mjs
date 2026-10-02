// scripts/check-reconciliation.mjs
// 目的：让「提交项目拥有者确认」（Architecture Reconciliation, C0 §6.2）有**统一且可核对**的形状。
//
// 为什么需要它：
//   C0/C1 定义了"什么必须提交"，但没规定提案长什么样。于是每个 AI 交上来的东西形状各异
//   （三个方案 / 十页分析 / 一句"建议走 Reconciliation"），拥有者无法横向比较，
//   也无法判断这是真需要他，还是 AI 在拿这个词当挡箭牌。
//
// 识别方式：**文件自带标记**（第 1 行 `提案类型：Architecture Reconciliation`）。
//   不维护清单、不靠文件名猜 —— 与 provider / 采集意图同样的思路：让声明自己说话，守卫直接核对。
//
// 检查项：
//   ① 头部四行齐备（标记 / 编号 / 日期 / 状态 / 涉及层级）
//   ② 状态 ∈ {待裁决, 已裁定}；已裁定必须补 `裁定结果` 行（避免"批了但没写结论"）
//   ③ 五项标题逐字齐备：改什么 / 为什么 / 影响谁 / 怎么回滚 / 请你回答什么
//   ④ 每项都必须有实质内容（标题之下至少一行非空且非占位）
//   ⑤ **第五项必须是可回答的具体问题** —— 至少含一个 `？` 或编号选项；"请确认"之类不合格
//      ★ 反挡箭牌条款：写不出具体问题 → 说明本可自主完成，不应提交
//   ⑥ 篇幅：提案正文应在一页内（> 120 行即报警告，> 200 行判红）
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../packages/data-access/src/index.mjs";

const MARKER = "提案类型：Architecture Reconciliation";
const HEADINGS = ["## 改什么", "## 为什么", "## 影响谁", "## 怎么回滚", "## 请你回答什么"];
const HEADER_FIELDS = ["提案编号", "日期", "状态", "涉及层级"];
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "archive", "data", "verification", "test-results", "legacy"]);
const PLACEHOLDER = /^(（.*）|\.{3}|…|—|-|待补|TBD)$/;

let failed = false;
const bad = (m) => { console.error("RECONCILIATION_ERROR " + m); failed = true; };
const warn = (m) => console.error("RECONCILIATION_WARN " + m);

// ---------- 收集提案文件（按内容标记，不靠文件名） ----------
const files = [];
function walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".md")) files.push(p);
  }
}
walk(PROJECT_ROOT);

// 识别方式：**提案必须在文件头部 12 行内自我声明**。
// 为什么限定头部：宪法 C0 §6.2 与模板示例里也含有这个标记字符串。
// 若只按"全文出现"匹配，契约文件本身会被误判为一份提案 —— 首版就是这么错的（三组反证全在报它）。
const proposals = [];
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  const head = t.split(/\r?\n/).slice(0, 12).join("\n");
  if (head.includes(MARKER)) proposals.push({ file: path.relative(PROJECT_ROOT, f), text: t });
}

// ---------- 逐份校验 ----------
let decided = 0;
let pending = 0;
for (const p of proposals) {
  const tag = p.file;
  const lines = p.text.split(/\r?\n/);

  for (const k of HEADER_FIELDS) {
    if (!new RegExp(`\\*\\*${k}\\*\\*`).test(p.text)) bad(`${tag}: 头部缺「${k}」`);
  }
  const st = (p.text.match(/\*\*状态\*\*[：:]\s*(\S+)/) || [])[1];
  if (!["待裁决", "已裁定"].includes(st)) bad(`${tag}: 状态必须是「待裁决」或「已裁定」，实际 "${st || "(无)"}"`);
  else if (st === "已裁定") {
    decided++;
    if (!/\*\*裁定结果\*\*/.test(p.text)) bad(`${tag}: 状态为已裁定，但缺「裁定结果」行 —— 避免批了但没写结论`);
  } else pending++;

  // 标题齐备 + 实质内容
  for (const h of HEADINGS) {
    const i = lines.findIndex((l) => l.trim() === h);
    if (i < 0) { bad(`${tag}: 缺标题「${h}」`); continue; }
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^##\s/.test(lines[j])) break;
      body.push(lines[j]);
    }
    const real = body.map((s) => s.trim()).filter((s) => s && !PLACEHOLDER.test(s) && !s.startsWith("```"));
    if (!real.length) bad(`${tag}: 「${h}」是空的（只有标题或占位符）`);
    if (h === HEADINGS[4]) {
      const askText = body.join("\n");
      // 反挡箭牌：必须有真正可回答的问题
      const hasQuestion = /[？?]/.test(askText) && !/^(请确认|请批准|请裁决)[。.！!]?$/.test(askText.trim());
      const hasOptions = /选项|A\s*[/／]\s*B|[（(]\s*[A-C]\s*[)）]|^\s*\d+[.、)]/m.test(askText);
      if (!hasQuestion) bad(`${tag}: 「请你回答什么」必须是**可回答的具体问题**（需含 ？）—— 写不出具体问题说明本可自主完成，不应提交`);
      else if (!hasOptions) warn(`${tag}: 「请你回答什么」建议给出可选项（A/B/C），便于拥有者一句话裁定`);

      // ---- 自足性检查（C0 §6.2）：2026-10-02 首个实例六个问题一个也答不上，故机器能拦的必须拦 ----
      // ① 每条编号问题下面必须紧接一行以 `→` 开头的"后果"
      for (let j = 0; j < body.length; j++) {
        if (!/^\s*\d+[.、)]/.test(body[j])) continue;
        let k = j + 1;
        while (k < body.length && !body[k].trim()) k++;
        if (!String(body[k] || "").trim().startsWith("→")) {
          bad(`${tag}: 问题「${body[j].trim().slice(0, 36)}…」下面缺一行以「→」开头的**后果**说明（C0 §6.2 自足性）`);
        }
      }
      // ② 问句提到「方案 X」→ **问句之前**必须有该方案的**定义块**（另起一行）
      //    三次迭代才做对，记录在此：
      //      首版在整篇文件里找 → 被问句自己满足；
      //      二版改成"问句之前"找 → 仍被正文里的**行内提及**（"我建议 **方案 A**"）满足。
      //    结论：**字符串匹配区分不了「定义」与「提及」**，故要求定义块**必须另起一行**（^**方案 X**）。
      //    局限（已知并接受）：守卫只能拦"没定义"与"只在问句里提"，**判断不了定义写得好不好**——最终靠人。
      const askIdx = lines.findIndex((l) => l.trim() === HEADINGS[4]);
      const beforeAsk = lines.slice(0, askIdx < 0 ? lines.length : askIdx).join("\n");
      for (const L of ["A", "B", "C"]) {
        if (!new RegExp(`方案\\s*${L}`).test(askText)) continue;
        if (!new RegExp(`^\\*\\*方案\\s*${L}\\*\\*`, "m").test(beforeAsk)) {
          bad(`${tag}: 问句提到「方案 ${L}」，但**问句之前**没有它的定义块（需另起一行写 \`**方案 ${L}**\`）—— 拥有者不该去别处找记录（C0 §6.2）`);
        }
      }
    }
  }

  const bodyLines = lines.filter((l) => l.trim() && !l.startsWith("```")).length;
  if (bodyLines > 200) bad(`${tag}: 提案 ${bodyLines} 行，超出"一页"太多（>200）—— 请裁剪为可裁决的一页`);
  else if (bodyLines > 120) warn(`${tag}: 提案 ${bodyLines} 行，偏长（建议 ≤120 行，一页可读完）`);
}

console.log(
  `RECONCILIATION proposals=${proposals.length} pending=${pending} decided=${decided} ` +
  `scanned=${files.length} (marker="${MARKER}")`
);
if (proposals.length) for (const p of proposals) console.log(`  · ${p.file}`);
process.exit(failed ? 1 : 0);
