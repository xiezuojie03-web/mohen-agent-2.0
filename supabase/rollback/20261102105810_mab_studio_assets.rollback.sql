-- Fail closed; preserve permanent asset/receipt rows and immutable history.
-- Re-enable only after a new reviewed migration and positive/negative tests.
begin;
revoke all on all tables in schema studio from mohen_app_runtime;
revoke all on schema studio from mohen_app_runtime;
commit;
