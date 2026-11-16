-- M5 development environment: existing private-original Storage adapter's bucket.
-- The Owner confirmed 2026-11-16 that mohen-cloud is the active non-operational
-- development database. No second database/project and no production rollout.
-- Never expose originals publicly. Keep browser roles without Storage object
-- policies. Server-only credentials are separately configured and never here.
--
-- Supabase's documented SQL bucket-creation method, not a direct mutation of
-- storage.objects. Files must be created/read/deleted only through Storage API.
begin;
insert into storage.buckets
  (id,name,public,file_size_limit,allowed_mime_types)
values
  ('mohen-private-originals','mohen-private-originals',false,10485760,
   array['application/pdf','text/plain','image/png','image/jpeg','image/webp','application/octet-stream']::text[])
on conflict(id) do nothing;
-- If an existing bucket was incompatible, do not silently rewrite its
-- access contract; fail closed and require a separate explicit correction.
do $$
begin
 if not exists(
   select 1 from storage.buckets b
   where b.id='mohen-private-originals'
     and b.name='mohen-private-originals'
     and b.public=false and b.file_size_limit=10485760
     and b.allowed_mime_types @> array['application/pdf','text/plain','image/png','image/jpeg','image/webp','application/octet-stream']::text[]
 ) then raise exception 'PRIVATE_ORIGINAL_BUCKET_CONTRACT_MISMATCH';end if;
end $$;
commit;
