-- ============================================================
-- 断点修复 · 撤销脚本（如需回滚，运行本文件）
-- 仅 STRIP 前缀，恢复原值；publishable 复位为 true
-- ============================================================

BEGIN;

UPDATE relations
SET predicate = replace(predicate, '[ASSOC_CANDIDATE]', '')
WHERE predicate LIKE '[ASSOC_CANDIDATE]%';

UPDATE entities
SET entity_type = replace(entity_type, '[SOUYUN_FRAGMENT]', '')
WHERE entity_type LIKE '[SOUYUN_FRAGMENT]%';

UPDATE discovery_candidates
SET publishable = true
WHERE humanistic_why = '一手语料中多实体同现，是宗族/人物/地方结构叙事的潜在原料；须经 C3 编织与门禁判定。';

COMMIT;
