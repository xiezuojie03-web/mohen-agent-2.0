import fs from "node:fs";
import { queryRows } from "../packages/data-access/src/index.mjs";
const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const T = [["commons_baoshan_chuansha_20260831.json", "candidates"], ["commons_external_maps_20260831.json", "known"]];
const urls = [];
for (const [f, k] of T) {
  const d = JSON.parse(fs.readFileSync(FETCHED + "/" + f, "utf8"));
  for (const im of (d[k] || [])) { const u = im.url || im.thumb || im.file_path || im.image; if (u) urls.push(String(u).split("?")[0].trim()); }
}
const rows = await queryRows(`select legacy_id from visual_assets`);
const have = new Set(rows.map((r) => r.legacy_id).filter(Boolean));
const missing = urls.filter((u) => !have.has(u));
console.log("expected=", urls.length, "present=", urls.length - missing.length, "missing=", missing.length);
if (missing.length) console.log("MISSING:", missing.slice(0, 8));
else console.log("ALL 38 INGESTED ✔");
