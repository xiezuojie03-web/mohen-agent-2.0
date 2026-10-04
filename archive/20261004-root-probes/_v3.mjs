const { queryRows, run, runMany } = await import('./packages/data-access/src/index.mjs');
import crypto from 'node:crypto';
const claims = await queryRows(`select claim_id, evidence_fragment_ids from cultural_relation_claims where array_length(evidence_fragment_ids,1)>0 order by claim_id limit 5`, {});
console.log('claims:', claims.length);
for (const c of claims) {
  console.log('  claim', String(c.claim_id).slice(0, 8),
    'typeof=', typeof c.evidence_fragment_ids, 'isArr=', Array.isArray(c.evidence_fragment_ids),
    'len=', (c.evidence_fragment_ids || []).length);
}
const ns = 'L4-PROBE';
await run(`delete from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
const rows = [{ sql: `insert into knowledge_paths (path_id,path_code,title,status,evidence_coverage,unresolved_breaks,generated_by) values (:'pid'::uuid,:'code','t','candidate','{}'::jsonb,'[]'::jsonb,'probe')`, params: { pid: crypto.randomUUID(), code: ns + '-x' } },
  { sql: `insert into knowledge_path_steps (path_id,step_no,step_kind,ref_id,label,epistemic_status,evidence_ids) values (:'pid'::uuid,1,'relation','r','l','candidate',:'eids'::uuid[])`, params: { pid: crypto.randomUUID(), eids: ['11111111-1111-1111-1111-111111111111'] } }];
try { await runMany(rows); console.log('ARRAY PARAM runMany: OK (unexpected)'); }
catch (e) { console.log('ARRAY PARAM runMany: THREW'); }
await run(`delete from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
const pid2 = crypto.randomUUID();
const rows2 = [{ sql: `insert into knowledge_paths (path_id,path_code,title,status,evidence_coverage,unresolved_breaks,generated_by) values (:'pid'::uuid,:'code','t','candidate','{}'::jsonb,'[]'::jsonb,'probe')`, params: { pid: pid2, code: ns + '-y' } },
  { sql: `insert into knowledge_path_steps (path_id,step_no,step_kind,ref_id,label,epistemic_status,evidence_ids) values (:'pid'::uuid,1,'relation','r','l','candidate','{11111111-1111-1111-1111-111111111111}'::uuid[])`, params: { pid: pid2 } }];
try { await runMany(rows2); console.log('INLINE LITERAL runMany: OK'); }
catch (e) { console.log('INLINE LITERAL runMany: THREW', (e && e.message || e).split('\n')[0]); }
await run(`delete from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
