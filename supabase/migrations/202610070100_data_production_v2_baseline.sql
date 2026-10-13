-- MoHen Data Production Physical Model V2 (fresh target baseline)
begin;
create extension if not exists pgcrypto;
create schema if not exists source;
create schema if not exists evidence;
create schema if not exists world;
create schema if not exists meaning;
create schema if not exists read_model;
create schema if not exists control;

do $$ begin create type control.gate_result as enum ('PASS','HOLD','REJECT'); exception when duplicate_object then null; end $$;
do $$ begin create type control.owner_decision as enum ('ACCEPT','DEEPEN','DROP'); exception when duplicate_object then null; end $$;
do $$ begin create type control.maturity_status as enum ('candidate','adjudicated','rejected','archived'); exception when duplicate_object then null; end $$;

create table if not exists control.production_runs (
 run_id uuid primary key default gen_random_uuid(), research_intent text not null, scope jsonb not null default '{}',
 execution_mode text not null check(execution_mode in ('attended','unattended','batch','interactive')),
 status text not null check(status in ('RUNNING','PASS','HOLD','REJECT','FAILED')),
 current_stage text check(current_stage is null or current_stage in ('D01','D02','D03','D04','D05')),
 started_at timestamptz not null default now(), finished_at timestamptz, metadata jsonb not null default '{}');
create table if not exists control.gate_audits (
 gate_audit_id uuid primary key default gen_random_uuid(), run_id uuid not null references control.production_runs(run_id),
 stage text not null check(stage in ('D01','D02','D03','D04','D05')), gate_code text not null check(gate_code in ('G0','G1','G2','G3','G4')),
 object_type text not null, object_id uuid not null, result control.gate_result not null, reason_codes text[] not null default '{}',
 guard_versions jsonb not null default '{}', details jsonb not null default '{}', checked_at timestamptz not null default now(),
 unique(run_id,gate_code,object_type,object_id));
create index if not exists idx_gate_audits_object on control.gate_audits(object_type,object_id,gate_code,result);
create table if not exists control.owner_reviews (
 owner_review_id uuid primary key default gen_random_uuid(), run_id uuid not null references control.production_runs(run_id),
 stage text not null check(stage in ('D01','D02','D03','D04','D05')), object_type text, object_id uuid,
 decision control.owner_decision not null, note text, reviewed_at timestamptz not null default now());

create table if not exists source.sources (
 source_id uuid primary key default gen_random_uuid(), provider text not null, title text not null, source_type text not null, carrier_type text not null,
 creator text, publisher_or_institution text, source_uri_or_catalog_no text, source_date jsonb, rights jsonb not null default '{}',
 provenance_status text not null default 'declared', content_availability text not null check(content_availability in ('full_content','image_scan','ocr','structured_content','catalog_only','unavailable')),
 original_locator jsonb not null default '{}', scope jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists source.source_versions (
 source_version_id uuid primary key default gen_random_uuid(), source_id uuid not null references source.sources(source_id), version_label text,
 retrieved_at timestamptz not null default now(), checksum_sha256 text not null, metadata jsonb not null default '{}', unique(source_id,checksum_sha256));
create table if not exists source.raw_items (
 raw_item_id uuid primary key default gen_random_uuid(), source_version_id uuid not null references source.source_versions(source_version_id),
 storage_ref text not null, media_type text, byte_size bigint check(byte_size is null or byte_size>=0), checksum_sha256 text not null,
 created_at timestamptz not null default now(), unique(source_version_id,storage_ref));
create or replace function source.forbid_raw_mutation() returns trigger language plpgsql as $$ begin raise exception 'RAW_APPEND_ONLY'; end $$;
drop trigger if exists raw_items_append_only_update on source.raw_items;
create trigger raw_items_append_only_update before update or delete on source.raw_items for each row execute function source.forbid_raw_mutation();

create table if not exists evidence.material_evidence (
 evidence_id uuid primary key default gen_random_uuid(), source_id uuid not null references source.sources(source_id),
 source_version_id uuid references source.source_versions(source_version_id), raw_item_id uuid references source.raw_items(raw_item_id),
 locator jsonb not null, media_region jsonb, modality text not null, raw_excerpt_or_region jsonb, literal_reading text,
 normalized_text text, research_proposition text, source_voice text not null, evidence_type text, temporal_applicability jsonb,
 spatial_applicability jsonb, uncertainty jsonb not null default '{}', extraction_method jsonb not null default '{}',
 maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now());
create index if not exists idx_material_evidence_source on evidence.material_evidence(source_id);

create table if not exists world.entities (
 entity_id uuid primary key default gen_random_uuid(), entity_type text not null, canonical_label text not null, aliases text[] not null default '{}',
 temporal_scope jsonb, spatial_scope jsonb, attributes jsonb not null default '{}', maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now());
create table if not exists world.events (
 event_id uuid primary key default gen_random_uuid(), event_type text not null, canonical_label text not null, subject_entity_id uuid references world.entities(entity_id),
 time_scope jsonb not null default '{}', space_scope jsonb not null default '{}', attributes jsonb not null default '{}', maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now());
create table if not exists world.relation_claims (
 relation_claim_id uuid primary key default gen_random_uuid(), relation_type text not null, subject_entity_id uuid references world.entities(entity_id),
 object_entity_id uuid references world.entities(entity_id), object_value jsonb, time_scope jsonb not null default '{}', space_scope jsonb not null default '{}',
 expression_rule jsonb not null default '{}', maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now(),
 check(object_entity_id is not null or object_value is not null));
create table if not exists world.changes (
 change_id uuid primary key default gen_random_uuid(), subject_entity_id uuid references world.entities(entity_id), change_type text not null,
 before_state jsonb, after_state jsonb, time_scope jsonb not null default '{}', expression_rule jsonb not null default '{}',
 maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now());
create table if not exists world.historical_space_claims (
 historical_space_claim_id uuid primary key default gen_random_uuid(), subject_entity_id uuid references world.entities(entity_id), claim_type text not null,
 geometry_claim jsonb, spatial_relation jsonb, time_scope jsonb not null default '{}', precision jsonb not null default '{}', uncertainty jsonb not null default '{}',
 expression_rule jsonb not null default '{}', maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now(),
 check(geometry_claim is not null or spatial_relation is not null));
create table if not exists world.visual_objects (
 visual_object_id uuid primary key default gen_random_uuid(), source_id uuid references source.sources(source_id), subject_entity_id uuid references world.entities(entity_id),
 visual_type text not null, asset_ref text, literal_reading text, time_scope jsonb, space_scope jsonb, correspondence_claim jsonb,
 maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now());
create table if not exists world.claim_evidence_links (
 claim_evidence_link_id uuid primary key default gen_random_uuid(), claim_object_type text not null check(claim_object_type in ('event','relation_claim','change','historical_space_claim','visual_object')),
 claim_object_id uuid not null, evidence_id uuid not null references evidence.material_evidence(evidence_id), support_type text not null check(support_type in ('supports','contradicts','contextualizes')),
 note text, created_at timestamptz not null default now(), unique(claim_object_type,claim_object_id,evidence_id,support_type));
create index if not exists idx_claim_evidence_claim on world.claim_evidence_links(claim_object_type,claim_object_id);
create table if not exists world.conflicts (
 conflict_id uuid primary key default gen_random_uuid(), conflict_key text not null unique, object_type text not null, object_id uuid not null, variant jsonb not null,
 resolution_status text not null default 'open' check(resolution_status in ('open','resolved','preserved_open','rejected')), resolution_note text, created_at timestamptz not null default now());

create table if not exists meaning.findings (
 finding_id uuid primary key default gen_random_uuid(), finding_type text not null, human_question text, interpretive_statement text not null,
 understanding_delta text, supporting_world_objects jsonb not null default '[]', counter_view_or_alternative jsonb not null default '[]',
 missing_evidence jsonb not null default '[]', present_connection_basis jsonb, uncertainty jsonb not null default '{}', expression_rule jsonb not null default '{}',
 discovery_method jsonb not null default '{}', ranking_components jsonb not null default '{}', maturity control.maturity_status not null default 'candidate', created_at timestamptz not null default now());
create table if not exists meaning.present_connections (
 present_connection_id uuid primary key default gen_random_uuid(), finding_id uuid references meaning.findings(finding_id), connection_type text not null,
 observed_state text, basis_world_objects jsonb not null default '[]', open_questions jsonb not null default '[]', expression_rule jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists meaning.open_questions (
 open_question_id uuid primary key default gen_random_uuid(), finding_id uuid references meaning.findings(finding_id), question text not null,
 missing_evidence jsonb not null default '[]', next_research_action text, status text not null default 'open' check(status in ('open','resolved','dropped')), created_at timestamptz not null default now());

create table if not exists read_model.world_projections (projection_id uuid primary key default gen_random_uuid(), projection_key text not null unique, payload jsonb not null, derived_from_finding_ids uuid[] not null default '{}', expression_rule jsonb not null default '{}', generated_at timestamptz not null default now());
create table if not exists read_model.agent_contexts (agent_context_id uuid primary key default gen_random_uuid(), context_key text not null unique, payload jsonb not null, derived_from_finding_ids uuid[] not null default '{}', generated_at timestamptz not null default now());
create table if not exists read_model.story_seeds (story_seed_id uuid primary key default gen_random_uuid(), seed_key text not null unique, title text, narrative_question text, payload jsonb not null, derived_from_finding_ids uuid[] not null default '{}', evidence_pointer_ids uuid[] not null default '{}', generated_at timestamptz not null default now());
create table if not exists read_model.discovery_paths (discovery_path_id uuid primary key default gen_random_uuid(), path_key text not null unique, steps jsonb not null, derived_from_finding_ids uuid[] not null default '{}', generated_at timestamptz not null default now());
create table if not exists read_model.map_timeline_projections (map_timeline_projection_id uuid primary key default gen_random_uuid(), projection_key text not null unique, payload jsonb not null, derived_from_world_objects jsonb not null default '[]', generated_at timestamptz not null default now());
create table if not exists read_model.evidence_pointers (evidence_pointer_id uuid primary key default gen_random_uuid(), evidence_id uuid not null references evidence.material_evidence(evidence_id), source_id uuid not null references source.sources(source_id), display_locator jsonb not null, display_excerpt text, generated_at timestamptz not null default now(), unique(evidence_id,source_id));

create or replace view control.g0_pass_sources as select s.* from source.sources s where exists(select 1 from control.gate_audits g where g.object_type='source' and g.object_id=s.source_id and g.gate_code='G0' and g.result='PASS');
create or replace view control.g1_pass_evidence as select e.* from evidence.material_evidence e where exists(select 1 from control.gate_audits g where g.object_type='material_evidence' and g.object_id=e.evidence_id and g.gate_code='G1' and g.result='PASS');
create or replace view control.g2_pass_world_objects as
 select 'entity'::text object_type,entity_id object_id from world.entities e where exists(select 1 from control.gate_audits g where g.object_type='entity' and g.object_id=e.entity_id and g.gate_code='G2' and g.result='PASS')
 union all select 'event',event_id from world.events e where exists(select 1 from control.gate_audits g where g.object_type='event' and g.object_id=e.event_id and g.gate_code='G2' and g.result='PASS')
 union all select 'relation_claim',relation_claim_id from world.relation_claims r where exists(select 1 from control.gate_audits g where g.object_type='relation_claim' and g.object_id=r.relation_claim_id and g.gate_code='G2' and g.result='PASS')
 union all select 'change',change_id from world.changes c where exists(select 1 from control.gate_audits g where g.object_type='change' and g.object_id=c.change_id and g.gate_code='G2' and g.result='PASS')
 union all select 'historical_space_claim',historical_space_claim_id from world.historical_space_claims h where exists(select 1 from control.gate_audits g where g.object_type='historical_space_claim' and g.object_id=h.historical_space_claim_id and g.gate_code='G2' and g.result='PASS')
 union all select 'visual_object',visual_object_id from world.visual_objects v where exists(select 1 from control.gate_audits g where g.object_type='visual_object' and g.object_id=v.visual_object_id and g.gate_code='G2' and g.result='PASS');
create or replace view control.g3_pass_findings as select f.* from meaning.findings f where exists(select 1 from control.gate_audits g where g.object_type='finding' and g.object_id=f.finding_id and g.gate_code='G3' and g.result='PASS');
create or replace view control.g4_pass_read_models as
 select 'world_projection'::text object_type,projection_id object_id from read_model.world_projections p where exists(select 1 from control.gate_audits g where g.object_type='world_projection' and g.object_id=p.projection_id and g.gate_code='G4' and g.result='PASS')
 union all select 'agent_context',agent_context_id from read_model.agent_contexts a where exists(select 1 from control.gate_audits g where g.object_type='agent_context' and g.object_id=a.agent_context_id and g.gate_code='G4' and g.result='PASS')
 union all select 'story_seed',story_seed_id from read_model.story_seeds s where exists(select 1 from control.gate_audits g where g.object_type='story_seed' and g.object_id=s.story_seed_id and g.gate_code='G4' and g.result='PASS')
 union all select 'discovery_path',discovery_path_id from read_model.discovery_paths d where exists(select 1 from control.gate_audits g where g.object_type='discovery_path' and g.object_id=d.discovery_path_id and g.gate_code='G4' and g.result='PASS')
 union all select 'map_timeline_projection',map_timeline_projection_id from read_model.map_timeline_projections m where exists(select 1 from control.gate_audits g where g.object_type='map_timeline_projection' and g.object_id=m.map_timeline_projection_id and g.gate_code='G4' and g.result='PASS');
commit;
