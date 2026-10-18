--
-- PostgreSQL database dump
--

\restrict s1UzrUw284YHjHosSQHEzJ7oflhLJvbERSDEgQD76j3sKh5gqbo3cngXoq0mw5s

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: control; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA control;


ALTER SCHEMA control OWNER TO postgres;

--
-- Name: evidence; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA evidence;


ALTER SCHEMA evidence OWNER TO postgres;

--
-- Name: meaning; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA meaning;


ALTER SCHEMA meaning OWNER TO postgres;

--
-- Name: read_model; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA read_model;


ALTER SCHEMA read_model OWNER TO postgres;

--
-- Name: source; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA source;


ALTER SCHEMA source OWNER TO postgres;

--
-- Name: world; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA world;


ALTER SCHEMA world OWNER TO postgres;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: gate_result; Type: TYPE; Schema: control; Owner: postgres
--

CREATE TYPE control.gate_result AS ENUM (
    'PASS',
    'HOLD',
    'REJECT',
    'REVOKED',
    'UNASSESSED'
);


ALTER TYPE control.gate_result OWNER TO postgres;

--
-- Name: maturity_status; Type: TYPE; Schema: control; Owner: postgres
--

CREATE TYPE control.maturity_status AS ENUM (
    'candidate',
    'adjudicated',
    'rejected',
    'archived'
);


ALTER TYPE control.maturity_status OWNER TO postgres;

--
-- Name: owner_decision; Type: TYPE; Schema: control; Owner: postgres
--

CREATE TYPE control.owner_decision AS ENUM (
    'ACCEPT',
    'DEEPEN',
    'DROP'
);


ALTER TYPE control.owner_decision OWNER TO postgres;

--
-- Name: historical_change_status; Type: TYPE; Schema: public; Owner: mohen_app
--

CREATE TYPE public.historical_change_status AS ENUM (
    'survives',
    'rebuilt',
    'relocated',
    'site_only',
    'name_changed',
    'function_changed',
    'surrounding_context_changed',
    'unknown'
);


ALTER TYPE public.historical_change_status OWNER TO mohen_app;

--
-- Name: historical_geometry_type; Type: TYPE; Schema: public; Owner: mohen_app
--

CREATE TYPE public.historical_geometry_type AS ENUM (
    'point',
    'line',
    'area',
    'unknown'
);


ALTER TYPE public.historical_geometry_type OWNER TO mohen_app;

--
-- Name: historical_relation_class; Type: TYPE; Schema: public; Owner: mohen_app
--

CREATE TYPE public.historical_relation_class AS ENUM (
    'E1',
    'E2',
    'E3',
    'E4'
);


ALTER TYPE public.historical_relation_class OWNER TO mohen_app;

--
-- Name: historical_spatial_status; Type: TYPE; Schema: public; Owner: mohen_app
--

CREATE TYPE public.historical_spatial_status AS ENUM (
    'verified_object_point',
    'official_or_provider_object_point',
    'approximate_object_area',
    'historical_anchor_candidate',
    'historical_relative_position_only',
    'unresolved'
);


ALTER TYPE public.historical_spatial_status OWNER TO mohen_app;

--
-- Name: verification_status; Type: TYPE; Schema: public; Owner: mohen_app
--

CREATE TYPE public.verification_status AS ENUM (
    'raw',
    'extracted',
    'candidate',
    'evidence_linked',
    'verified',
    'rejected',
    'pending',
    'published'
);


ALTER TYPE public.verification_status OWNER TO mohen_app;

--
-- Name: guard_cmc_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_cmc_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'cultural_meaning_candidate' and g.object_id = new.meaning_id::text) then
    raise exception 'cultural_meaning_candidates % 晋级为 % 必须先有 evidence_gate_audit 记录', new.meaning_id, new.review_status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_cmc_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_confirmed_link_has_evidence(); Type: FUNCTION; Schema: public; Owner: mohen_app
--

CREATE FUNCTION public.guard_confirmed_link_has_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.link_status = 'confirmed' and new.link_evidence_id is null then
    raise exception 'confirmed visual link 必须有 link_evidence_id (asset=%, object=%)',
      new.asset_id, new.depicted_entity_label;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_confirmed_link_has_evidence() OWNER TO mohen_app;

--
-- Name: guard_cpc_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_cpc_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'cultural_present_connection' and g.object_id = new.present_id::text) then
    raise exception 'cultural_present_connections % 晋级为 % 必须先有 evidence_gate_audit 记录', new.present_id, new.review_status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_cpc_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_crc_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_crc_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'cultural_relation_claim' and g.object_id = new.claim_id::text) then
    raise exception 'cultural_relation_claims % 晋级为 % 必须先有 evidence_gate_audit 记录', new.claim_id, new.review_status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_crc_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_entity_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_entity_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'entity' and g.object_id = new.entity_id::text) then
    raise exception 'entities % 晋级为 % 必须先有 evidence_gate_audit(object_type=entity) 记录', new.entity_id, new.status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_entity_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_evidence_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_evidence_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.verification_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'evidence' and g.object_id = new.evidence_id::text) then
    raise exception 'evidence % 晋级为 % 必须先有 evidence_gate_audit(object_type=evidence) 记录', new.evidence_id, new.verification_status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_evidence_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_excluded_asset_not_heritage_confirmed(); Type: FUNCTION; Schema: public; Owner: mohen_app
--

CREATE FUNCTION public.guard_excluded_asset_not_heritage_confirmed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  ex boolean;
begin
  if new.link_status = 'confirmed' then
    select (a.eligibility_tags && array['excluded_from_heritage_primary'])
      into ex
      from visual_assets a where a.asset_id = new.asset_id;
    if coalesce(ex, false) then
      raise exception 'HR-5 排除资产不得建立 confirmed 遗产链接 (asset=%)', new.asset_id;
    end if;
    if new.eligibility_tags && array['excluded_from_heritage_primary'] then
      raise exception '链接自身被标为 excluded_from_heritage_primary，不得为 confirmed (asset=%)', new.asset_id;
    end if;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_excluded_asset_not_heritage_confirmed() OWNER TO mohen_app;

--
-- Name: guard_hf_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_hf_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'historical_feature' and g.object_id = new.feature_id::text) then
    raise exception 'historical_features % 晋级为 % 必须先有 evidence_gate_audit 记录', new.feature_id, new.review_status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_hf_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_hsr_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_hsr_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'historical_spatial_relation' and g.object_id = new.hs_relation_id::text) then
    raise exception 'historical_spatial_relations % 晋级为 % 必须先有 evidence_gate_audit 记录', new.hs_relation_id, new.status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_hsr_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_published_claim_evidence(); Type: FUNCTION; Schema: public; Owner: mohen_app
--

CREATE FUNCTION public.guard_published_claim_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.status = 'published' and not exists (
    select 1 from claim_evidence ce where ce.claim_id = new.claim_id
  ) then
    raise exception 'Published claim % requires evidence', new.claim_id;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_published_claim_evidence() OWNER TO mohen_app;

--
-- Name: guard_relation_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_relation_promotion_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'relation' and g.object_id = new.relation_id::text) then
    raise exception 'relations % 晋级为 % 必须先有 evidence_gate_audit(object_type=relation) 记录', new.relation_id, new.status;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_relation_promotion_requires_audit() OWNER TO postgres;

--
-- Name: guard_review_queue_tier_c(); Type: FUNCTION; Schema: public; Owner: mohen_app
--

CREATE FUNCTION public.guard_review_queue_tier_c() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.review_tier = 'C' and new.status = 'approved'
     and (new.review_note is null or new.reviewed_at is null) then
    raise exception 'Tier C review item % requires human review note + reviewed_at before approval', new.review_id;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_review_queue_tier_c() OWNER TO mohen_app;

--
-- Name: guard_review_queue_triage(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_review_queue_triage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  -- ① 分诊行必须带原因：AUTO/HOLD/REJECT 都是判断，判断必须可解释
  if new.triage_outcome is not null and new.reason_code is null then
    raise exception 'review_queue % 分诊为 % 却没有 reason_code', new.review_id, new.triage_outcome;
  end if;

  -- ② 分诊结论不可改写（R14 规则 5「历史记录不改写」精神）：
  --    人审改变的是 status，不是当初机器的分诊。
  if tg_op = 'UPDATE' and old.triage_outcome is not null
     and new.triage_outcome is distinct from old.triage_outcome then
    raise exception 'review_queue % 的 triage_outcome 不可从 % 改写为 %（分诊是当时事实；人审改 status）',
      new.review_id, old.triage_outcome, new.triage_outcome;
  end if;

  if tg_op = 'INSERT' then
    if new.triage_outcome = 'auto' then
      if new.review_tier = 'C' then
        raise exception 'review_queue % 分诊 auto 但 tier=C —— Tier C 不得自动晋级', new.review_id;
      end if;
      if new.status <> 'approved' then
        raise exception 'review_queue % 分诊 auto 必须出生为 approved（确定性晋级）', new.review_id;
      end if;
      if new.review_note is null then
        raise exception 'review_queue % 分诊 auto 必须在 review_note 记录规则/版本（协议 #6）', new.review_id;
      end if;
    elsif new.triage_outcome = 'hold' then
      if new.status <> 'pending' then
        raise exception 'review_queue % 分诊 hold 必须出生为 pending（隔离区；定案权在人）', new.review_id;
      end if;
    elsif new.triage_outcome = 'reject' then
      if new.status <> 'rejected' then
        raise exception 'review_queue % 分诊 reject 必须出生为 rejected', new.review_id;
      end if;
    end if;
  end if;

  return new;
end $$;


ALTER FUNCTION public.guard_review_queue_triage() OWNER TO postgres;

--
-- Name: guard_visual_asset_gate_passed_requires_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.guard_visual_asset_gate_passed_requires_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.eligibility_status = 'gate_passed' and not exists (
    select 1 from evidence_gate_audit g
     where g.object_type = 'visual_asset'
       and g.object_id = new.asset_id::text
  ) then
    raise exception 'visual_asset % 标为 gate_passed 必须有 evidence_gate_audit 记录', new.asset_id;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_visual_asset_gate_passed_requires_audit() OWNER TO postgres;

--
-- Name: guard_weave_not_publishable(); Type: FUNCTION; Schema: public; Owner: mohen_app
--

CREATE FUNCTION public.guard_weave_not_publishable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.publishable = true then
    raise exception 'TASK-0006 Knowledge Weave 产物不得 publishable=true (discovery %)', new.discovery_code;
  end if;
  return new;
end $$;


ALTER FUNCTION public.guard_weave_not_publishable() OWNER TO mohen_app;

--
-- Name: forbid_raw_mutation(); Type: FUNCTION; Schema: source; Owner: postgres
--

CREATE FUNCTION source.forbid_raw_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ begin raise exception 'RAW_APPEND_ONLY'; end $$;


ALTER FUNCTION source.forbid_raw_mutation() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: gate_audits; Type: TABLE; Schema: control; Owner: postgres
--

CREATE TABLE control.gate_audits (
    gate_audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    stage text NOT NULL,
    gate_code text NOT NULL,
    object_type text NOT NULL,
    object_id uuid NOT NULL,
    result control.gate_result NOT NULL,
    reason_codes text[] DEFAULT '{}'::text[] NOT NULL,
    guard_versions jsonb DEFAULT '{}'::jsonb NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    architecture_generation text DEFAULT 'mohen.six-stage.v1'::text NOT NULL,
    purpose text,
    allowed_scope jsonb DEFAULT '{}'::jsonb,
    consumer text,
    dependency_snapshot jsonb DEFAULT '{}'::jsonb,
    effective_time timestamp with time zone,
    input_fingerprint text,
    output_fingerprint text,
    rule_version text,
    supersedes_id uuid,
    current_valid boolean DEFAULT true NOT NULL,
    CONSTRAINT gate_audits_gate_code_check CHECK ((gate_code = ANY (ARRAY['G0'::text, 'G1'::text, 'G2'::text, 'G3'::text, 'G4'::text, 'G5'::text]))),
    CONSTRAINT gate_audits_stage_check CHECK ((stage = ANY (ARRAY['D00'::text, 'D01'::text, 'D02'::text, 'D03'::text, 'D04'::text, 'D05'::text])))
);


ALTER TABLE control.gate_audits OWNER TO postgres;

--
-- Name: invalidation_events; Type: TABLE; Schema: control; Owner: postgres
--

CREATE TABLE control.invalidation_events (
    invalidation_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_event_ref jsonb DEFAULT '{}'::jsonb NOT NULL,
    changed_dependency_ref jsonb DEFAULT '{}'::jsonb NOT NULL,
    affected_publication_revisions jsonb DEFAULT '[]'::jsonb NOT NULL,
    affected_purpose_scope_consumers jsonb DEFAULT '[]'::jsonb NOT NULL,
    dependency_paths jsonb DEFAULT '[]'::jsonb NOT NULL,
    reason text,
    suspension_request jsonb,
    recheck_request jsonb,
    disposition text DEFAULT 'UNASSESSED'::text NOT NULL,
    unknown_dependency boolean DEFAULT false NOT NULL,
    producer_method_id text NOT NULL,
    producer_method_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE control.invalidation_events OWNER TO postgres;

--
-- Name: meaning_eligibility; Type: VIEW; Schema: control; Owner: postgres
--

CREATE VIEW control.meaning_eligibility AS
 SELECT object_type,
    object_id,
    gate_audit_id,
    purpose,
    allowed_scope,
    consumer,
    effective_time
   FROM control.gate_audits g
  WHERE ((gate_code = 'G4'::text) AND (result = 'PASS'::control.gate_result) AND (current_valid = true));


ALTER VIEW control.meaning_eligibility OWNER TO postgres;

--
-- Name: owner_reviews; Type: TABLE; Schema: control; Owner: postgres
--

CREATE TABLE control.owner_reviews (
    owner_review_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    stage text NOT NULL,
    object_type text,
    object_id uuid,
    decision control.owner_decision NOT NULL,
    note text,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT owner_reviews_stage_check CHECK ((stage = ANY (ARRAY['D01'::text, 'D02'::text, 'D03'::text, 'D04'::text, 'D05'::text])))
);


ALTER TABLE control.owner_reviews OWNER TO postgres;

--
-- Name: production_runs; Type: TABLE; Schema: control; Owner: postgres
--

CREATE TABLE control.production_runs (
    run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    research_intent text NOT NULL,
    scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    execution_mode text NOT NULL,
    status text NOT NULL,
    current_stage text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    architecture_generation text DEFAULT 'mohen.six-stage.v1'::text NOT NULL,
    CONSTRAINT production_runs_current_stage_check CHECK (((current_stage IS NULL) OR (current_stage = ANY (ARRAY['D00'::text, 'D01'::text, 'D02'::text, 'D03'::text, 'D04'::text, 'D05'::text])))),
    CONSTRAINT production_runs_execution_mode_check CHECK ((execution_mode = ANY (ARRAY['attended'::text, 'unattended'::text, 'batch'::text, 'interactive'::text]))),
    CONSTRAINT production_runs_status_check CHECK ((status = ANY (ARRAY['RUNNING'::text, 'PASS'::text, 'HOLD'::text, 'REJECT'::text, 'FAILED'::text])))
);


ALTER TABLE control.production_runs OWNER TO postgres;

--
-- Name: world_eligibility; Type: VIEW; Schema: control; Owner: postgres
--

CREATE VIEW control.world_eligibility AS
 SELECT object_type,
    object_id,
    gate_audit_id,
    purpose,
    allowed_scope,
    consumer,
    effective_time
   FROM control.gate_audits g
  WHERE ((gate_code = 'G3'::text) AND (result = 'PASS'::control.gate_result) AND (current_valid = true));


ALTER VIEW control.world_eligibility OWNER TO postgres;

--
-- Name: classification_decisions; Type: TABLE; Schema: evidence; Owner: postgres
--

CREATE TABLE evidence.classification_decisions (
    decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    reading_unit_id uuid NOT NULL,
    primary_h_type text,
    alternatives jsonb DEFAULT '{}'::jsonb NOT NULL,
    basis text,
    taxonomy_version text,
    status text,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    supersedes_decision_id uuid
);


ALTER TABLE evidence.classification_decisions OWNER TO postgres;

--
-- Name: material_evidence; Type: TABLE; Schema: evidence; Owner: postgres
--

CREATE TABLE evidence.material_evidence (
    evidence_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    source_version_id uuid,
    raw_item_id uuid,
    locator jsonb NOT NULL,
    media_region jsonb,
    modality text NOT NULL,
    raw_excerpt_or_region jsonb,
    literal_reading text,
    normalized_text text,
    research_proposition text,
    source_voice text NOT NULL,
    evidence_type text,
    temporal_applicability jsonb,
    spatial_applicability jsonb,
    uncertainty jsonb DEFAULT '{}'::jsonb NOT NULL,
    extraction_method jsonb DEFAULT '{}'::jsonb NOT NULL,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reading_unit_id uuid,
    assertion_kind text,
    voice_basis text,
    quote_review_status text,
    quote_review_ref text,
    evidence_version_no integer,
    input_fingerprint text,
    supersedes_evidence_id uuid
);


ALTER TABLE evidence.material_evidence OWNER TO postgres;

--
-- Name: material_mentions; Type: TABLE; Schema: evidence; Owner: postgres
--

CREATE TABLE evidence.material_mentions (
    mention_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    mention_kind text,
    literal_text text,
    span_in_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    "precision" jsonb DEFAULT '{}'::jsonb NOT NULL,
    uncertainty jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE evidence.material_mentions OWNER TO postgres;

--
-- Name: read_unit_evidence_links; Type: TABLE; Schema: evidence; Owner: postgres
--

CREATE TABLE evidence.read_unit_evidence_links (
    link_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    read_unit_id uuid NOT NULL,
    read_run_id uuid NOT NULL,
    selected_extent jsonb DEFAULT '{}'::jsonb,
    selection_basis text,
    quote_snapshot_hash text,
    technical_profile_id text,
    g1_decision_id uuid,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    link_version text,
    supersedes_link_id uuid,
    extent_order integer,
    allowed_purpose text,
    locator_schema_version text
);


ALTER TABLE evidence.read_unit_evidence_links OWNER TO postgres;

--
-- Name: reading_unit_dependencies; Type: TABLE; Schema: evidence; Owner: postgres
--

CREATE TABLE evidence.reading_unit_dependencies (
    dependency_id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_reading_unit_id uuid NOT NULL,
    to_reading_unit_id uuid,
    external_source_version_id uuid,
    relation_kind text,
    certainty text,
    basis text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reading_unit_dependencies_target_check CHECK (((to_reading_unit_id IS NOT NULL) OR (external_source_version_id IS NOT NULL)))
);


ALTER TABLE evidence.reading_unit_dependencies OWNER TO postgres;

--
-- Name: reading_units; Type: TABLE; Schema: evidence; Owner: postgres
--

CREATE TABLE evidence.reading_units (
    reading_unit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_version_id uuid,
    raw_item_id uuid,
    parent_unit_id uuid,
    unit_path text,
    unit_kind text,
    primary_h_type text,
    taxonomy_version text,
    classification_status text,
    classification_basis text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE evidence.reading_units OWNER TO postgres;

--
-- Name: claim_revisions; Type: TABLE; Schema: meaning; Owner: postgres
--

CREATE TABLE meaning.claim_revisions (
    claim_revision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    finding_id uuid NOT NULL,
    revision_no integer NOT NULL,
    revision_content jsonb NOT NULL,
    producer_method_id text NOT NULL,
    producer_method_version text,
    supersedes_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE meaning.claim_revisions OWNER TO postgres;

--
-- Name: findings; Type: TABLE; Schema: meaning; Owner: postgres
--

CREATE TABLE meaning.findings (
    finding_id uuid DEFAULT gen_random_uuid() NOT NULL,
    finding_type text NOT NULL,
    human_question text,
    interpretive_statement text NOT NULL,
    understanding_delta text,
    supporting_world_objects jsonb DEFAULT '[]'::jsonb NOT NULL,
    counter_view_or_alternative jsonb DEFAULT '[]'::jsonb NOT NULL,
    missing_evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    present_connection_basis jsonb,
    uncertainty jsonb DEFAULT '{}'::jsonb NOT NULL,
    expression_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
    discovery_method jsonb DEFAULT '{}'::jsonb NOT NULL,
    ranking_components jsonb DEFAULT '{}'::jsonb NOT NULL,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE meaning.findings OWNER TO postgres;

--
-- Name: open_questions; Type: TABLE; Schema: meaning; Owner: postgres
--

CREATE TABLE meaning.open_questions (
    open_question_id uuid DEFAULT gen_random_uuid() NOT NULL,
    finding_id uuid,
    question text NOT NULL,
    missing_evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    next_research_action text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT open_questions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'dropped'::text])))
);


ALTER TABLE meaning.open_questions OWNER TO postgres;

--
-- Name: present_connections; Type: TABLE; Schema: meaning; Owner: postgres
--

CREATE TABLE meaning.present_connections (
    present_connection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    finding_id uuid,
    connection_type text NOT NULL,
    observed_state text,
    basis_world_objects jsonb DEFAULT '[]'::jsonb NOT NULL,
    open_questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    expression_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE meaning.present_connections OWNER TO postgres;

--
-- Name: agent_contexts; Type: TABLE; Schema: read_model; Owner: postgres
--

CREATE TABLE read_model.agent_contexts (
    agent_context_id uuid DEFAULT gen_random_uuid() NOT NULL,
    context_key text NOT NULL,
    payload jsonb NOT NULL,
    derived_from_finding_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE read_model.agent_contexts OWNER TO postgres;

--
-- Name: discovery_paths; Type: TABLE; Schema: read_model; Owner: postgres
--

CREATE TABLE read_model.discovery_paths (
    discovery_path_id uuid DEFAULT gen_random_uuid() NOT NULL,
    path_key text NOT NULL,
    steps jsonb NOT NULL,
    derived_from_finding_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE read_model.discovery_paths OWNER TO postgres;

--
-- Name: evidence_pointers; Type: TABLE; Schema: read_model; Owner: postgres
--

CREATE TABLE read_model.evidence_pointers (
    evidence_pointer_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    source_id uuid NOT NULL,
    display_locator jsonb NOT NULL,
    display_excerpt text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE read_model.evidence_pointers OWNER TO postgres;

--
-- Name: map_timeline_projections; Type: TABLE; Schema: read_model; Owner: postgres
--

CREATE TABLE read_model.map_timeline_projections (
    map_timeline_projection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    projection_key text NOT NULL,
    payload jsonb NOT NULL,
    derived_from_world_objects jsonb DEFAULT '[]'::jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE read_model.map_timeline_projections OWNER TO postgres;

--
-- Name: story_seeds; Type: TABLE; Schema: read_model; Owner: postgres
--

CREATE TABLE read_model.story_seeds (
    story_seed_id uuid DEFAULT gen_random_uuid() NOT NULL,
    seed_key text NOT NULL,
    title text,
    narrative_question text,
    payload jsonb NOT NULL,
    derived_from_finding_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    evidence_pointer_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE read_model.story_seeds OWNER TO postgres;

--
-- Name: world_projections; Type: TABLE; Schema: read_model; Owner: postgres
--

CREATE TABLE read_model.world_projections (
    projection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    projection_key text NOT NULL,
    payload jsonb NOT NULL,
    derived_from_finding_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    expression_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE read_model.world_projections OWNER TO postgres;

--
-- Name: raw_items; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.raw_items (
    raw_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_version_id uuid NOT NULL,
    storage_ref text NOT NULL,
    media_type text,
    byte_size bigint,
    checksum_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_items_byte_size_check CHECK (((byte_size IS NULL) OR (byte_size >= 0)))
);


ALTER TABLE source.raw_items OWNER TO postgres;

--
-- Name: read_handoffs; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.read_handoffs (
    handoff_id uuid DEFAULT gen_random_uuid() NOT NULL,
    read_run_id uuid NOT NULL,
    g1_audit_id uuid,
    output_manifest_hash text,
    allowed_extent jsonb DEFAULT '{}'::jsonb,
    gaps jsonb DEFAULT '{}'::jsonb,
    consumer_stage text DEFAULT 'D02'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE source.read_handoffs OWNER TO postgres;

--
-- Name: read_quality_checks; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.read_quality_checks (
    check_id uuid DEFAULT gen_random_uuid() NOT NULL,
    read_run_id uuid NOT NULL,
    metric text,
    profile_id text,
    denominator integer,
    population_n integer,
    sampled_n integer,
    error_n integer,
    sampling_scheme text,
    actual jsonb DEFAULT '{}'::jsonb,
    result text,
    evidence_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE source.read_quality_checks OWNER TO postgres;

--
-- Name: read_runs; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.read_runs (
    read_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    production_run_id uuid,
    raw_item_id uuid,
    input_sha256 text NOT NULL,
    upstream_g0_decision_id uuid,
    method_set jsonb DEFAULT '{}'::jsonb,
    engine text,
    config jsonb DEFAULT '{}'::jsonb,
    version text,
    status text DEFAULT 'RUNNING'::text NOT NULL,
    manifest_hash text,
    supersedes_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE source.read_runs OWNER TO postgres;

--
-- Name: read_units; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.read_units (
    read_unit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    read_run_id uuid NOT NULL,
    parent_id uuid,
    method_code text NOT NULL,
    kind text,
    locator_schema text,
    locator jsonb DEFAULT '{}'::jsonb,
    ordinal integer,
    payload_ref text,
    uncertainty jsonb DEFAULT '{}'::jsonb,
    revision_of uuid,
    locator_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT read_units_method_code_check CHECK ((method_code = ANY (ARRAY['C01'::text, 'C02'::text, 'C03'::text, 'C04'::text, 'C05'::text, 'C06'::text, 'C07'::text, 'C08'::text])))
);


ALTER TABLE source.read_units OWNER TO postgres;

--
-- Name: source_versions; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.source_versions (
    source_version_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    version_label text,
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    checksum_sha256 text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE source.source_versions OWNER TO postgres;

--
-- Name: sources; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.sources (
    source_id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    title text NOT NULL,
    source_type text NOT NULL,
    carrier_type text NOT NULL,
    creator text,
    publisher_or_institution text,
    source_uri_or_catalog_no text,
    source_date jsonb,
    rights jsonb DEFAULT '{}'::jsonb NOT NULL,
    provenance_status text DEFAULT 'declared'::text NOT NULL,
    content_availability text NOT NULL,
    original_locator jsonb DEFAULT '{}'::jsonb NOT NULL,
    scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sources_content_availability_check CHECK ((content_availability = ANY (ARRAY['full_content'::text, 'image_scan'::text, 'ocr'::text, 'structured_content'::text, 'catalog_only'::text, 'unavailable'::text])))
);


ALTER TABLE source.sources OWNER TO postgres;

--
-- Name: changes; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.changes (
    change_id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_entity_id uuid,
    change_type text NOT NULL,
    before_state jsonb,
    after_state jsonb,
    time_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    expression_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE world.changes OWNER TO postgres;

--
-- Name: claim_evidence_links; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.claim_evidence_links (
    claim_evidence_link_id uuid DEFAULT gen_random_uuid() NOT NULL,
    claim_object_type text NOT NULL,
    claim_object_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    support_type text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT claim_evidence_links_claim_object_type_check CHECK ((claim_object_type = ANY (ARRAY['event'::text, 'relation_claim'::text, 'change'::text, 'historical_space_claim'::text, 'visual_object'::text]))),
    CONSTRAINT claim_evidence_links_support_type_check CHECK ((support_type = ANY (ARRAY['supports'::text, 'contradicts'::text, 'contextualizes'::text])))
);


ALTER TABLE world.claim_evidence_links OWNER TO postgres;

--
-- Name: claim_revisions; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.claim_revisions (
    claim_revision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_kind text CONSTRAINT claim_revisions_object_type_not_null NOT NULL,
    subject_id uuid CONSTRAINT claim_revisions_object_id_not_null NOT NULL,
    revision_no integer NOT NULL,
    assertion_payload_json jsonb CONSTRAINT claim_revisions_revision_content_not_null NOT NULL,
    producer_method_id text NOT NULL,
    producer_method_version text,
    upstream_refs jsonb,
    supersedes_revision_id uuid,
    authored_at timestamp with time zone DEFAULT now() CONSTRAINT claim_revisions_created_at_not_null NOT NULL,
    claim_family_id uuid,
    evidence_snapshot_id uuid,
    asserted_time_json jsonb,
    CONSTRAINT claim_revisions_no_self_supersede CHECK ((claim_revision_id <> supersedes_revision_id)),
    CONSTRAINT claim_revisions_object_type_check CHECK ((subject_kind = ANY (ARRAY['entity'::text, 'event'::text, 'relation_claim'::text, 'change'::text, 'historical_space_claim'::text, 'visual_object'::text])))
);


ALTER TABLE world.claim_revisions OWNER TO postgres;

--
-- Name: conflicts; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.conflicts (
    conflict_id uuid DEFAULT gen_random_uuid() NOT NULL,
    conflict_key text NOT NULL,
    object_type text NOT NULL,
    object_id uuid NOT NULL,
    variant jsonb NOT NULL,
    resolution_status text DEFAULT 'open'::text NOT NULL,
    resolution_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conflicts_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['open'::text, 'resolved'::text, 'preserved_open'::text, 'rejected'::text])))
);


ALTER TABLE world.conflicts OWNER TO postgres;

--
-- Name: dependency_edges; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.dependency_edges (
    dependency_edge_id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_object_type text NOT NULL,
    from_object_id uuid NOT NULL,
    to_object_type text NOT NULL,
    to_object_id uuid NOT NULL,
    dependency_type text NOT NULL,
    producer_method_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    from_claim_revision_id uuid,
    to_claim_revision_id uuid,
    CONSTRAINT dependency_edges_dependency_type_check CHECK ((dependency_type = ANY (ARRAY['supports'::text, 'derived_from'::text, 'refines'::text, 'conflicts_with'::text])))
);


ALTER TABLE world.dependency_edges OWNER TO postgres;

--
-- Name: entities; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.entities (
    entity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    canonical_label text NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    temporal_scope jsonb,
    spatial_scope jsonb,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE world.entities OWNER TO postgres;

--
-- Name: event_participations; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.event_participations (
    event_participation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    candidate_entity_id uuid CONSTRAINT event_participations_entity_id_not_null NOT NULL,
    role_code text CONSTRAINT event_participations_role_not_null NOT NULL,
    expression_rule jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claim_revision_id uuid,
    temporal_scope jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE world.event_participations OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.events (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    canonical_label text NOT NULL,
    subject_entity_id uuid,
    time_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    space_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE world.events OWNER TO postgres;

--
-- Name: historical_space_claims; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.historical_space_claims (
    historical_space_claim_id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_entity_id uuid,
    claim_type text NOT NULL,
    geometry_claim jsonb,
    spatial_relation jsonb,
    time_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    "precision" jsonb DEFAULT '{}'::jsonb NOT NULL,
    uncertainty jsonb DEFAULT '{}'::jsonb NOT NULL,
    expression_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT historical_space_claims_check CHECK (((geometry_claim IS NOT NULL) OR (spatial_relation IS NOT NULL)))
);


ALTER TABLE world.historical_space_claims OWNER TO postgres;

--
-- Name: identity_decision_evidence; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.identity_decision_evidence (
    identity_decision_evidence_id uuid DEFAULT gen_random_uuid() CONSTRAINT identity_decision_evidence_identity_decision_evidence__not_null NOT NULL,
    identity_decision_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    support_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_decision_evidence_support_type_check CHECK ((support_type = ANY (ARRAY['supports'::text, 'undermines'::text, 'neutral'::text])))
);


ALTER TABLE world.identity_decision_evidence OWNER TO postgres;

--
-- Name: identity_decisions; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.identity_decisions (
    identity_decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    merged_entity_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    decision_type text NOT NULL,
    rationale text NOT NULL,
    producer_method_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    temporal_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    decision_version text,
    upstream_g2_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT identity_decisions_decision_type_check CHECK ((decision_type = ANY (ARRAY['same_identity'::text, 'distinct_identity'::text, 'merge'::text, 'split'::text])))
);


ALTER TABLE world.identity_decisions OWNER TO postgres;

--
-- Name: provenance_assessments; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.provenance_assessments (
    provenance_assessment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    claim_object_type text NOT NULL,
    claim_object_id uuid NOT NULL,
    assessment_type text NOT NULL,
    source_lineage jsonb NOT NULL,
    is_independent boolean NOT NULL,
    rationale text NOT NULL,
    producer_method_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claim_revision_id uuid,
    independence_state text,
    source_fingerprint text,
    assessment_version text,
    evidence_input_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT provenance_assessments_assessment_type_check CHECK ((assessment_type = ANY (ARRAY['independence'::text, 'genealogy'::text]))),
    CONSTRAINT provenance_assessments_independence_state_check CHECK (((independence_state IS NULL) OR (independence_state = ANY (ARRAY['UNKNOWN'::text, 'POSSIBLY_SHARED'::text, 'INDEPENDENT'::text, 'DERIVED'::text]))))
);


ALTER TABLE world.provenance_assessments OWNER TO postgres;

--
-- Name: relation_claims; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.relation_claims (
    relation_claim_id uuid DEFAULT gen_random_uuid() NOT NULL,
    relation_type text NOT NULL,
    subject_entity_id uuid,
    object_entity_id uuid,
    object_value jsonb,
    time_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    space_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    expression_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT relation_claims_check CHECK (((object_entity_id IS NOT NULL) OR (object_value IS NOT NULL)))
);


ALTER TABLE world.relation_claims OWNER TO postgres;

--
-- Name: visual_objects; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.visual_objects (
    visual_object_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid,
    subject_entity_id uuid,
    visual_type text NOT NULL,
    asset_ref text,
    literal_reading text,
    time_scope jsonb,
    space_scope jsonb,
    correspondence_claim jsonb,
    maturity control.maturity_status DEFAULT 'candidate'::control.maturity_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE world.visual_objects OWNER TO postgres;

--
-- Name: world_decision_events; Type: TABLE; Schema: world; Owner: postgres
--

CREATE TABLE world.world_decision_events (
    world_decision_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_claim_revision_id uuid,
    to_claim_revision_id uuid,
    dependency_type text,
    affected_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    previous_input_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    change_reason text,
    producer_method_id text,
    producer_method_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE world.world_decision_events OWNER TO postgres;

--
-- Data for Name: gate_audits; Type: TABLE DATA; Schema: control; Owner: postgres
--

COPY control.gate_audits (gate_audit_id, run_id, stage, gate_code, object_type, object_id, result, reason_codes, guard_versions, details, checked_at, architecture_generation, purpose, allowed_scope, consumer, dependency_snapshot, effective_time, input_fingerprint, output_fingerprint, rule_version, supersedes_id, current_valid) FROM stdin;
\.


--
-- Data for Name: invalidation_events; Type: TABLE DATA; Schema: control; Owner: postgres
--

COPY control.invalidation_events (invalidation_event_id, change_event_ref, changed_dependency_ref, affected_publication_revisions, affected_purpose_scope_consumers, dependency_paths, reason, suspension_request, recheck_request, disposition, unknown_dependency, producer_method_id, producer_method_version, created_at) FROM stdin;
\.


--
-- Data for Name: owner_reviews; Type: TABLE DATA; Schema: control; Owner: postgres
--

COPY control.owner_reviews (owner_review_id, run_id, stage, object_type, object_id, decision, note, reviewed_at) FROM stdin;
\.


--
-- Data for Name: production_runs; Type: TABLE DATA; Schema: control; Owner: postgres
--

COPY control.production_runs (run_id, research_intent, scope, execution_mode, status, current_stage, started_at, finished_at, metadata, architecture_generation) FROM stdin;
\.


--
-- Data for Name: classification_decisions; Type: TABLE DATA; Schema: evidence; Owner: postgres
--

COPY evidence.classification_decisions (decision_id, reading_unit_id, primary_h_type, alternatives, basis, taxonomy_version, status, decided_at, supersedes_decision_id) FROM stdin;
\.


--
-- Data for Name: material_evidence; Type: TABLE DATA; Schema: evidence; Owner: postgres
--

COPY evidence.material_evidence (evidence_id, source_id, source_version_id, raw_item_id, locator, media_region, modality, raw_excerpt_or_region, literal_reading, normalized_text, research_proposition, source_voice, evidence_type, temporal_applicability, spatial_applicability, uncertainty, extraction_method, maturity, created_at, reading_unit_id, assertion_kind, voice_basis, quote_review_status, quote_review_ref, evidence_version_no, input_fingerprint, supersedes_evidence_id) FROM stdin;
\.


--
-- Data for Name: material_mentions; Type: TABLE DATA; Schema: evidence; Owner: postgres
--

COPY evidence.material_mentions (mention_id, evidence_id, mention_kind, literal_text, span_in_evidence, "precision", uncertainty, created_at) FROM stdin;
\.


--
-- Data for Name: read_unit_evidence_links; Type: TABLE DATA; Schema: evidence; Owner: postgres
--

COPY evidence.read_unit_evidence_links (link_id, evidence_id, read_unit_id, read_run_id, selected_extent, selection_basis, quote_snapshot_hash, technical_profile_id, g1_decision_id, recorded_at, link_version, supersedes_link_id, extent_order, allowed_purpose, locator_schema_version) FROM stdin;
\.


--
-- Data for Name: reading_unit_dependencies; Type: TABLE DATA; Schema: evidence; Owner: postgres
--

COPY evidence.reading_unit_dependencies (dependency_id, from_reading_unit_id, to_reading_unit_id, external_source_version_id, relation_kind, certainty, basis, created_at) FROM stdin;
\.


--
-- Data for Name: reading_units; Type: TABLE DATA; Schema: evidence; Owner: postgres
--

COPY evidence.reading_units (reading_unit_id, source_version_id, raw_item_id, parent_unit_id, unit_path, unit_kind, primary_h_type, taxonomy_version, classification_status, classification_basis, created_at) FROM stdin;
\.


--
-- Data for Name: claim_revisions; Type: TABLE DATA; Schema: meaning; Owner: postgres
--

COPY meaning.claim_revisions (claim_revision_id, finding_id, revision_no, revision_content, producer_method_id, producer_method_version, supersedes_id, created_at) FROM stdin;
\.


--
-- Data for Name: findings; Type: TABLE DATA; Schema: meaning; Owner: postgres
--

COPY meaning.findings (finding_id, finding_type, human_question, interpretive_statement, understanding_delta, supporting_world_objects, counter_view_or_alternative, missing_evidence, present_connection_basis, uncertainty, expression_rule, discovery_method, ranking_components, maturity, created_at) FROM stdin;
\.


--
-- Data for Name: open_questions; Type: TABLE DATA; Schema: meaning; Owner: postgres
--

COPY meaning.open_questions (open_question_id, finding_id, question, missing_evidence, next_research_action, status, created_at) FROM stdin;
\.


--
-- Data for Name: present_connections; Type: TABLE DATA; Schema: meaning; Owner: postgres
--

COPY meaning.present_connections (present_connection_id, finding_id, connection_type, observed_state, basis_world_objects, open_questions, expression_rule, created_at) FROM stdin;
\.


--
-- Data for Name: agent_contexts; Type: TABLE DATA; Schema: read_model; Owner: postgres
--

COPY read_model.agent_contexts (agent_context_id, context_key, payload, derived_from_finding_ids, generated_at) FROM stdin;
\.


--
-- Data for Name: discovery_paths; Type: TABLE DATA; Schema: read_model; Owner: postgres
--

COPY read_model.discovery_paths (discovery_path_id, path_key, steps, derived_from_finding_ids, generated_at) FROM stdin;
\.


--
-- Data for Name: evidence_pointers; Type: TABLE DATA; Schema: read_model; Owner: postgres
--

COPY read_model.evidence_pointers (evidence_pointer_id, evidence_id, source_id, display_locator, display_excerpt, generated_at) FROM stdin;
\.


--
-- Data for Name: map_timeline_projections; Type: TABLE DATA; Schema: read_model; Owner: postgres
--

COPY read_model.map_timeline_projections (map_timeline_projection_id, projection_key, payload, derived_from_world_objects, generated_at) FROM stdin;
\.


--
-- Data for Name: story_seeds; Type: TABLE DATA; Schema: read_model; Owner: postgres
--

COPY read_model.story_seeds (story_seed_id, seed_key, title, narrative_question, payload, derived_from_finding_ids, evidence_pointer_ids, generated_at) FROM stdin;
\.


--
-- Data for Name: world_projections; Type: TABLE DATA; Schema: read_model; Owner: postgres
--

COPY read_model.world_projections (projection_id, projection_key, payload, derived_from_finding_ids, expression_rule, generated_at) FROM stdin;
\.


--
-- Data for Name: raw_items; Type: TABLE DATA; Schema: source; Owner: postgres
--

COPY source.raw_items (raw_item_id, source_version_id, storage_ref, media_type, byte_size, checksum_sha256, created_at) FROM stdin;
\.


--
-- Data for Name: read_handoffs; Type: TABLE DATA; Schema: source; Owner: postgres
--

COPY source.read_handoffs (handoff_id, read_run_id, g1_audit_id, output_manifest_hash, allowed_extent, gaps, consumer_stage, created_at) FROM stdin;
\.


--
-- Data for Name: read_quality_checks; Type: TABLE DATA; Schema: source; Owner: postgres
--

COPY source.read_quality_checks (check_id, read_run_id, metric, profile_id, denominator, population_n, sampled_n, error_n, sampling_scheme, actual, result, evidence_ref, created_at) FROM stdin;
\.


--
-- Data for Name: read_runs; Type: TABLE DATA; Schema: source; Owner: postgres
--

COPY source.read_runs (read_run_id, production_run_id, raw_item_id, input_sha256, upstream_g0_decision_id, method_set, engine, config, version, status, manifest_hash, supersedes_id, created_at) FROM stdin;
\.


--
-- Data for Name: read_units; Type: TABLE DATA; Schema: source; Owner: postgres
--

COPY source.read_units (read_unit_id, read_run_id, parent_id, method_code, kind, locator_schema, locator, ordinal, payload_ref, uncertainty, revision_of, locator_hash, created_at) FROM stdin;
\.


--
-- Data for Name: source_versions; Type: TABLE DATA; Schema: source; Owner: postgres
--

COPY source.source_versions (source_version_id, source_id, version_label, retrieved_at, checksum_sha256, metadata) FROM stdin;
\.


--
-- Data for Name: sources; Type: TABLE DATA; Schema: source; Owner: postgres
--

COPY source.sources (source_id, provider, title, source_type, carrier_type, creator, publisher_or_institution, source_uri_or_catalog_no, source_date, rights, provenance_status, content_availability, original_locator, scope, created_at) FROM stdin;
\.


--
-- Data for Name: changes; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.changes (change_id, subject_entity_id, change_type, before_state, after_state, time_scope, expression_rule, maturity, created_at) FROM stdin;
\.


--
-- Data for Name: claim_evidence_links; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.claim_evidence_links (claim_evidence_link_id, claim_object_type, claim_object_id, evidence_id, support_type, note, created_at) FROM stdin;
\.


--
-- Data for Name: claim_revisions; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.claim_revisions (claim_revision_id, subject_kind, subject_id, revision_no, assertion_payload_json, producer_method_id, producer_method_version, upstream_refs, supersedes_revision_id, authored_at, claim_family_id, evidence_snapshot_id, asserted_time_json) FROM stdin;
\.


--
-- Data for Name: conflicts; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.conflicts (conflict_id, conflict_key, object_type, object_id, variant, resolution_status, resolution_note, created_at) FROM stdin;
\.


--
-- Data for Name: dependency_edges; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.dependency_edges (dependency_edge_id, from_object_type, from_object_id, to_object_type, to_object_id, dependency_type, producer_method_id, created_at, from_claim_revision_id, to_claim_revision_id) FROM stdin;
\.


--
-- Data for Name: entities; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.entities (entity_id, entity_type, canonical_label, aliases, temporal_scope, spatial_scope, attributes, maturity, created_at) FROM stdin;
\.


--
-- Data for Name: event_participations; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.event_participations (event_participation_id, event_id, candidate_entity_id, role_code, expression_rule, created_at, claim_revision_id, temporal_scope) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.events (event_id, event_type, canonical_label, subject_entity_id, time_scope, space_scope, attributes, maturity, created_at) FROM stdin;
\.


--
-- Data for Name: historical_space_claims; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.historical_space_claims (historical_space_claim_id, subject_entity_id, claim_type, geometry_claim, spatial_relation, time_scope, "precision", uncertainty, expression_rule, maturity, created_at) FROM stdin;
\.


--
-- Data for Name: identity_decision_evidence; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.identity_decision_evidence (identity_decision_evidence_id, identity_decision_id, evidence_id, support_type, created_at) FROM stdin;
\.


--
-- Data for Name: identity_decisions; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.identity_decisions (identity_decision_id, entity_id, merged_entity_ids, decision_type, rationale, producer_method_id, created_at, temporal_scope, decision_version, upstream_g2_snapshot) FROM stdin;
\.


--
-- Data for Name: provenance_assessments; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.provenance_assessments (provenance_assessment_id, claim_object_type, claim_object_id, assessment_type, source_lineage, is_independent, rationale, producer_method_id, created_at, claim_revision_id, independence_state, source_fingerprint, assessment_version, evidence_input_snapshot) FROM stdin;
\.


--
-- Data for Name: relation_claims; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.relation_claims (relation_claim_id, relation_type, subject_entity_id, object_entity_id, object_value, time_scope, space_scope, expression_rule, maturity, created_at) FROM stdin;
\.


--
-- Data for Name: visual_objects; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.visual_objects (visual_object_id, source_id, subject_entity_id, visual_type, asset_ref, literal_reading, time_scope, space_scope, correspondence_claim, maturity, created_at) FROM stdin;
\.


--
-- Data for Name: world_decision_events; Type: TABLE DATA; Schema: world; Owner: postgres
--

COPY world.world_decision_events (world_decision_event_id, from_claim_revision_id, to_claim_revision_id, dependency_type, affected_scope, previous_input_snapshot, change_reason, producer_method_id, producer_method_version, created_at) FROM stdin;
\.


--
-- Name: gate_audits gate_audits_pkey; Type: CONSTRAINT; Schema: control; Owner: postgres
--

ALTER TABLE ONLY control.gate_audits
    ADD CONSTRAINT gate_audits_pkey PRIMARY KEY (gate_audit_id);


--
-- Name: invalidation_events invalidation_events_pkey; Type: CONSTRAINT; Schema: control; Owner: postgres
--

ALTER TABLE ONLY control.invalidation_events
    ADD CONSTRAINT invalidation_events_pkey PRIMARY KEY (invalidation_event_id);


--
-- Name: owner_reviews owner_reviews_pkey; Type: CONSTRAINT; Schema: control; Owner: postgres
--

ALTER TABLE ONLY control.owner_reviews
    ADD CONSTRAINT owner_reviews_pkey PRIMARY KEY (owner_review_id);


--
-- Name: production_runs production_runs_pkey; Type: CONSTRAINT; Schema: control; Owner: postgres
--

ALTER TABLE ONLY control.production_runs
    ADD CONSTRAINT production_runs_pkey PRIMARY KEY (run_id);


--
-- Name: classification_decisions classification_decisions_pkey; Type: CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.classification_decisions
    ADD CONSTRAINT classification_decisions_pkey PRIMARY KEY (decision_id);


--
-- Name: material_evidence material_evidence_pkey; Type: CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: material_mentions material_mentions_pkey; Type: CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_mentions
    ADD CONSTRAINT material_mentions_pkey PRIMARY KEY (mention_id);


--
-- Name: read_unit_evidence_links read_unit_evidence_links_pkey; Type: CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_pkey PRIMARY KEY (link_id);


--
-- Name: reading_unit_dependencies reading_unit_dependencies_pkey; Type: CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_unit_dependencies
    ADD CONSTRAINT reading_unit_dependencies_pkey PRIMARY KEY (dependency_id);


--
-- Name: reading_units reading_units_pkey; Type: CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_units
    ADD CONSTRAINT reading_units_pkey PRIMARY KEY (reading_unit_id);


--
-- Name: claim_revisions claim_revisions_pkey; Type: CONSTRAINT; Schema: meaning; Owner: postgres
--

ALTER TABLE ONLY meaning.claim_revisions
    ADD CONSTRAINT claim_revisions_pkey PRIMARY KEY (claim_revision_id);


--
-- Name: findings findings_pkey; Type: CONSTRAINT; Schema: meaning; Owner: postgres
--

ALTER TABLE ONLY meaning.findings
    ADD CONSTRAINT findings_pkey PRIMARY KEY (finding_id);


--
-- Name: open_questions open_questions_pkey; Type: CONSTRAINT; Schema: meaning; Owner: postgres
--

ALTER TABLE ONLY meaning.open_questions
    ADD CONSTRAINT open_questions_pkey PRIMARY KEY (open_question_id);


--
-- Name: present_connections present_connections_pkey; Type: CONSTRAINT; Schema: meaning; Owner: postgres
--

ALTER TABLE ONLY meaning.present_connections
    ADD CONSTRAINT present_connections_pkey PRIMARY KEY (present_connection_id);


--
-- Name: agent_contexts agent_contexts_context_key_key; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.agent_contexts
    ADD CONSTRAINT agent_contexts_context_key_key UNIQUE (context_key);


--
-- Name: agent_contexts agent_contexts_pkey; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.agent_contexts
    ADD CONSTRAINT agent_contexts_pkey PRIMARY KEY (agent_context_id);


--
-- Name: discovery_paths discovery_paths_path_key_key; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.discovery_paths
    ADD CONSTRAINT discovery_paths_path_key_key UNIQUE (path_key);


--
-- Name: discovery_paths discovery_paths_pkey; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.discovery_paths
    ADD CONSTRAINT discovery_paths_pkey PRIMARY KEY (discovery_path_id);


--
-- Name: evidence_pointers evidence_pointers_evidence_id_source_id_key; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_evidence_id_source_id_key UNIQUE (evidence_id, source_id);


--
-- Name: evidence_pointers evidence_pointers_pkey; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_pkey PRIMARY KEY (evidence_pointer_id);


--
-- Name: map_timeline_projections map_timeline_projections_pkey; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.map_timeline_projections
    ADD CONSTRAINT map_timeline_projections_pkey PRIMARY KEY (map_timeline_projection_id);


--
-- Name: map_timeline_projections map_timeline_projections_projection_key_key; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.map_timeline_projections
    ADD CONSTRAINT map_timeline_projections_projection_key_key UNIQUE (projection_key);


--
-- Name: story_seeds story_seeds_pkey; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.story_seeds
    ADD CONSTRAINT story_seeds_pkey PRIMARY KEY (story_seed_id);


--
-- Name: story_seeds story_seeds_seed_key_key; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.story_seeds
    ADD CONSTRAINT story_seeds_seed_key_key UNIQUE (seed_key);


--
-- Name: world_projections world_projections_pkey; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.world_projections
    ADD CONSTRAINT world_projections_pkey PRIMARY KEY (projection_id);


--
-- Name: world_projections world_projections_projection_key_key; Type: CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.world_projections
    ADD CONSTRAINT world_projections_projection_key_key UNIQUE (projection_key);


--
-- Name: raw_items raw_items_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.raw_items
    ADD CONSTRAINT raw_items_pkey PRIMARY KEY (raw_item_id);


--
-- Name: raw_items raw_items_source_version_id_storage_ref_key; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.raw_items
    ADD CONSTRAINT raw_items_source_version_id_storage_ref_key UNIQUE (source_version_id, storage_ref);


--
-- Name: read_handoffs read_handoffs_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_handoffs
    ADD CONSTRAINT read_handoffs_pkey PRIMARY KEY (handoff_id);


--
-- Name: read_quality_checks read_quality_checks_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_quality_checks
    ADD CONSTRAINT read_quality_checks_pkey PRIMARY KEY (check_id);


--
-- Name: read_runs read_runs_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_runs
    ADD CONSTRAINT read_runs_pkey PRIMARY KEY (read_run_id);


--
-- Name: read_units read_units_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_pkey PRIMARY KEY (read_unit_id);


--
-- Name: read_units read_units_read_run_id_ordinal_method_code_locator_hash_key; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_read_run_id_ordinal_method_code_locator_hash_key UNIQUE (read_run_id, ordinal, method_code, locator_hash);


--
-- Name: source_versions source_versions_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.source_versions
    ADD CONSTRAINT source_versions_pkey PRIMARY KEY (source_version_id);


--
-- Name: source_versions source_versions_source_id_checksum_sha256_key; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.source_versions
    ADD CONSTRAINT source_versions_source_id_checksum_sha256_key UNIQUE (source_id, checksum_sha256);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (source_id);


--
-- Name: changes changes_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.changes
    ADD CONSTRAINT changes_pkey PRIMARY KEY (change_id);


--
-- Name: claim_evidence_links claim_evidence_links_claim_object_type_claim_object_id_evid_key; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.claim_evidence_links
    ADD CONSTRAINT claim_evidence_links_claim_object_type_claim_object_id_evid_key UNIQUE (claim_object_type, claim_object_id, evidence_id, support_type);


--
-- Name: claim_evidence_links claim_evidence_links_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.claim_evidence_links
    ADD CONSTRAINT claim_evidence_links_pkey PRIMARY KEY (claim_evidence_link_id);


--
-- Name: claim_revisions claim_revisions_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.claim_revisions
    ADD CONSTRAINT claim_revisions_pkey PRIMARY KEY (claim_revision_id);


--
-- Name: conflicts conflicts_conflict_key_key; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.conflicts
    ADD CONSTRAINT conflicts_conflict_key_key UNIQUE (conflict_key);


--
-- Name: conflicts conflicts_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.conflicts
    ADD CONSTRAINT conflicts_pkey PRIMARY KEY (conflict_id);


--
-- Name: dependency_edges dependency_edges_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.dependency_edges
    ADD CONSTRAINT dependency_edges_pkey PRIMARY KEY (dependency_edge_id);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (entity_id);


--
-- Name: event_participations event_participations_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.event_participations
    ADD CONSTRAINT event_participations_pkey PRIMARY KEY (event_participation_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);


--
-- Name: historical_space_claims historical_space_claims_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.historical_space_claims
    ADD CONSTRAINT historical_space_claims_pkey PRIMARY KEY (historical_space_claim_id);


--
-- Name: identity_decision_evidence identity_decision_evidence_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.identity_decision_evidence
    ADD CONSTRAINT identity_decision_evidence_pkey PRIMARY KEY (identity_decision_evidence_id);


--
-- Name: identity_decisions identity_decisions_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.identity_decisions
    ADD CONSTRAINT identity_decisions_pkey PRIMARY KEY (identity_decision_id);


--
-- Name: provenance_assessments provenance_assessments_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.provenance_assessments
    ADD CONSTRAINT provenance_assessments_pkey PRIMARY KEY (provenance_assessment_id);


--
-- Name: relation_claims relation_claims_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.relation_claims
    ADD CONSTRAINT relation_claims_pkey PRIMARY KEY (relation_claim_id);


--
-- Name: visual_objects visual_objects_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.visual_objects
    ADD CONSTRAINT visual_objects_pkey PRIMARY KEY (visual_object_id);


--
-- Name: world_decision_events world_decision_events_pkey; Type: CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.world_decision_events
    ADD CONSTRAINT world_decision_events_pkey PRIMARY KEY (world_decision_event_id);


--
-- Name: idx_gate_audits_object; Type: INDEX; Schema: control; Owner: postgres
--

CREATE INDEX idx_gate_audits_object ON control.gate_audits USING btree (object_type, object_id, gate_code, result);


--
-- Name: idx_invalidation_events_dependency; Type: INDEX; Schema: control; Owner: postgres
--

CREATE INDEX idx_invalidation_events_dependency ON control.invalidation_events USING btree (((changed_dependency_ref ->> 'type'::text)), ((changed_dependency_ref ->> 'id'::text)));


--
-- Name: idx_classification_decisions_reading_unit; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_classification_decisions_reading_unit ON evidence.classification_decisions USING btree (reading_unit_id);


--
-- Name: idx_material_evidence_reading_unit; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_material_evidence_reading_unit ON evidence.material_evidence USING btree (reading_unit_id);


--
-- Name: idx_material_evidence_source; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_material_evidence_source ON evidence.material_evidence USING btree (source_id);


--
-- Name: idx_material_evidence_supersedes; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_material_evidence_supersedes ON evidence.material_evidence USING btree (supersedes_evidence_id);


--
-- Name: idx_material_mentions_evidence; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_material_mentions_evidence ON evidence.material_mentions USING btree (evidence_id);


--
-- Name: idx_read_unit_evidence_links_order; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE UNIQUE INDEX idx_read_unit_evidence_links_order ON evidence.read_unit_evidence_links USING btree (evidence_id, extent_order);


--
-- Name: idx_reading_unit_dependencies_from; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_reading_unit_dependencies_from ON evidence.reading_unit_dependencies USING btree (from_reading_unit_id);


--
-- Name: idx_reading_units_parent; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_reading_units_parent ON evidence.reading_units USING btree (parent_unit_id);


--
-- Name: idx_reading_units_source_version; Type: INDEX; Schema: evidence; Owner: postgres
--

CREATE INDEX idx_reading_units_source_version ON evidence.reading_units USING btree (source_version_id);


--
-- Name: idx_claim_evidence_claim; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_claim_evidence_claim ON world.claim_evidence_links USING btree (claim_object_type, claim_object_id);


--
-- Name: idx_claim_revisions_family; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_claim_revisions_family ON world.claim_revisions USING btree (claim_family_id);


--
-- Name: idx_claim_revisions_subject; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_claim_revisions_subject ON world.claim_revisions USING btree (subject_kind, subject_id);


--
-- Name: idx_dependency_edges_from_revision; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_dependency_edges_from_revision ON world.dependency_edges USING btree (from_claim_revision_id);


--
-- Name: idx_dependency_edges_to_revision; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_dependency_edges_to_revision ON world.dependency_edges USING btree (to_claim_revision_id);


--
-- Name: idx_event_participations_revision; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_event_participations_revision ON world.event_participations USING btree (claim_revision_id);


--
-- Name: idx_provenance_assessments_revision; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_provenance_assessments_revision ON world.provenance_assessments USING btree (claim_revision_id);


--
-- Name: idx_world_decision_events_from; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_world_decision_events_from ON world.world_decision_events USING btree (from_claim_revision_id);


--
-- Name: idx_world_decision_events_to; Type: INDEX; Schema: world; Owner: postgres
--

CREATE INDEX idx_world_decision_events_to ON world.world_decision_events USING btree (to_claim_revision_id);


--
-- Name: raw_items raw_items_append_only_update; Type: TRIGGER; Schema: source; Owner: postgres
--

CREATE TRIGGER raw_items_append_only_update BEFORE DELETE OR UPDATE ON source.raw_items FOR EACH ROW EXECUTE FUNCTION source.forbid_raw_mutation();


--
-- Name: gate_audits gate_audits_run_id_fkey; Type: FK CONSTRAINT; Schema: control; Owner: postgres
--

ALTER TABLE ONLY control.gate_audits
    ADD CONSTRAINT gate_audits_run_id_fkey FOREIGN KEY (run_id) REFERENCES control.production_runs(run_id);


--
-- Name: gate_audits gate_audits_supersedes_id_fkey; Type: FK CONSTRAINT; Schema: control; Owner: postgres
--

ALTER TABLE ONLY control.gate_audits
    ADD CONSTRAINT gate_audits_supersedes_id_fkey FOREIGN KEY (supersedes_id) REFERENCES control.gate_audits(gate_audit_id);


--
-- Name: owner_reviews owner_reviews_run_id_fkey; Type: FK CONSTRAINT; Schema: control; Owner: postgres
--

ALTER TABLE ONLY control.owner_reviews
    ADD CONSTRAINT owner_reviews_run_id_fkey FOREIGN KEY (run_id) REFERENCES control.production_runs(run_id);


--
-- Name: classification_decisions classification_decisions_reading_unit_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.classification_decisions
    ADD CONSTRAINT classification_decisions_reading_unit_id_fkey FOREIGN KEY (reading_unit_id) REFERENCES evidence.reading_units(reading_unit_id);


--
-- Name: classification_decisions classification_decisions_supersedes_decision_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.classification_decisions
    ADD CONSTRAINT classification_decisions_supersedes_decision_id_fkey FOREIGN KEY (supersedes_decision_id) REFERENCES evidence.classification_decisions(decision_id);


--
-- Name: material_evidence material_evidence_raw_item_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_raw_item_id_fkey FOREIGN KEY (raw_item_id) REFERENCES source.raw_items(raw_item_id);


--
-- Name: material_evidence material_evidence_reading_unit_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_reading_unit_id_fkey FOREIGN KEY (reading_unit_id) REFERENCES evidence.reading_units(reading_unit_id);


--
-- Name: material_evidence material_evidence_source_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- Name: material_evidence material_evidence_source_version_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_source_version_id_fkey FOREIGN KEY (source_version_id) REFERENCES source.source_versions(source_version_id);


--
-- Name: material_evidence material_evidence_supersedes_evidence_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_supersedes_evidence_id_fkey FOREIGN KEY (supersedes_evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- Name: material_mentions material_mentions_evidence_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.material_mentions
    ADD CONSTRAINT material_mentions_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- Name: read_unit_evidence_links read_unit_evidence_links_evidence_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- Name: read_unit_evidence_links read_unit_evidence_links_g1_decision_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_g1_decision_id_fkey FOREIGN KEY (g1_decision_id) REFERENCES control.gate_audits(gate_audit_id);


--
-- Name: read_unit_evidence_links read_unit_evidence_links_read_run_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- Name: read_unit_evidence_links read_unit_evidence_links_read_unit_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_read_unit_id_fkey FOREIGN KEY (read_unit_id) REFERENCES source.read_units(read_unit_id);


--
-- Name: reading_unit_dependencies reading_unit_dependencies_external_source_version_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_unit_dependencies
    ADD CONSTRAINT reading_unit_dependencies_external_source_version_id_fkey FOREIGN KEY (external_source_version_id) REFERENCES source.source_versions(source_version_id);


--
-- Name: reading_unit_dependencies reading_unit_dependencies_from_reading_unit_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_unit_dependencies
    ADD CONSTRAINT reading_unit_dependencies_from_reading_unit_id_fkey FOREIGN KEY (from_reading_unit_id) REFERENCES evidence.reading_units(reading_unit_id);


--
-- Name: reading_unit_dependencies reading_unit_dependencies_to_reading_unit_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_unit_dependencies
    ADD CONSTRAINT reading_unit_dependencies_to_reading_unit_id_fkey FOREIGN KEY (to_reading_unit_id) REFERENCES evidence.reading_units(reading_unit_id);


--
-- Name: reading_units reading_units_parent_unit_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_units
    ADD CONSTRAINT reading_units_parent_unit_id_fkey FOREIGN KEY (parent_unit_id) REFERENCES evidence.reading_units(reading_unit_id);


--
-- Name: reading_units reading_units_raw_item_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_units
    ADD CONSTRAINT reading_units_raw_item_id_fkey FOREIGN KEY (raw_item_id) REFERENCES source.raw_items(raw_item_id);


--
-- Name: reading_units reading_units_source_version_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: postgres
--

ALTER TABLE ONLY evidence.reading_units
    ADD CONSTRAINT reading_units_source_version_id_fkey FOREIGN KEY (source_version_id) REFERENCES source.source_versions(source_version_id);


--
-- Name: claim_revisions claim_revisions_finding_id_fkey; Type: FK CONSTRAINT; Schema: meaning; Owner: postgres
--

ALTER TABLE ONLY meaning.claim_revisions
    ADD CONSTRAINT claim_revisions_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES meaning.findings(finding_id);


--
-- Name: open_questions open_questions_finding_id_fkey; Type: FK CONSTRAINT; Schema: meaning; Owner: postgres
--

ALTER TABLE ONLY meaning.open_questions
    ADD CONSTRAINT open_questions_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES meaning.findings(finding_id);


--
-- Name: present_connections present_connections_finding_id_fkey; Type: FK CONSTRAINT; Schema: meaning; Owner: postgres
--

ALTER TABLE ONLY meaning.present_connections
    ADD CONSTRAINT present_connections_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES meaning.findings(finding_id);


--
-- Name: evidence_pointers evidence_pointers_evidence_id_fkey; Type: FK CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- Name: evidence_pointers evidence_pointers_source_id_fkey; Type: FK CONSTRAINT; Schema: read_model; Owner: postgres
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- Name: raw_items raw_items_source_version_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.raw_items
    ADD CONSTRAINT raw_items_source_version_id_fkey FOREIGN KEY (source_version_id) REFERENCES source.source_versions(source_version_id);


--
-- Name: read_handoffs read_handoffs_g1_audit_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_handoffs
    ADD CONSTRAINT read_handoffs_g1_audit_id_fkey FOREIGN KEY (g1_audit_id) REFERENCES control.gate_audits(gate_audit_id);


--
-- Name: read_handoffs read_handoffs_read_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_handoffs
    ADD CONSTRAINT read_handoffs_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- Name: read_quality_checks read_quality_checks_read_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_quality_checks
    ADD CONSTRAINT read_quality_checks_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- Name: read_runs read_runs_production_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_runs
    ADD CONSTRAINT read_runs_production_run_id_fkey FOREIGN KEY (production_run_id) REFERENCES control.production_runs(run_id);


--
-- Name: read_runs read_runs_raw_item_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_runs
    ADD CONSTRAINT read_runs_raw_item_id_fkey FOREIGN KEY (raw_item_id) REFERENCES source.raw_items(raw_item_id);


--
-- Name: read_units read_units_parent_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES source.read_units(read_unit_id);


--
-- Name: read_units read_units_read_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- Name: source_versions source_versions_source_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.source_versions
    ADD CONSTRAINT source_versions_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- Name: changes changes_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.changes
    ADD CONSTRAINT changes_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- Name: claim_evidence_links claim_evidence_links_evidence_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.claim_evidence_links
    ADD CONSTRAINT claim_evidence_links_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- Name: claim_revisions claim_revisions_supersedes_fk; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.claim_revisions
    ADD CONSTRAINT claim_revisions_supersedes_fk FOREIGN KEY (supersedes_revision_id) REFERENCES world.claim_revisions(claim_revision_id);


--
-- Name: dependency_edges dependency_edges_from_claim_revision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.dependency_edges
    ADD CONSTRAINT dependency_edges_from_claim_revision_id_fkey FOREIGN KEY (from_claim_revision_id) REFERENCES world.claim_revisions(claim_revision_id);


--
-- Name: dependency_edges dependency_edges_to_claim_revision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.dependency_edges
    ADD CONSTRAINT dependency_edges_to_claim_revision_id_fkey FOREIGN KEY (to_claim_revision_id) REFERENCES world.claim_revisions(claim_revision_id);


--
-- Name: event_participations event_participations_claim_revision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.event_participations
    ADD CONSTRAINT event_participations_claim_revision_id_fkey FOREIGN KEY (claim_revision_id) REFERENCES world.claim_revisions(claim_revision_id);


--
-- Name: event_participations event_participations_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.event_participations
    ADD CONSTRAINT event_participations_entity_id_fkey FOREIGN KEY (candidate_entity_id) REFERENCES world.entities(entity_id);


--
-- Name: event_participations event_participations_event_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.event_participations
    ADD CONSTRAINT event_participations_event_id_fkey FOREIGN KEY (event_id) REFERENCES world.events(event_id);


--
-- Name: events events_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.events
    ADD CONSTRAINT events_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- Name: historical_space_claims historical_space_claims_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.historical_space_claims
    ADD CONSTRAINT historical_space_claims_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- Name: identity_decision_evidence identity_decision_evidence_evidence_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.identity_decision_evidence
    ADD CONSTRAINT identity_decision_evidence_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- Name: identity_decision_evidence identity_decision_evidence_identity_decision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.identity_decision_evidence
    ADD CONSTRAINT identity_decision_evidence_identity_decision_id_fkey FOREIGN KEY (identity_decision_id) REFERENCES world.identity_decisions(identity_decision_id);


--
-- Name: identity_decisions identity_decisions_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.identity_decisions
    ADD CONSTRAINT identity_decisions_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES world.entities(entity_id);


--
-- Name: provenance_assessments provenance_assessments_claim_revision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.provenance_assessments
    ADD CONSTRAINT provenance_assessments_claim_revision_id_fkey FOREIGN KEY (claim_revision_id) REFERENCES world.claim_revisions(claim_revision_id);


--
-- Name: relation_claims relation_claims_object_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.relation_claims
    ADD CONSTRAINT relation_claims_object_entity_id_fkey FOREIGN KEY (object_entity_id) REFERENCES world.entities(entity_id);


--
-- Name: relation_claims relation_claims_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.relation_claims
    ADD CONSTRAINT relation_claims_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- Name: visual_objects visual_objects_source_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.visual_objects
    ADD CONSTRAINT visual_objects_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- Name: visual_objects visual_objects_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.visual_objects
    ADD CONSTRAINT visual_objects_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- Name: world_decision_events world_decision_events_from_claim_revision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.world_decision_events
    ADD CONSTRAINT world_decision_events_from_claim_revision_id_fkey FOREIGN KEY (from_claim_revision_id) REFERENCES world.claim_revisions(claim_revision_id);


--
-- Name: world_decision_events world_decision_events_to_claim_revision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: postgres
--

ALTER TABLE ONLY world.world_decision_events
    ADD CONSTRAINT world_decision_events_to_claim_revision_id_fkey FOREIGN KEY (to_claim_revision_id) REFERENCES world.claim_revisions(claim_revision_id);


--
-- PostgreSQL database dump complete
--

\unrestrict s1UzrUw284YHjHosSQHEzJ7oflhLJvbERSDEgQD76j3sKh5gqbo3cngXoq0mw5s

