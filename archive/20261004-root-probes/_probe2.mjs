import { buildJobs, matchEntries } from './pipelines/legacy/unattended-jobs.mjs';
import { queryRows } from './packages/data-access/src/index.mjs';
import fs from 'node:fs';

const jobs = buildJobs();
const prod = jobs.filter((j) => j.id.startsWith('unattended.'));
const reg = JSON.parse(fs.readFileSync('specs/data-production/production-registry.json', 'utf8'));
for (const j of prod) {
  const hits = matchEntries(reg.jobs, j.id);
  console.log('resolve', j.id, '->', hits.length, hits.map((h) => h.id + (h.unattended || '')).join('/'));
}

const q = async (s) => (await queryRows(s, {})).length;
console.log('evidence lacking source:', await q(`select source_id from source_records sr where not exists (select 1 from evidence e where e.source_id=sr.source_id) limit 500`));
console.log('distinct hints:', await q(`select distinct subject_hint from evidence where subject_hint is not null and subject_hint<>'' union select distinct place_hint from evidence where place_hint is not null and place_hint<>''`));
console.log('relations unaudited:', await q(`select relation_id from relations where not exists (select 1 from evidence_gate_audit g where g.object_type='relation' and g.object_id=relation_id::text) limit 2000`));
console.log('claims with ev:', await q(`select claim_id from cultural_relation_claims where array_length(evidence_fragment_ids,1)>0`));
console.log('FETCHED exists:', fs.existsSync('D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched'));
