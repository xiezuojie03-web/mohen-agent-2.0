// scripts/check-structure-map.mjs
// 两条不变量（目的：让"结构 SOT"不会与实际仓库漂移）：
//   ① 仓库根目录的每个条目，都必须在 OWNERSHIP_MAP.md §0 中被声明；
//   ② AGENTS.md §1 里列出的每条路径都必须真实存在。
//
// 为什么需要 ②：2026-10-02 审计实测到「唯一路由源」本身有过两类断链——
//   · AGENTS.md §1 指向 `specs/experience-ui/source/MoHen_Narrative_Motif_Framework_V1.3.md`（不存在，实为 docs/…md）
//   · C4 正文引用 8 张 canonical 原型图（全部不存在，后从 docx 还原）
// 靠人记必然复发，因此把"路由源里的路径"纳入机器校验。
import fs from "node:fs";
import path from "node:path";

const MAP = "OWNERSHIP_MAP.md";
const ROUTER = "AGENTS.md";
// 只忽略这两项：其余根目录条目（含配置、.env*、构建残留）都必须被显式声明，
// 否则"新增顶层东西"可以静默发生——那正是过去混乱的来源。
const IGNORE = new Set(["node_modules", ".git"]);

let failed = false;

// ---- ① 根目录条目覆盖 ----
if (!fs.existsSync(MAP)) { console.error(`MISSING ${MAP}`); process.exit(1); }
const mapText = fs.readFileSync(MAP, "utf8");
const entries = fs
  .readdirSync(".", { withFileTypes: true })
  .map((d) => d.name)
  .filter((n) => !IGNORE.has(n))
  .sort();
const undeclared = entries.filter((n) => !mapText.includes("`" + n));
if (undeclared.length) {
  console.error("UNDECLARED_ROOT_ENTRIES: " + undeclared.join(", "));
  console.error("  → 请在 OWNERSHIP_MAP.md §0 声明其职责与禁止事项（新增顶层目录/文件必须先登记）。");
  failed = true;
}

// ---- ② 路由源路径存在性 ----
if (!fs.existsSync(ROUTER)) { console.error(`MISSING ${ROUTER}`); process.exit(1); }
const routerText = fs.readFileSync(ROUTER, "utf8");
const tokens = [...routerText.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const isPathLike = (t) =>
  !t.includes(":") &&
  !t.startsWith("#") &&
  !/^https?:/i.test(t) &&
  !/^\.[a-z0-9]+$/i.test(t) && // 排除裸扩展名（如 `.docx`）——它是说明文字，不是路径
  (/\.(md|html|png|jpe?g|json|mjs|ts|tsx|sql|docx|pptx)$/i.test(t) || t.endsWith("/"));
const candidates = [...new Set(tokens.filter(isPathLike))];
const brokenPaths = [];
for (const t of candidates) {
  const clean = t.replace(/\/$/, "");
  if (!clean) continue;
  if (!fs.existsSync(path.resolve(process.cwd(), clean))) brokenPaths.push(t);
}
if (brokenPaths.length) {
  console.error("BROKEN_ROUTER_PATHS (in " + ROUTER + "):");
  for (const b of brokenPaths) console.error("  " + b);
  failed = true;
}

console.log(
  `STRUCTURE_MAP root_entries=${entries.length} undeclared=${undeclared.length} ` +
  `router_paths=${candidates.length} broken=${brokenPaths.length}`
);
process.exit(failed ? 1 : 0);
