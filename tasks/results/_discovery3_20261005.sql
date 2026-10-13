-- ============================================================
-- 诗词/分词碎片实体识别（corrected join）· dry-run
-- 路径：entities(subject/object of claims) <- claim_evidence <- evidence <- souyun sources
-- ============================================================

-- 计数：与任一 souyun 来源证据关联的实体（去重）
SELECT count(DISTINCT e.entity_id) AS souyun_linked_entities
FROM claims c
JOIN claim_evidence ce ON ce.claim_id = c.claim_id
JOIN evidence ev ON ev.evidence_id = ce.evidence_id
JOIN source_records sr ON sr.source_id = ev.source_id
JOIN entities e ON e.entity_id = c.subject_id
WHERE sr.title ILIKE '%souyun%';

-- 抽样：看这些实体长什么样
SELECT e.entity_id, e.canonical_name, e.entity_type, e.status::text
FROM claims c
JOIN claim_evidence ce ON ce.claim_id = c.claim_id
JOIN evidence ev ON ev.evidence_id = ce.evidence_id
JOIN source_records sr ON sr.source_id = ev.source_id
JOIN entities e ON e.entity_id = c.subject_id
WHERE sr.title ILIKE '%souyun%'
ORDER BY e.canonical_name
LIMIT 50;
