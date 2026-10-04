const { queryRows } = await import('./packages/data-access/src/index.mjs');
const q = async (sql) => (await queryRows(sql, {})).map((r) => Object.values(r).join('=')).join('  |  ');
console.log('entities.status        :', await q('select status, count(*) from entities group by 1'));
console.log('evidence.verif_status  :', await q('select verification_status, count(*) from evidence group by 1'));
console.log('relations.status       :', await q('select status, count(*) from relations group by 1'));
console.log('counts                 :',
  'sources=' + (await queryRows('select count(*) c from source_records', {}))[0].c,
  'evidence=' + (await queryRows('select count(*) c from evidence', {}))[0].c,
  'entities=' + (await queryRows('select count(*) c from entities', {}))[0].c,
  'relations=' + (await queryRows('select count(*) c from relations', {}))[0].c,
  'crc=' + (await queryRows('select count(*) c from cultural_relation_claims', {}))[0].c);
console.log('baseline audit/queue   :',
  'gate=' + (await queryRows('select count(*) c from evidence_gate_audit', {}))[0].c,
  'queue=' + (await queryRows('select count(*) c from review_queue', {}))[0].c,
  'paths=' + (await queryRows('select count(*) c from knowledge_paths', {}))[0].c,
  'steps=' + (await queryRows('select count(*) c from knowledge_path_steps', {}))[0].c);
// enum 取值确认
const enums = await queryRows(
  "select t.typname, e.enumlabel from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typname in ('entity_status','verification_status','evidence_gate_result') order by 1,2", {});
console.log('enums                  :', enums.map((r) => r.typname + ':' + r.enumlabel).join('  |  '));
