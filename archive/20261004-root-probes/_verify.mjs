const { queryRows } = await import('./packages/data-access/src/index.mjs');
const c = async (s) => (await queryRows(s, {})).map((r) => Object.values(r).join('=')).join('  ');
console.log('evidence :', await c('select verification_status, count(*) from evidence group by 1'));
console.log('entities :', await c('select status, count(*) from entities group by 1'));
console.log('relations:', await c('select status, count(*) from relations group by 1'));
const cnt = async (s) => (await queryRows(s, {}))[0].c;
console.log('counts   :',
  'evidence=' + (await cnt('select count(*) c from evidence')),
  'entities=' + (await cnt('select count(*) c from entities')),
  'relations=' + (await cnt('select count(*) c from relations')),
  'crc=' + (await cnt('select count(*) c from cultural_relation_claims')),
  'paths=' + (await cnt('select count(*) c from knowledge_paths')),
  'steps=' + (await cnt('select count(*) c from knowledge_path_steps')),
  'gate=' + (await cnt('select count(*) c from evidence_gate_audit')),
  'queue=' + (await cnt('select count(*) c from review_queue')));
console.log('L4 (L4-UNATTENDED):', (await cnt("select count(*) c from knowledge_paths where path_code like 'L4-UNATTENDED%'")) + ' paths');
console.log('RED LINE :', 'published=' + (await cnt("select count(*) c from entities where status='published'")),
  'verified=' + (await cnt("select count(*) c from evidence where verification_status='verified'")));
