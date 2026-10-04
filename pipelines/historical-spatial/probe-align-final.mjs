// TASK-0011 S1-A6：最后一轮 —— 家谱库「吕颐浩」人物实体 + 两套 place 实体（金泽）。
// 命名空间已坐实：家谱人物 = `data.library.sh.cn/jp/entity/person/<id>`（jp = 家谱）。
import { saveRaw, nowIso } from "./shl-client.mjs";
// 2026-10-04（Skill 治理 R26）：复用唯一权威实现 `shl-probe.mjs`。
import { sparql, printProps } from "./shl-probe.mjs";

const RUN = { dir: process.env.T11_RUN_DIR };

const out = { run_at: nowIso(), dumps: [] };

const JOBS = [
  { id: "jp-lvyihao-a", g: "http://gen.library.sh.cn/graph/person", s: "http://data.library.sh.cn/jp/entity/person/am63unfc2v6uw7eo" },
  { id: "jp-lvyihao-b", g: "http://gen.library.sh.cn/graph/person", s: "http://data.library.sh.cn/jp/entity/person/lfdowhpnikchhh1c" },
  { id: "jp-lvyihao-c", g: "http://gen.library.sh.cn/graph/person", s: "http://data.library.sh.cn/jp/entity/person/xekxsw7n02vn87p6" },
  { id: "gen-place-jinze", g: "http://gen.library.sh.cn/graph/place", s: "http://data.library.sh.cn/entity/place/a2ecnz84k4w86oto" },
  { id: "dmz-place-jinze-upper", g: "http://dmz.library.sh.cn/graph/place", s: "http://data.library.sh.cn/entity/place/3y0xj13ie16rj5p8" },
];

for (const j of JOBS) {
  const { ok, rows } = await sparql(`SELECT ?p ?o WHERE { GRAPH <${j.g}> { <${j.s}> ?p ?o } } LIMIT 80`);
  out.dumps.push({ ...j, ok, n: rows?.length ?? 0, props: rows || [] });
  process.stdout.write(`\n### ${j.id}  n=${rows?.length ?? 0}\n`);
  printProps(rows, { slice: 240 });
}

saveRaw(RUN.dir, "align-final-dump.json", JSON.stringify(out, null, 2));
process.stdout.write(`\nsaved align-final-dump.json\n`);
