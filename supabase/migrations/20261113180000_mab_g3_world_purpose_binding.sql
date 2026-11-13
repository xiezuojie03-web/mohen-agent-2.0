-- MAB M5 / ST-04（2026-11-13）：G3 世界门按现行 Gate 合同补齐世界用途授权
--
-- 依据 specs/data-production/gates/gate-contracts.v3.json：
--   G3.purpose_source = "G3.world.v1"
--   G3.purpose_codes  = world.explain_bounded / world.show_original_region /
--                       world.map_anchor_link / world.map_registered_overlay /
--                       world.reconstruct_bounded / world.change_compare /
--                       world.relation_explain
--   G3.purpose_rule   = "G3/G4 exact namespaces retain original semantics;
--                        G0/G1/G2/G5 operations require explicit versioned profile,
--                        unknown -> HOLD"
--
-- 事实：control.gate_reviewer_bindings 中 G3 只有 data-production/m5-remediation/v1
-- 一种用途（M5 生产用途）。D03 候选按设计改绑 world.explain_bounded 后，
-- 既有绑定无法覆盖 → 签发必抛 REVIEWER_BINDING_REQUIRED。
--
-- 本迁移**只补一个用途** world.explain_bounded，理由与范围：
--   * 用途由消费者意图决定（D03 主规 §1：D04 只能消费相匹配的世界判断）。
--     M5 链下游 D04→D05→WATCH 做的是有界解释，即 explain_bounded。
--   * 其余六种用途当前没有任何消费者申请（无地图配准、无原件高清展示需求），
--     按设计"七用途不互相继承"不预先授权，避免无依据扩大机审范围。
--
-- 安全边界（不放松任何一道闸门）：
--   * 复用既有 Reviewer 身份与 Producer 隔离，不新增身份、不合并角色；
--   * 作用域沿用 20261113160000 的规则范围 {"scope_kind":"studio_project"}，
--     判据仍是候选项目必须存在 D00 Y01 需求回执（source.source_needs）；
--   * 有效期 180 天，到期需续，不无限期；
--   * 不改任何 Gate 规则、不改 sign_gate_candidate 逻辑、不标记 GATE_ACTIVE
--     （Gate 合同 §7：Reviewer 身份/机审范围的最终生效仍属原 D/G 治理责任方）。
begin;

insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,
  purpose_code,purpose_version,consumer,allowed_scope,valid_from,valid_until,source_ref,active)
select distinct b.reviewer_user_id,b.db_identity,'G3','world','explain_bounded','v1','producer',
       '{"scope_kind":"studio_project"}'::jsonb, now(),now()+interval '180 days',
       'gate-contracts.v3.json#G3.purpose_codes',true
  from control.gate_reviewer_bindings b
 where b.gate_code='G3' and b.purpose_code='m5-remediation' and b.consumer='producer'
   and b.db_identity in ('mohen_gate_signer_m5_machine','mohen_gate_signer_m5_owner','mohen_gate_signer')
   and b.active
   and not exists(select from control.gate_reviewer_bindings x
                  where x.reviewer_user_id=b.reviewer_user_id and x.db_identity=b.db_identity
                    and x.gate_code='G3' and x.purpose_namespace='world'
                    and x.purpose_code='explain_bounded' and x.purpose_version='v1'
                    and x.consumer='producer' and x.allowed_scope->>'scope_kind'='studio_project'
                    and x.active);

commit;
