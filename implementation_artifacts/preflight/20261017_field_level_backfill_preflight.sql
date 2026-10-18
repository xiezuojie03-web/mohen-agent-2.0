--
-- PostgreSQL database dump
--

\restrict VEpA2CyKmsIrtcMa1eSTJrwKik255MudtiIFFnv07lBGBIpHk70bC27nkhGXgax

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-10-17 12:25:40

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
-- TOC entry 12 (class 2615 OID 43664)
-- Name: control; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA control;


--
-- TOC entry 8 (class 2615 OID 43660)
-- Name: evidence; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA evidence;


--
-- TOC entry 10 (class 2615 OID 43662)
-- Name: meaning; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA meaning;


--
-- TOC entry 11 (class 2615 OID 43663)
-- Name: read_model; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA read_model;


--
-- TOC entry 7 (class 2615 OID 43659)
-- Name: source; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA source;


--
-- TOC entry 9 (class 2615 OID 43661)
-- Name: world; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA world;


--
-- TOC entry 2 (class 3079 OID 16861)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 964 (class 1247 OID 43666)
-- Name: gate_result; Type: TYPE; Schema: control; Owner: -
--

CREATE TYPE control.gate_result AS ENUM (
    'PASS',
    'HOLD',
    'REJECT',
    'REVOKED',
    'UNASSESSED'
);


--
-- TOC entry 970 (class 1247 OID 43682)
-- Name: maturity_status; Type: TYPE; Schema: control; Owner: -
--

CREATE TYPE control.maturity_status AS ENUM (
    'candidate',
    'adjudicated',
    'rejected',
    'archived'
);


--
-- TOC entry 967 (class 1247 OID 43674)
-- Name: owner_decision; Type: TYPE; Schema: control; Owner: -
--

CREATE TYPE control.owner_decision AS ENUM (
    'ACCEPT',
    'DEEPEN',
    'DROP'
);


--
-- TOC entry 958 (class 1247 OID 19688)
-- Name: historical_change_status; Type: TYPE; Schema: public; Owner: -
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


--
-- TOC entry 952 (class 1247 OID 19664)
-- Name: historical_geometry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.historical_geometry_type AS ENUM (
    'point',
    'line',
    'area',
    'unknown'
);


--
-- TOC entry 961 (class 1247 OID 19706)
-- Name: historical_relation_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.historical_relation_class AS ENUM (
    'E1',
    'E2',
    'E3',
    'E4'
);


--
-- TOC entry 955 (class 1247 OID 19674)
-- Name: historical_spatial_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.historical_spatial_status AS ENUM (
    'verified_object_point',
    'official_or_provider_object_point',
    'approximate_object_area',
    'historical_anchor_candidate',
    'historical_relative_position_only',
    'unresolved'
);


--
-- TOC entry 949 (class 1247 OID 16900)
-- Name: verification_status; Type: TYPE; Schema: public; Owner: -
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


--
-- TOC entry 324 (class 1255 OID 39454)
-- Name: guard_cmc_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 305 (class 1255 OID 19479)
-- Name: guard_confirmed_link_has_evidence(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 320 (class 1255 OID 39457)
-- Name: guard_cpc_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 323 (class 1255 OID 39451)
-- Name: guard_crc_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 321 (class 1255 OID 39436)
-- Name: guard_entity_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 325 (class 1255 OID 39442)
-- Name: guard_evidence_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 306 (class 1255 OID 19481)
-- Name: guard_excluded_asset_not_heritage_confirmed(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 327 (class 1255 OID 39448)
-- Name: guard_hf_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 326 (class 1255 OID 39445)
-- Name: guard_hsr_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 302 (class 1255 OID 17091)
-- Name: guard_published_claim_evidence(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 322 (class 1255 OID 39439)
-- Name: guard_relation_promotion_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 303 (class 1255 OID 17423)
-- Name: guard_review_queue_tier_c(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 319 (class 1255 OID 22817)
-- Name: guard_review_queue_triage(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 307 (class 1255 OID 20720)
-- Name: guard_visual_asset_gate_passed_requires_audit(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 304 (class 1255 OID 19230)
-- Name: guard_weave_not_publishable(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- TOC entry 299 (class 1255 OID 43834)
-- Name: forbid_raw_mutation(); Type: FUNCTION; Schema: source; Owner: -
--

CREATE FUNCTION source.forbid_raw_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ begin raise exception 'RAW_APPEND_ONLY'; end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 43712)
-- Name: gate_audits; Type: TABLE; Schema: control; Owner: -
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


--
-- TOC entry 263 (class 1259 OID 44590)
-- Name: meaning_eligibility; Type: VIEW; Schema: control; Owner: -
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


--
-- TOC entry 228 (class 1259 OID 43745)
-- Name: owner_reviews; Type: TABLE; Schema: control; Owner: -
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


--
-- TOC entry 226 (class 1259 OID 43691)
-- Name: production_runs; Type: TABLE; Schema: control; Owner: -
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


--
-- TOC entry 262 (class 1259 OID 44586)
-- Name: world_eligibility; Type: VIEW; Schema: control; Owner: -
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


--
-- TOC entry 232 (class 1259 OID 43836)
-- Name: material_evidence; Type: TABLE; Schema: evidence; Owner: -
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 254 (class 1259 OID 44403)
-- Name: read_unit_evidence_links; Type: TABLE; Schema: evidence; Owner: -
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
    supersedes_link_id uuid
);


--
-- TOC entry 261 (class 1259 OID 44566)
-- Name: claim_revisions; Type: TABLE; Schema: meaning; Owner: -
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


--
-- TOC entry 241 (class 1259 OID 44069)
-- Name: findings; Type: TABLE; Schema: meaning; Owner: -
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


--
-- TOC entry 243 (class 1259 OID 44121)
-- Name: open_questions; Type: TABLE; Schema: meaning; Owner: -
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


--
-- TOC entry 242 (class 1259 OID 44098)
-- Name: present_connections; Type: TABLE; Schema: meaning; Owner: -
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


--
-- TOC entry 245 (class 1259 OID 44162)
-- Name: agent_contexts; Type: TABLE; Schema: read_model; Owner: -
--

CREATE TABLE read_model.agent_contexts (
    agent_context_id uuid DEFAULT gen_random_uuid() NOT NULL,
    context_key text NOT NULL,
    payload jsonb NOT NULL,
    derived_from_finding_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 247 (class 1259 OID 44198)
-- Name: discovery_paths; Type: TABLE; Schema: read_model; Owner: -
--

CREATE TABLE read_model.discovery_paths (
    discovery_path_id uuid DEFAULT gen_random_uuid() NOT NULL,
    path_key text NOT NULL,
    steps jsonb NOT NULL,
    derived_from_finding_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 249 (class 1259 OID 44232)
-- Name: evidence_pointers; Type: TABLE; Schema: read_model; Owner: -
--

CREATE TABLE read_model.evidence_pointers (
    evidence_pointer_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    source_id uuid NOT NULL,
    display_locator jsonb NOT NULL,
    display_excerpt text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 248 (class 1259 OID 44215)
-- Name: map_timeline_projections; Type: TABLE; Schema: read_model; Owner: -
--

CREATE TABLE read_model.map_timeline_projections (
    map_timeline_projection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    projection_key text NOT NULL,
    payload jsonb NOT NULL,
    derived_from_world_objects jsonb DEFAULT '[]'::jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 246 (class 1259 OID 44179)
-- Name: story_seeds; Type: TABLE; Schema: read_model; Owner: -
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


--
-- TOC entry 244 (class 1259 OID 44143)
-- Name: world_projections; Type: TABLE; Schema: read_model; Owner: -
--

CREATE TABLE read_model.world_projections (
    projection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    projection_key text NOT NULL,
    payload jsonb NOT NULL,
    derived_from_finding_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    expression_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 231 (class 1259 OID 43812)
-- Name: raw_items; Type: TABLE; Schema: source; Owner: -
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


--
-- TOC entry 253 (class 1259 OID 44377)
-- Name: read_handoffs; Type: TABLE; Schema: source; Owner: -
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


--
-- TOC entry 252 (class 1259 OID 44359)
-- Name: read_quality_checks; Type: TABLE; Schema: source; Owner: -
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


--
-- TOC entry 250 (class 1259 OID 44305)
-- Name: read_runs; Type: TABLE; Schema: source; Owner: -
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


--
-- TOC entry 251 (class 1259 OID 44331)
-- Name: read_units; Type: TABLE; Schema: source; Owner: -
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


--
-- TOC entry 230 (class 1259 OID 43790)
-- Name: source_versions; Type: TABLE; Schema: source; Owner: -
--

CREATE TABLE source.source_versions (
    source_version_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    version_label text,
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    checksum_sha256 text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 43765)
-- Name: sources; Type: TABLE; Schema: source; Owner: -
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


--
-- TOC entry 236 (class 1259 OID 43949)
-- Name: changes; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 239 (class 1259 OID 44024)
-- Name: claim_evidence_links; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 255 (class 1259 OID 44439)
-- Name: claim_revisions; Type: TABLE; Schema: world; Owner: -
--

CREATE TABLE world.claim_revisions (
    claim_revision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    object_type text NOT NULL,
    object_id uuid NOT NULL,
    revision_no integer NOT NULL,
    revision_content jsonb NOT NULL,
    producer_method_id text NOT NULL,
    producer_method_version text,
    upstream_refs jsonb,
    supersedes_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT claim_revisions_object_type_check CHECK ((object_type = ANY (ARRAY['entity'::text, 'event'::text, 'relation_claim'::text, 'change'::text, 'historical_space_claim'::text, 'visual_object'::text])))
);


--
-- TOC entry 240 (class 1259 OID 44049)
-- Name: conflicts; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 258 (class 1259 OID 44504)
-- Name: dependency_edges; Type: TABLE; Schema: world; Owner: -
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
    CONSTRAINT dependency_edges_dependency_type_check CHECK ((dependency_type = ANY (ARRAY['supports'::text, 'derived_from'::text, 'refines'::text, 'conflicts_with'::text])))
);


--
-- TOC entry 233 (class 1259 OID 43873)
-- Name: entities; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 260 (class 1259 OID 44541)
-- Name: event_participations; Type: TABLE; Schema: world; Owner: -
--

CREATE TABLE world.event_participations (
    event_participation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    entity_id uuid NOT NULL,
    role text NOT NULL,
    expression_rule jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 234 (class 1259 OID 43892)
-- Name: events; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 237 (class 1259 OID 43972)
-- Name: historical_space_claims; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 257 (class 1259 OID 44479)
-- Name: identity_decision_evidence; Type: TABLE; Schema: world; Owner: -
--

CREATE TABLE world.identity_decision_evidence (
    identity_decision_evidence_id uuid DEFAULT gen_random_uuid() CONSTRAINT identity_decision_evidence_identity_decision_evidence__not_null NOT NULL,
    identity_decision_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    support_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_decision_evidence_support_type_check CHECK ((support_type = ANY (ARRAY['supports'::text, 'undermines'::text, 'neutral'::text])))
);


--
-- TOC entry 256 (class 1259 OID 44456)
-- Name: identity_decisions; Type: TABLE; Schema: world; Owner: -
--

CREATE TABLE world.identity_decisions (
    identity_decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    merged_entity_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    decision_type text NOT NULL,
    rationale text NOT NULL,
    producer_method_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_decisions_decision_type_check CHECK ((decision_type = ANY (ARRAY['same_identity'::text, 'distinct_identity'::text, 'merge'::text, 'split'::text])))
);


--
-- TOC entry 259 (class 1259 OID 44522)
-- Name: provenance_assessments; Type: TABLE; Schema: world; Owner: -
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
    CONSTRAINT provenance_assessments_assessment_type_check CHECK ((assessment_type = ANY (ARRAY['independence'::text, 'genealogy'::text])))
);


--
-- TOC entry 235 (class 1259 OID 43918)
-- Name: relation_claims; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 238 (class 1259 OID 44000)
-- Name: visual_objects; Type: TABLE; Schema: world; Owner: -
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


--
-- TOC entry 5433 (class 0 OID 43712)
-- Dependencies: 227
-- Data for Name: gate_audits; Type: TABLE DATA; Schema: control; Owner: -
--

COPY control.gate_audits (gate_audit_id, run_id, stage, gate_code, object_type, object_id, result, reason_codes, guard_versions, details, checked_at, architecture_generation, purpose, allowed_scope, consumer, dependency_snapshot, effective_time, input_fingerprint, output_fingerprint, rule_version, supersedes_id, current_valid) FROM stdin;
\.


--
-- TOC entry 5434 (class 0 OID 43745)
-- Dependencies: 228
-- Data for Name: owner_reviews; Type: TABLE DATA; Schema: control; Owner: -
--

COPY control.owner_reviews (owner_review_id, run_id, stage, object_type, object_id, decision, note, reviewed_at) FROM stdin;
\.


--
-- TOC entry 5432 (class 0 OID 43691)
-- Dependencies: 226
-- Data for Name: production_runs; Type: TABLE DATA; Schema: control; Owner: -
--

COPY control.production_runs (run_id, research_intent, scope, execution_mode, status, current_stage, started_at, finished_at, metadata, architecture_generation) FROM stdin;
\.


--
-- TOC entry 5438 (class 0 OID 43836)
-- Dependencies: 232
-- Data for Name: material_evidence; Type: TABLE DATA; Schema: evidence; Owner: -
--

COPY evidence.material_evidence (evidence_id, source_id, source_version_id, raw_item_id, locator, media_region, modality, raw_excerpt_or_region, literal_reading, normalized_text, research_proposition, source_voice, evidence_type, temporal_applicability, spatial_applicability, uncertainty, extraction_method, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5460 (class 0 OID 44403)
-- Dependencies: 254
-- Data for Name: read_unit_evidence_links; Type: TABLE DATA; Schema: evidence; Owner: -
--

COPY evidence.read_unit_evidence_links (link_id, evidence_id, read_unit_id, read_run_id, selected_extent, selection_basis, quote_snapshot_hash, technical_profile_id, g1_decision_id, recorded_at, link_version, supersedes_link_id) FROM stdin;
\.


--
-- TOC entry 5467 (class 0 OID 44566)
-- Dependencies: 261
-- Data for Name: claim_revisions; Type: TABLE DATA; Schema: meaning; Owner: -
--

COPY meaning.claim_revisions (claim_revision_id, finding_id, revision_no, revision_content, producer_method_id, producer_method_version, supersedes_id, created_at) FROM stdin;
\.


--
-- TOC entry 5447 (class 0 OID 44069)
-- Dependencies: 241
-- Data for Name: findings; Type: TABLE DATA; Schema: meaning; Owner: -
--

COPY meaning.findings (finding_id, finding_type, human_question, interpretive_statement, understanding_delta, supporting_world_objects, counter_view_or_alternative, missing_evidence, present_connection_basis, uncertainty, expression_rule, discovery_method, ranking_components, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5449 (class 0 OID 44121)
-- Dependencies: 243
-- Data for Name: open_questions; Type: TABLE DATA; Schema: meaning; Owner: -
--

COPY meaning.open_questions (open_question_id, finding_id, question, missing_evidence, next_research_action, status, created_at) FROM stdin;
\.


--
-- TOC entry 5448 (class 0 OID 44098)
-- Dependencies: 242
-- Data for Name: present_connections; Type: TABLE DATA; Schema: meaning; Owner: -
--

COPY meaning.present_connections (present_connection_id, finding_id, connection_type, observed_state, basis_world_objects, open_questions, expression_rule, created_at) FROM stdin;
\.


--
-- TOC entry 5451 (class 0 OID 44162)
-- Dependencies: 245
-- Data for Name: agent_contexts; Type: TABLE DATA; Schema: read_model; Owner: -
--

COPY read_model.agent_contexts (agent_context_id, context_key, payload, derived_from_finding_ids, generated_at) FROM stdin;
\.


--
-- TOC entry 5453 (class 0 OID 44198)
-- Dependencies: 247
-- Data for Name: discovery_paths; Type: TABLE DATA; Schema: read_model; Owner: -
--

COPY read_model.discovery_paths (discovery_path_id, path_key, steps, derived_from_finding_ids, generated_at) FROM stdin;
\.


--
-- TOC entry 5455 (class 0 OID 44232)
-- Dependencies: 249
-- Data for Name: evidence_pointers; Type: TABLE DATA; Schema: read_model; Owner: -
--

COPY read_model.evidence_pointers (evidence_pointer_id, evidence_id, source_id, display_locator, display_excerpt, generated_at) FROM stdin;
\.


--
-- TOC entry 5454 (class 0 OID 44215)
-- Dependencies: 248
-- Data for Name: map_timeline_projections; Type: TABLE DATA; Schema: read_model; Owner: -
--

COPY read_model.map_timeline_projections (map_timeline_projection_id, projection_key, payload, derived_from_world_objects, generated_at) FROM stdin;
\.


--
-- TOC entry 5452 (class 0 OID 44179)
-- Dependencies: 246
-- Data for Name: story_seeds; Type: TABLE DATA; Schema: read_model; Owner: -
--

COPY read_model.story_seeds (story_seed_id, seed_key, title, narrative_question, payload, derived_from_finding_ids, evidence_pointer_ids, generated_at) FROM stdin;
\.


--
-- TOC entry 5450 (class 0 OID 44143)
-- Dependencies: 244
-- Data for Name: world_projections; Type: TABLE DATA; Schema: read_model; Owner: -
--

COPY read_model.world_projections (projection_id, projection_key, payload, derived_from_finding_ids, expression_rule, generated_at) FROM stdin;
\.


--
-- TOC entry 5437 (class 0 OID 43812)
-- Dependencies: 231
-- Data for Name: raw_items; Type: TABLE DATA; Schema: source; Owner: -
--

COPY source.raw_items (raw_item_id, source_version_id, storage_ref, media_type, byte_size, checksum_sha256, created_at) FROM stdin;
\.


--
-- TOC entry 5459 (class 0 OID 44377)
-- Dependencies: 253
-- Data for Name: read_handoffs; Type: TABLE DATA; Schema: source; Owner: -
--

COPY source.read_handoffs (handoff_id, read_run_id, g1_audit_id, output_manifest_hash, allowed_extent, gaps, consumer_stage, created_at) FROM stdin;
\.


--
-- TOC entry 5458 (class 0 OID 44359)
-- Dependencies: 252
-- Data for Name: read_quality_checks; Type: TABLE DATA; Schema: source; Owner: -
--

COPY source.read_quality_checks (check_id, read_run_id, metric, profile_id, denominator, population_n, sampled_n, error_n, sampling_scheme, actual, result, evidence_ref, created_at) FROM stdin;
\.


--
-- TOC entry 5456 (class 0 OID 44305)
-- Dependencies: 250
-- Data for Name: read_runs; Type: TABLE DATA; Schema: source; Owner: -
--

COPY source.read_runs (read_run_id, production_run_id, raw_item_id, input_sha256, upstream_g0_decision_id, method_set, engine, config, version, status, manifest_hash, supersedes_id, created_at) FROM stdin;
\.


--
-- TOC entry 5457 (class 0 OID 44331)
-- Dependencies: 251
-- Data for Name: read_units; Type: TABLE DATA; Schema: source; Owner: -
--

COPY source.read_units (read_unit_id, read_run_id, parent_id, method_code, kind, locator_schema, locator, ordinal, payload_ref, uncertainty, revision_of, locator_hash, created_at) FROM stdin;
\.


--
-- TOC entry 5436 (class 0 OID 43790)
-- Dependencies: 230
-- Data for Name: source_versions; Type: TABLE DATA; Schema: source; Owner: -
--

COPY source.source_versions (source_version_id, source_id, version_label, retrieved_at, checksum_sha256, metadata) FROM stdin;
\.


--
-- TOC entry 5435 (class 0 OID 43765)
-- Dependencies: 229
-- Data for Name: sources; Type: TABLE DATA; Schema: source; Owner: -
--

COPY source.sources (source_id, provider, title, source_type, carrier_type, creator, publisher_or_institution, source_uri_or_catalog_no, source_date, rights, provenance_status, content_availability, original_locator, scope, created_at) FROM stdin;
\.


--
-- TOC entry 5442 (class 0 OID 43949)
-- Dependencies: 236
-- Data for Name: changes; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.changes (change_id, subject_entity_id, change_type, before_state, after_state, time_scope, expression_rule, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5445 (class 0 OID 44024)
-- Dependencies: 239
-- Data for Name: claim_evidence_links; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.claim_evidence_links (claim_evidence_link_id, claim_object_type, claim_object_id, evidence_id, support_type, note, created_at) FROM stdin;
\.


--
-- TOC entry 5461 (class 0 OID 44439)
-- Dependencies: 255
-- Data for Name: claim_revisions; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.claim_revisions (claim_revision_id, object_type, object_id, revision_no, revision_content, producer_method_id, producer_method_version, upstream_refs, supersedes_id, created_at) FROM stdin;
\.


--
-- TOC entry 5446 (class 0 OID 44049)
-- Dependencies: 240
-- Data for Name: conflicts; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.conflicts (conflict_id, conflict_key, object_type, object_id, variant, resolution_status, resolution_note, created_at) FROM stdin;
\.


--
-- TOC entry 5464 (class 0 OID 44504)
-- Dependencies: 258
-- Data for Name: dependency_edges; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.dependency_edges (dependency_edge_id, from_object_type, from_object_id, to_object_type, to_object_id, dependency_type, producer_method_id, created_at) FROM stdin;
\.


--
-- TOC entry 5439 (class 0 OID 43873)
-- Dependencies: 233
-- Data for Name: entities; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.entities (entity_id, entity_type, canonical_label, aliases, temporal_scope, spatial_scope, attributes, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5466 (class 0 OID 44541)
-- Dependencies: 260
-- Data for Name: event_participations; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.event_participations (event_participation_id, event_id, entity_id, role, expression_rule, created_at) FROM stdin;
\.


--
-- TOC entry 5440 (class 0 OID 43892)
-- Dependencies: 234
-- Data for Name: events; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.events (event_id, event_type, canonical_label, subject_entity_id, time_scope, space_scope, attributes, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5443 (class 0 OID 43972)
-- Dependencies: 237
-- Data for Name: historical_space_claims; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.historical_space_claims (historical_space_claim_id, subject_entity_id, claim_type, geometry_claim, spatial_relation, time_scope, "precision", uncertainty, expression_rule, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5463 (class 0 OID 44479)
-- Dependencies: 257
-- Data for Name: identity_decision_evidence; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.identity_decision_evidence (identity_decision_evidence_id, identity_decision_id, evidence_id, support_type, created_at) FROM stdin;
\.


--
-- TOC entry 5462 (class 0 OID 44456)
-- Dependencies: 256
-- Data for Name: identity_decisions; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.identity_decisions (identity_decision_id, entity_id, merged_entity_ids, decision_type, rationale, producer_method_id, created_at) FROM stdin;
\.


--
-- TOC entry 5465 (class 0 OID 44522)
-- Dependencies: 259
-- Data for Name: provenance_assessments; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.provenance_assessments (provenance_assessment_id, claim_object_type, claim_object_id, assessment_type, source_lineage, is_independent, rationale, producer_method_id, created_at) FROM stdin;
\.


--
-- TOC entry 5441 (class 0 OID 43918)
-- Dependencies: 235
-- Data for Name: relation_claims; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.relation_claims (relation_claim_id, relation_type, subject_entity_id, object_entity_id, object_value, time_scope, space_scope, expression_rule, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5444 (class 0 OID 44000)
-- Dependencies: 238
-- Data for Name: visual_objects; Type: TABLE DATA; Schema: world; Owner: -
--

COPY world.visual_objects (visual_object_id, source_id, subject_entity_id, visual_type, asset_ref, literal_reading, time_scope, space_scope, correspondence_claim, maturity, created_at) FROM stdin;
\.


--
-- TOC entry 5151 (class 2606 OID 43736)
-- Name: gate_audits gate_audits_pkey; Type: CONSTRAINT; Schema: control; Owner: -
--

ALTER TABLE ONLY control.gate_audits
    ADD CONSTRAINT gate_audits_pkey PRIMARY KEY (gate_audit_id);


--
-- TOC entry 5154 (class 2606 OID 43759)
-- Name: owner_reviews owner_reviews_pkey; Type: CONSTRAINT; Schema: control; Owner: -
--

ALTER TABLE ONLY control.owner_reviews
    ADD CONSTRAINT owner_reviews_pkey PRIMARY KEY (owner_review_id);


--
-- TOC entry 5149 (class 2606 OID 43711)
-- Name: production_runs production_runs_pkey; Type: CONSTRAINT; Schema: control; Owner: -
--

ALTER TABLE ONLY control.production_runs
    ADD CONSTRAINT production_runs_pkey PRIMARY KEY (run_id);


--
-- TOC entry 5167 (class 2606 OID 43856)
-- Name: material_evidence material_evidence_pkey; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_pkey PRIMARY KEY (evidence_id);


--
-- TOC entry 5230 (class 2606 OID 44417)
-- Name: read_unit_evidence_links read_unit_evidence_links_pkey; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_pkey PRIMARY KEY (link_id);


--
-- TOC entry 5244 (class 2606 OID 44580)
-- Name: claim_revisions claim_revisions_pkey; Type: CONSTRAINT; Schema: meaning; Owner: -
--

ALTER TABLE ONLY meaning.claim_revisions
    ADD CONSTRAINT claim_revisions_pkey PRIMARY KEY (claim_revision_id);


--
-- TOC entry 5190 (class 2606 OID 44097)
-- Name: findings findings_pkey; Type: CONSTRAINT; Schema: meaning; Owner: -
--

ALTER TABLE ONLY meaning.findings
    ADD CONSTRAINT findings_pkey PRIMARY KEY (finding_id);


--
-- TOC entry 5194 (class 2606 OID 44137)
-- Name: open_questions open_questions_pkey; Type: CONSTRAINT; Schema: meaning; Owner: -
--

ALTER TABLE ONLY meaning.open_questions
    ADD CONSTRAINT open_questions_pkey PRIMARY KEY (open_question_id);


--
-- TOC entry 5192 (class 2606 OID 44115)
-- Name: present_connections present_connections_pkey; Type: CONSTRAINT; Schema: meaning; Owner: -
--

ALTER TABLE ONLY meaning.present_connections
    ADD CONSTRAINT present_connections_pkey PRIMARY KEY (present_connection_id);


--
-- TOC entry 5200 (class 2606 OID 44178)
-- Name: agent_contexts agent_contexts_context_key_key; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.agent_contexts
    ADD CONSTRAINT agent_contexts_context_key_key UNIQUE (context_key);


--
-- TOC entry 5202 (class 2606 OID 44176)
-- Name: agent_contexts agent_contexts_pkey; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.agent_contexts
    ADD CONSTRAINT agent_contexts_pkey PRIMARY KEY (agent_context_id);


--
-- TOC entry 5208 (class 2606 OID 44214)
-- Name: discovery_paths discovery_paths_path_key_key; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.discovery_paths
    ADD CONSTRAINT discovery_paths_path_key_key UNIQUE (path_key);


--
-- TOC entry 5210 (class 2606 OID 44212)
-- Name: discovery_paths discovery_paths_pkey; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.discovery_paths
    ADD CONSTRAINT discovery_paths_pkey PRIMARY KEY (discovery_path_id);


--
-- TOC entry 5216 (class 2606 OID 44247)
-- Name: evidence_pointers evidence_pointers_evidence_id_source_id_key; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_evidence_id_source_id_key UNIQUE (evidence_id, source_id);


--
-- TOC entry 5218 (class 2606 OID 44245)
-- Name: evidence_pointers evidence_pointers_pkey; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_pkey PRIMARY KEY (evidence_pointer_id);


--
-- TOC entry 5212 (class 2606 OID 44229)
-- Name: map_timeline_projections map_timeline_projections_pkey; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.map_timeline_projections
    ADD CONSTRAINT map_timeline_projections_pkey PRIMARY KEY (map_timeline_projection_id);


--
-- TOC entry 5214 (class 2606 OID 44231)
-- Name: map_timeline_projections map_timeline_projections_projection_key_key; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.map_timeline_projections
    ADD CONSTRAINT map_timeline_projections_projection_key_key UNIQUE (projection_key);


--
-- TOC entry 5204 (class 2606 OID 44195)
-- Name: story_seeds story_seeds_pkey; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.story_seeds
    ADD CONSTRAINT story_seeds_pkey PRIMARY KEY (story_seed_id);


--
-- TOC entry 5206 (class 2606 OID 44197)
-- Name: story_seeds story_seeds_seed_key_key; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.story_seeds
    ADD CONSTRAINT story_seeds_seed_key_key UNIQUE (seed_key);


--
-- TOC entry 5196 (class 2606 OID 44159)
-- Name: world_projections world_projections_pkey; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.world_projections
    ADD CONSTRAINT world_projections_pkey PRIMARY KEY (projection_id);


--
-- TOC entry 5198 (class 2606 OID 44161)
-- Name: world_projections world_projections_projection_key_key; Type: CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.world_projections
    ADD CONSTRAINT world_projections_projection_key_key UNIQUE (projection_key);


--
-- TOC entry 5162 (class 2606 OID 43826)
-- Name: raw_items raw_items_pkey; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.raw_items
    ADD CONSTRAINT raw_items_pkey PRIMARY KEY (raw_item_id);


--
-- TOC entry 5164 (class 2606 OID 43828)
-- Name: raw_items raw_items_source_version_id_storage_ref_key; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.raw_items
    ADD CONSTRAINT raw_items_source_version_id_storage_ref_key UNIQUE (source_version_id, storage_ref);


--
-- TOC entry 5228 (class 2606 OID 44392)
-- Name: read_handoffs read_handoffs_pkey; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_handoffs
    ADD CONSTRAINT read_handoffs_pkey PRIMARY KEY (handoff_id);


--
-- TOC entry 5226 (class 2606 OID 44371)
-- Name: read_quality_checks read_quality_checks_pkey; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_quality_checks
    ADD CONSTRAINT read_quality_checks_pkey PRIMARY KEY (check_id);


--
-- TOC entry 5220 (class 2606 OID 44320)
-- Name: read_runs read_runs_pkey; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_runs
    ADD CONSTRAINT read_runs_pkey PRIMARY KEY (read_run_id);


--
-- TOC entry 5222 (class 2606 OID 44346)
-- Name: read_units read_units_pkey; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_pkey PRIMARY KEY (read_unit_id);


--
-- TOC entry 5224 (class 2606 OID 44348)
-- Name: read_units read_units_read_run_id_ordinal_method_code_locator_hash_key; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_read_run_id_ordinal_method_code_locator_hash_key UNIQUE (read_run_id, ordinal, method_code, locator_hash);


--
-- TOC entry 5158 (class 2606 OID 43804)
-- Name: source_versions source_versions_pkey; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.source_versions
    ADD CONSTRAINT source_versions_pkey PRIMARY KEY (source_version_id);


--
-- TOC entry 5160 (class 2606 OID 43806)
-- Name: source_versions source_versions_source_id_checksum_sha256_key; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.source_versions
    ADD CONSTRAINT source_versions_source_id_checksum_sha256_key UNIQUE (source_id, checksum_sha256);


--
-- TOC entry 5156 (class 2606 OID 43789)
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (source_id);


--
-- TOC entry 5175 (class 2606 OID 43966)
-- Name: changes changes_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.changes
    ADD CONSTRAINT changes_pkey PRIMARY KEY (change_id);


--
-- TOC entry 5181 (class 2606 OID 44042)
-- Name: claim_evidence_links claim_evidence_links_claim_object_type_claim_object_id_evid_key; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.claim_evidence_links
    ADD CONSTRAINT claim_evidence_links_claim_object_type_claim_object_id_evid_key UNIQUE (claim_object_type, claim_object_id, evidence_id, support_type);


--
-- TOC entry 5183 (class 2606 OID 44040)
-- Name: claim_evidence_links claim_evidence_links_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.claim_evidence_links
    ADD CONSTRAINT claim_evidence_links_pkey PRIMARY KEY (claim_evidence_link_id);


--
-- TOC entry 5232 (class 2606 OID 44455)
-- Name: claim_revisions claim_revisions_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.claim_revisions
    ADD CONSTRAINT claim_revisions_pkey PRIMARY KEY (claim_revision_id);


--
-- TOC entry 5186 (class 2606 OID 44068)
-- Name: conflicts conflicts_conflict_key_key; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.conflicts
    ADD CONSTRAINT conflicts_conflict_key_key UNIQUE (conflict_key);


--
-- TOC entry 5188 (class 2606 OID 44066)
-- Name: conflicts conflicts_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.conflicts
    ADD CONSTRAINT conflicts_pkey PRIMARY KEY (conflict_id);


--
-- TOC entry 5238 (class 2606 OID 44521)
-- Name: dependency_edges dependency_edges_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.dependency_edges
    ADD CONSTRAINT dependency_edges_pkey PRIMARY KEY (dependency_edge_id);


--
-- TOC entry 5169 (class 2606 OID 43891)
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (entity_id);


--
-- TOC entry 5242 (class 2606 OID 44555)
-- Name: event_participations event_participations_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.event_participations
    ADD CONSTRAINT event_participations_pkey PRIMARY KEY (event_participation_id);


--
-- TOC entry 5171 (class 2606 OID 43912)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);


--
-- TOC entry 5177 (class 2606 OID 43994)
-- Name: historical_space_claims historical_space_claims_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.historical_space_claims
    ADD CONSTRAINT historical_space_claims_pkey PRIMARY KEY (historical_space_claim_id);


--
-- TOC entry 5236 (class 2606 OID 44493)
-- Name: identity_decision_evidence identity_decision_evidence_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.identity_decision_evidence
    ADD CONSTRAINT identity_decision_evidence_pkey PRIMARY KEY (identity_decision_evidence_id);


--
-- TOC entry 5234 (class 2606 OID 44473)
-- Name: identity_decisions identity_decisions_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.identity_decisions
    ADD CONSTRAINT identity_decisions_pkey PRIMARY KEY (identity_decision_id);


--
-- TOC entry 5240 (class 2606 OID 44540)
-- Name: provenance_assessments provenance_assessments_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.provenance_assessments
    ADD CONSTRAINT provenance_assessments_pkey PRIMARY KEY (provenance_assessment_id);


--
-- TOC entry 5173 (class 2606 OID 43938)
-- Name: relation_claims relation_claims_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.relation_claims
    ADD CONSTRAINT relation_claims_pkey PRIMARY KEY (relation_claim_id);


--
-- TOC entry 5179 (class 2606 OID 44013)
-- Name: visual_objects visual_objects_pkey; Type: CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.visual_objects
    ADD CONSTRAINT visual_objects_pkey PRIMARY KEY (visual_object_id);


--
-- TOC entry 5152 (class 1259 OID 43744)
-- Name: idx_gate_audits_object; Type: INDEX; Schema: control; Owner: -
--

CREATE INDEX idx_gate_audits_object ON control.gate_audits USING btree (object_type, object_id, gate_code, result);


--
-- TOC entry 5165 (class 1259 OID 43872)
-- Name: idx_material_evidence_source; Type: INDEX; Schema: evidence; Owner: -
--

CREATE INDEX idx_material_evidence_source ON evidence.material_evidence USING btree (source_id);


--
-- TOC entry 5184 (class 1259 OID 44048)
-- Name: idx_claim_evidence_claim; Type: INDEX; Schema: world; Owner: -
--

CREATE INDEX idx_claim_evidence_claim ON world.claim_evidence_links USING btree (claim_object_type, claim_object_id);


--
-- TOC entry 5282 (class 2620 OID 43835)
-- Name: raw_items raw_items_append_only_update; Type: TRIGGER; Schema: source; Owner: -
--

CREATE TRIGGER raw_items_append_only_update BEFORE DELETE OR UPDATE ON source.raw_items FOR EACH ROW EXECUTE FUNCTION source.forbid_raw_mutation();


--
-- TOC entry 5245 (class 2606 OID 43739)
-- Name: gate_audits gate_audits_run_id_fkey; Type: FK CONSTRAINT; Schema: control; Owner: -
--

ALTER TABLE ONLY control.gate_audits
    ADD CONSTRAINT gate_audits_run_id_fkey FOREIGN KEY (run_id) REFERENCES control.production_runs(run_id);


--
-- TOC entry 5246 (class 2606 OID 44295)
-- Name: gate_audits gate_audits_supersedes_id_fkey; Type: FK CONSTRAINT; Schema: control; Owner: -
--

ALTER TABLE ONLY control.gate_audits
    ADD CONSTRAINT gate_audits_supersedes_id_fkey FOREIGN KEY (supersedes_id) REFERENCES control.gate_audits(gate_audit_id);


--
-- TOC entry 5247 (class 2606 OID 43760)
-- Name: owner_reviews owner_reviews_run_id_fkey; Type: FK CONSTRAINT; Schema: control; Owner: -
--

ALTER TABLE ONLY control.owner_reviews
    ADD CONSTRAINT owner_reviews_run_id_fkey FOREIGN KEY (run_id) REFERENCES control.production_runs(run_id);


--
-- TOC entry 5250 (class 2606 OID 43867)
-- Name: material_evidence material_evidence_raw_item_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_raw_item_id_fkey FOREIGN KEY (raw_item_id) REFERENCES source.raw_items(raw_item_id);


--
-- TOC entry 5251 (class 2606 OID 43857)
-- Name: material_evidence material_evidence_source_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- TOC entry 5252 (class 2606 OID 43862)
-- Name: material_evidence material_evidence_source_version_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.material_evidence
    ADD CONSTRAINT material_evidence_source_version_id_fkey FOREIGN KEY (source_version_id) REFERENCES source.source_versions(source_version_id);


--
-- TOC entry 5272 (class 2606 OID 44418)
-- Name: read_unit_evidence_links read_unit_evidence_links_evidence_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- TOC entry 5273 (class 2606 OID 44433)
-- Name: read_unit_evidence_links read_unit_evidence_links_g1_decision_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_g1_decision_id_fkey FOREIGN KEY (g1_decision_id) REFERENCES control.gate_audits(gate_audit_id);


--
-- TOC entry 5274 (class 2606 OID 44428)
-- Name: read_unit_evidence_links read_unit_evidence_links_read_run_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- TOC entry 5275 (class 2606 OID 44423)
-- Name: read_unit_evidence_links read_unit_evidence_links_read_unit_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.read_unit_evidence_links
    ADD CONSTRAINT read_unit_evidence_links_read_unit_id_fkey FOREIGN KEY (read_unit_id) REFERENCES source.read_units(read_unit_id);


--
-- TOC entry 5281 (class 2606 OID 44581)
-- Name: claim_revisions claim_revisions_finding_id_fkey; Type: FK CONSTRAINT; Schema: meaning; Owner: -
--

ALTER TABLE ONLY meaning.claim_revisions
    ADD CONSTRAINT claim_revisions_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES meaning.findings(finding_id);


--
-- TOC entry 5262 (class 2606 OID 44138)
-- Name: open_questions open_questions_finding_id_fkey; Type: FK CONSTRAINT; Schema: meaning; Owner: -
--

ALTER TABLE ONLY meaning.open_questions
    ADD CONSTRAINT open_questions_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES meaning.findings(finding_id);


--
-- TOC entry 5261 (class 2606 OID 44116)
-- Name: present_connections present_connections_finding_id_fkey; Type: FK CONSTRAINT; Schema: meaning; Owner: -
--

ALTER TABLE ONLY meaning.present_connections
    ADD CONSTRAINT present_connections_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES meaning.findings(finding_id);


--
-- TOC entry 5263 (class 2606 OID 44248)
-- Name: evidence_pointers evidence_pointers_evidence_id_fkey; Type: FK CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- TOC entry 5264 (class 2606 OID 44253)
-- Name: evidence_pointers evidence_pointers_source_id_fkey; Type: FK CONSTRAINT; Schema: read_model; Owner: -
--

ALTER TABLE ONLY read_model.evidence_pointers
    ADD CONSTRAINT evidence_pointers_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- TOC entry 5249 (class 2606 OID 43829)
-- Name: raw_items raw_items_source_version_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.raw_items
    ADD CONSTRAINT raw_items_source_version_id_fkey FOREIGN KEY (source_version_id) REFERENCES source.source_versions(source_version_id);


--
-- TOC entry 5270 (class 2606 OID 44398)
-- Name: read_handoffs read_handoffs_g1_audit_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_handoffs
    ADD CONSTRAINT read_handoffs_g1_audit_id_fkey FOREIGN KEY (g1_audit_id) REFERENCES control.gate_audits(gate_audit_id);


--
-- TOC entry 5271 (class 2606 OID 44393)
-- Name: read_handoffs read_handoffs_read_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_handoffs
    ADD CONSTRAINT read_handoffs_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- TOC entry 5269 (class 2606 OID 44372)
-- Name: read_quality_checks read_quality_checks_read_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_quality_checks
    ADD CONSTRAINT read_quality_checks_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- TOC entry 5265 (class 2606 OID 44321)
-- Name: read_runs read_runs_production_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_runs
    ADD CONSTRAINT read_runs_production_run_id_fkey FOREIGN KEY (production_run_id) REFERENCES control.production_runs(run_id);


--
-- TOC entry 5266 (class 2606 OID 44326)
-- Name: read_runs read_runs_raw_item_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_runs
    ADD CONSTRAINT read_runs_raw_item_id_fkey FOREIGN KEY (raw_item_id) REFERENCES source.raw_items(raw_item_id);


--
-- TOC entry 5267 (class 2606 OID 44354)
-- Name: read_units read_units_parent_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES source.read_units(read_unit_id);


--
-- TOC entry 5268 (class 2606 OID 44349)
-- Name: read_units read_units_read_run_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.read_units
    ADD CONSTRAINT read_units_read_run_id_fkey FOREIGN KEY (read_run_id) REFERENCES source.read_runs(read_run_id);


--
-- TOC entry 5248 (class 2606 OID 43807)
-- Name: source_versions source_versions_source_id_fkey; Type: FK CONSTRAINT; Schema: source; Owner: -
--

ALTER TABLE ONLY source.source_versions
    ADD CONSTRAINT source_versions_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- TOC entry 5256 (class 2606 OID 43967)
-- Name: changes changes_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.changes
    ADD CONSTRAINT changes_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- TOC entry 5260 (class 2606 OID 44043)
-- Name: claim_evidence_links claim_evidence_links_evidence_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.claim_evidence_links
    ADD CONSTRAINT claim_evidence_links_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- TOC entry 5279 (class 2606 OID 44561)
-- Name: event_participations event_participations_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.event_participations
    ADD CONSTRAINT event_participations_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES world.entities(entity_id);


--
-- TOC entry 5280 (class 2606 OID 44556)
-- Name: event_participations event_participations_event_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.event_participations
    ADD CONSTRAINT event_participations_event_id_fkey FOREIGN KEY (event_id) REFERENCES world.events(event_id);


--
-- TOC entry 5253 (class 2606 OID 43913)
-- Name: events events_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.events
    ADD CONSTRAINT events_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- TOC entry 5257 (class 2606 OID 43995)
-- Name: historical_space_claims historical_space_claims_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.historical_space_claims
    ADD CONSTRAINT historical_space_claims_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- TOC entry 5277 (class 2606 OID 44499)
-- Name: identity_decision_evidence identity_decision_evidence_evidence_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.identity_decision_evidence
    ADD CONSTRAINT identity_decision_evidence_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES evidence.material_evidence(evidence_id);


--
-- TOC entry 5278 (class 2606 OID 44494)
-- Name: identity_decision_evidence identity_decision_evidence_identity_decision_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.identity_decision_evidence
    ADD CONSTRAINT identity_decision_evidence_identity_decision_id_fkey FOREIGN KEY (identity_decision_id) REFERENCES world.identity_decisions(identity_decision_id);


--
-- TOC entry 5276 (class 2606 OID 44474)
-- Name: identity_decisions identity_decisions_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.identity_decisions
    ADD CONSTRAINT identity_decisions_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES world.entities(entity_id);


--
-- TOC entry 5254 (class 2606 OID 43944)
-- Name: relation_claims relation_claims_object_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.relation_claims
    ADD CONSTRAINT relation_claims_object_entity_id_fkey FOREIGN KEY (object_entity_id) REFERENCES world.entities(entity_id);


--
-- TOC entry 5255 (class 2606 OID 43939)
-- Name: relation_claims relation_claims_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.relation_claims
    ADD CONSTRAINT relation_claims_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


--
-- TOC entry 5258 (class 2606 OID 44014)
-- Name: visual_objects visual_objects_source_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.visual_objects
    ADD CONSTRAINT visual_objects_source_id_fkey FOREIGN KEY (source_id) REFERENCES source.sources(source_id);


--
-- TOC entry 5259 (class 2606 OID 44019)
-- Name: visual_objects visual_objects_subject_entity_id_fkey; Type: FK CONSTRAINT; Schema: world; Owner: -
--

ALTER TABLE ONLY world.visual_objects
    ADD CONSTRAINT visual_objects_subject_entity_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES world.entities(entity_id);


-- Completed on 2026-10-17 12:25:40

--
-- PostgreSQL database dump complete
--

\unrestrict VEpA2CyKmsIrtcMa1eSTJrwKik255MudtiIFFnv07lBGBIpHk70bC27nkhGXgax

