#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path";
const root=path.resolve(process.argv[2]||process.cwd());
const sql=fs.readFileSync(path.join(root,"supabase/migrations/202610070100_data_production_v2_baseline.sql"),"utf8");
for(const s of ["source","evidence","world","meaning","read_model","control"]) if(!sql.includes(`create schema if not exists ${s}`)) throw new Error(`SCHEMA_MISSING:${s}`);
for(const f of ["research_workspace","bridge_queue","truth_write_ceiling","production_mode"]) if(sql.toLowerCase().includes(f)) throw new Error(`LEGACY_SCHEMA_TERM:${f}`);
console.log("PHYSICAL_DATA_MODEL_TARGET_OK");
