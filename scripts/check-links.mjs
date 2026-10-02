// scripts/check-links.mjs
// 校验【活跃文档】里的相对链接 / 图片引用是否解析得到实体。
// 目的：杜绝「被引用的文件被移动或归档后，引用静默失效」这一类反复出现的问题
//       （实例：C4 PART IV 的 8 张原型图，自 2026-10-01 净化后长期断链，直到 10-02 审计才发现）。
//
// 范围（活跃）：根目录 `*.md`、`governance/*.md`、`specs/**/*.md`、`docs/**/*.md`、`decisions/*.md`、`skills/**/SKILL.md`
// 豁免（Trace）：路径含 `archive` 的目录、`tasks/`、`data/`、`verification/`、`test-results/`
//                —— 依 OWNERSHIP_MAP §1.2 第 5 条，归档件与历史记录正文不改写，允许保留失效路径。
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "archive", "tasks", "data", "verification", "test-results", "legacy"]);
const BASES = ["governance", "specs", "docs", "decisions", "skills"];

const files = [];
function walk(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".md")) files.push(p);
  }
}
for (const b of BASES) if (fs.existsSync(b)) walk(b);
for (const f of fs.readdirSync(".")) if (f.endsWith(".md")) files.push(f);

const LINK = /\]\(([^)]+)\)/g;
const isExternal = (t) => /^(https?:|mailto:|tel:|data:|#)/i.test(t);
let checked = 0;
const broken = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);
  for (const m of text.matchAll(LINK)) {
    let target = m[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    target = target.replace(/\s+["'].*$/, "");       // 只去掉 ](path "title") 里带引号的 title；路径本身可含空格
    if (!target || isExternal(target)) continue;
    let clean = target.split("#")[0];
    if (!clean) continue;
    try { clean = decodeURIComponent(clean); } catch { /* 保留原样 */ }
    checked++;
    const resolved = clean.startsWith("/")
      ? path.resolve(ROOT, "." + clean)
      : path.resolve(ROOT, dir, clean);
    if (!fs.existsSync(resolved)) broken.push(`${file} -> ${target}`);
  }
}

for (const b of broken) console.error("BROKEN_LINK " + b);
console.log(`LINKS files=${files.length} checked=${checked} broken=${broken.length} (exempt: archive/ tasks/ data/ legacy/)`);
process.exit(broken.length ? 1 : 0);
