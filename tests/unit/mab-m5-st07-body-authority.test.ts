import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect,it} from 'vitest';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const migration=readFileSync(path.join(root,
  'supabase/migrations/20261123120000_mab_m5_st05_st07_project_and_body_authority.sql'),'utf8');

it('keeps publication.work_revisions as the only formal work revision body',()=>{
  expect(migration).toContain('publication.work_revisions');
  expect(migration).toContain("'publication','work_revisions','revision_id'");
  expect(migration).toMatch(/comment on column studio\.work_revisions\.content is[\s\S]*LEGACY ENVELOPE SNAPSHOT ONLY/);
  expect(migration).toContain('not a second body authority');
});
it('resolves work_revision artifacts through the formal body and fails closed when unbound',()=>{
  expect(migration).toContain("if p_kind = 'work_revision' then");
  expect(migration).toContain('select formal_revision_id from studio.work_revisions');
  expect(migration).toContain('if formal_id is null then return null; end if;');
  expect(migration).not.toContain("('work_revision','studio','work_revisions','revision_id')");
});
it('preserves historical tables, rows and G5 audits without migration or reuse',()=>{
  expect(migration).not.toMatch(/^\s*drop table/gim);
  expect(migration).not.toMatch(/^\s*delete from/gim);
  expect(migration).not.toMatch(/^\s*truncate/gim);
  expect(migration).toContain('NULL legacy rows remain HOLD and must never be inferred/backfilled');
});
it('requires every Studio plan to bind project, delegation and research snapshot',()=>{
  for(const column of ['project_id','delegation_id','root_task_ref','research_snapshot_hash','research_source_refs'])
    expect(migration).toContain(column);
});
