-- ============================================================
-- 诗词碎片实体识别（dry-run，仅查询）
-- 路径：entities <- claims <- claim_evidence <- evidence <- source_records(verify_souyun)
-- ============================================================

-- claims 表结构
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'claims' ORDER BY ordinal_position;

-- verify_souyun 来源
SELECT source_id, title
FROM source_records
WHERE title ILIKE '%souyun%';

-- 经 claims 桥关联到 verify_souyun 来源的实体数（去重）
SELECT count(DISTINCT c.entity_id) AS poetry_linked_entities
FROM claims c
JOIN claim_evidence ce ON ce.claim_id = c.claim_id
JOIN evidence e ON e.evidence_id = ce.evidence_id
JOIN source_records sr ON sr.source_id = e.source_id
WHERE sr.title ILIKE '%souyun%';

-- 抽样这些实体的特征（确认是 2–3 字分词碎片）
SELECT e.entity_id, e.canonical_name, e.entity_type, e.status::text
FROM entities e
WHERE e.entity_id IN (
  SELECT DISTINCT c.entity_id
  FROM claims c
  JOIN claim_evidence ce ON ce.claim_id = c.claim_id
  JOIN evidence ev ON ev.evidence_id = ce.evidence_id
  JOIN source_records sr ON sr.source_id = ev.source_id
  WHERE sr.title ILIKE '%souyun%'
)
LIMIT 30;
