-- ============================================================
-- 断点修复 · 数据层 remediation（可逆前缀标记，非破坏）
-- 设计：所有改动用前缀标记写在 text 列上，原值保留在字符串内，
--       撤销只需 STRIP 前缀（见 _remediation_rollback_20261005.sql）
-- 运行：psql ... -v ON_ERROR_STOP=1 -f 本文件
-- ============================================================

BEGIN;

-- (1) 模板化发现：排除出 publishable（保留溯源；布尔可回滚）
UPDATE discovery_candidates
SET publishable = false
WHERE humanistic_why = '一手语料中多实体同现，是宗族/人物/地方结构叙事的潜在原料；须经 C3 编织与门禁判定。';

-- (2) 共现关系：降级为关联候选（predicate 加可逆前缀，原值保留）
UPDATE relations
SET predicate = '[ASSOC_CANDIDATE]' || predicate
WHERE confidence = 0.2;

-- (3) 诗词/分词碎片实体：标记排除出实体表（entity_type 加可逆前缀，原值保留）
--     范围 = 与任一 souyun 来源证据关联的 46 个实体（4 个 souyun 来源家族）
UPDATE entities
SET entity_type = '[SOUYUN_FRAGMENT]' || entity_type
WHERE entity_id IN (
  SELECT DISTINCT e.entity_id
  FROM claims c
  JOIN claim_evidence ce ON ce.claim_id = c.claim_id
  JOIN evidence ev ON ev.evidence_id = ce.evidence_id
  JOIN source_records sr ON sr.source_id = ev.source_id
  JOIN entities e ON e.entity_id = c.subject_id
  WHERE sr.title ILIKE '%souyun%'
);

-- 校验（应分别 = 1138 / 2923 / 46）
SELECT 'templated_off'     AS k, count(*) AS n FROM discovery_candidates WHERE publishable = false AND humanistic_why = '一手语料中多实体同现，是宗族/人物/地方结构叙事的潜在原料；须经 C3 编织与门禁判定。';
SELECT 'cooc_downgraded'   AS k, count(*) AS n FROM relations WHERE predicate LIKE '[ASSOC_CANDIDATE]%';
SELECT 'poetry_marked'     AS k, count(*) AS n FROM entities WHERE entity_type LIKE '[SOUYUN_FRAGMENT]%';

COMMIT;
