-- MAB-ENG-01 M2: private original receipt and source_anchor revision.
-- GitHub-only candidate. DO NOT apply to production without isolated DB/storage,
-- bucket policy, backup, low-privilege cross-owner and rollback verification.
begin;
create table studio.private_originals (
 original_id uuid primary key,
 project_id uuid not null references studio.projects(project_id) on delete restrict,
 owner_user_id uuid not null references public.users(user_id) on delete restrict,
 asset_id uuid not null unique,
 asset_revision_id uuid unique references studio.asset_revisions(revision_id) on delete restrict,
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
 check(storage_key=project_id::text||'/'||original_id::text||'.bin'),
 check((state='STORED_VERIFIED')=(asset_revision_id is not null and verified_at is not null))
);
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
