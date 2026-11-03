begin;
revoke execute on function control.kad1_change_account(uuid,uuid,text[],text) from mohen_app_runtime;
-- Keep accounts unchanged; do not restore racy legacy mutations.
commit;
