create extension if not exists pgcrypto;

create type verification_status as enum
  ('raw','extracted','candidate','evidence_linked','verified','rejected','pending','published');

create table source_records (
  source_id uuid primary key default gen_random_uuid(),
  provider text not null,
  title text not null,
  creator text,
  source_date text,
  retrieved_at timestamptz not null default now(),
  source_uri text,
  content_type text not null,
  license_code text,
  checksum text not null,
  raw_path text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  legacy_id text,
  unique(provider, checksum)
);

create table evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  source_id uuid not null references source_records(source_id),
  evidence_type text not null check (evidence_type in ('text','image','map','record','field_observation')),
  locator text,
  quote_text text,
  region_json jsonb,
  subject_hint text,
  place_hint text,
  time_hint text,
  extraction_method text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  verification_status verification_status not null default 'candidate',
  created_at timestamptz not null default now()
);

create table entities (
  entity_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  canonical_name text not null,
  aliases text[] not null default '{}',
  description text,
  valid_from text,
  valid_to text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  status verification_status not null default 'candidate',
  legacy_id text
);

create table claims (
  claim_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references entities(entity_id),
  predicate text not null,
  object_id uuid references entities(entity_id),
  object_value jsonb,
  certainty numeric(4,3) not null check (certainty between 0 and 1),
  status verification_status not null default 'candidate',
  review_tier text not null check (review_tier in ('A','B','C')),
  generated_by text,
  review_note text
);

create table claim_evidence (
  claim_id uuid not null references claims(claim_id) on delete cascade,
  evidence_id uuid not null references evidence(evidence_id) on delete cascade,
  support_type text not null default 'supports',
  primary key (claim_id, evidence_id)
);

create table relations (
  relation_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references entities(entity_id),
  predicate text not null,
  object_id uuid not null references entities(entity_id),
  valid_from text,
  valid_to text,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  status verification_status not null default 'candidate',
  legacy_id text
);

create table relation_evidence (
  relation_id uuid not null references relations(relation_id) on delete cascade,
  evidence_id uuid not null references evidence(evidence_id) on delete cascade,
  support_type text not null default 'supports',
  primary key (relation_id, evidence_id)
);

create table visual_assets (
  asset_id uuid primary key default gen_random_uuid(),
  source_id uuid not null references source_records(source_id),
  asset_type text not null,
  file_path text not null,
  created_date text,
  depicted_period text,
  rights text,
  checksum text not null,
  quality_score numeric(4,3) check (quality_score between 0 and 1),
  legacy_id text
);

-- Phase 0 invariant: published claims must have evidence.
create or replace function guard_published_claim_evidence()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and not exists (
    select 1 from claim_evidence ce where ce.claim_id = new.claim_id
  ) then
    raise exception 'Published claim % requires evidence', new.claim_id;
  end if;
  return new;
end $$;

create constraint trigger claims_require_evidence
after insert or update of status on claims
deferrable initially deferred
for each row execute function guard_published_claim_evidence();
