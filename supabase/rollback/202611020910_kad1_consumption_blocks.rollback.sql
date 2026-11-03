-- Safe rollback closes public consumption; it must not resurrect a blocked qualification.
begin;
revoke execute on function control.request_consumption_block(text,uuid,text) from mohen_app_runtime;
create or replace function control.qualification_allows(uuid,text,text,text,text,jsonb) returns boolean
language sql stable security definer set search_path=pg_catalog as $$select false$$;
-- Preserve blocks and all signed history; restore only after authorized policy reconciliation.
commit;
