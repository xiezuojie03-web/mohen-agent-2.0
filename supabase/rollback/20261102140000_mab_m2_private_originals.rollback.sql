-- Fail closed. Do not delete originals, immutable revisions, pending recovery
-- receipts or object bytes; disable the application feature flag first.
begin;
revoke all on studio.private_originals from mohen_app_runtime,public,anon,authenticated,service_role;
revoke update(state,asset_revision_id,verified_at) on studio.private_originals from mohen_app_runtime;
commit;
