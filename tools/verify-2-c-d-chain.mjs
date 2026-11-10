// 校验 M5 批次C D02-D05 私有候选链落库行（本地隔离 PG）。只读校验，
// 不改数据；失败即打印具体字段并输出 VERIFY_2_C_ALL_FAIL。
// 选择器钉住批次 C（第一链）对象：项目内后续批次（CP2-E 第二链 0004 原件等）会在同表
// 追加更新行，"取最新一行"会误选；本脚本只断言批次 C 链的字段真值，后续链另有自己的验证。
import { queryRows, getNodePgPool } from "../packages/data-access/src/index.mjs";

const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const ORIGINAL = "b0a11000-0000-4000-8000-000000000002";
const PAGE_SHA256 = "99dae89a9c8f2b6951aff32be91eee4dc1c8b8887caacbb5475bab0caeb5f7b4";

let failed = 0;
const expect = (label, ok) => { if (!ok) { failed += 1; console.log("FAIL", label); } };
const isUuid = (v) => typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);

// D02: material_evidence + observation link + derived reading_unit。
const ev = await queryRows(`select e.evidence_id::text, e.source_voice, e.evidence_type, e.modality,
  e.literal_reading, e.input_fingerprint, e.maturity::text, e.evidence_version_no::text,
  e.extraction_method->>'method' as method, e.extraction_method->>'qualification' as qualification,
  e.uncertainty->>'qualification' as uncertainty_qualification,
  l.link_id::text, l.link_version, l.allowed_purpose, l.locator_schema_version, l.quote_snapshot_hash,
  l.byte_verification_receipt->>'key_version' as receipt_key,
  ru.reading_unit_id::text, ru.primary_h_type, ru.classification_status, ru.unit_kind, ru.taxonomy_version
  from evidence.material_evidence e
  join evidence.read_unit_evidence_links l on l.evidence_id=e.evidence_id
  join evidence.reading_units ru on ru.reading_unit_id=e.reading_unit_id
  where l.link_version='mab.private-material-observation.v1'
    and e.evidence_type='gazetteer_tax_quota_observation'
  order by e.created_at asc limit 1`);
const e0 = ev[0];
if (!e0) { failed += 1; console.log("FAIL D02 evidence/link rows missing"); }
else {
  expect("D02 source_voice", e0.source_voice === "official_gazetteer");
  expect("D02 evidence_type", e0.evidence_type === "gazetteer_tax_quota_observation");
  expect("D02 modality", e0.modality === "page_image");
  expect("D02 literal_reading", e0.literal_reading === "均科正耗平米三斗六升五合以下低田等准熟起科同");
  expect("D02 method H05", e0.method === "H05");
  expect("D02 qualification UNASSESSED", e0.qualification === "UNASSESSED");
  expect("D02 uncertainty UNASSESSED", e0.uncertainty_qualification === "UNASSESSED");
  expect("D02 maturity candidate", e0.maturity === "candidate");
  expect("D02 evidence_version_no 1", e0.evidence_version_no === "1");
  expect("D02 input_fingerprint 64hex", /^[a-f0-9]{64}$/.test(e0.input_fingerprint ?? ""));
  expect("D02 link purpose", e0.allowed_purpose === "private_research_candidate");
  expect("D02 locator schema", e0.locator_schema_version === "scanned_page/v1");
  expect("D02 quote_snapshot_hash = original sha", e0.quote_snapshot_hash === PAGE_SHA256);
  expect("D02 receipt key present", typeof e0.receipt_key === "string" && e0.receipt_key.length > 0);
  expect("D02 reading unit H05", e0.primary_h_type === "H05");
  expect("D02 reading unit candidate", e0.classification_status === "candidate");
  expect("D02 reading unit page", e0.unit_kind === "page");
  expect("D02 taxonomy version", e0.taxonomy_version === "mohka-d02-h-classification.v1");
}

// D03: change + claim_revision + claim_evidence_link。
const cl = await queryRows(`select c.change_id::text, c.change_type,
  c.expression_rule->>'method' as rule_method,
  c.expression_rule->>'qualification' as rule_qualification,
  cr.claim_revision_id::text, cr.subject_kind, cr.revision_no::text, cr.producer_method_id,
  cr.assertion_payload_json->>'project_id' as project_id,
  cr.assertion_payload_json->>'method' as payload_method,
  cr.assertion_payload_json->>'qualification' as payload_qualification,
  cr.assertion_payload_json->'evidence_ids'->>0 as evidence_id,
  cr.assertion_payload_json->>'original_id' as original_id,
  cel.claim_evidence_link_id::text, cel.claim_object_type, cel.support_type, cel.note
  from world.claim_revisions cr
  join world.changes c on c.change_id=cr.subject_id
  join world.claim_evidence_links cel on cel.claim_revision_id=cr.claim_revision_id
  where cr.producer_method_id='W07' and c.change_type='taxation_quota_assessment'
  order by cr.authored_at asc limit 1`);
const c0 = cl[0];
if (!c0) { failed += 1; console.log("FAIL D03 claim rows missing"); }
else {
  expect("D03 change_type", c0.change_type === "taxation_quota_assessment");
  expect("D03 rule method W07", c0.rule_method === "W07");
  expect("D03 rule qualification UNASSESSED", c0.rule_qualification === "UNASSESSED");
  expect("D03 subject_kind change", c0.subject_kind === "change");
  expect("D03 revision_no 1", c0.revision_no === "1");
  expect("D03 producer_method_id W07", c0.producer_method_id === "W07");
  expect("D03 payload project", c0.project_id === PROJECT);
  expect("D03 payload method W07", c0.payload_method === "W07");
  expect("D03 payload qualification UNASSESSED", c0.payload_qualification === "UNASSESSED");
  expect("D03 payload original", c0.original_id === ORIGINAL);
  expect("D03 evidence cites D02 evidence", e0 && c0.evidence_id === e0.evidence_id);
  expect("D03 link object type", c0.claim_object_type === "change");
  expect("D03 support_type", c0.support_type === "supports");
  expect("D03 link note candidate", typeof c0.note === "string" && c0.note.includes("UNASSESSED"));
}

// D04: meaning.findings（A06）。
const f = await queryRows(`select finding_id::text, finding_type, human_question, maturity::text,
  discovery_method->>'method_id' as method,
  discovery_method->>'qualification' as qualification,
  uncertainty->>'qualification' as uncertainty_qualification,
  supporting_world_objects->0->>'kind' as ref_kind,
  supporting_world_objects->0->>'id' as ref_id
  from meaning.findings
  where discovery_method->>'method_id'='A06'
    and supporting_world_objects->0->>'id' in (
      select cr.claim_revision_id::text from world.claim_revisions cr
      join world.changes c on c.change_id=cr.subject_id
      where cr.producer_method_id='W07' and c.change_type='taxation_quota_assessment')
  order by created_at asc limit 1`);
const f0 = f[0];
if (!f0) { failed += 1; console.log("FAIL D04 finding rows missing"); }
else {
  expect("D04 finding_type institutional_mechanism", f0.finding_type === "institutional_mechanism");
  expect("D04 method A06", f0.method === "A06");
  expect("D04 qualification UNASSESSED", f0.qualification === "UNASSESSED");
  expect("D04 uncertainty UNASSESSED", f0.uncertainty_qualification === "UNASSESSED");
  expect("D04 maturity candidate", f0.maturity === "candidate");
  expect("D04 cites claim_revision", f0.ref_kind === "claim_revision");
  expect("D04 cites D03 claim", c0 && f0.ref_id === c0.claim_revision_id);
}

// D05: read_model.world_projections（P02）。
const p = await queryRows(`select projection_id::text, projection_key,
  payload->>'schema' as payload_schema,
  payload->>'qualification' as payload_qualification,
  payload->'body'->>'title' as title,
  payload->>'finding_id' as payload_finding_id,
  payload->>'original_id' as payload_original_id,
  array_to_string(derived_from_finding_ids, ',') as derived,
  expression_rule->>'method_id' as method,
  expression_rule->>'qualification' as rule_qualification
  from read_model.world_projections
  where expression_rule->>'method_id'='P02' and projection_key='m5.songjiang.tianze.quota-rule.v1'
  order by generated_at desc limit 1`);
const p0 = p[0];
if (!p0) { failed += 1; console.log("FAIL D05 projection rows missing"); }
else {
  expect("D05 projection_key", p0.projection_key === "m5.songjiang.tianze.quota-rule.v1");
  expect("D05 payload schema", p0.payload_schema === "mohen.private-world-projection.v1");
  expect("D05 payload qualification UNASSESSED", p0.payload_qualification === "UNASSESSED");
  expect("D05 body title", p0.title === "松江府田赋科则投影（候选）");
  expect("D05 payload original", p0.payload_original_id === ORIGINAL);
  expect("D05 derives from D04 finding", f0 && p0.payload_finding_id === f0.finding_id);
  expect("D05 derived array = D04 finding", f0 && p0.derived === f0.finding_id);
  expect("D05 method P02", p0.method === "P02");
  expect("D05 rule qualification UNASSESSED", p0.rule_qualification === "UNASSESSED");
}

console.log("rows:", JSON.stringify({ d02: isUuid(e0?.evidence_id ?? ""), d03: isUuid(c0?.claim_revision_id ?? ""),
  d04: isUuid(f0?.finding_id ?? ""), d05: isUuid(p0?.projection_id ?? "") }));
await getNodePgPool().end();
console.log(failed === 0 ? "VERIFY_2_C_ALL_PASS" : `VERIFY_2_C_ALL_FAIL (${failed})`);
