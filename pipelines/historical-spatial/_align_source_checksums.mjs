// pipelines/historical-spatial/_align_source_checksums.mjs — TASK-0009 一次性完整性修正。
//
// 把 source_records.checksum 对齐到 raw_store 实测文件 sha256（§7 要求采集资产保留文件完整性 checksum）。
// 匹配键用 raw_path（稳健），不依赖 manifest 里的旧 checksum；仅 UPDATE，不碰其它表。

import fs from "node:fs";
import path from "node:path";
import { run, queryRows } from "../../packages/data-access/src/index.mjs";

const RAW = "D:/MoHen/data/raw/historical-spatial/jinze";
const rawStore = JSON.parse(fs.readFileSync(path.join(RAW, "_raw_store_manifest.json"), "utf8"));

const fileSha = {};
for (const a of rawStore.assets) fileSha[a.file] = a.sha256;

// raw_store 的 file 是相对 raw store 的路径，与 source_records.raw_path 的叶子名一致
const byLeaf = {};
for (const [f, sha] of Object.entries(fileSha)) {
  byLeaf[path.basename(f)] = sha;
}

const rows = await queryRows(
  `select source_id::text sid, raw_path, checksum from source_records where content_type='pdf'`
);
let updated = 0;
for (const r of rows) {
  const leaf = path.basename(String(r.raw_path || ""));
  const want = byLeaf[leaf];
  if (!want) continue;
  if (String(r.checksum) === want) { console.log(`SKIP ${leaf} (db==file)`); continue; }
  await run(`update source_records set checksum=:'n' where source_id=:'sid'::uuid`, { n: want, sid: r.sid });
  console.log(`UPDATED ${leaf}: ${String(r.checksum).slice(0,8)} -> ${want.slice(0,8)}`);
  updated++;
}
console.log(`ALIGN_DONE updated=${updated}`);
