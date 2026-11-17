-- Development machine credentials/roles explicit revocation.
-- This intentionally fails if a live session or owned object still depends on
-- the logins; do not CASCADE or silently reset a running business task.
begin;
alter role mohen_m5_producer_login nologin password null;
alter role mohen_m5_worker_login nologin password null;
revoke mohen_producer from mohen_m5_producer_login;
revoke mohen_app_runtime from mohen_m5_worker_login;
drop role if exists mohen_m5_producer_login;
drop role if exists mohen_m5_worker_login;
commit;
