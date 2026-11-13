-- MAB M5（2026-11-13）：机器评审的阅读范围不再写死 CP1 样本项目。
--
-- 实测事实：studio.private_originals 的 m5_machine_reviewer_read 策略谓词是
--   project_id = 'b0a11000-0000-4000-8000-000000000001'
-- 于是任何新建项目（通用入口产出的非模板题材）的 G0 候选，评审查权利记录恒返回空集，
-- 机器评审一律 `rights_record_missing` —— 只有那一座样板项目能过门，与"任意题材可跑通"直接冲突。
--
-- 改为：评审只读范围跟着"当前有待评审候选的项目"走。不放开任何写权限，
-- 不改变 Gate 规则与检查项；候选一经 CONSUMED/HOLD 或被替换，可见性自然收回。
drop policy if exists m5_machine_reviewer_read on studio.private_originals;

create policy m5_machine_reviewer_read on studio.private_originals
  for select to mohen_gate_signer_m5_machine
  using (
    project_id in (
      select distinct (c.allowed_scope ->> 'project_id')::uuid
        from control.gate_candidates c
       where c.consumer = 'producer'
         and c.candidate_status = 'SUBMITTED'
    )
  );
