// pipelines/historical-spatial/shl-probe.mjs
// 共享的 SHL SPARQL 探针 helper —— **唯一权威实现**（C2 §2.1 / C0 §11 R26 · 2026-10-04 Skill 治理）。
//
// 由来：TASK-0011 的三个对齐探针 `probe-align-{entities,extra,final}.mjs` 此前各自复制了一份
//   「call → bindings → parseSparqlXml 兜底」的查询 helper 与 ?p/?o 属性打印逻辑（复制粘贴增量迭代）。
// 本模块把这段**真正重复**的部分抽为唯一实现，三个脚本改为复用；各脚本**自身的分析逻辑与输出文件保持不变**。
//
// 纪律（沿用 TASK-0011 S1-A4 教训）：全串行；保留每条原始行；不臆测同名实体同一性；不猜 URI 命名空间。
import { call, parseSparqlXml } from "./shl-client.mjs";

/** 唯一权威的 SPARQL 查询 helper：call → bindings → XML 兜底。返回 { ok, status, rows }。 */
export const sparql = async (query) => {
  const res = await call(`/sparql?query=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: { Accept: "application/sparql-results+json" },
    retries: 1,
  });
  const rows = res.parsed?.results?.bindings
    ? res.parsed.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])))
    : parseSparqlXml(res.text);
  return { ok: res.ok, status: res.status, rows };
};

/** 取一个主体（?s）的全部属性（?p ?o）。 */
export const subjectRows = async (graph, subject, limit = 80) => {
  const { rows } = await sparql(`SELECT ?p ?o WHERE { GRAPH <${graph}> { <${subject}> ?p ?o } } LIMIT ${limit}`);
  return rows || [];
};

/** 把一行 ?p ?o 格式化为 [短属性名, 可读对象]。 */
export const propPair = (r) => {
  const p = String(r.p).split("/").pop().split("#").pop();
  const o = String(r.o).startsWith("http") ? "<" + String(r.o).split("/").slice(-2).join("/") + ">" : r.o;
  return [p, o];
};

/** 统一打印一组属性行（此前在 extra / final 中逐字重复）。 */
export const printProps = (rows, { indent = "     ", width = 24, slice = 200, out = process.stdout } = {}) => {
  for (const r of rows || []) {
    const [p, o] = propPair(r);
    out.write(`${indent}${p.padEnd(width)} ${String(o).slice(0, slice)}\n`);
  }
};
