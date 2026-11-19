#!/usr/bin/env node
/**
 * P1 结构差异比较
 * 输入：DATABASE_SCHEMA_LOCAL.json / DATABASE_SCHEMA_CLOUD.json（同目录）
 * 输出：DATABASE_SCHEMA_DIFF.json
 * 分类：IDENTICAL / LOCAL_ONLY / CLOUD_ONLY / DEFINITION_DIFFERENT / MIGRATION_PENDING / UNKNOWN
 */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/';
const L = JSON.parse(readFileSync(dir + 'DATABASE_SCHEMA_LOCAL.json', 'utf8'));
const C = JSON.parse(readFileSync(dir + 'DATABASE_SCHEMA_CLOUD.json', 'utf8'));

const IGNORE_SCHEMAS = new Set(['pg_temp_38', 'pg_temp_43', 'pg_temp_92', 'pg_toast_temp_38', 'pg_toast_temp_43', 'pg_toast_temp_92', 'pgbouncer', 'mab_backup']);

const key = (...parts) => parts.join('.');
const norm = (v) => (v === null || v === undefined ? null : String(v).replace(/\s+/g, ' ').trim());

function mapBy(rows, fn) {
  const m = new Map();
  for (const r of rows) { const k = fn(r); m.set(k, r); }
  return m;
}

const diff = {
  specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01',
  stage: 'P1',
  generated_at: new Date().toISOString(),
  server: { local: L.server, cloud: C.server },
  summary: {},
  details: {},
};

// ---- 表级 ----
const lt = L.objects.tables.filter(t => !IGNORE_SCHEMAS.has(t.schema));
const ct = C.objects.tables.filter(t => !IGNORE_SCHEMAS.has(t.schema));
const ltMap = mapBy(lt, t => key(t.schema, t.table));
const ctMap = mapBy(ct, t => key(t.schema, t.table));

const tableDiff = { IDENTICAL: [], LOCAL_ONLY: [], CLOUD_ONLY: [], DEFINITION_DIFFERENT: [] };
for (const [k, t] of ltMap) {
  if (!ctMap.has(k)) { tableDiff.LOCAL_ONLY.push(k); continue; }
  const c = ctMap.get(k);
  if (t.rls_enabled !== c.rls_enabled) tableDiff.DEFINITION_DIFFERENT.push({ table: k, aspect: 'rls_enabled', local: t.rls_enabled, cloud: c.rls_enabled });
}
for (const k of ctMap.keys()) if (!ltMap.has(k)) tableDiff.CLOUD_ONLY.push(k);
tableDiff.IDENTICAL = [...ltMap.keys()].filter(k => ctMap.has(k) && !tableDiff.DEFINITION_DIFFERENT.some(d => d.table === k));
diff.summary.tables = {
  local_total: lt.length, cloud_total: ct.length,
  identical: tableDiff.IDENTICAL.length, local_only: tableDiff.LOCAL_ONLY.length,
  cloud_only: tableDiff.CLOUD_ONLY.length, definition_different: tableDiff.DEFINITION_DIFFERENT.length,
};
diff.details.tables = tableDiff;

// ---- 列级（同名表内比较） ----
const colDiff = [];
const lcols = mapBy(L.objects.columns, c => key(c.schema, c.table, c.column));
const ccols = mapBy(C.objects.columns, c => key(c.schema, c.table, c.column));
for (const [k, c] of lcols) {
  if (!ccols.has(k)) {
    const [s, t] = k.split('.');
    if (ctMap.has(key(s, t))) colDiff.push({ object: k, kind: 'COLUMN_LOCAL_ONLY', local: c.type });
  }
}
for (const [k, c] of ccols) {
  if (!lcols.has(k)) {
    const [s, t] = k.split('.');
    if (ltMap.has(key(s, t))) colDiff.push({ object: k, kind: 'COLUMN_CLOUD_ONLY', cloud: c.type });
  }
}
for (const [k, c] of lcols) {
  const o = ccols.get(k);
  if (o && (norm(c.type) !== norm(o.type) || !!c.not_null !== !!o.not_null)) {
    colDiff.push({ object: k, kind: 'COLUMN_DEFINITION_DIFFERENT', local: `${c.type}${c.not_null ? ' NOT NULL' : ''}`, cloud: `${o.type}${o.not_null ? ' NOT NULL' : ''}` });
  }
}
diff.summary.columns = {
  local_total: L.objects.columns.length, cloud_total: C.objects.columns.length,
  differences: colDiff.length,
};
diff.details.columns = colDiff;

// ---- 约束级 ----
const conDiff = [];
const lcon = mapBy(L.objects.constraints, c => key(c.schema, c.table, c.name));
const ccon = mapBy(C.objects.constraints, c => key(c.schema, c.table, c.name));
for (const [k, c] of lcon) if (!ccon.has(k)) conDiff.push({ object: k, kind: 'CONSTRAINT_LOCAL_ONLY', type: c.type });
for (const [k, c] of ccon) if (!lcon.has(k)) conDiff.push({ object: k, kind: 'CONSTRAINT_CLOUD_ONLY', type: c.type });
for (const [k, c] of lcon) {
  const o = ccon.get(k);
  if (o && norm(c.definition) !== norm(o.definition)) conDiff.push({ object: k, kind: 'CONSTRAINT_DEFINITION_DIFFERENT', local: c.definition, cloud: o.definition });
}
diff.summary.constraints = {
  local_total: L.objects.constraints.length, cloud_total: C.objects.constraints.length,
  local_only: conDiff.filter(d => d.kind === 'CONSTRAINT_LOCAL_ONLY').length,
  cloud_only: conDiff.filter(d => d.kind === 'CONSTRAINT_CLOUD_ONLY').length,
  different: conDiff.filter(d => d.kind === 'CONSTRAINT_DEFINITION_DIFFERENT').length,
};
diff.details.constraints = conDiff;

// ---- RLS 策略 ----
const polDiff = [];
const lpol = mapBy(L.objects.policies, p => key(p.schema, p.table, p.name));
const cpol = mapBy(C.objects.policies, p => key(p.schema, p.table, p.name));
for (const [k, p] of lpol) if (!cpol.has(k)) polDiff.push({ object: k, kind: 'POLICY_LOCAL_ONLY' });
for (const [k, p] of cpol) if (!lpol.has(k)) polDiff.push({ object: k, kind: 'POLICY_CLOUD_ONLY' });
for (const [k, p] of lpol) {
  const o = cpol.get(k);
  if (o && (norm(p.qual) !== norm(o.qual) || norm(p.with_check) !== norm(o.with_check) || norm(p.cmd) !== norm(o.cmd))) {
    polDiff.push({ object: k, kind: 'POLICY_DEFINITION_DIFFERENT' });
  }
}
diff.summary.policies = {
  local_total: L.objects.policies.length, cloud_total: C.objects.policies.length,
  local_only: polDiff.filter(d => d.kind === 'POLICY_LOCAL_ONLY').length,
  cloud_only: polDiff.filter(d => d.kind === 'POLICY_CLOUD_ONLY').length,
  different: polDiff.filter(d => d.kind === 'POLICY_DEFINITION_DIFFERENT').length,
};
diff.details.policies = polDiff;

// ---- 触发器 ----
const trgDiff = [];
const ltrg = mapBy(L.objects.triggers, t => key(t.schema, t.table, t.name));
const ctrg = mapBy(C.objects.triggers, t => key(t.schema, t.table, t.name));
for (const [k] of ltrg) if (!ctrg.has(k)) trgDiff.push({ object: k, kind: 'TRIGGER_LOCAL_ONLY' });
for (const [k] of ctrg) if (!ltrg.has(k)) trgDiff.push({ object: k, kind: 'TRIGGER_CLOUD_ONLY' });
for (const [k, t] of ltrg) {
  const o = ctrg.get(k);
  if (o && norm(t.definition) !== norm(o.definition)) trgDiff.push({ object: k, kind: 'TRIGGER_DEFINITION_DIFFERENT' });
}
diff.summary.triggers = {
  local_total: L.objects.triggers.length, cloud_total: C.objects.triggers.length,
  local_only: trgDiff.filter(d => d.kind === 'TRIGGER_LOCAL_ONLY').length,
  cloud_only: trgDiff.filter(d => d.kind === 'TRIGGER_CLOUD_ONLY').length,
  different: trgDiff.filter(d => d.kind === 'TRIGGER_DEFINITION_DIFFERENT').length,
};
diff.details.triggers = trgDiff;

// ---- 函数 ----
const fnDiff = [];
const lfn = mapBy(L.objects.functions, f => key(f.schema, f.name, f.args));
const cfn = mapBy(C.objects.functions, f => key(f.schema, f.name, f.args));
for (const [k] of lfn) if (!cfn.has(k)) fnDiff.push({ object: k, kind: 'FUNCTION_LOCAL_ONLY' });
for (const [k] of cfn) if (!lfn.has(k)) fnDiff.push({ object: k, kind: 'FUNCTION_CLOUD_ONLY' });
diff.summary.functions = {
  local_total: L.objects.functions.length, cloud_total: C.objects.functions.length,
  local_only: fnDiff.filter(d => d.kind === 'FUNCTION_LOCAL_ONLY').length,
  cloud_only: fnDiff.filter(d => d.kind === 'FUNCTION_CLOUD_ONLY').length,
};
diff.details.functions = fnDiff;

// ---- 索引 ----
const idxDiff = [];
const lidx = mapBy(L.objects.indexes, i => key(i.schema, i.table, i.name));
const cidx = mapBy(C.objects.indexes, i => key(i.schema, i.table, i.name));
for (const [k] of lidx) if (!cidx.has(k)) idxDiff.push({ object: k, kind: 'INDEX_LOCAL_ONLY' });
for (const [k] of cidx) if (!lidx.has(k)) idxDiff.push({ object: k, kind: 'INDEX_CLOUD_ONLY' });
for (const [k, i] of lidx) {
  const o = cidx.get(k);
  if (o && norm(i.definition) !== norm(o.definition)) idxDiff.push({ object: k, kind: 'INDEX_DEFINITION_DIFFERENT' });
}
diff.summary.indexes = {
  local_total: L.objects.indexes.length, cloud_total: C.objects.indexes.length,
  local_only: idxDiff.filter(d => d.kind === 'INDEX_LOCAL_ONLY').length,
  cloud_only: idxDiff.filter(d => d.kind === 'INDEX_CLOUD_ONLY').length,
  different: idxDiff.filter(d => d.kind === 'INDEX_DEFINITION_DIFFERENT').length,
};
diff.details.indexes = idxDiff;

// ---- 枚举 / 序列 / 视图 ----
const lenum = new Set(L.objects.enums.map(e => key(e.schema, e.name)));
const cenum = new Set(C.objects.enums.map(e => key(e.schema, e.name)));
diff.summary.enums = {
  local_total: lenum.size, cloud_total: cenum.size,
  local_only: [...lenum].filter(e => !cenum.has(e)),
  cloud_only: [...cenum].filter(e => !lenum.has(e)),
};
const lseq = new Set(L.objects.sequences.map(s => key(s.schema, s.name)));
const cseq = new Set(C.objects.sequences.map(s => key(s.schema, s.name)));
diff.summary.sequences = {
  local_total: lseq.size, cloud_total: cseq.size,
  local_only: [...lseq].filter(s => !cseq.has(s)).length,
  cloud_only: [...cseq].filter(s => !lseq.has(s)).length,
};
const lview = new Set(L.objects.views.map(v => key(v.schema, v.name)));
const cview = new Set(C.objects.views.map(v => key(v.schema, v.name)));
diff.summary.views = {
  local_total: lview.size, cloud_total: cview.size,
  local_only: [...lview].filter(v => !cview.has(v)),
  cloud_only: [...cview].filter(v => !lview.has(v)),
};

// ---- 角色 ----
const lroles = new Set(L.objects.roles.map(r => r.name));
const croles = new Set(C.objects.roles.map(r => r.name));
diff.summary.roles = {
  local_only: [...lroles].filter(r => !croles.has(r)),
  cloud_only: [...croles].filter(r => !lroles.has(r)),
};

// ---- 扩展 ----
const lext = new Map(L.objects.extensions.map(e => [e.name, e.version]));
const cext = new Map(C.objects.extensions.map(e => [e.name, e.version]));
diff.summary.extensions = {
  local_only: [...lext.keys()].filter(e => !cext.has(e)),
  cloud_only: [...cext.keys()].filter(e => !lext.has(e)),
  version_different: [...lext.keys()].filter(e => cext.has(e) && lext.get(e) !== cext.get(e)).map(e => ({ name: e, local: lext.get(e), cloud: cext.get(e) })),
};

// ---- Storage ----
diff.summary.storage = {
  local_buckets: (L.storage_buckets || []).map(b => `${b.name}${b.error ? ':ERR' : ''}`),
  cloud_buckets: (C.storage_buckets || []).map(b => `${b.name}${b.error ? ':ERR' : ''}`),
};

// ---- 行计数差异（P2 预览） ----
const rowDiff = {};
for (const [t, n] of Object.entries(L.row_counts)) {
  if (IGNORE_SCHEMAS.has(t.split('.')[0])) continue;
  const c = C.row_counts[t];
  if (c === undefined) { rowDiff[t] = { local: n, cloud: 'TABLE_MISSING' }; }
  else if (n !== c) rowDiff[t] = { local: n, cloud: c };
}
for (const [t, n] of Object.entries(C.row_counts)) {
  if (IGNORE_SCHEMAS.has(t.split('.')[0])) continue;
  if (L.row_counts[t] === undefined) rowDiff[t] = { local: 'TABLE_MISSING', cloud: n };
}
diff.summary.row_count_differences = rowDiff;

writeFileSync(dir + 'DATABASE_SCHEMA_DIFF.json', JSON.stringify(diff, null, 1), 'utf8');
console.log('tables:', JSON.stringify(diff.summary.tables));
console.log('columns diffs:', diff.summary.columns.differences);
console.log('constraints:', JSON.stringify(diff.summary.constraints));
console.log('policies:', JSON.stringify(diff.summary.policies));
console.log('triggers:', JSON.stringify(diff.summary.triggers));
console.log('functions:', JSON.stringify(diff.summary.functions));
console.log('indexes:', JSON.stringify(diff.summary.indexes));
console.log('enums local_only/cloud_only:', diff.summary.enums.local_only.length, '/', diff.summary.enums.cloud_only.length);
console.log('views local_only:', diff.summary.views.local_only, 'cloud_only:', diff.summary.views.cloud_only);
console.log('roles local_only:', diff.summary.roles.local_only, 'cloud_only:', diff.summary.roles.cloud_only);
console.log('storage:', JSON.stringify(diff.summary.storage));
console.log('-> DATABASE_SCHEMA_DIFF.json');
