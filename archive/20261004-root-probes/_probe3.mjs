const { queryRows } = await import('./packages/data-access/src/index.mjs');
for (const t of ['entities', 'evidence']) {
  const r = await queryRows(
    "select column_name from information_schema.columns where table_name=:'t' and is_nullable='NO' order by ordinal_position",
    { t });
  console.log(t + ' NOT NULL:', r.map((x) => x.column_name).join(', '));
}
