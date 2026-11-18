import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

it("keeps the scoped formal-read SQL unambiguous and preserves the nested security-definer ACL bridge",()=>{
  const file=resolve(process.cwd(),"supabase/migrations/20261118120000_m5_formal_project_read_acl_order_fix.sql");
  const sql=readFileSync(file,"utf8");
  expect(sql).toContain("order by case m.layer when 'L4'");
  expect(sql).not.toContain("order by case layer when 'L4'");
  expect(sql).toContain("grant execute on function control.qualification_allows(uuid,text,text,text,text,jsonb) to postgres;");
  expect(sql).toContain("grant execute on function studio.search_qualified_project_layers(uuid,text,text,text,jsonb,text[],integer) to mohen_app_runtime;");
  expect(sql).toContain("revoke all on function studio.search_qualified_project_layers(uuid,text,text,text,jsonb,text[],integer) from public;");
});
