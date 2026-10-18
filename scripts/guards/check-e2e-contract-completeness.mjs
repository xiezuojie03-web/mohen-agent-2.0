#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path";
const root=path.resolve(process.argv[2]||process.cwd());
const required=[
"specs/DATA_CONTRACT.md","specs/AGENT_CONTRACT.md","specs/EXPERIENCE_CONTRACT.md",
"specs/data-production/MoHen_Data_Production_Protocol.md","specs/data-production/production-registry.json",
"specs/data-production/method-binding-contract.json",
"specs/data-production/PHYSICAL_DATA_MODEL_V2.md","specs/data-production/PERSISTENCE_BINDING_CONTRACT.md",
"specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md",
"specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md","specs/data-production/gates/gate-contracts.v3.json",
"pipelines/data-production/run.mjs",
"packages/agent-runtime/src/read-model-client.mjs","packages/agent-runtime/src/evidence-on-demand.mjs",
"packages/experience-engine/src/participation-feedback.mjs",
"supabase/migrations/202610070100_data_production_v2_baseline.sql",
"supabase/migrations/202610070200_legacy_v1_to_v2_backfill.sql",
"supabase/rollback/202610070200_legacy_v1_to_v2_backfill.rollback.sql",
"verification/sql/phase_e_post_backfill_verification.sql"];
const missing=required.filter(x=>!fs.existsSync(path.join(root,x)));
if(missing.length) throw new Error(`E2E_REQUIRED_FILE_MISSING:${missing.join(",")}`);
console.log(`E2E_CONTRACT_COMPLETENESS_OK files=${required.length}`);
