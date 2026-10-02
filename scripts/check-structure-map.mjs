// scripts/check-structure-map.mjs
// 三条不变量（目的：让"结构 SOT"不会与实际仓库漂移）：
//   ① 仓库根目录的每个实际条目，都必须出现在 OWNERSHIP_MAP.md §0 的目录树里（顶层覆盖）；
//   ② 树里按缩进推出的**完整路径**都必须真实存在（含嵌套，能抓出"目录已退役但树没删"）；
//   ③ AGENTS.md §1 里列出的每条路径都必须真实存在。
//
// 为什么需要 ③：2026-10-02 审计实测「唯一路由源」本身有过断链——
//   · AGENTS.md §1 指向 `specs/experience-ui/source/MoHen_Narrative_Motif_Framework_V1.3.md`（不存在）
//   · C4 正文引用 8 张 canonical 原型图（全部不存在，后从 docx 还原）
// 靠人记必然复发，因此把"路由源与结构树里的路径"纳入机器校验。
//
// 树行格式约定（与 OWNERSHIP_MAP.md §0 的说明一致）：
//   `<树形前缀><├|└>── <名字们>   <职责与禁止说明>`
//   · 缩进每级 4 字符（`│   ` / `    `），由缩进推出层级并拼出完整路径；
//   · 名字段以**两个以上空格**与说明分隔；同一行可写多个同级名字（以单空格分隔）；
//   · 含 `…` 或 `*` 的写法视为描述性占位，跳过存在性校验（宽松）；
//     权威路径清单在 AGENTS.md §1（严格，逐条校验）。
import fs from "node:fs";
import path from "node:path";

const MAP = "OWNERSHIP_MAP.md";
const ROUTER = "AGENTS.md";
const IGNORE = new Set(["node_modules", ".git"]);

let failed = false;

// ---------- 解析目录树：按缩进还原层级，得到完整路径 ----------
function parseTree(text) {
  const stack = [];   // stack[depth-1] = 该层当前父名
  const items = [];   // { depth, name, full, descriptive }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([\s│]*)([├└])──\s+(.+)$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 4) + 1;
    const rest = m[3];
    const gap = rest.search(/\s{2,}/);
    const namesPart = (gap === -1 ? rest : rest.slice(0, gap)).trim();
    if (!namesPart) continue;
    stack.length = depth - 1;
    const toks = namesPart.split(/\s+/).map((t) => t.replace(/\/+$/, "")).filter(Boolean);
    const parent = stack.filter(Boolean).join("/");
    for (const name of toks) {
      items.push({
        depth,
        name,
        full: parent ? parent + "/" + name : name,
        descriptive: name.includes("…") || name.includes("*"),
      });
    }
    if (toks.length) stack[depth - 1] = toks[0]; // 首个 token 作为后续子项的父
  }
  return items;
}

if (!fs.existsSync(MAP)) { console.error(`MISSING ${MAP}`); process.exit(1); }
const mapText = fs.readFileSync(MAP, "utf8");
const items = parseTree(mapText);
if (!items.length) { console.error(`NO_TREE_PARSED: ${MAP} §0 未解析到任何树行`); process.exit(1); }

const actualRoot = fs
  .readdirSync(".", { withFileTypes: true })
  .map((d) => d.name)
  .filter((n) => !IGNORE.has(n))
  .sort();

// ---------- ① 顶层覆盖 ----------
// 顶层项可能写作 `apps/web` / `supabase/migrations` / `tools/night` —— 取第一段作为顶层名
const declaredTop = new Set(items.filter((i) => i.depth === 1).map((i) => i.full.split("/")[0]));
const undeclared = actualRoot.filter((n) => !declaredTop.has(n));
if (undeclared.length) {
  console.error("UNDECLARED_ROOT_ENTRIES: " + undeclared.join(", "));
  console.error("  → 请在 OWNERSHIP_MAP.md §0 的目录树里声明它的职责与禁止事项（新增顶层条目必须先登记）。");
  failed = true;
}

// ---------- ② 树中完整路径存在性 ----------
const checked = items.filter((i) => !i.descriptive);
const treeMissing = checked.filter((i) => !fs.existsSync(path.resolve(process.cwd(), i.full)));
if (treeMissing.length) {
  console.error("TREE_PATHS_NOT_FOUND (declared in " + MAP + " §0 but missing on disk):");
  for (const i of treeMissing) console.error(`  line-depth ${i.depth}: ${i.full}`);
  console.error("  → 目录/文件已退役、改名或移动时，必须同步更新树里的这一行。");
  failed = true;
}

// ---------- ③ 路由源路径存在性 ----------
if (!fs.existsSync(ROUTER)) { console.error(`MISSING ${ROUTER}`); process.exit(1); }
const routerText = fs.readFileSync(ROUTER, "utf8");
const tokens = [...routerText.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const isPathLike = (t) =>
  !t.includes(":") &&
  !t.startsWith("#") &&
  !/^https?:/i.test(t) &&
  !/^\.[a-z0-9]+$/i.test(t) &&
  (/\.(md|html|png|jpe?g|json|mjs|ts|tsx|sql|docx|pptx)$/i.test(t) || t.endsWith("/"));
const candidates = [...new Set(tokens.filter(isPathLike))];
const brokenRouter = candidates.filter((t) => !fs.existsSync(path.resolve(process.cwd(), t.replace(/\/$/, ""))));
if (brokenRouter.length) {
  console.error("BROKEN_ROUTER_PATHS (in " + ROUTER + " §1):");
  for (const b of brokenRouter) console.error("  " + b);
  failed = true;
}

console.log(
  `STRUCTURE_MAP root_entries=${actualRoot.length} undeclared=${undeclared.length} ` +
  `tree_items=${items.length} tree_checked=${checked.length} tree_missing=${treeMissing.length} ` +
  `router_paths=${candidates.length} router_broken=${brokenRouter.length}`
);
process.exit(failed ? 1 : 0);
