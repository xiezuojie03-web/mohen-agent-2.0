// scripts/check-escalations.mjs
// 目的：让 CURRENT §9 的升级项**状态可见、计数不可过期、指针不悬空**，并让"冻结项"在机器层面显形。
//
// 背景（2026-10-02 拥有者两次反馈）：
//   ① 「我明确说了 1246 图片暂时不管，为什么还是老提呢？」—— 该冻结裁定只写在散文里，
//      而"待裁决"列表里仍并列着 ②③④，一读就像仍未决；且 §9 头部写「当前：4 项」实际有 5 项。
//   ② 「老在 CURRENT.md 里累积，职责不明了」—— 于是 §9 改为**只登记「状态 + 指针」**，
//      详情一律放任务结果文件（CURRENT §9 由 106 行降至 23 行）。
//   → 两条的根因相同：**只写在散文里的东西，没有任何东西在逼它保持一致。**
//
// 检查项：
//   ① §9 头部声明的「N 项」== 表格实际行数（防"4 项/5 项"这类陈旧计数）；
//   ② 每行状态取值在白名单内（待裁决 / 部分处置 / 部分冻结 / 已冻结 / 已处置）；
//   ③ **「详情」列里反引号包裹的路径必须真实存在**（防指针悬空 —— 归位后指针就是唯一入口）；
//   ④ 打印逐条状态表，**冻结项打 🔒 并附「不是待办」提示**，使开发平台每次运行都被机器提醒。
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../packages/data-access/src/index.mjs";

const FILE = "CURRENT.md";
const ALLOWED = ["待裁决", "部分处置", "部分冻结", "已冻结", "已处置"];

let failed = false;
const bad = (m) => { console.error("ESCALATIONS_ERROR " + m); failed = true; };

const p = path.join(PROJECT_ROOT, FILE);
if (!fs.existsSync(p)) { console.error(`ESCALATIONS_ERROR 找不到 ${FILE}`); process.exit(1); }
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);

const s9 = lines.findIndex((l) => /^##\s*9[.、]/.test(l.trim()));
if (s9 < 0) { console.error("ESCALATIONS_ERROR CURRENT.md 里找不到 §9（Architecture Escalations）"); process.exit(1); }
const s10 = lines.findIndex((l, i) => i > s9 && /^##\s*10[.、]/.test(l.trim()));
const body = lines.slice(s9, s10 < 0 ? lines.length : s10);

// 声明项数：取「当前：」那一行的**第一个**数字。
// 首版写成 find(l => l.includes("项（ESC-")) —— 而实际文本是 `**5 项**（ESC-01…`，
// `项` 与 `（` 之间隔着 `**`，永远匹配不到 → declared=NaN → **计数检查静默失效**。
// 由反证 1 抓出（输出呈现 declared=n/a 且不报错）。教训同前：检查必须验证它真的会触发。
const headLine = body.find((l) => l.trim().startsWith("当前：")) || "";
const declared = Number((headLine.match(/(\d+)\s*项/) || [])[1]);
if (!Number.isFinite(declared)) bad("§9 里找不到「当前：**N 项**（ESC-…）」这一行，无法校验计数");

const entries = [];
for (const l of body) {
  const m = l.match(/^\|\s*(ESC-\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*(.+?)\s*\|\s*$/);
  if (!m) continue;
  entries.push({ id: m[1], status: m[2].replace(/\*\*/g, "").replace(/[🔒`\s]/g, "").trim(), summary: m[3].trim(), ref: m[4].trim() });
}

if (!entries.length) bad("§9 表格里没有解析到任何 `| ESC-NN | 状态 | … |` 行");
if (Number.isFinite(declared) && declared !== entries.length) {
  bad(`§9 头部声明「${declared} 项」，表格实际 ${entries.length} 行 —— 计数已过期`);
}

for (const e of entries) {
  if (!ALLOWED.some((a) => e.status.startsWith(a))) {
    bad(`${e.id} 的状态「${e.status}」不在白名单内（${ALLOWED.join(" / ")}）`);
  }
  // ③ 「详情」列里的路径必须存在
  const refs = [...e.ref.matchAll(/`([^`]+)`/g)].map((x) => x[1]).filter((s) => s.includes("/"));
  if (!refs.length) bad(`${e.id} 的「详情」列没有给出可核对的路径（应为反引号包裹的文件路径）`);
  for (const r of refs) {
    if (!fs.existsSync(path.join(PROJECT_ROOT, r))) bad(`${e.id} 的「详情」指针指向不存在的文件：${r}`);
  }
}

const frozen = entries.filter((e) => e.status.startsWith("已冻结") || e.status.startsWith("部分冻结"));
console.log(`ESCALATIONS sections=${entries.length} declared=${Number.isFinite(declared) ? declared : "n/a"} frozen=${frozen.length}`);
for (const e of entries) {
  const mark = e.status.startsWith("已冻结") || e.status.startsWith("部分冻结") ? "🔒" : "  ";
  console.log(`  ${mark} ${e.id}  ${e.status.padEnd(12)}  ${e.summary}`);
}
console.log(`  🔒 = 已冻结：**不是待办**，不得主动重提、不得当论据、不得计入"未解决数量"。`);
process.exit(failed ? 1 : 0);
