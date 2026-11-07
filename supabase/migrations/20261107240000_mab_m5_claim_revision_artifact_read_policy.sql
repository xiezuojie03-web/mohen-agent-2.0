-- MAB M5: 补齐 control.artifact_revision_for('claim_revision', …) 所需的 RLS 读取策略。
-- 20261107200000 只授予 mohen_gate_authority 对 world.claim_revisions 的 select，
-- 但该表启用了 RLS 且无对应该角色的策略，致 SECURITY DEFINER 读不到行、
-- D03 候选的 artifact_revision 恒为 null（PRIVATE_WORLD_CLAIM_NOT_PERSISTED）。
-- 与 202611010900 的 k3_artifact_read 模式保持一致：只读、只授该角色。
drop policy if exists k3_artifact_read on world.claim_revisions;
create policy k3_artifact_read on world.claim_revisions for select to mohen_gate_authority using(true);
