-- D00-C5（2026-11-10）：获取方法目录的"当前有效性"可以推进，定义仍然不可改写。
--
-- 背景：20261110110000 已授予 mohen_private_worker 对
-- (method_state, last_revalidated_at, recommended, alternatives) 的列级 update，
-- 但没有对应的 RLS update 策略，默认拒绝使该授权实际不可用：
-- 一条方法第一次登记时若失败（TESTED_FAILURE），此后真实成功也无法推进状态，
-- 账上会长期留着与事实相反的"当前状态"。本迁移只补策略，不改任何既有数据与定义约束。
--
-- 边界：定义列（resource_scope/access_mode/preconditions/steps/success_criteria/
-- failure_modes）仍由 source.guard_acquisition_method_mutation() 拒绝改写；
-- 更新只允许这四列，且不新增删除能力。

drop policy if exists acquisition_methods_worker_update on source.acquisition_methods;
create policy acquisition_methods_worker_update on source.acquisition_methods for update
  to mohen_private_worker using (true) with check (true);

comment on policy acquisition_methods_worker_update on source.acquisition_methods is
 'Y07：只允许推进 method_state/last_revalidated_at/recommended/alternatives；定义列由触发器拒绝改写。';
