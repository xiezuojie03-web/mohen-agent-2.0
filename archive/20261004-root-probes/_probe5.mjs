const { queryRows } = await import('./packages/data-access/src/index.mjs');
const r = await queryRows("select distinct evidence_type from evidence order by 1", {});
console.log('evidence_type values:', r.map((x) => x.evidence_type).join(' | '));
const c = await queryRows(
  `select cc.check_clause from information_schema.check_constraints cc
     join information_schema.constraint_column_usage cu on cu.constraint_name=cc.constraint_name
     where cu.table_name='evidence' and cu.column_name='evidence_type'`, {});
console.log('check clause:', c.map((x) => x.check_clause).join(' || '));
