-- Existing web authentication backend only; never expose via public Data API.
begin;
create table if not exists control.web_password_resets (
  user_id uuid primary key references public.users(user_id) on delete cascade,
  token_hash text unique check(token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz,
  session_epoch bigint not null check(session_epoch>=0),
  last_requested_at timestamptz not null,
  window_started_at timestamptz not null,
  requests integer not null check(requests between 1 and 5),
  check((token_hash is null)=(expires_at is null))
);
create table if not exists control.web_password_reset_request_budget (
  singleton boolean primary key default true check(singleton),
  window_started_at timestamptz not null,
  requests integer not null check(requests between 1 and 30)
);
alter table control.web_password_resets enable row level security;
alter table control.web_password_reset_request_budget enable row level security;
revoke all on control.web_password_resets,control.web_password_reset_request_budget
  from public,mohen_producer,mohen_gate_signer,mohen_app_runtime;
do $$declare role_name text;begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select from pg_roles where rolname=role_name) then
      execute format('revoke all on control.web_password_resets,control.web_password_reset_request_budget from %I',role_name);
    end if;
  end loop;
end $$;
commit;
