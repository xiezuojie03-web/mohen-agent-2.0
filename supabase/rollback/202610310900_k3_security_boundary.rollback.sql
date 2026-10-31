-- Safety rollback: remove the new login paths, preserving rows, ownership,
-- key material and audit history. Never restore anonymous broad grants or disable RLS.
begin;
revoke all on public.imported_materials, public.conversations from mohen_app_runtime;
revoke all on function control.current_app_user_id() from mohen_app_runtime;
revoke all on control.gate_audits from mohen_producer, mohen_app_runtime, mohen_gate_signer;
commit;
