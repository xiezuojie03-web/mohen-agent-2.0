-- Non-destructive rollback: close new route and privileges; retain all user data and the expanded key.
-- Restoring the old work_id-only writer would mix users and is not a legal rollback.
begin;
revoke insert,update on public.watch_sessions from mohen_app_runtime;
-- Keep SELECT protected by owner RLS; keep columns/index/history for recovery and export.
commit;
