import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

it("keeps the development-only historical run repair explicit and non-guessing",()=>{
 const sql=readFileSync(resolve(process.cwd(),"supabase/migrations/20261118130000_m5_repair_historical_run_status_incident.sql"),"utf8");
 expect(sql).toContain("M5_HISTORICAL_REPAIR_KNOWN_PASS_PRECONDITION");
 expect(sql).toContain("historical_status_uncertain');
 expect(sql).toContain("14 PASS / 5 RUNNING / 1 FAILED");
 expect(sql).toContain("M5_HISTORICAL_REPAIR_RUNNING_REMAINS");
});
