-- K3 additive migration. Apply only in an explicitly authorized environment.
-- No secret is supplied here. Runtime identity stays denied until a trusted
-- provisioner binds the existing HMAC session verification key privately.
begin;

do $$
begin
  if not exists(select from pg_roles where rolname='mohen_app_runtime') then
    create role mohen_app_runtime nologin nosuperuser nobypassrls;
  end if;
  if not exists(select from pg_roles where rolname='mohen_producer') then
    create role mohen_producer nologin nosuperuser nobypassrls;
  end if;
  if not exists(select from pg_roles where rolname='mohen_gate_signer') then
    create role mohen_gate_signer nologin nosuperuser nobypassrls;
  end if;
  if exists(select from pg_roles where rolname in ('mohen_app_runtime','mohen_producer','mohen_gate_signer')
            and (rolsuper or rolbypassrls)) then
    raise exception 'K3_ROLE_PRIVILEGE_PREFLIGHT_FAILED';
  end if;
  if exists(select from pg_auth_members m join pg_roles r on r.oid=m.member
            where r.rolname in ('mohen_app_runtime','mohen_producer','mohen_gate_signer')) then
    raise exception 'K3_ROLE_MEMBERSHIP_PREFLIGHT_FAILED';
  end if;
  if exists(select from pg_class c join pg_roles r on r.oid=c.relowner
            where r.rolname in ('mohen_app_runtime','mohen_producer','mohen_gate_signer')
              and c.oid in ('control.gate_audits'::regclass,'public.imported_materials'::regclass,'public.conversations'::regclass)) then
    raise exception 'K3_ROLE_OWNERSHIP_PREFLIGHT_FAILED';
  end if;
end $$;

create table if not exists control.session_verification_keys (
  key_slot boolean primary key default true check(key_slot),
  verification_key text not null check(length(verification_key)>=32),
  provisioned_at timestamptz not null default now()
);
alter table control.session_verification_keys enable row level security;
revoke all on control.session_verification_keys from public, mohen_app_runtime, mohen_producer, mohen_gate_signer;

-- A bare user-id GUC or Supabase auth.uid() cannot authenticate this project's
-- own public.users UUIDs. Verify the actual signed session and current account.
create or replace function control.current_app_user_id() returns uuid
language plpgsql stable security definer set search_path=pg_catalog as $$
declare
  token text := current_setting('mohen.session_token',true);
  payload text; signature text; expected text; key_value text; claims jsonb; subject uuid; crypto_schema text;
begin
  if token is null or token !~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' or length(token)>8192 then return null; end if;
  select verification_key into key_value from control.session_verification_keys where key_slot=true;
  if key_value is null then return null; end if;
  payload := split_part(token,'.',1); signature := split_part(token,'.',2);
  select n.nspname into crypto_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
  if crypto_schema is null then return null; end if;
  execute format('select rtrim(translate(encode(%I.hmac($1,$2,''sha256''),''base64''),''+/'',''-_''),''='')',crypto_schema)
    into expected using convert_to(payload,'UTF8'),convert_to(key_value,'UTF8');
  if signature<>expected then return null; end if;
  claims := convert_from(decode(translate(payload,'-_','+/') || repeat('=',(4-length(payload)%4)%4),'base64'),'UTF8')::jsonb;
  if jsonb_typeof(claims->'exp') is distinct from 'number' or
     (claims->>'exp')::numeric<=extract(epoch from statement_timestamp())*1000 then return null; end if;
  subject := (claims->>'uid')::uuid;
  if not exists(select from public.users where user_id=subject and status='active') then return null; end if;
  return subject;
exception when others then return null;
end $$;
revoke all on function control.current_app_user_id() from public;
grant usage on schema control, public to mohen_app_runtime;
grant execute on function control.current_app_user_id() to mohen_app_runtime;

alter table public.imported_materials enable row level security;
revoke all on public.imported_materials from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select from pg_roles where rolname=role_name) then
      execute format('revoke all on public.imported_materials from %I',role_name);
    end if;
  end loop;
end $$;
grant select, insert, update, delete on public.imported_materials to mohen_app_runtime;
drop policy if exists k3_imported_materials_owner on public.imported_materials;
create policy k3_imported_materials_owner on public.imported_materials to mohen_app_runtime
  using(owner_user_id=control.current_app_user_id())
  with check(owner_user_id=control.current_app_user_id());
drop policy if exists k3_imported_materials_boundary on public.imported_materials;
create policy k3_imported_materials_boundary on public.imported_materials as restrictive to mohen_app_runtime
  using(owner_user_id=control.current_app_user_id())
  with check(owner_user_id=control.current_app_user_id());

-- Old conversations without a proven owner remain private; never guess an owner.
alter table public.conversations add column if not exists owner_user_id uuid references public.users(user_id) on delete set null;
create index if not exists conversations_owner_idx on public.conversations(owner_user_id);
alter table public.conversations enable row level security;
revoke all on public.conversations from public;
grant select, insert, update on public.conversations to mohen_app_runtime;
drop policy if exists k3_conversations_owner on public.conversations;
create policy k3_conversations_owner on public.conversations to mohen_app_runtime
  using(owner_user_id=control.current_app_user_id())
  with check(owner_user_id=control.current_app_user_id());
drop policy if exists k3_conversations_boundary on public.conversations;
create policy k3_conversations_boundary on public.conversations as restrictive to mohen_app_runtime
  using(owner_user_id=control.current_app_user_id())
  with check(owner_user_id=control.current_app_user_id());

grant usage on schema control to mohen_producer, mohen_gate_signer;
revoke all on control.gate_audits from public, mohen_producer, mohen_app_runtime;
-- Signer privileges are installed only with the independent signing transaction;
-- merely creating the identity cannot grant direct audit/projection mutation.
revoke insert, update, delete, truncate on control.gate_audits from mohen_gate_signer;
commit;
