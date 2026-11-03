-- Fail-closed rollback: preserve revocation tombstones and session floor.
-- Never disable the application revocation check or restore older auth code
-- after activation without invalidating ALL previously signed browser tokens.
begin;
revoke all on control.web_session_revocations from public,mohen_app_runtime,mohen_producer,mohen_gate_signer;
commit;
