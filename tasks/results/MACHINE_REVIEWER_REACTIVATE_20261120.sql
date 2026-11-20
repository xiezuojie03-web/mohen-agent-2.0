-- Restore the independent MACHINE reviewer identity on mohen-cloud.
-- Context: P4 data-unification deliberately downgraded this account to
-- disabled/member with a '!' password marker (auth isolation). Owner has
-- explicitly authorized reactivation (2026-11-20) to enable independent G0
-- machine signing (path B). Mirrors the local working state exactly.
-- Scoped to ONE fixed user_id; fails closed on any identity mismatch.
-- Idempotent and contains NO secret (the password_hash is a non-interactive
-- placeholder; machine signing authenticates via a separate HMAC session token).
begin;

do $$
declare
  v_uid uuid := 'b0a11000-0000-4000-8000-0000000000a1'::uuid;
  v_email text := 'machine-reviewer@mohen.local';
  v_placeholder text := 'machine-reviewer-has-no-interactive-login';
  v_bad integer := 0;
begin
  -- fail closed: no other account may own this email
  select count(*) into v_bad from public.users
   where email = v_email and user_id <> v_uid;
  if v_bad > 0 then raise exception 'MACHINE_REVIEWER_EMAIL_CONFLICT'; end if;

  -- fail closed: target must exist with the exact fixed id
  if not exists (select 1 from public.users where user_id = v_uid) then
    raise exception 'MACHINE_REVIEWER_USER_MISSING';
  end if;

  update public.users
     set status = 'active',
         roles = array['reviewer']::text[],
         password_hash = v_placeholder
   where user_id = v_uid
     and email = v_email;
end $$;

-- post-condition: active + reviewer + non-disabled placeholder, nothing else changed
do $$
begin
  if not exists (
    select 1 from public.users
     where user_id = 'b0a11000-0000-4000-8000-0000000000a1'::uuid
       and status = 'active'
       and roles @> array['reviewer']::text[]
       and password_hash = 'machine-reviewer-has-no-interactive-login'
  ) then raise exception 'MACHINE_REVIEWER_REACTIVATE_VERIFY_FAILED'; end if;
end $$;
commit;
