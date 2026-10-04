const { queryRows, run, runMany } = await import('./packages/data-access/src/index.mjs');
import crypto from 'node:crypto';
function parsePgArray(s) { if (Array.isArray(s)) return s; if (!s) return []; const t = String(s).trim(); if (t === '{}' || t === '') return []; if (t.startsWith('{') && t.endsWith('}')) return t.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean); return [t]; }
const claims = await queryRows(`select claim_id, predicate, epistemic_status, evidence_fragment_ids from cultural_relation_claims where array_length(evidence_fragment_ids,1)>0 order by claim_id limit 3`, {});
const ns = 'L4-FIX';
await run(`delete from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
// 方案 A：runMany + 行内字面量
const rows = [];
for (const c of claims) {
  const ev = parsePgArray(c.evidence_fragment_ids);
  const code = ns + '-' + String(c.claim_id).replace(/-/g, '').slice(0, 8);
  const pid = crypto.randomUUID();
  rows.push({ sql: `insert into knowledge_paths (path_id,path_code,title,status,evidence_coverage,unresolved_breaks,generated_by) values (:'pid'::uuid,:'code',:'t','candidate',:'ec','[]'::jsonb,'fix')`, params: { pid, code, t: 't', ec: JSON.stringify({ n: ev.length }) } });
  const evLit = "'{" + ev.join(',') + "}'::uuid[]";
  rows.push({ sql: `insert into knowledge_path_steps (path_id,step_no,step_kind,ref_id,label,epistemic_status,evidence_ids) values (:'pid'::uuid,1,'relation',:'rid','l','candidate',${evLit})`, params: { pid, rid: String(c.claim_id) } });
}
try { await runMany(rows); console.log('A) runMany+inline OK'); } catch (e) { console.log('A) runMany+inline THREW:', (e && e.message || e).split('\n').slice(-3).join(' | ')); }
const cntA = await queryRows(`select count(*) c from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
console.log('A) paths created:', cntA[0].c);
await run(`delete from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
// 方案 B：逐条 run（单语句）
let okB = true;
try {
  for (const c of claims) {
    const ev = parsePgArray(c.evidence_fragment_ids);
    const code = ns + '-' + String(c.claim_id).replace(/-/g, '').slice(0, 8);
    const pid = crypto.randomUUID();
    await run(`insert into knowledge_paths (path_id,path_code,title,status,evidence_coverage,unresolved_breaks,generated_by) values (:'pid'::uuid,:'code',:'t','candidate',:'ec','[]'::jsonb,'fix')`, { pid, code, t: 't', ec: JSON.stringify({ n: ev.length }) });
    const evLit = "'{" + ev.join(',') + "}'::uuid[]";
    await run(`insert into knowledge_path_steps (path_id,step_no,step_kind,ref_id,label,epistemic_status,evidence_ids) values (:'pid'::uuid,1,'relation',:'rid','l','candidate',${evLit})`, { pid, rid: String(c.claim_id) });
  }
  console.log('B) per-run OK');
} catch (e) { okB = false; console.log('B) per-run THREW:', (e && e.message || e).split('\n').slice(-3).join(' | ')); }
const cntB = await queryRows(`select count(*) c from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
console.log('B) paths created:', cntB[0].c);
await run(`delete from knowledge_paths where path_code like :'p'||'%'`, { p: ns });
