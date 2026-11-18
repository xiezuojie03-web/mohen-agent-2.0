import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

it("keeps legacy-run reconciliation admin-only and stale/unclaimed-only",()=>{
 const sql=readFileSync(resolve(process.cwd(),"supabase/migrations/20261118123000_m5_legacy_run_reconciliation.sql"),"utf8");
 expect(sql).toContain("M5_RECONCILIATION_ADMIN_REQUIRED");
 expect(sql).toContain("M5_RECONCILIATION_NOT_STALE");
 expect(sql).toContain("M5_RECONCILIATION_CLAIMED_RUN");
 expect(sql).toContain("grant execute on function control.m5_reconcile_legacy_unclaimed_run(uuid,text) to postgres;");
 expect(sql).toContain("'m5.legacy-unclaimed.v1'");
 expect(sql).not.toContain("grant execute on function control.m5_reconcile_legacy_unclaimed_run(uuid,text) to mohen_producer");
});
