import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect,it} from 'vitest';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const migration=readFileSync(path.join(root,
  'supabase/migrations/20261123130000_mab_m5_director_plan_formal_body_authority.sql'),'utf8');

it('maps director_plan artifact revision to the formal public.director_plans body',()=>{
  // The executable mapping row (not the explanatory comment) must point to the formal table.
  expect(migration).toContain("('director_plan','public','director_plans','plan_id')) as m(kind,ns,tbl,key_col)");
  expect(migration).not.toContain("('director_plan','studio','director_plans','plan_id')) as m(kind,ns,tbl,key_col)");
});

it('registers director_plan content columns from the formal table, excluding timestamps',()=>{
  expect(migration).toContain("delete from control.artifact_content_columns where kind = 'director_plan'");
  expect(migration).toContain("select 'director_plan', a.attname");
  expect(migration).toContain("to_regclass('public.director_plans')");
  expect(migration).toContain("a.attname not in ('created_at', 'updated_at')");
});

it('grants the gate authority minimal read on the formal director body',()=>{
  expect(migration).toContain('grant usage on schema public to mohen_gate_authority');
  expect(migration).toContain('grant select on public.director_plans to mohen_gate_authority');
});

it('preserves work_revision formal-body mapping and all historical audits unchanged',()=>{
  expect(migration).toContain("if p_kind = 'work_revision' then");
  expect(migration).toContain("'publication','work_revisions','revision_id'");
  expect(migration).not.toMatch(/^\s*drop table/gim);
  expect(migration).not.toMatch(/^\s*truncate/gim);
  expect(migration).not.toMatch(/^\s*update\s+(public|studio)\./gim);
});
