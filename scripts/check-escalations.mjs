// scripts/check-escalations.mjs
// 目的：让 CURRENT §9 的升级项**状态可见、计数不可过期**，并让"冻结项"在机器层面显形。
//
// 为什么需要它（2026-10-02 拥有者反馈）：
//   拥有者已明确裁定「1246 张图片暂不处置、但保留」，开发平台却仍在后续盘点与论证里反复引用它们，
//   拥有者指出：「我明确说了 1246 图片暂时不管，为什么还是老提呢？」
//   根因有两条：
//     ① 该裁定只写在**散文字段**里，而"待裁决"列表里仍并列着 ②③④ —— 一读就像仍未决；
//     ② §9 头部写「当前：**4 项**待裁决」，实际有 **5 项**（陈旧计数，无人校验）。
//   → 结论与今天其余各处相同：**只写在散文里的东西，没有任何东西在逼它保持一致。**
//
// 检查项：
//   ① 每个 `### ESC-NN｜` 章节必须带 `> **状态**：…`，且状态取值在白名单内；
//   ② §9 头部声明的**升级项总数**必须等于实际章节数（防"4 项/5 项"这类陈旧计数）；
//   ③ 打印逐条状态表（待裁决 / 部分处置 / 部分冻结 / 已冻结 / 已处置）——
//      **冻结项因此每次运行都会被显式标出**，开发平台无法"忘记"它已被冻结。
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../packages/data-access/src/index.mjs";

const FILE = "CURRENT.md";
const ALLOWED = ["待裁决", "部分处置", "部分冻结", "已冻结", "已处置"];

let failed = false;
const bad = (m) => { console.error("ESCALATIONS_ERROR " + m); failed = true; };

const p = path.join(PROJECT_ROOT, FILE);
if (!fs.existsSync(p)) { console.error(`ESCALATIONS_ERROR 找不到 ${FILE}`); process.exit(1); }
const text = fs.readFileSync(p, "utf8");
const lines = text.split(/\r?\n/);

// ── 抽出 §9 区段 ──────────────────────────────────────────────────────────
const s9 = lines.findIndex((l) => /^##\s*9[.、]/.test(l.trim()));
if (s9 < 0) { bad("CURRENT.md 里找不到 §9（Architecture Escalations）章节"); }
const s10 = lines.findIndex((l, i) => i > s9 && /^##\s*10[.、]/.test(l.trim()));
const body = lines.slice(s9, s10 < 0 ? lines.length : s10);

// 头部声明的总数
const head = body.find((l) => l.includes("项升级")) || body[1] || "";
const declared = Number((head.match(/(\d+)\s*项升级/) || [])[1]);

// ── 逐条检查 ──────────────────────────────────────────────────────────────
const entries = [];
for (let i = 0; i < body.length; i++) {
  const m = body[i].match(/^###\s*(ESC-\d+)｜(.+)$/);
  if (!m) continue;
  const id = m[1];
  const title = m[2].replace(/`/g, "").trim();
  // 状态行须出现在本章节内、下一个 ### 之前
  let status = null;
  for (let j = i + 1; j < body.length; j++) {
    if (/^###\s/.test(body[j])) break;
    const sm = body[j].match(/^>\s*\*\*状态\*\*[：:]\s*(\S+)/);
    if (sm) { status = sm[1]; break; }
  }
  if (!status) bad(`${id} 缺少状态行（应为 \`> **状态**：待裁决 / 部分处置 / 部分冻结 / 已冻结 / 已处置\`）`);
  else if (!ALLOWED.some((a) => status.startsWith(a))) {
    bad(`${id} 的状态「${status}」不在白名单内（${ALLOWED.join(" / ")}）`);
  }
  entries.push({ id, title: title.slice(0, 34), status: status || "(缺失)" });
}

if (!entries.length) bad("§9 下没有解析到任何 `### ESC-NN｜` 章节");
if (Number.isFinite(declared) && declared !== entries.length) {
  bad(`§9 头部声明「${declared} 项升级」，实际解析到 ${entries.length} 个 ESC 章节 —— 计数已过期`);
}

// ── 输出（冻结项必须每次都被看见）─────────────────────────────────────────
const frozen = entries.filter((e) => e.status.startsWith("已冻结") || e.status.startsWith("部分冻结"));
const pending = entries.filter((e) => e.status.startsWith("待裁决") || e.status.startsWith("部分处置"));
console.log(`ESCALATIONS sections=${entries.length} declared=${Number.isFinite(declared) ? declared : "n/a"} pending=${pending.length} frozen=${frozen.length}`);
for (const e of entries) {
  const mark = e.status.startsWith("已冻结") || e.status.startsWith("部分冻结") ? "🔒" : "  ";
  console.log(`  ${mark} ${e.id}  ${e.status.padEnd(10)}  ${e.title}`);
}
if (frozen.length) {
  console.log(`  🔒 = 已冻结：**不是待办**，不得主动重提、不得当论据、不得计入"未解决数量"。`);
}
process.exit(failed ? 1 : 0);
