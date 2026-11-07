import { queryRows, getNodePgPool } from "../packages/data-access/src/index.mjs";
const u = await queryRows(`select read_unit_id::text, method_code, kind, locator_schema, ordinal, locator_hash,
  payload_ref from source.read_units where read_unit_id='9e847de9-8ac3-3da1-65ac-b4a7868dd1a8'::uuid`);
console.log("L1 read_unit:", JSON.stringify(u, null, 1));
const r = await queryRows(`select read_run_id::text, status, method_set, engine, config->>'schema' as schema,
  config->>'qualification' as qualification from source.read_runs
  where read_run_id='be31613d-6687-08fa-0272-ba254752a295'::uuid`);
console.log("L1 read_run:", JSON.stringify(r, null, 1));
const runs = await queryRows(`select run_id::text, current_stage, status from control.production_runs
  where run_id in ('3f6d59f2-99f5-46e7-8954-3bdf32f014f3'::uuid,'227cff63-797a-4c69-a78b-8e029dc65408'::uuid)`);
console.log("runs:", JSON.stringify(runs, null, 1));
await getNodePgPool().end();
