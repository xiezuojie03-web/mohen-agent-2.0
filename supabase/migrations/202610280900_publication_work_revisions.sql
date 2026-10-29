-- 202610280900_publication_work_revisions.sql
-- 作品出版线：works（作品主体）+ work_revisions（不可变修订）+ published_pointers（发布指针）
-- 目的：打通"创作 → 提交审核 → 发布 → 观看"闭环；作品与知识资产（read_model）分离。

create schema if not exists publication;

-- 作品主体
create table publication.works (
  work_id     uuid primary key default gen_random_uuid(),
  title       text not null,
  creator     text not null default '访客',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 不可变修订：发布后不可改，改动即新修订（version chain）
create table publication.work_revisions (
  revision_id uuid primary key default gen_random_uuid(),
  work_id     uuid not null references publication.works(work_id) on delete cascade,
  revision_no integer not null,
  title       text not null,
  description text not null default '',
  content     jsonb not null default '{}'::jsonb,
  status      text not null default 'draft'
              check (status in ('draft','submitted','published','rejected')),
  created_at  timestamptz not null default now(),
  unique (work_id, revision_no)
);

-- 发布指针：指向当前已发布修订（观众只消费它）
create table publication.published_pointers (
  work_id      uuid primary key references publication.works(work_id) on delete cascade,
  revision_id  uuid not null references publication.work_revisions(revision_id) on delete cascade,
  published_at timestamptz not null default now(),
  published_by text not null default 'operator'
);

-- RLS：公众只读"已发布修订 + 发布指针"；草稿/待审仅 service/operator 可达
alter table publication.works               enable row level security;
alter table publication.work_revisions      enable row level security;
alter table publication.published_pointers  enable row level security;

create policy published_pointers_public_read on publication.published_pointers
  for select using (true);
create policy work_revisions_published_read on publication.work_revisions
  for select using (status = 'published');
