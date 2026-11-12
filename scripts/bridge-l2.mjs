#!/usr/bin/env node
/**
 * bridge-l2.mjs —— scanned-page source.read_units → evidence.reading_units → material_evidence
 * 简单脚本：查出 source 层 scanned-page 所有数据，直接写 evidence 层
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const m = env.DATABASE_URL.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(\S+)$/);
const [, user, pwd, host, port = "5432", dbName] = m;
const psqlBin = "D:\\MoHen\\tools\\PostgreSQL\\18\\bin\\psql.exe";
const pgEnv = { PGPASSWORD: pwd, PGCLIENTENCODING: "UTF8", ...process.env };

function q(sql) {
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8", env: pgEnv });
  if (r.status !== 0) { console.error("SQL ERR:", r.stderr?.slice(0, 200)); process.exit(1); }
  return r.stdout.trim();
}

// 查所有 scanned-page source 数据
const sql = `
select distinct
  ru.read_unit_id, rr.read_run_id, rr.raw_item_id, rr.input_sha256,
  ru.locator, ru.ordinal as page_number,
  raw.source_version_id, sv.source_id, s.provider, s.title
from source.read_units ru
join source.read_runs rr using(read_run_id)
join source.raw_items raw using(raw_item_id)
join source.source_versions sv using(source_version_id)
join source.sources s using(source_id)
where rr.config->>'schema'='mab.private-scanned-page-reading.v1'
order by rr.raw_item_id, ru.ordinal
`;
const rows = q(sql).split(/\n/).filter(Boolean).map((line) => {
  // 最后几列可能含 | 号，前 8 列固定
  const cols = line.split("|");
  return {
    read_unit_id: cols[0], read_run_id: cols[1], raw_item_id: cols[2], input_sha256: cols[3],
    locator: cols[4], page_number: cols[5], source_version_id: cols[6], source_id: cols[7],
  };
});

console.log(`Found ${rows.length} scanned-page read_units`);
const locators = rows;

// 查 evidence.reading_units 现有
const existingEu = q(`select reading_unit_id, raw_item_id from evidence.reading_units`);
const euMap = {};
existingEu.split(/\n/).filter(Boolean).forEach((l) => {
  const [id, rawItem] = l.split("|");
  if (!euMap[rawItem]) euMap[rawItem] = [];
  euMap[rawItem].push(id);
});

// 为每个 scanned-page raw_item 创建 evidence.reading_unit（如果还没有）
const processedEuIds = {};
let euCreated = 0;
const rawItemSet = [...new Set(locators.map((r) => r.raw_item_id))];

for (const rawItemId of rawItemSet) {
  const svId = locators.find((r) => r.raw_item_id === rawItemId).source_version_id;
  const pageNum = locators.find((r) => r.raw_item_id === rawItemId).page_number;
  // 用 pg gen_random_uuid()
  const newEuId = q(`select gen_random_uuid()::text`);
  q(`insert into evidence.reading_units(reading_unit_id, source_version_id, raw_item_id, unit_path, unit_kind, primary_h_type, classification_status)
    values('${newEuId}','${svId}','${rawItemId}','page ${pageNum}','page_image','H03','candidate')`);
  processedEuIds[rawItemId] = newEuId;
  euCreated++;
  console.log(`  evidence.reading_units  created=${newEuId.slice(0, 8)}... raw_item=${rawItemId.slice(0, 8)}...`);
}
console.log(`Created ${euCreated} evidence.reading_units`);

// 为每个 evidence.reading_unit 写 material_evidence
let meCreated = 0;
const srcId = q(`select s.source_id from source.sources s join source.source_versions sv using(source_id) join source.raw_items raw on raw.source_version_id=sv.source_version_id where raw.raw_item_id='${rawItemSet[0]}' limit 1`);
for (const rawItemId of rawItemSet) {
  const euId = processedEuIds[rawItemId];
  const locatorRow = locators.find((r) => r.raw_item_id === rawItemId);
  const evId = q(`select gen_random_uuid()::text`);
  const locJson = locatorRow.locator.replace(/'/g, "''");
  q(`insert into evidence.material_evidence(
      evidence_id, reading_unit_id, locator, modality, source_voice, evidence_type, evidence_version_no,
      source_id, source_version_id, raw_item_id, input_fingerprint, extraction_method, maturity
    ) values(
      '${evId}','${euId}','${locJson}'::jsonb,'image','silent_artifact','private_scanned_page',1,
      '${srcId}','${locatorRow.source_version_id}','${rawItemId}','${locatorRow.input_sha256}',
      jsonb_build_object('method','C02_scanned_page_reading'),'candidate'
    )`);
  meCreated++;
  console.log(`  material_evidence  created=${evId.slice(0, 8)}... reading_unit=${euId.slice(0, 8)}...`);
}
console.log(`Created ${meCreated} material_evidence`);

// 最终验证
console.log("\n=== FINAL ===");
console.log(q(`select 'L0 raw_items', count(*) from source.raw_items where storage_ref like '%mohen-private-originals%' union all select 'L1 read_runs', count(*) from source.read_runs r join source.raw_items x using(raw_item_id) where x.storage_ref like '%mohen-private-originals%' union all select 'L1 read_units', count(*) from source.read_units ru join source.read_runs r using(read_run_id) join source.raw_items x using(raw_item_id) where x.storage_ref like '%mohen-private-originals%' union all select 'L2 evidence_units', count(*) from evidence.reading_units eu join evidence.material_evidence e on e.reading_unit_id=eu.reading_unit_id union all select 'L2 final_evidence', count(*) from evidence.material_evidence where evidence_type='private_scanned_page'`));
