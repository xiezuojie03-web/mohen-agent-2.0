const { run } = await import('./packages/data-access/src/index.mjs');
import crypto from 'node:crypto';
const pid = crypto.randomUUID();
const code = 'L4-TEST2-' + Date.now();
try {
  await run(`insert into knowledge_paths (path_id, path_code, title, purpose_question, status, evidence_coverage, unresolved_breaks, generated_by)
    values (:'pid'::uuid, :'code', :'t', :'pq', 'candidate', :'ec', '[]'::jsonb, 'test')`,
    { pid, code, t: 't', pq: 'p', ec: JSON.stringify({ a: 1 }) });
  console.log('path insert OK');
  try {
    await run(`insert into knowledge_path_steps (path_id, step_no, step_kind, ref_id, label, epistemic_status, evidence_ids)
      values (:'pid'::uuid, 1, 'relation', 'x', 'l', 'candidate', :'eids'::uuid[])`,
      { pid, eids: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'] });
    console.log('NON-EMPTY array PARAM OK');
  } catch (e) { console.log('NON-EMPTY PARAM ERROR:', (e && e.message || e).split('\n')[0]); }
  try {
    await run(`insert into knowledge_path_steps (path_id, step_no, step_kind, ref_id, label, epistemic_status, evidence_ids)
      values (:'pid'::uuid, 2, 'relation', 'y', 'm', 'candidate', '{33333333-3333-3333-3333-333333333333,44444444-4444-4444-4444-444444444444}'::uuid[])`,
      { pid });
    console.log('INLINE array literal OK');
  } catch (e) { console.log('INLINE ERROR:', (e && e.message || e).split('\n')[0]); }
  try {
    await run(`insert into knowledge_path_steps (path_id, step_no, step_kind, ref_id, label, epistemic_status, evidence_ids)
      values (:'pid'::uuid, 3, 'relation', 'z', 'n', 'candidate', '{}'::uuid[])`,
      { pid });
    console.log('EMPTY INLINE OK');
  } catch (e) { console.log('EMPTY INLINE ERROR:', (e && e.message || e).split('\n')[0]); }
} catch (e) { console.log('PATH ERROR:', e && e.message); }
finally { await run(`delete from knowledge_paths where path_code=:'c'`, { c: code }); console.log('cleanup done'); }
