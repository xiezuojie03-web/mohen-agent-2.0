// TASK-0011 S1-A5：收尾解析 —— (a) 跨图定位两个上位 place URI；(b) 家谱库「吕颐浩」属性；
// (c) 舆图库 6 个「金泽」作品的真实题名（判定是否日本金泽的假阳性）。
import { call, parseSparqlXml, saveRaw, nowIso } from "./shl-client.mjs";

const RUN = { dir: process.env.T11_RUN_DIR };
const run = async (query) => {
  const res = await call(`/sparql?query=${encodeURIComponent(query)}`, {
    method: "GET", headers: { Accept: "application/sparql-results+json" }, retries: 1,
  });
  if (res.parsed?.results?.bindings) {
    return { ok: res.ok, rows: res.parsed.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value]))) };
  }
  return { ok: res.ok, rows: parseSparqlXml(res.text) };
};

const out = { run_at: nowIso() };

// (a) 跨图定位上位 place
for (const s of ["http://data.library.sh.cn/entity/place/a2ecnz84k4w86oto", "http://data.library.sh.cn/entity/place/3y0xj13ie16rj5p8"]) {
  const { ok, rows } = await run(`SELECT DISTINCT ?g WHERE { GRAPH ?g { <${s}> ?p ?o } } LIMIT 20`);
  out[`locate_${s.split("/").pop()}`] = { ok, graphs: (rows || []).map((r) => r.g) };
  process.stdout.write(`LOCATE ${s}  ok=${ok}  graphs=${JSON.stringify((rows || []).map((r) => r.g))}\n`);
}

// (b) 家谱库「吕颐浩」三个 person 的全部属性
for (const s of [
  "http://data.library.sh.cn/gen/resource/person/am63unfc2v6uw7eo",
  "http://data.library.sh.cn/gen/resource/person/lfdowhpnikchhh1c",
  "http://data.library.sh.cn/gen/resource/person/xekxsw7n02vn87p6",
]) {
  const { rows } = await run(`SELECT ?p ?o WHERE { GRAPH <http://gen.library.sh.cn/graph/person> { <${s}> ?p ?o } } LIMIT 60`);
  out[`gen_${s.split("/").pop()}`] = rows;
  process.stdout.write(`\nGEN ${s.split("/").pop()}  n=${rows?.length ?? 0}\n`);
  for (const r of rows || []) {
    const p = r.p.split("/").pop().split("#").pop();
    const o = r.o.startsWith("http") ? "<" + r.o.split("/").slice(-2).join("/") + ">" : r.o;
    process.stdout.write(`     ${p.padEnd(24)} ${String(o).slice(0, 200)}\n`);
  }
}

// (c) 舆图库「金泽」作品题名
const YW = "http://yutu.library.sh.cn/graph/work";
const { rows: yRows } = await run(
  `SELECT DISTINCT ?s ?p ?o WHERE { GRAPH <${YW}> { ?s ?p ?o . FILTER(isLiteral(?o) && CONTAINS(STR(?o),"金泽")) } } LIMIT 60`
);
out.yutu_jinze = yRows;
process.stdout.write(`\nYUTU 金泽 rows=${yRows?.length ?? 0}\n`);
for (const r of yRows || []) {
  process.stdout.write(`     ${r.s.split("/").pop().padEnd(18)} ${r.p.split("/").pop().padEnd(24)} ${String(r.o).slice(0, 160)}\n`);
}

saveRaw(RUN.dir, "align-resolve-extra.json", JSON.stringify(out, null, 2));
process.stdout.write(`\nsaved align-resolve-extra.json\n`);
