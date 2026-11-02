-- MAB-ENG-01 M2: private original receipt and source_anchor revision.
-- GitHub-only candidate. DO NOT apply to production without isolated DB/storage,
-- bucket policy, backup, low-privilege cross-owner and rollback verification.
begin;
create table studio.private_originals (
 original_id uuid primary key,
 project_id uuid not null references studio.projects(project_id) on delete restrict,
 owner_user_id uuid not null references public.users(user_id) on delete restrict,
 asset_id uuid not null unique,
 asset_revision_id uuid unique,
 idempotency_key text not null check(length(idempotency_key) between 8 and 200),
 storage_bucket text not null default 'mohen-private-originals' check(storage_bucket='mohen-private-originals'),
 storage_key text not null unique,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 byte_size bigint not null check(byte_size between 1 and 10485760),
 file_name text not null check(length(file_name) between 1 and 200),
 content_type text not null check(content_type in ('application/pdf','text/plain','image/png','image/jpeg','image/webp','application/octet-stream')),
 rights_declared boolean not null check(rights_declared=true),
 state text not null default 'PENDING' check(state in ('PENDING','STORED_VERIFIED')),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(project_id,idempotency_key),
 foreign key(asset_id,asset_revision_id) references studio.asset_revisions(asset_id,revision_id) on delete restrict,
 check(storage_key=project_id::text||'/'||original_id::text||'.bin'),
 check((state='PENDING' and asset_revision_id is null and verified_at is null)
    or (state='STORED_VERIFIED' and asset_revision_id is not null and verified_at is not null))
);
-- This candidate migration has not been applied to production. A verified
-- receipt is permanent; neither its object identity nor its revision may drift.
create function studio.protect_private_original() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='DELETE' then raise exception 'ORIGINAL_IMMUTABLE'; end if;
 if tg_op='INSERT' then
  if new.state<>'PENDING' or new.asset_revision_id is not null or new.verified_at is not null then
   raise exception 'ORIGINAL_MUST_START_PENDING';
  end if;
 else
  if old.state='STORED_VERIFIED' or
     (to_jsonb(old)-array['state','asset_revision_id','verified_at']) is distinct from
     (to_jsonb(new)-array['state','asset_revision_id','verified_at']) then
   raise exception 'ORIGINAL_IMMUTABLE';
  end if;
 end if;
 if new.state='STORED_VERIFIED' and not exists(
  select 1 from studio.asset_revisions r join studio.asset_heads h on h.asset_id=r.asset_id
  where r.revision_id=new.asset_revision_id and r.asset_id=new.asset_id and h.project_id=new.project_id
   and h.asset_kind='source_anchor' and r.actor_id=new.owner_user_id
   and r.content_hash=new.sha256 and r.payload_storage_ref=new.storage_bucket||'/'||new.storage_key
   and r.provenance->>'private_original_id'=new.original_id::text
 ) then raise exception 'ORIGINAL_REVISION_BINDING_INVALID'; end if;
 return new;
end $$;
revoke all on function studio.protect_private_original() from public;
create trigger studio_private_original_immutable before insert or update or delete
 on studio.private_originals for each row execute function studio.protect_private_original();
create index studio_private_originals_project on studio.private_originals(project_id,created_at desc);
alter table studio.private_originals enable row level security;
revoke all on studio.private_originals from public,anon,authenticated,service_role;
grant select,insert on studio.private_originals to mohen_app_runtime;
grant update(state,asset_revision_id,verified_at) on studio.private_originals to mohen_app_runtime;
create policy studio_private_original_owner on studio.private_originals
 to mohen_app_runtime
 using(owner_user_id=(select control.current_app_user_id())
       and exists(select 1 from studio.projects p where p.project_id=private_originals.project_id and p.lifecycle_status='ACTIVE'))
 with check(owner_user_id=(select control.current_app_user_id())
       and exists(select 1 from studio.projects p where p.project_id=private_originals.project_id and p.lifecycle_status='ACTIVE'));
-- No INSERT to storage.buckets here: bucket creation and its object policies
-- require separate audited activation; code remains OFF by default.
commit;
