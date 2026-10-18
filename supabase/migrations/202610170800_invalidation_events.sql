-- ============================================================================
-- 字段级改库补充（2026-10-17 第三批）：建 control.invalidation_events
-- 依据：method-binding-contract.json P08 output_contract = ["control.invalidation_event"]
--       契约 P5 §9.4 —— P08 输出 change_event_ref / changed_dependency_ref /
--       affected_publication_revisions / affected_purpose_scope_consumers /
--       dependency_paths / reason / suspension_request / recheck_request
--       computePreciseInvalidation（invalidation.mjs）返回结构与之对齐。
-- 性质：纯建表；P08 精准失效是控制层职责（P5 §9.4："控制请求及审计属于 control 职责，
--       不成为第七类 L5 内容"），不并入 L5 六表。
-- 回滚：supabase/rollback/202610170800_invalidation_events.rollback.sql
-- ============================================================================
BEGIN;

CREATE TABLE control.invalidation_events (
  invalidation_event_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_event_ref               jsonb NOT NULL DEFAULT '{}',
  changed_dependency_ref         jsonb NOT NULL DEFAULT '{}',   -- {type,id,version}
  affected_publication_revisions jsonb NOT NULL DEFAULT '[]',   -- 受影响 L5 修订集合
  affected_purpose_scope_consumers jsonb NOT NULL DEFAULT '[]', -- 受影响 用途×范围×消费者 分面
  dependency_paths               jsonb NOT NULL DEFAULT '[]',   -- 反向依赖路径
  reason                         text,
  suspension_request             jsonb,                          -- 暂停请求
  recheck_request                jsonb,                          -- 重审请求
  disposition                    text NOT NULL DEFAULT 'UNASSESSED',  -- UNASSESSED/BLOCKED（见 computePreciseInvalidation）
  unknown_dependency             boolean NOT NULL DEFAULT false, -- 失败关闭标记（未知依赖≠无依赖）
  producer_method_id             text NOT NULL,                  -- P08
  producer_method_version        text,
  created_at                     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invalidation_events_dependency
  ON control.invalidation_events ((changed_dependency_ref->>'type'), (changed_dependency_ref->>'id'));

COMMIT;
