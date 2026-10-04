// TASK-0011 S1-A4：实体链接解析（Shanghai Library Knowledge Alignment pilot 底层数据）。
//
// 教训（本轮踩到）：**不要猜 URI 命名空间**。上图至少并存两套 place 命名空间
//   · `…/dmz/entity/place/<id>`    —— 地名库（geonames）的**主语**
//   · `…/entity/place/<id>`        —— 被 `place` 谓词指向的**上位地点实体**
// 猜错会得到「全 0」，而「全 0」会被误读成「上图没有这个实体」——正是任务书禁止的假阴性。
// 因此本脚本改为**按名称在指定图内发现主语**，再展开全部属性；解析 place 时**同时试两套命名空间**并如实记录哪套命中。
//
// 纪律：全串行；保留每条原始行；不臆测同名实体同一性。
import { makeRunDir, saveRaw, nowIso } from "./shl-client.mjs";
// 2026-10-04（Skill 治理 R26）：查询 helper 与 subject dump 改为复用唯一权威实现 `shl-probe.mjs`。
import { sparql, subjectRows } from "./shl-probe.mjs";

const RUN = process.env.T11_RUN_DIR
  ? { dir: process.env.T11_RUN_DIR, runId: process.env.T11_RUN_DIR.split("/").pop() }
  : makeRunDir("t11-shl");

const out = { run_at: nowIso(), name_discovery: [], subject_dumps: [], place_resolution: [] };

// ---- 1. 按名称发现主语（图 + 名称） ----
const TARGETS = [
  { id: "puji-jinze", g: "http://red.library.sh.cn/graph/building", kw: "普济桥", expect_place: "金泽" },
  { id: "wanan-jinze", g: "http://red.library.sh.cn/graph/building", kw: "万安桥", expect_place: "金泽" },
  { id: "yihao-site", g: "http://red.library.sh.cn/graph/building", kw: "颐浩寺遗址", expect_place: "金泽" },
  { id: "yingxiang", g: "http://red.library.sh.cn/graph/building", kw: "迎祥桥", expect_place: "金泽" },
  { id: "jinze-place-red", g: "http://red.library.sh.cn/graph/building", kw: "金泽镇", expect_place: "" },
  { id: "lvyihao-gen", g: "http://gen.library.sh.cn/graph/person", kw: "吕颐浩", expect_place: "" },
  { id: "jinze-yutu", g: "http://yutu.library.sh.cn/graph/work", kw: "金泽", expect_place: "" },
];

for (const t of TARGETS) {
  const q = `SELECT DISTINCT ?s WHERE { GRAPH <${t.g}> { ?s ?p ?o . FILTER(isLiteral(?o) && (CONTAINS(STR(?o),"${t.kw}") || CONTAINS(STR(?o),"${t.kw}")) ) } } LIMIT 40`;
  const { ok, status, rows } = await sparql(q);
  const subs = (rows || []).map((r) => r.s);
  out.name_discovery.push({ ...t, status, ok, n: subs.length, subjects: subs });
  process.stdout.write(`\n### ${t.id}  graph=${t.g}  kw=${t.kw}  n=${subs.length}\n`);
  for (const s of subs) {
    const props = await subjectRows(t.g, s);
    const name = props.find((r) => /(^|\/|\#)name$/.test(r.p))?.o ?? "";
    const addr = props.find((r) => /address$/.test(r.p))?.o ?? "";
    const lvl = props.filter((r) => r.p.endsWith("/type")).map((r) => (r.o.startsWith("http") ? "<" + r.o.split("/").pop() + ">" : r.o)).join(",");
    out.subject_dumps.push({ group: t.id, graph: t.g, subject: s, props });
    process.stdout.write(`   ${s.split("/").pop().padEnd(20)} ${String(name).padEnd(14)} lvl=${lvl.slice(0, 40).padEnd(40)} addr=${addr}\n`);
  }
}

// ---- 2. place 解析：两套命名空间都试 ----
const PLACES = [
  "http://data.library.sh.cn/entity/place/a2ecnz84k4w86oto",
  "http://data.library.sh.cn/entity/place/3y0xj13ie16rj5p8",
  "http://data.library.sh.cn/entity/place/8z9fiv1jeos4l8cf",
  "http://data.library.sh.cn/entity/place/zia3da59a31ucutd",
  "http://data.library.sh.cn/dmz/entity/place/y7kgl0030jtps4qv",
  "http://data.library.sh.cn/dmz/entity/place/ij2dm4q8uoe086kv",
  "http://data.library.sh.cn/dmz/entity/place/ohj05t8scnz6jgkx",
  "http://data.library.sh.cn/dmz/entity/place/8pn1fuwx2ccbsoy7",
  "http://data.library.sh.cn/dmz/entity/place/p6l1tz1r5g5ojkun",
  "http://data.library.sh.cn/authority/name/4kw0wvkppv8bq7ms",
  "http://data.library.sh.cn/authority/name/b5da3rksgypd6drb",
];
const GRAPHS_ALL = [
  "http://red.library.sh.cn/graph/building",
  "http://data.library.sh.cn/graph/geonames",
  "http://whzk.library.sh.cn/graph/photo",
];

process.stdout.write("\n=== place/authority resolution ===\n");
for (const s of PLACES) {
  let found = null;
  for (const g of GRAPHS_ALL) {
    const props = await subjectRows(g, s);
    if (props.length) { found = { graph: g, props }; break; }
  }
  out.place_resolution.push({ subject: s, resolved_in: found?.graph ?? null, props: found?.props ?? [] });
  const nm = found?.props.find((r) => /(^|\/|\#)(name|label)$/.test(r.p))?.o ?? "";
  process.stdout.write(`${String(found?.props.length ?? 0).padStart(3)}  ${s.split("/").slice(-2).join("/").padEnd(34)} ${found?.graph?.split("//")[1]?.split("/")[0] ?? "UNRESOLVED"}  ${nm}\n`);
  for (const r of found?.props ?? []) {
    const p = r.p.split("/").pop().split("#").pop();
    const o = r.o.startsWith("http") ? "<" + r.o.split("/").slice(-2).join("/") + ">" : r.o;
    process.stdout.write(`        ${p.padEnd(22)} ${String(o).slice(0, 220)}\n`);
  }
}

saveRaw(RUN.dir, "align-entity-dump-v2.json", JSON.stringify(out, null, 2));
process.stdout.write(`\nRUN_DIR=${RUN.dir}\n`);
