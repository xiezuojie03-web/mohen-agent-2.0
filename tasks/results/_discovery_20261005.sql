-- ============================================================
-- 断点修复 · 目标发现（dry-run，仅查询，不修改）
-- 用途：在执行任何 remediation 前，确认可精确识别的目标集合
-- ============================================================

-- 1) 模板化发现：humanistic_why 一字不差重复
SELECT 'templated_discovery' AS target, count(*) AS n
FROM discovery_candidates
WHERE humanistic_why = '一手语料中多实体同现，是宗族/人物/地方结构叙事的潜在原料；须经 C3 编织与门禁判定。';

-- 2) 共现关系：confidence = 0.2 的"关联候选"被误落为关系
SELECT 'cooccurrence_relation' AS target, predicate, count(*) AS n
FROM relations WHERE confidence = 0.2 GROUP BY predicate ORDER BY n DESC;

-- 3) 诗词碎片实体：来自 verify_souyun 类来源的 2–3 字分词
-- 3a. 先看 entities.legacy_id 是否带 souyun 线索
SELECT 'entity_legacy_sample' AS k, legacy_id, entity_type, canonical_name
FROM entities WHERE legacy_id ILIKE '%souyun%' LIMIT 10;

SELECT 'souyun_entity_count' AS k, count(*) AS n
FROM entities WHERE legacy_id ILIKE '%souyun%';

-- 3b. 若 legacy_id 无线索，检查是否存在 entity↔source 桥表
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name ILIKE '%claim%';

-- 4) 总体基线
SELECT 'total_entities' AS k, count(*) FROM entities;
SELECT 'total_relations' AS k, count(*) FROM relations;
SELECT 'total_discovery' AS k, count(*) FROM discovery_candidates;
