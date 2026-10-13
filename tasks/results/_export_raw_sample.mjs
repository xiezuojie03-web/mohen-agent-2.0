// 一次性原始数据样本导出器：直连 mohen_dev，抽真实进库数据，生成可读 HTML 卡片报告。
// 仅查询叙事性表（排除审计/治理/溯源类）。
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PSQL = 'D:\\MoHen\\tools\\PostgreSQL\\18\\bin\\psql.exe';
const CONN = 'postgresql://postgres:postgres@127.0.0.1:5432/mohen_dev';
process.env.PGPASSWORD = 'postgres';

function runSql(sql) {
  const sql1 = ('select row_to_json(t) from (' + sql + ') t').replace(/\s+/g, ' ');
  const out = execSync(`"${PSQL}" "${CONN}" -t --csv -c "${sql1}"`, { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
  const rows = [];
  let i = 0, field = '', row = [], inQ = false;
  while (i < out.length) {
    const ch = out[i];
    if (inQ) {
      if (ch === '"') {
        if (out[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += ch; i++; continue;
    } else {
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      field += ch; i++;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && r[0].length).map(r => JSON.parse(r[0]));
}

const esc = (v) => {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};
const show = (v) => (v === null || v === undefined || v === '' ? '<span class="na">—</span>' : esc(v));

// 卡片：标题 + 类型徽标 + 字段列表
function card(title, type, kv) {
  const typeHtml = type !== null && type !== undefined && type !== '' ? `<span class="badge">${esc(type)}</span>` : '';
  const body = kv.map(([k, v]) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${show(v)}</span></div>`).join('');
  return `<div class="card"><div class="ct">${show(title)}${typeHtml}</div>${body}</div>`;
}

// ---------- 查询定义 ----------
const tables = {};

// source_records
tables.source_records = {
  label: 'source_records（来源主记录）',
  noteA: 'A 组：贡献证据最多的来源', noteB: 'B 组：尚未贡献任何证据的来源',
  A: `select s.source_id, s.provider, s.title, s.creator, s.source_date, s.content_type, s.license_code, s.source_uri, coalesce(e.c,0) as evidence_count, s.legacy_id
       from source_records s left join (select source_id, count(*) c from evidence group by source_id) e using(source_id)
       order by e.c desc nulls last limit 20`,
  B: `select s.source_id, s.provider, s.title, s.creator, s.source_date, s.content_type, s.license_code, s.source_uri, coalesce(e.c,0) as evidence_count, s.legacy_id
       from source_records s left join (select source_id, count(*) c from evidence group by source_id) e using(source_id)
       order by coalesce(e.c,0) asc, s.source_id limit 20`,
  render: (r) => card(r.title || r.legacy_id, r.provider, [
    ['标题', r.title], ['贡献证据数', r.evidence_count], ['创作者', r.creator], ['年代', r.source_date],
    ['类型', r.content_type], ['许可', r.license_code], ['来源 URL', r.source_uri], ['legacy_id', r.legacy_id],
  ]),
};

// evidence
tables.evidence = {
  label: 'evidence（证据·原文片段）',
  noteA: 'A 组：locator 完整、原文最长、置信度最高的证据', noteB: 'B 组：locator 缺失或原文极短的证据',
  A: `select e.evidence_id, e.evidence_type, e.locator, e.quote_text, e.subject_hint, e.place_hint, e.time_hint, e.extraction_method, e.confidence, e.verification_status, sr.title as source_title, sr.provider
       from evidence e join source_records sr on e.source_id=sr.source_id
       where e.locator is not null and length(e.quote_text) > 20
       order by length(e.quote_text) desc, e.confidence desc limit 20`,
  B: `select e.evidence_id, e.evidence_type, e.locator, e.quote_text, e.subject_hint, e.place_hint, e.time_hint, e.extraction_method, e.confidence, e.verification_status, sr.title as source_title, sr.provider
       from evidence e join source_records sr on e.source_id=sr.source_id
       where e.locator is null or length(coalesce(e.quote_text,'')) < 15
       order by length(coalesce(e.quote_text,'')) asc, e.confidence asc limit 20`,
  render: (r) => card((r.quote_text || '').slice(0, 40) + (r.quote_text && r.quote_text.length > 40 ? '…' : ''), r.evidence_type, [
    ['原文片段', r.quote_text], ['关联来源', r.source_title], ['来源 provider', r.provider], ['locator', r.locator],
    ['主题提示', r.subject_hint], ['地点提示', r.place_hint], ['时间提示', r.time_hint], ['抽取方式', r.extraction_method],
    ['置信度', r.confidence], ['核验状态', r.verification_status],
  ]),
};

// entities
tables.entities = {
  label: 'entities（实体候选）',
  noteA: 'A 组：类型明确(place/building)、有描述、置信度最高的实体', noteB: 'B 组：类型=unknown、无描述或置信度最低的实体',
  A: `select entity_id, entity_type, canonical_name, description, valid_from, valid_to, confidence, status, legacy_id
       from entities where entity_type in ('place','building') and description is not null and length(description)>5
       order by confidence desc, canonical_name limit 20`,
  B: `select entity_id, entity_type, canonical_name, description, valid_from, valid_to, confidence, status, legacy_id
       from entities where entity_type='unknown' or confidence < 0.4 or description is null
       order by confidence asc nulls first, canonical_name limit 20`,
  render: (r) => card(r.canonical_name, r.entity_type, [
    ['名称', r.canonical_name], ['类型', r.entity_type], ['描述', r.description], ['有效起', r.valid_from], ['有效止', r.valid_to],
    ['置信度', r.confidence], ['状态', r.status], ['legacy_id', r.legacy_id],
  ]),
};

// relations
tables.relations = {
  label: 'relations（关系候选）',
  noteA: 'A 组：绑定证据最多的关系', noteB: 'B 组：绑定证据最少的关系',
  A: `select r.relation_id, r.predicate, r.confidence, r.status, r.legacy_id,
        se.canonical_name as subject_name, se.entity_type as subject_type, oe.canonical_name as object_name, oe.entity_type as object_type,
        (select count(*) from relation_evidence re where re.relation_id=r.relation_id) as evidence_count,
        (select sr.title from relation_evidence re join evidence e on re.evidence_id=e.evidence_id join source_records sr on e.source_id=sr.source_id where re.relation_id=r.relation_id limit 1) as source_title
       from relations r join entities se on r.subject_id=se.entity_id join entities oe on r.object_id=oe.entity_id
       order by evidence_count desc, r.confidence desc limit 20`,
  B: `select r.relation_id, r.predicate, r.confidence, r.status, r.legacy_id,
        se.canonical_name as subject_name, se.entity_type as subject_type, oe.canonical_name as object_name, oe.entity_type as object_type,
        (select count(*) from relation_evidence re where re.relation_id=r.relation_id) as evidence_count,
        (select sr.title from relation_evidence re join evidence e on re.evidence_id=e.evidence_id join source_records sr on e.source_id=sr.source_id where re.relation_id=r.relation_id limit 1) as source_title
       from relations r join entities se on r.subject_id=se.entity_id join entities oe on r.object_id=oe.entity_id
       order by evidence_count asc, r.confidence asc limit 20`,
  render: (r) => card(`${r.subject_name} → ${r.object_name}`, r.predicate, [
    ['主语对象', `${r.subject_name}（${r.subject_type}）`], ['宾语对象', `${r.object_name}（${r.object_type}）`],
    ['谓词', r.predicate], ['绑定证据数', r.evidence_count], ['置信度', r.confidence], ['状态', r.status],
    ['关联来源', r.source_title], ['legacy_id', r.legacy_id],
  ]),
};

// claims
tables.claims = {
  label: 'claims（断言候选）',
  noteA: 'A 组：置信度最高、有证据绑定的断言', noteB: 'B 组：置信度最低或零证据绑定的断言',
  A: `select c.claim_id, c.predicate, c.object_value, c.certainty, c.status,
        se.canonical_name as subject_name, se.entity_type as subject_type,
        (select count(*) from claim_evidence ce where ce.claim_id=c.claim_id) as evidence_count,
        (select sr.title from claim_evidence ce join evidence e on ce.evidence_id=e.evidence_id join source_records sr on e.source_id=sr.source_id where ce.claim_id=c.claim_id limit 1) as source_title
       from claims c join entities se on c.subject_id=se.entity_id
       where c.certainty is not null order by c.certainty desc, evidence_count desc limit 20`,
  B: `select c.claim_id, c.predicate, c.object_value, c.certainty, c.status,
        se.canonical_name as subject_name, se.entity_type as subject_type,
        (select count(*) from claim_evidence ce where ce.claim_id=c.claim_id) as evidence_count,
        (select sr.title from claim_evidence ce join evidence e on ce.evidence_id=e.evidence_id join source_records sr on e.source_id=sr.source_id where ce.claim_id=c.claim_id limit 1) as source_title
       from claims c join entities se on c.subject_id=se.entity_id
       order by coalesce(c.certainty,0) asc, evidence_count asc limit 20`,
  render: (r) => card(r.subject_name, r.predicate, [
    ['主语对象', `${r.subject_name}（${r.subject_type}）`], ['谓词', r.predicate], ['宾语值', r.object_value],
    ['置信度', r.certainty], ['状态', r.status], ['绑定证据数', r.evidence_count], ['关联来源', r.source_title],
  ]),
};

// visual_assets
tables.visual_assets = {
  label: 'visual_assets（视觉资产）',
  noteA: 'A 组：已建立实体链接最多的图', noteB: 'B 组：无链接或处于 excluded/pending 的图',
  A: `select va.asset_id, va.legacy_id, va.asset_type, va.depicted_period, va.rights, va.eligibility_status, va.created_date, sr.title as source_title, sr.provider,
        (select count(*) from visual_entity_links vel where vel.asset_id=va.asset_id) as link_count
       from visual_assets va join source_records sr on va.source_id=sr.source_id
       order by link_count desc, va.asset_id limit 20`,
  B: `select va.asset_id, va.legacy_id, va.asset_type, va.depicted_period, va.rights, va.eligibility_status, va.created_date, sr.title as source_title, sr.provider,
        (select count(*) from visual_entity_links vel where vel.asset_id=va.asset_id) as link_count
       from visual_assets va join source_records sr on va.source_id=sr.source_id
       where va.eligibility_status in ('excluded','pending_review') or (select count(*) from visual_entity_links vel where vel.asset_id=va.asset_id)=0
       order by link_count asc, va.asset_id limit 20`,
  render: (r) => card(r.legacy_id || r.asset_id, r.asset_type, [
    ['legacy_id', r.legacy_id], ['类型', r.asset_type], ['描绘时期', r.depicted_period], ['权利', r.rights],
    ['资格状态', r.eligibility_status], ['链接数', r.link_count], ['关联来源', r.source_title], ['provider', r.provider], ['创建日期', r.created_date],
  ]),
};

// visual_entity_links
tables.visual_entity_links = {
  label: 'visual_entity_links（图-实体链接）',
  noteA: 'A 组：带证据(evidence 完整)的链接', noteB: 'B 组：无证据或仅镇域 unconfirmed 的链接',
  A: `select vel.link_id, vel.depicted_entity_label, vel.link_status, vel.decision_rule, vel.current_or_historical, vel.eligibility_tags,
        en.canonical_name as entity_name, en.entity_type, va.legacy_id as asset_legacy,
        (select sr.title from evidence e join source_records sr on e.source_id=sr.source_id where e.evidence_id=vel.link_evidence_id) as source_title
       from visual_entity_links vel join entities en on vel.entity_id=en.entity_id join visual_assets va on vel.asset_id=va.asset_id
       where vel.link_evidence_id is not null order by vel.link_status, vel.created_at desc limit 20`,
  B: `select vel.link_id, vel.depicted_entity_label, vel.link_status, vel.decision_rule, vel.current_or_historical, vel.eligibility_tags,
        en.canonical_name as entity_name, en.entity_type, va.legacy_id as asset_legacy,
        (select sr.title from evidence e join source_records sr on e.source_id=sr.source_id where e.evidence_id=vel.link_evidence_id) as source_title
       from visual_entity_links vel join entities en on vel.entity_id=en.entity_id join visual_assets va on vel.asset_id=va.asset_id
       where vel.link_evidence_id is null or vel.link_status='unconfirmed' order by (vel.link_evidence_id is null) desc, vel.created_at desc limit 20`,
  render: (r) => card(r.depicted_entity_label, r.link_status, [
    ['题录对象名', r.depicted_entity_label], ['链接状态', r.link_status], ['实体名', `${r.entity_name}（${r.entity_type}）`],
    ['图 legacy_id', r.asset_legacy], ['判定规则', r.decision_rule], ['古今', r.current_or_historical],
    ['资格标签', r.eligibility_tags], ['关联来源', r.source_title],
  ]),
};

// discovery_candidates
tables.discovery_candidates = {
  label: 'discovery_candidates（发现候选）',
  noteA: 'A 组：关联对象/证据最多的发现候选', noteB: 'B 组：关联对象/证据最少的发现候选',
  A: `select dc.discovery_id, dc.title, dc.relationship_change, dc.relevance_question, dc.humanistic_why, dc.epistemic_status, dc.publishable, dc.generated_by,
        coalesce((select jsonb_array_length(dc.objects) where jsonb_typeof(dc.objects)='array'),0) as obj_count, coalesce(array_length(dc.evidence_refs,1),0) as ev_count, dc.objects
       from discovery_candidates dc order by obj_count desc, ev_count desc limit 20`,
  B: `select dc.discovery_id, dc.title, dc.relationship_change, dc.relevance_question, dc.humanistic_why, dc.epistemic_status, dc.publishable, dc.generated_by,
        coalesce((select jsonb_array_length(dc.objects) where jsonb_typeof(dc.objects)='array'),0) as obj_count, coalesce(array_length(dc.evidence_refs,1),0) as ev_count, dc.objects
       from discovery_candidates dc order by obj_count asc, ev_count asc limit 20`,
  render: (r) => card(r.title, r.epistemic_status, [
    ['标题', r.title], ['关系变化', r.relationship_change], ['关联对象数', r.obj_count], ['证据引用数', r.ev_count],
    ['对象列表', r.objects], ['相关人文问题', r.relevance_question], ['人文价值(why)', r.humanistic_why],
    ['可发布', r.publishable], ['生成者', r.generated_by],
  ]),
};

// knowledge_paths
tables.knowledge_paths = {
  label: 'knowledge_paths（L4 投影路径）',
  noteA: 'A 组：断裂最少(unresolved_breaks 空)的路径', noteB: 'B 组：断裂最多的路径',
  A: `select kp.path_id, kp.title, kp.purpose_question, kp.path_code, kp.status, kp.evidence_coverage, kp.unresolved_breaks
       from knowledge_paths kp order by (kp.unresolved_breaks::text = '[]' or kp.unresolved_breaks is null) desc, kp.created_at desc limit 20`,
  B: `select kp.path_id, kp.title, kp.purpose_question, kp.path_code, kp.status, kp.evidence_coverage, kp.unresolved_breaks
       from knowledge_paths kp order by coalesce(jsonb_array_length(kp.unresolved_breaks),0) desc, kp.created_at desc limit 20`,
  render: (r) => card(r.title, r.path_code, [
    ['标题', r.title], ['路径码', r.path_code], ['目的问题', r.purpose_question], ['状态', r.status],
    ['对象链', r.obj_chain], ['证据覆盖', r.evidence_coverage], ['未决断裂', r.unresolved_breaks],
  ]),
};

// evidence_fragments 60 条重点
const EF_QUERY = `select ef.fragment_id, ef.span_type, ef.quote_fragment, ef.usable_for_claim, e.locator, sr.title as source_title, sr.provider
   from evidence_fragments ef join evidence e on ef.evidence_id=e.evidence_id join source_records sr on e.source_id=sr.source_id
   order by md5(ef.fragment_id::text) limit 60`;

// L3 空表检查（逐表容错）
function countOrMissing(name) {
  try { const r = runSql(`select count(*) as c from ${name}`); return { t: name, c: Number(r[0].c) }; }
  catch (e) { return { t: name, c: '表未建', missing: true }; }
}
const L3 = [countOrMissing('cultural_meaning_candidates'), countOrMissing('cultural_present_connections'), countOrMissing('open_question')];

// 标签字节级解码（个别 knowledge_path_steps.label 含损坏字节，按 UTF8 优先、GBK 兜底）
function decodeLabel(hex) {
  if (!hex) return '';
  const buf = Buffer.from(hex.startsWith('\\x') ? hex.slice(2) : hex, 'hex');
  try { const s = buf.toString('utf8'); if (s.includes('�')) throw 0; return s; }
  catch (e) { return new TextDecoder('gbk').decode(buf); }
}
function enrichPaths(rows) {
  if (!rows.length) return;
  const ids = rows.map(r => r.path_id);
  const inl = ids.map(id => `'${id}'`).join(',');
  const steps = runSql(`select kps.path_id, convert_to(kps.label,'UTF8') as lb from knowledge_path_steps kps where kps.path_id in (${inl}) order by kps.path_id, kps.step_no`);
  const map = {};
  for (const s of steps) { const dec = decodeLabel(s.lb); (map[s.path_id] = map[s.path_id] || []).push(dec); }
  for (const r of rows) r.obj_chain = (map[r.path_id] || []).join(' → ');
}

// ---------- 生成 HTML ----------
let sections = '';
for (const key of Object.keys(tables)) {
  const t = tables[key];
  const a = runSql(t.A), b = runSql(t.B);
  if (key === 'knowledge_paths') { enrichPaths(a); enrichPaths(b); }
  sections += `<section><h2>${esc(t.label)}</h2>
    <p class="grp">A 组（最可能支撑叙事）· ${a.length} 条 — ${esc(t.noteA)}</p>
    <div class="grid">${a.map(t.render).join('')}</div>
    <p class="grp">B 组（最可疑）· ${b.length} 条 — ${esc(t.noteB)}</p>
    <div class="grid">${b.map(t.render).join('')}</div></section>`;
}

// evidence_fragments 60
const ef = runSql(EF_QUERY);
sections += `<section><h2>evidence_fragments（最扎实的原始文本 · 重点 60 条，完整不截断）</h2>
  <p class="grp">抽 60 条跨来源的原文片段，展示方志/语料里到底摘出了什么句子。</p>
  <div class="grid">${ef.map(r => card((r.quote_fragment || '').slice(0, 50) + (r.quote_fragment && r.quote_fragment.length > 50 ? '…' : ''), r.span_type, [
    ['原文（完整）', r.quote_fragment], ['关联来源', r.source_title], ['provider', r.provider], ['locator', r.locator],
    ['可否用于断言', r.usable_for_claim],
  ])).join('')}</div></section>`;

// L3 空表
const l3html = L3.map(r => {
  const empty = !r.missing && Number(r.c) === 0;
  const txt = r.missing ? '<span class="na">表未建（无物理表）</span>' : (empty ? '<span class="na">空（0 行）</span>' : esc(r.c) + ' 行');
  return `<div class="kv"><span class="k">${esc(r.t)}</span><span class="v">${txt}</span></div>`;
}).join('');
// L3 非空表展示真实行（不多不少，按实际条数）
const meaningRows = runSql(`select meaning_id, slice_id, subject_feature_key, interpretive_text, derived_from_claim_ids, epistemic_status, review_status from cultural_meaning_candidates`);
const presentRows = runSql(`select present_id, slice_id, subject_feature_key, connection_type, observed_state, basis_claim_ids, review_status from cultural_present_connections`);
const l3cards = [];
meaningRows.forEach(r => l3cards.push(card(r.subject_feature_key || r.slice_id, 'meaning·' + r.epistemic_status, [
  ['特征键', r.subject_feature_key], ['切片', r.slice_id], ['解释文本', r.interpretive_text], ['来源断言', r.derived_from_claim_ids], ['认知状态', r.epistemic_status], ['审查状态', r.review_status],
])));
presentRows.forEach(r => l3cards.push(card(r.subject_feature_key || r.slice_id, 'present·' + r.connection_type, [
  ['特征键', r.subject_feature_key], ['切片', r.slice_id], ['连接类型', r.connection_type], ['观察状态', r.observed_state], ['来源断言', r.basis_claim_ids], ['审查状态', r.review_status],
])));
const l3CardsHtml = l3cards.length ? `<div class="grid">${l3cards.join('')}</div>` : '';
sections += `<section><h2>L3 意义与当下连接表（空表检查）</h2>
  <div class="card">${l3html}</div>${l3CardsHtml}</section>`;

// 字段说明
const FIELDS = {
  source_records: [['source_id','来源唯一 ID'],['provider','来源提供方(如 hushang_legacy/wikidata/wikimedia_commons)'],['title','来源标题/名称'],['creator','创作者/机构'],['source_date','来源年代'],['content_type','内容类型'],['license_code','许可协议代码'],['source_uri','来源 URL'],['raw_path','原始文件落盘路径'],['metadata_json','原始元数据'],['legacy_id','老项目映射 ID']],
  evidence: [['evidence_id','证据唯一 ID'],['source_id','所属来源(→source_records)'],['evidence_type','证据类型(text/image/...)'],['locator','可定位位置(文件#路径)'],['quote_text','原文引用片段'],['subject_hint','主题提示'],['place_hint','地点提示'],['time_hint','时间提示'],['extraction_method','抽取作业名'],['confidence','置信度'],['verification_status','核验状态(candidate/...)']],
  evidence_fragments: [['fragment_id','片段唯一 ID'],['evidence_id','所属证据'],['span_type','片段类型(generic/...)'],['quote_fragment','最小可引用原文'],['usable_for_claim','可否用于断言(pending/...)'],['usage_note','使用备注']],
  entities: [['entity_id','实体唯一 ID'],['entity_type','类型(place/building/unknown/...)'],['canonical_name','规范名称'],['aliases','别名数组'],['description','描述'],['valid_from/to','有效起止(文本)'],['confidence','置信度'],['status','状态(candidate/...)'],['legacy_id','老项目映射 ID']],
  relations: [['relation_id','关系唯一 ID'],['subject_id','主语实体(→entities)'],['predicate','谓词(如 co_mentioned_in)'],['object_id','宾语实体(→entities)'],['valid_from/to','有效起止'],['confidence','置信度'],['status','状态'],['legacy_id','老项目映射 ID']],
  claims: [['claim_id','断言唯一 ID'],['subject_id','主语实体'],['predicate','谓词'],['object_id','宾语实体'],['object_value','宾语值(jsonb)'],['certainty','确定性'],['status','状态'],['generated_by','生成作业']],
  visual_assets: [['asset_id','图唯一 ID'],['source_id','所属来源'],['asset_type','类型(photo/...)'],['file_path','文件路径'],['created_date','拍摄/创建日期'],['depicted_period','描绘时期'],['rights','权利信息'],['eligibility_status','资格状态'],['eligibility_tags','资格标签数组'],['legacy_id','老项目映射 ID']],
  visual_entity_links: [['link_id','链接唯一 ID'],['asset_id','图(→visual_assets)'],['entity_id','实体(→entities)'],['depicted_entity_label','题录点名的对象标签'],['link_status','链接状态(suspected/unconfirmed)'],['decision_rule','判定规则'],['link_evidence_id','支撑证据(→evidence)'],['current_or_historical','古今判定'],['eligibility_tags','资格标签']],
  discovery_candidates: [['discovery_id','发现候选 ID'],['discovery_code','发现代码'],['title','标题'],['objects','关联对象(jsonb 数组)'],['relationship_change','关系变化'],['evidence_refs','证据引用数组'],['relevance_question','相关人文问题'],['humanistic_why','人文价值说明'],['epistemic_status','认知状态'],['publishable','可否发布'],['generated_by','生成作业']],
  knowledge_paths: [['path_id','路径唯一 ID'],['path_code','路径码(L4-WEAVE)'],['title','标题'],['purpose_question','目的问题'],['status','状态'],['evidence_coverage','证据覆盖(jsonb)'],['unresolved_breaks','未决断裂(jsonb)'],['generated_by','生成作业']],
  'L3(cultural_*)': [['meaning_id/present_id','意义/当下连接唯一 ID'],['slice_id','切片 ID'],['subject_feature_key','主体特征键'],['interpretive_text','解释文本'],['connection_type','连接类型'],['observed_state','观察状态'],['basis_claim_ids','支撑断言数组'],['review_status','审查状态']],
};

let fieldHtml = '';
for (const [k, cols] of Object.entries(FIELDS)) {
  fieldHtml += `<h3>${esc(k)}</h3><table><tr><th>字段</th><th>含义</th></tr>${cols.map(([c, d]) => `<tr><td><code>${esc(c)}</code></td><td>${esc(d)}</td></tr>`).join('')}</table>`;
}

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>原始数据样本报告 · mohen_dev 真库</title>
<style>
:root{--bg:#0f1115;--panel:#171a21;--line:#2a2f3a;--ink:#e8ebf0;--sub:#9aa4b2;--na:#6b7480;--a:#3ecf8e;--b:#f0a44f;}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.55;font-size:13px}
.wrap{max-width:1240px;margin:0 auto;padding:28px 22px 80px}
header{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:6px}
h1{font-size:23px;margin:0 0 4px}h2{font-size:18px;margin:38px 0 4px;padding-left:9px;border-left:4px solid #4f9cf0}
h3{font-size:14px;color:var(--sub);margin:20px 0 6px}
.grp{color:var(--sub);font-size:12.5px;margin:14px 0 8px}
.grp:first-of-type{margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.ct{font-weight:700;font-size:14px;margin-bottom:7px;color:#fff;word-break:break-word}
.badge{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(79,156,240,.18);color:#9cc8f7;vertical-align:middle}
.kv{display:flex;gap:8px;padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.05)}
.kv:last-child{border-bottom:none}
.k{flex:0 0 92px;color:var(--sub);font-size:12px}
.v{flex:1;word-break:break-word;white-space:pre-wrap;font-size:12.5px}
.na{color:var(--na)}code{background:#11141a;padding:1px 5px;border-radius:4px;font-size:11.5px;color:#cdd6e3}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin:6px 0}
th,td{text-align:left;padding:6px 9px;border-bottom:1px solid var(--line)}
th{color:var(--sub);background:#1d212b}
.a-tag{color:var(--a);font-weight:600}.b-tag{color:var(--b);font-weight:600}
.foot{margin-top:40px;color:var(--na);font-size:12px;border-top:1px solid var(--line);padding-top:12px}
</style></head><body><div class="wrap">
<header><h1>原始数据样本报告（mohen_dev 真库直出）</h1>
<div style="color:var(--sub);font-size:13px">导出时间 2026-10-05 · 连接方式 postgresql://postgres@127.0.0.1:5432/mohen_dev · <span class="a-tag">A组=最支撑叙事</span> / <span class="b-tag">B组=最可疑</span> 各 20 条，evidence_fragments 重点 60 条</div></header>
<p style="color:var(--sub);font-size:12.5px">已排除全部审计/治理/溯源类表（evidence_gate_audit、review_queue、legacy_mappings、ingest_runs、human_review_decisions、research_*）。下列均为真实进库数据，未做聚合、未做判断。</p>
${sections}
<section><h2>附：各表字段说明</h2>${fieldHtml}</section>
<div class="foot">本页面为只读样本导出，数据来自生产库 mohen_dev。所有名字/原文均按原样呈现；状态字段（candidate/unconfirmed/suspected 等）表示候选层，非已证成事实。</div>
</div></body></html>`;

writeFileSync('D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0/tasks/results/TASK-DATA-20261004_原始数据样本报告.html', html, 'utf8');
console.log('OK rows:', Object.keys(tables).length, 'tables; ef', ef.length, '; L3', JSON.stringify(L3));
