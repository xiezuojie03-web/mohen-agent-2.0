-- =====================================================================
-- 墨痕｜行级安全（RLS）完整可执行脚本 · 001
-- 状态：DRAFT_NOT_APPLIED（尚未执行；执行前须 Owner 单独确认目标库：本机 mohen_dev 或云端 mohen-cloud）
-- 决策依据：2026-10-28 Owner 选 B —— 先 1 个运营账号管"作品审核"+"知识签字"；
--           知识签字短期无人管，主要靠生产链机器 Gate(G0—G5) 自动把关。
-- 性能：PostgreSQL 原生 RLS 为查询期透明过滤（非排队锁），单查询开销微秒级，
--       对墨痕"少量创作者 + 公众观看/探索"并发量级无可感知影响。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 一、角色约定（Supabase auth 模型）
-- ---------------------------------------------------------------------
-- anon / authenticated : 公众未登录 / 已登录（对应 auth.role()）
-- operator            : 运营负责人（auth 接入后以用户元数据/角色授予；当前先 1 个账号）
-- reviewer            : 独立知识签字（暂不配置，未来再拆）
-- service_role        : 生产链 Runner 与 Next.js API 服务端，BYPASS RLS（唯一合法直通通道）

-- ---------------------------------------------------------------------
-- 二、核心策略（2026-10-28 Owner 纠正后的理念）
-- ---------------------------------------------------------------------
-- 理念：数据生产链每一步（D00—D05）都有独立 Gate（G0—G5）、都能签发资格；
--       各层数据（L0—L5）按"用途 / 范围 / 消费者 / 版本 / 时效"被对应消费者
--       "有限使用"，并非只有 L5 发布层才能被消费。
-- RLS 只约束"外部角色（公众 / 登录用户）直连数据库"这一条路径：
--   · 公众（anon）直连 → 只读 L5 发布层（read_model 六表，已发布合格内容）；
--   · 系统内部各消费者（Agent 读 L5 agent_contexts、视觉舞台读 visual_stage 分面、
--     生产链读 L0—L4 等）→ 走 service 通道 + 应用层"资格分面"检查，
--     按 G0—G5 各自有限使用，不受此处 public 策略影响；
--   · 其余 36 表不向公众直开，但不等于"锁死不用"——它们由系统内部按阶段资格持续有限使用。
-- operator 的"作品审核写"（control.owner_reviews）待 auth 系统接入后细化，
--             届时以 operator 角色授 SELECT/INSERT/UPDATE owner_reviews，此处先占位注释。

-- ---------------------------------------------------------------------
-- 三、read_model 六表：启用 RLS + 公众只读
-- ---------------------------------------------------------------------
ALTER TABLE read_model.world_projections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_model.agent_contexts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_model.story_seeds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_model.discovery_paths          ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_model.map_timeline_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_model.evidence_pointers        ENABLE ROW LEVEL SECURITY;

CREATE POLICY rm_world_projections_public_read ON read_model.world_projections
  FOR SELECT USING (true);
CREATE POLICY rm_agent_contexts_public_read ON read_model.agent_contexts
  FOR SELECT USING (true);
CREATE POLICY rm_story_seeds_public_read ON read_model.story_seeds
  FOR SELECT USING (true);
CREATE POLICY rm_discovery_paths_public_read ON read_model.discovery_paths
  FOR SELECT USING (true);
CREATE POLICY rm_map_timeline_public_read ON read_model.map_timeline_projections
  FOR SELECT USING (true);
CREATE POLICY rm_evidence_pointers_public_read ON read_model.evidence_pointers
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------
-- 四、其余 36 表：仅启用 RLS（默认拒绝 public，service_role 直通）
-- ---------------------------------------------------------------------
-- control（4）
ALTER TABLE control.production_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE control.gate_audits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE control.owner_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE control.invalidation_events  ENABLE ROW LEVEL SECURITY;

-- source（7）
ALTER TABLE source.sources                ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.source_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.raw_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.read_runs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.read_units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.read_quality_checks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.read_handoffs          ENABLE ROW LEVEL SECURITY;

-- evidence（6）
ALTER TABLE evidence.material_evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.read_unit_evidence_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.reading_units               ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.classification_decisions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.material_mentions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.reading_unit_dependencies   ENABLE ROW LEVEL SECURITY;

-- world（15）
ALTER TABLE world.entities                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.events                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.relation_claims            ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.changes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.historical_space_claims    ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.visual_objects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.claim_evidence_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.conflicts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.claim_revisions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.identity_decisions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.identity_decision_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.dependency_edges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.provenance_assessments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.event_participations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.world_decision_events      ENABLE ROW LEVEL SECURITY;

-- meaning（4）
ALTER TABLE meaning.findings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE meaning.present_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meaning.open_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meaning.claim_revisions     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 五、operator 写权限（auth 系统接入后细化，当前占位说明）
-- ---------------------------------------------------------------------
-- 作品审核：operator 对 control.owner_reviews 增/改自己的审核记录；
-- 知识签字：operator 短期内只"查看" control.gate_audits 的机器 Gate 结果，
--           不建 operator 对 gate_audits 的写策略（机器自动把关，人工签字未来拆 reviewer）。
-- 届时追加：
--   CREATE POLICY owner_reviews_operator_write ON control.owner_reviews
--     FOR ALL TO authenticated USING (auth.uid() IN (SELECT ... operator ...));

-- ---------------------------------------------------------------------
-- 六、回滚（整批安全可逆，不触碰任何行数据）
-- ---------------------------------------------------------------------
-- DROP POLICY IF EXISTS rm_world_projections_public_read ON read_model.world_projections;
-- ...（其余 5 条 rm_* 同法）
-- ALTER TABLE read_model.world_projections DISABLE ROW LEVEL SECURITY;
-- ...（其余 41 表同法 DISABLE）
