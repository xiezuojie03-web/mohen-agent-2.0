-- GAP_GATE_AUDITS_RLS 修复（Owner 2026-11-10 裁决：专项批次）：
-- control.gate_audits 从未执行 "alter table ... enable row level security"，
-- 故 20261107210000 建的 k3_private_worker_gate_audit_read 策略挂空，
-- mohen_private_worker 实测可读全部审计行（含 legacy_untrusted 与其他消费者行）。
-- 本迁移启用 RLS 并一次补齐现有读身份的策略，保持既有读面不变：
--   mohen_gate_authority          —— k3_authority（既有，using true）
--   mohen_gate_signer             —— 既有 NOLOGIN signer group；未绑定登录身份
--   mohen_private_worker          —— k3_private_worker_gate_audit_read（既有，启用后生效）
-- 不启用 FORCE ROW LEVEL SECURITY：表属主 k3_admin 保持绕过，
-- SECURITY DEFINER 的 sign/revoke 函数继续以属主身份写审计。

begin;

alter table control.gate_audits enable row level security;

drop policy if exists k3_gate_signer_audit_read on control.gate_audits;
create policy k3_gate_signer_audit_read on control.gate_audits
  for select to mohen_gate_signer
  using (true);

commit;
