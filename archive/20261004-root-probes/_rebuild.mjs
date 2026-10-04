const { queryRows, run, runMany } = await import('./packages/data-access/src/index.mjs');
import crypto from 'node:crypto';
function parsePgArray(s) { if (Array.isArray(s)) return s; if (!s) return []; const t = String(s).trim(); if (t === '{}' || t === '') return []; if (t.startsWith('{') && t.endsWith('}')) return t.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean); return [t]; }
const ns = 'L4-UNATTENDED';
const claims = await queryRows(`select claim_id, predicate, epistemic_status, evidence_fragment_ids from cultural_relation_claims where array_length(evidence_fragment_ids,1)>0 order by claim_id`, {});
await run(`delete from knowledge_path_steps where path_id in (select path_id from knowledge_paths where path_code like :'p'||'%')`, { p: ns });
await run(`delete from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
const rows = [];
for (const c of claims) {
  const ev = parsePgArray(c.evidence_fragment_ids);
  if (!ev.length) continue;
  const code = ns + '-' + String(c.claim_id).replace(/-/g, '').slice(0, 8);
  const pid = crypto.randomUUID();
  rows.push({ sql: `insert into knowledge_paths (path_id,path_code,title,purpose_question,status,evidence_coverage,unresolved_breaks,generated_by) values (:'pid'::uuid,:'code',:'t',:'pq','candidate',:'ec','[]'::jsonb,'unattended-runner-N06')`, params: { pid, code, t: '金泽关系簇 ' + (c.predicate || '?'), pq: '该关系如何支撑金泽体验', ec: JSON.stringify({ evidence_ids: ev, covered_steps: ev.length, total_steps: ev.length }) } });
  const steps = [{ n: 1, sk: 'relation', rid: String(c.claim_id), lb: '关系断言 ' + (c.predicate || '?'), es: c.epistemic_status || 'candidate', ev }];
  ev.forEach((eid, k) => steps.push({ n: k + 2, sk: 'claim', rid: String(eid), lb: '证据片段 ' + String(eid).slice(0, 8), es: 'candidate', ev: [eid] }));
  for (const s of steps) { const lit = "'{" + s.ev.join(',') + "}'::uuid[]"; rows.push({ sql: `insert into knowledge_path_steps (path_id,step_no,step_kind,ref_id,label,epistemic_status,evidence_ids) values (:'pid'::uuid,:'n',:'sk',:'rid',:'lb',:'es',${lit})`, params: { pid, n: s.n, sk: s.sk, rid: s.rid, lb: s.lb, es: s.es } }); }
}
try { await runMany(rows); console.log('REBUILD OK'); } catch (e) { console.log('REBUILD THREW', (e && e.message || e).split('\n').slice(-3).join(' | ')); }
const cnt = await queryRows(`select count(*) c from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
console.log('L4-UNATTENDED paths now:', cnt[0].c);
