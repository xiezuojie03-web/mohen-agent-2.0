create or replace function control.sha256_bytes(p_data bytea)
returns bytea
language sql
immutable strict
set search_path to 'pg_catalog'
as $function$ select pg_catalog.sha256(p_data) $function$;
