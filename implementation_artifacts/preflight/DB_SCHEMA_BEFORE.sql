--
-- PostgreSQL database dump
--

\restrict 9HIseyibJmSDwLBFV5zJMyrPr7CEBMrOShX759sj1HAF3wUEpbsGvsLR8G4lssw

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: claim_evidence; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.claim_evidence (
    claim_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    support_type text DEFAULT 'supports'::text NOT NULL
);


ALTER TABLE public.claim_evidence OWNER TO mohen_app;

--
-- Name: claims; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.claims (
    claim_id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    predicate text NOT NULL,
    object_id uuid,
    object_value jsonb,
    certainty numeric(4,3) NOT NULL,
    status public.verification_status DEFAULT 'candidate'::public.verification_status NOT NULL,
    review_tier text NOT NULL,
    generated_by text,
    review_note text,
    CONSTRAINT claims_certainty_check CHECK (((certainty >= (0)::numeric) AND (certainty <= (1)::numeric))),
    CONSTRAINT claims_review_tier_check CHECK ((review_tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])))
);


ALTER TABLE public.claims OWNER TO mohen_app;

--
-- Name: cultural_conflicts; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.cultural_conflicts (
    conflict_id uuid DEFAULT gen_random_uuid() NOT NULL,
    conflict_key text NOT NULL,
    subject_feature_key text NOT NULL,
    primary_claim_id uuid,
    conflicted_variant_id uuid,
    primary_value text,
    conflicted_value text,
    source_of_conflict text,
    resolution_status text DEFAULT 'preserved_open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cultural_conflicts OWNER TO mohen_app;

--
-- Name: cultural_events; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.cultural_events (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    slice_id text NOT NULL,
    event_type text NOT NULL,
    canonical_label text NOT NULL,
    subject_feature_key text NOT NULL,
    time_scope_start text,
    time_scope_end text,
    time_scope_unknown boolean DEFAULT false NOT NULL,
    temporal_note text,
    place_refs text[] DEFAULT '{}'::text[] NOT NULL,
    evidence_fragment_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    epistemic_status text NOT NULL,
    expression_rule jsonb NOT NULL,
    review_status text DEFAULT 'candidate'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cultural_events_epistemic_status_check CHECK ((epistemic_status = ANY (ARRAY['SUPPORTED'::text, 'SUPPORTED_CANDIDATE'::text, 'CONFLICTED'::text, 'RESEARCH_LEAD'::text, 'UNSUPPORTED'::text, 'OPEN_QUESTION'::text]))),
    CONSTRAINT cultural_events_review_status_check CHECK ((review_status = ANY (ARRAY['candidate'::text, 'human_reviewed'::text, 'research'::text, 'unresolved'::text])))
);


ALTER TABLE public.cultural_events OWNER TO mohen_app;

--
-- Name: cultural_meaning_candidates; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.cultural_meaning_candidates (
    meaning_id uuid DEFAULT gen_random_uuid() NOT NULL,
    slice_id text NOT NULL,
    subject_feature_key text NOT NULL,
    interpretive_text text NOT NULL,
    derived_from_claim_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    epistemic_status text NOT NULL,
    expression_rule jsonb NOT NULL,
    review_status text DEFAULT 'candidate'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cultural_meaning_candidates_epistemic_status_check CHECK ((epistemic_status = ANY (ARRAY['SUPPORTED'::text, 'SUPPORTED_CANDIDATE'::text, 'CONFLICTED'::text, 'RESEARCH_LEAD'::text, 'UNSUPPORTED'::text, 'OPEN_QUESTION'::text]))),
    CONSTRAINT cultural_meaning_candidates_review_status_check CHECK ((review_status = ANY (ARRAY['candidate'::text, 'human_reviewed'::text, 'research'::text, 'unresolved'::text, 'adjudicated'::text, 'runtime_eligible'::text, 'published'::text])))
);


ALTER TABLE public.cultural_meaning_candidates OWNER TO mohen_app;

--
-- Name: cultural_present_connections; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.cultural_present_connections (
    present_id uuid DEFAULT gen_random_uuid() NOT NULL,
    slice_id text NOT NULL,
    subject_feature_key text NOT NULL,
    connection_type text NOT NULL,
    observed_state text,
    basis_claim_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    open_questions text[] DEFAULT '{}'::text[] NOT NULL,
    expression_rule jsonb NOT NULL,
    review_status text DEFAULT 'candidate'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cultural_present_connections_review_status_check CHECK ((review_status = ANY (ARRAY['candidate'::text, 'human_reviewed'::text, 'research'::text, 'unresolved'::text, 'adjudicated'::text, 'runtime_eligible'::text, 'published'::text])))
);


ALTER TABLE public.cultural_present_connections OWNER TO mohen_app;

--
-- Name: cultural_relation_claims; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.cultural_relation_claims (
    claim_id uuid DEFAULT gen_random_uuid() NOT NULL,
    slice_id text NOT NULL,
    claim_type text NOT NULL,
    subject_feature_key text NOT NULL,
    predicate text NOT NULL,
    object_feature_key text,
    object_value text,
    time_scope_start text,
    time_scope_end text,
    time_scope_unknown boolean DEFAULT false NOT NULL,
    spatial_scope text,
    evidence_fragment_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    epistemic_status text NOT NULL,
    uncertainty_and_conflict jsonb,
    conflict_refs uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    meaning_refs uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    present_connection_refs uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    discovery_affordance jsonb,
    expression_rule jsonb NOT NULL,
    existing_relation_id uuid,
    hr_constraint text[] DEFAULT '{}'::text[] NOT NULL,
    support_level text,
    review_status text DEFAULT 'candidate'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cultural_relation_claims_claim_type_check CHECK ((claim_type = ANY (ARRAY['FACT'::text, 'RELATION'::text]))),
    CONSTRAINT cultural_relation_claims_epistemic_status_check CHECK ((epistemic_status = ANY (ARRAY['SUPPORTED'::text, 'SUPPORTED_CANDIDATE'::text, 'CONFLICTED'::text, 'RESEARCH_LEAD'::text, 'UNSUPPORTED'::text, 'OPEN_QUESTION'::text]))),
    CONSTRAINT cultural_relation_claims_review_status_check CHECK ((review_status = ANY (ARRAY['candidate'::text, 'human_reviewed'::text, 'research'::text, 'unresolved'::text, 'adjudicated'::text, 'runtime_eligible'::text, 'published'::text]))),
    CONSTRAINT cultural_relation_claims_support_level_check CHECK (((support_level IS NULL) OR (support_level = ANY (ARRAY['primary_read'::text, 'secondary_transcription'::text, 'legacy_transcription'::text, 'provider_geometry'::text, 'none'::text]))))
);


ALTER TABLE public.cultural_relation_claims OWNER TO mohen_app;

--
-- Name: discovery_candidates; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.discovery_candidates (
    discovery_id uuid DEFAULT gen_random_uuid() NOT NULL,
    discovery_code text NOT NULL,
    title text NOT NULL,
    objects jsonb NOT NULL,
    relationship_change text NOT NULL,
    evidence_refs uuid[] NOT NULL,
    relevance_question text NOT NULL,
    epistemic_status text NOT NULL,
    humanistic_why text NOT NULL,
    unresolved_evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    publishable boolean DEFAULT false NOT NULL,
    generated_by text DEFAULT 'mohen-knowledge-weave'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discovery_candidates_epistemic_status_check CHECK ((epistemic_status = ANY (ARRAY['candidate'::text, 'legend'::text, 'research'::text, 'unresolved'::text]))),
    CONSTRAINT discovery_requires_evidence CHECK ((COALESCE(array_length(evidence_refs, 1), 0) >= 1))
);


ALTER TABLE public.discovery_candidates OWNER TO mohen_app;

--
-- Name: visual_assets; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.visual_assets (
    asset_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    asset_type text NOT NULL,
    file_path text NOT NULL,
    created_date text,
    depicted_period text,
    rights text,
    checksum text NOT NULL,
    quality_score numeric(4,3),
    legacy_id text,
    eligibility_tags text[] DEFAULT '{}'::text[] NOT NULL,
    eligibility_status text DEFAULT 'pending_review'::text NOT NULL,
    CONSTRAINT visual_assets_eligibility_status_check CHECK ((eligibility_status = ANY (ARRAY['pending_review'::text, 'gate_passed'::text, 'gate_failed'::text, 'excluded'::text]))),
    CONSTRAINT visual_assets_quality_score_check CHECK (((quality_score >= (0)::numeric) AND (quality_score <= (1)::numeric)))
);


ALTER TABLE public.visual_assets OWNER TO mohen_app;

--
-- Name: visual_entity_links; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.visual_entity_links (
    link_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    entity_id uuid,
    depicted_entity_label text NOT NULL,
    link_status text NOT NULL,
    decision_rule text NOT NULL,
    decision_note text,
    link_evidence_id uuid,
    current_or_historical text NOT NULL,
    name_variant_note text,
    eligibility_tags text[] DEFAULT '{}'::text[] NOT NULL,
    generated_by text DEFAULT 'mohen-visual-linkage'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT visual_entity_links_current_or_historical_check CHECK ((current_or_historical = ANY (ARRAY['current'::text, 'historical'::text, 'unknown'::text]))),
    CONSTRAINT visual_entity_links_link_status_check CHECK ((link_status = ANY (ARRAY['confirmed'::text, 'suspected'::text, 'similar'::text, 'unconfirmed'::text])))
);


ALTER TABLE public.visual_entity_links OWNER TO mohen_app;

--
-- Name: effective_visual_assets; Type: VIEW; Schema: public; Owner: mohen_app
--

CREATE VIEW public.effective_visual_assets AS
 SELECT l.link_id,
    l.asset_id,
    l.entity_id,
    l.depicted_entity_label,
    l.link_status,
    l.current_or_historical,
    l.decision_rule,
    a.source_id,
    a.file_path,
    a.asset_type,
    a.created_date,
    a.rights
   FROM (public.visual_entity_links l
     JOIN public.visual_assets a ON ((a.asset_id = l.asset_id)))
  WHERE ((l.link_status = 'confirmed'::text) AND (a.eligibility_status = 'gate_passed'::text) AND (NOT (a.eligibility_tags && ARRAY['excluded_from_heritage_primary'::text])) AND (NOT (l.eligibility_tags && ARRAY['excluded_from_heritage_primary'::text])));


ALTER VIEW public.effective_visual_assets OWNER TO mohen_app;

--
-- Name: entities; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.entities (
    entity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    canonical_name text NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    description text,
    valid_from text,
    valid_to text,
    confidence numeric(4,3),
    status public.verification_status DEFAULT 'candidate'::public.verification_status NOT NULL,
    legacy_id text,
    CONSTRAINT entities_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
);


ALTER TABLE public.entities OWNER TO mohen_app;

--
-- Name: evidence; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.evidence (
    evidence_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    evidence_type text NOT NULL,
    locator text,
    quote_text text,
    region_json jsonb,
    subject_hint text,
    place_hint text,
    time_hint text,
    extraction_method text NOT NULL,
    confidence numeric(4,3) NOT NULL,
    verification_status public.verification_status DEFAULT 'candidate'::public.verification_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT evidence_evidence_type_check CHECK ((evidence_type = ANY (ARRAY['text'::text, 'image'::text, 'map'::text, 'record'::text, 'field_observation'::text])))
);


ALTER TABLE public.evidence OWNER TO mohen_app;

--
-- Name: evidence_fragments; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.evidence_fragments (
    fragment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    span_type text NOT NULL,
    quote_fragment text NOT NULL,
    usable_for_claim text,
    usage_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_fragments_span_type_check CHECK ((span_type = ANY (ARRAY['hr4_usable'::text, 'u10_forbidden'::text, 'generic'::text])))
);


ALTER TABLE public.evidence_fragments OWNER TO mohen_app;

--
-- Name: evidence_gate_audit; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.evidence_gate_audit (
    audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    object_type text NOT NULL,
    object_id text NOT NULL,
    gate_code text NOT NULL,
    result text NOT NULL,
    reason text,
    actor_type text DEFAULT 'rule'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_gate_audit_actor_type_check CHECK ((actor_type = ANY (ARRAY['rule'::text, 'ai'::text, 'human'::text]))),
    CONSTRAINT evidence_gate_audit_gate_code_check CHECK ((gate_code = ANY (ARRAY['G0'::text, 'G1'::text, 'G2'::text, 'G3'::text, 'G4'::text, 'G5'::text, 'G6'::text]))),
    CONSTRAINT evidence_gate_audit_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'pending'::text])))
);


ALTER TABLE public.evidence_gate_audit OWNER TO mohen_app;

--
-- Name: historical_change_records; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.historical_change_records (
    change_id uuid NOT NULL,
    change_key text NOT NULL,
    slice_id text NOT NULL,
    feature_id uuid NOT NULL,
    change_status public.historical_change_status NOT NULL,
    change_epistemic text NOT NULL,
    from_state text,
    to_state text,
    time_hint text,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    legacy_only_parts text[] DEFAULT '{}'::text[] NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    review_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT change_evidenced_requires_evidence CHECK (((change_epistemic <> 'evidenced'::text) OR (array_length(evidence_ids, 1) >= 1))),
    CONSTRAINT historical_change_records_change_epistemic_check CHECK ((change_epistemic = ANY (ARRAY['evidenced'::text, 'candidate'::text, 'unknown'::text]))),
    CONSTRAINT historical_change_records_review_status_check CHECK ((review_status = ANY (ARRAY['candidate'::text, 'human_reviewed'::text, 'research'::text, 'unresolved'::text])))
);


ALTER TABLE public.historical_change_records OWNER TO mohen_app;

--
-- Name: historical_feature_anchors; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.historical_feature_anchors (
    anchor_id uuid NOT NULL,
    anchor_key text NOT NULL,
    feature_id uuid NOT NULL,
    anchor_kind text NOT NULL,
    spatial_status public.historical_spatial_status NOT NULL,
    geometry_type public.historical_geometry_type NOT NULL,
    coord_system text,
    location_raw text,
    lat numeric,
    lng numeric,
    crs_note text DEFAULT ''::text NOT NULL,
    precision_scope text,
    source_label text NOT NULL,
    source_locator text,
    evidence_id uuid,
    exact_object_point boolean DEFAULT false NOT NULL,
    historical_position_proof boolean DEFAULT false NOT NULL,
    human_review_code text,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT anchor_coord_requires_crs CHECK ((((lat IS NULL) AND (lng IS NULL) AND (coord_system IS NULL)) OR ((lat IS NOT NULL) AND (lng IS NOT NULL) AND (coord_system IS NOT NULL)))),
    CONSTRAINT anchor_current_never_proof CHECK ((NOT ((anchor_kind ~~ 'provider_current%'::text) AND historical_position_proof))),
    CONSTRAINT anchor_relative_has_no_coord CHECK (((anchor_kind <> 'textual_relative_statement'::text) OR ((lat IS NULL) AND (lng IS NULL) AND (coord_system IS NULL))))
);


ALTER TABLE public.historical_feature_anchors OWNER TO mohen_app;

--
-- Name: historical_features; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.historical_features (
    feature_id uuid NOT NULL,
    feature_key text NOT NULL,
    slice_id text NOT NULL,
    feature_type text NOT NULL,
    canonical_label text NOT NULL,
    historical_labels text[] DEFAULT '{}'::text[] NOT NULL,
    modern_labels text[] DEFAULT '{}'::text[] NOT NULL,
    label_variants_note text DEFAULT ''::text NOT NULL,
    entity_id uuid,
    geometry_type public.historical_geometry_type NOT NULL,
    geometry_note text DEFAULT ''::text NOT NULL,
    attested_time_start text,
    attested_time_end text,
    attested_time_label text,
    attested_time_evidence_backed boolean DEFAULT false NOT NULL,
    legacy_only_assertions text[] DEFAULT '{}'::text[] NOT NULL,
    attested_historical_existence text NOT NULL,
    current_survival_or_site text NOT NULL,
    historical_position_status public.historical_spatial_status NOT NULL,
    current_position_status public.historical_spatial_status NOT NULL,
    name_continuity_status text NOT NULL,
    change_status public.historical_change_status NOT NULL,
    historical_source_refs text[] DEFAULT '{}'::text[] NOT NULL,
    current_source_refs text[] DEFAULT '{}'::text[] NOT NULL,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    confidence numeric DEFAULT 0 NOT NULL,
    confidence_note text DEFAULT ''::text NOT NULL,
    review_status text NOT NULL,
    uncertainty_note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT historical_features_attested_historical_existence_check CHECK ((attested_historical_existence = ANY (ARRAY['attested'::text, 'not_attested'::text, 'unknown'::text]))),
    CONSTRAINT historical_features_name_continuity_status_check CHECK ((name_continuity_status = ANY (ARRAY['continuous'::text, 'variant_only'::text, 'name_changed'::text, 'unknown'::text]))),
    CONSTRAINT historical_features_review_status_check CHECK ((review_status = ANY (ARRAY['candidate'::text, 'human_reviewed'::text, 'research'::text, 'unresolved'::text])))
);


ALTER TABLE public.historical_features OWNER TO mohen_app;

--
-- Name: historical_spatial_relations; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.historical_spatial_relations (
    hs_relation_id uuid NOT NULL,
    relation_key text NOT NULL,
    slice_id text NOT NULL,
    subject_feature_key text NOT NULL,
    predicate text NOT NULL,
    object_feature_key text NOT NULL,
    epistemic_class public.historical_relation_class NOT NULL,
    support_level text NOT NULL,
    existing_relation_id uuid,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    hr_constraint text[] DEFAULT '{}'::text[] NOT NULL,
    confidence numeric DEFAULT 0 NOT NULL,
    status text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT historical_spatial_relations_status_check CHECK ((status = ANY (ARRAY['candidate'::text, 'unresolved'::text, 'research'::text, 'legend'::text]))),
    CONSTRAINT historical_spatial_relations_support_level_check CHECK ((support_level = ANY (ARRAY['primary_read'::text, 'secondary_transcription'::text, 'legacy_transcription'::text, 'provider_geometry'::text, 'none'::text]))),
    CONSTRAINT hs_relation_no_support_only_e4 CHECK (((support_level <> 'none'::text) OR (epistemic_class = 'E4'::public.historical_relation_class))),
    CONSTRAINT hs_relation_non_e4_requires_evidence CHECK (((epistemic_class = 'E4'::public.historical_relation_class) OR (array_length(evidence_ids, 1) >= 1)))
);


ALTER TABLE public.historical_spatial_relations OWNER TO mohen_app;

--
-- Name: historical_spatial_slices; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.historical_spatial_slices (
    slice_id text NOT NULL,
    slice_title text NOT NULL,
    focus_question text NOT NULL,
    time_context text NOT NULL,
    spatial_extent_current jsonb DEFAULT '{}'::jsonb NOT NULL,
    historical_geometry_status text NOT NULL,
    uncertainties jsonb DEFAULT '[]'::jsonb NOT NULL,
    experience_hooks jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    readiness_gate text NOT NULL,
    readiness_detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT historical_spatial_slices_historical_geometry_status_check CHECK ((historical_geometry_status = ANY (ARRAY['absent_no_source'::text, 'relative_only'::text, 'present_sourced'::text]))),
    CONSTRAINT historical_spatial_slices_readiness_gate_check CHECK ((readiness_gate = ANY (ARRAY['YES'::text, 'PARTIAL'::text, 'NO'::text])))
);


ALTER TABLE public.historical_spatial_slices OWNER TO mohen_app;

--
-- Name: human_review_decisions; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.human_review_decisions (
    decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    hr_code text NOT NULL,
    decision_code text NOT NULL,
    decision_label text NOT NULL,
    object_type text NOT NULL,
    object_ref text NOT NULL,
    review_note text NOT NULL,
    reviewed_at timestamp with time zone NOT NULL,
    actor text DEFAULT 'human'::text NOT NULL,
    status_after text NOT NULL,
    machine_readable_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_refs text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT human_review_decisions_actor_check CHECK ((actor = ANY (ARRAY['human'::text, 'user-confirmed'::text, 'ai'::text]))),
    CONSTRAINT human_review_decisions_decision_code_check CHECK ((decision_code = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])))
);


ALTER TABLE public.human_review_decisions OWNER TO mohen_app;

--
-- Name: ingest_runs; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.ingest_runs (
    ingest_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    pipeline_name text NOT NULL,
    source_scope text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    input_count integer DEFAULT 0 NOT NULL,
    candidate_count integer DEFAULT 0 NOT NULL,
    verified_count integer DEFAULT 0 NOT NULL,
    rejected_count integer DEFAULT 0 NOT NULL,
    pending_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ingest_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'partial'::text])))
);


ALTER TABLE public.ingest_runs OWNER TO mohen_app;

--
-- Name: knowledge_path_steps; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.knowledge_path_steps (
    path_id uuid NOT NULL,
    step_no integer NOT NULL,
    step_kind text NOT NULL,
    ref_id text,
    label text NOT NULL,
    epistemic_status text NOT NULL,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    CONSTRAINT knowledge_path_steps_step_kind_check CHECK ((step_kind = ANY (ARRAY['entity'::text, 'claim'::text, 'relation'::text, 'change'::text])))
);


ALTER TABLE public.knowledge_path_steps OWNER TO mohen_app;

--
-- Name: knowledge_paths; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.knowledge_paths (
    path_id uuid DEFAULT gen_random_uuid() NOT NULL,
    path_code text NOT NULL,
    title text NOT NULL,
    purpose_question text NOT NULL,
    status text NOT NULL,
    evidence_coverage jsonb DEFAULT '{}'::jsonb NOT NULL,
    unresolved_breaks jsonb DEFAULT '[]'::jsonb NOT NULL,
    generated_by text DEFAULT 'mohen-knowledge-weave'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_paths_status_check CHECK ((status = ANY (ARRAY['candidate'::text, 'research'::text, 'legend'::text, 'unresolved'::text, 'verified'::text, 'rejected'::text])))
);


ALTER TABLE public.knowledge_paths OWNER TO mohen_app;

--
-- Name: legacy_mappings; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.legacy_mappings (
    mapping_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legacy_source text NOT NULL,
    legacy_type text NOT NULL,
    legacy_id text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    mapping_status text DEFAULT 'candidate'::text NOT NULL,
    mapping_method text,
    confidence numeric(4,3),
    ingest_run_id uuid,
    CONSTRAINT legacy_mappings_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
);


ALTER TABLE public.legacy_mappings OWNER TO mohen_app;

--
-- Name: relation_evidence; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.relation_evidence (
    relation_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    support_type text DEFAULT 'supports'::text NOT NULL
);


ALTER TABLE public.relation_evidence OWNER TO mohen_app;

--
-- Name: relations; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.relations (
    relation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    predicate text NOT NULL,
    object_id uuid NOT NULL,
    valid_from text,
    valid_to text,
    confidence numeric(4,3) NOT NULL,
    status public.verification_status DEFAULT 'candidate'::public.verification_status NOT NULL,
    legacy_id text,
    CONSTRAINT relations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
);


ALTER TABLE public.relations OWNER TO mohen_app;

--
-- Name: research_association_candidate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_association_candidate (
    candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    subject_ref text NOT NULL,
    object_ref text NOT NULL,
    supporting_signals jsonb DEFAULT '[]'::jsonb NOT NULL,
    counter_signals jsonb DEFAULT '[]'::jsonb NOT NULL,
    avs jsonb DEFAULT '{}'::jsonb NOT NULL,
    avs_score numeric,
    why_interesting text,
    missing_evidence text,
    next_search_tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    association_readiness text DEFAULT 'limited'::text NOT NULL,
    disposition text DEFAULT 'long_tail'::text NOT NULL,
    review_queue_id uuid,
    promoted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_association_candidate_association_readiness_check CHECK ((association_readiness = ANY (ARRAY['ready'::text, 'limited'::text, 'catalog_only'::text, 'unreadable'::text]))),
    CONSTRAINT research_association_candidate_disposition_check CHECK ((disposition = ANY (ARRAY['long_tail'::text, 'selected'::text, 'truth_promotion'::text, 'narrative_critical'::text, 'conflict_critical'::text]))),
    CONSTRAINT research_candidate_longtail_no_review_queue CHECK (((disposition <> 'long_tail'::text) OR (review_queue_id IS NULL))),
    CONSTRAINT research_candidate_zero_auto_promotion CHECK ((promoted = false))
);


ALTER TABLE public.research_association_candidate OWNER TO postgres;

--
-- Name: research_bridge_draft; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_bridge_draft (
    draft_id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid,
    subject_ref text NOT NULL,
    object_ref text,
    avs_score integer,
    disposition text,
    proposed_job text NOT NULL,
    narrative_gap text,
    research_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    human_confirmed boolean DEFAULT false NOT NULL,
    confirmed_by text,
    confirmed_at timestamp with time zone,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bridge_no_execute_before_confirm CHECK (((executed_at IS NULL) OR (human_confirmed IS TRUE)))
);


ALTER TABLE public.research_bridge_draft OWNER TO postgres;

--
-- Name: research_mention; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_mention (
    mention_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    observation_id uuid NOT NULL,
    mention_text text NOT NULL,
    mention_type text DEFAULT 'other'::text NOT NULL,
    resolution text DEFAULT 'unresolved'::text NOT NULL,
    resolved_entity_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_mention_mention_type_check CHECK ((mention_type = ANY (ARRAY['person'::text, 'place'::text, 'organization'::text, 'work'::text, 'event'::text, 'other'::text]))),
    CONSTRAINT research_mention_resolution_check CHECK ((resolution = ANY (ARRAY['resolved'::text, 'unresolved'::text, 'ambiguous'::text]))),
    CONSTRAINT research_mention_resolved_needs_entity CHECK (((resolved_entity_id IS NULL) OR (resolution = 'resolved'::text)))
);


ALTER TABLE public.research_mention OWNER TO postgres;

--
-- Name: research_observation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_observation (
    observation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    source_id text NOT NULL,
    locator text,
    region jsonb,
    modality text DEFAULT 'text'::text NOT NULL,
    excerpt text,
    normalized_observation text,
    uncertainty text,
    association_readiness text DEFAULT 'limited'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_observation_association_readiness_check CHECK ((association_readiness = ANY (ARRAY['ready'::text, 'limited'::text, 'catalog_only'::text, 'unreadable'::text]))),
    CONSTRAINT research_observation_modality_check CHECK ((modality = ANY (ARRAY['text'::text, 'map_image'::text, 'photo'::text, 'table'::text, 'catalog_only'::text, 'other'::text]))),
    CONSTRAINT research_observation_must_be_locatable CHECK (((locator IS NOT NULL) OR (region IS NOT NULL)))
);


ALTER TABLE public.research_observation OWNER TO postgres;

--
-- Name: research_run; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_run (
    run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id text NOT NULL,
    production_mode text DEFAULT 'discovery'::text NOT NULL,
    research_scope text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    write_enabled boolean DEFAULT false NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT research_run_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'dry_run'::text])))
);


ALTER TABLE public.research_run OWNER TO postgres;

--
-- Name: research_signal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_signal (
    signal_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    signal_code text NOT NULL,
    subject_ref text NOT NULL,
    object_ref text NOT NULL,
    observation_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    strength numeric,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.research_signal OWNER TO postgres;

--
-- Name: research_source_dependency; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_source_dependency (
    dependency_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    source_id text NOT NULL,
    depends_on_source_id text NOT NULL,
    dependency_type text DEFAULT 'transclusion'::text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_source_dependency_dependency_type_check CHECK ((dependency_type = ANY (ARRAY['transclusion'::text, 'duplicate'::text, 'same_origin'::text, 'derived'::text])))
);


ALTER TABLE public.research_source_dependency OWNER TO postgres;

--
-- Name: research_source_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_source_inventory (
    inventory_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    source_ref text NOT NULL,
    carrier_type text DEFAULT 'unknown'::text NOT NULL,
    readability text DEFAULT 'catalog_only'::text NOT NULL,
    rights_status text DEFAULT 'unclear'::text NOT NULL,
    raw_available boolean DEFAULT false NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_source_inventory_readability_check CHECK ((readability = ANY (ARRAY['readable'::text, 'catalog_only'::text, 'unreadable'::text]))),
    CONSTRAINT research_source_inventory_rights_status_check CHECK ((rights_status = ANY (ARRAY['clear'::text, 'unclear'::text, 'restricted'::text])))
);


ALTER TABLE public.research_source_inventory OWNER TO postgres;

--
-- Name: research_task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.research_task (
    task_id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    candidate_id uuid,
    task_type text DEFAULT 'next_search'::text NOT NULL,
    target_ref text,
    priority integer DEFAULT 0 NOT NULL,
    note text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_task_status_check CHECK ((status = ANY (ARRAY['open'::text, 'done'::text, 'dropped'::text]))),
    CONSTRAINT research_task_task_type_check CHECK ((task_type = ANY (ARRAY['directed_research'::text, 'next_search'::text, 'pause'::text, 'drop'::text])))
);


ALTER TABLE public.research_task OWNER TO postgres;

--
-- Name: review_queue; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.review_queue (
    review_id uuid DEFAULT gen_random_uuid() NOT NULL,
    object_type text NOT NULL,
    object_id text NOT NULL,
    review_tier text NOT NULL,
    reason_code text,
    summary text,
    evidence_ids text[] DEFAULT '{}'::text[] NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    review_note text,
    triage_outcome text,
    ingest_run_id uuid,
    CONSTRAINT review_queue_review_tier_check CHECK ((review_tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
    CONSTRAINT review_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'needs_research'::text]))),
    CONSTRAINT review_queue_triage_outcome_check CHECK ((triage_outcome = ANY (ARRAY['auto'::text, 'hold'::text, 'reject'::text])))
);


ALTER TABLE public.review_queue OWNER TO mohen_app;

--
-- Name: source_records; Type: TABLE; Schema: public; Owner: mohen_app
--

CREATE TABLE public.source_records (
    source_id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    title text NOT NULL,
    creator text,
    source_date text,
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    source_uri text,
    content_type text NOT NULL,
    license_code text,
    checksum text NOT NULL,
    raw_path text NOT NULL,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    legacy_id text
);


ALTER TABLE public.source_records OWNER TO mohen_app;

--
-- Name: claim_evidence claim_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.claim_evidence
    ADD CONSTRAINT claim_evidence_pkey PRIMARY KEY (claim_id, evidence_id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (claim_id);


--
-- Name: cultural_conflicts cultural_conflicts_conflict_key_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_conflicts
    ADD CONSTRAINT cultural_conflicts_conflict_key_key UNIQUE (conflict_key);


--
-- Name: cultural_conflicts cultural_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_conflicts
    ADD CONSTRAINT cultural_conflicts_pkey PRIMARY KEY (conflict_id);


--
-- Name: cultural_events cultural_events_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_events
    ADD CONSTRAINT cultural_events_pkey PRIMARY KEY (event_id);


--
-- Name: cultural_meaning_candidates cultural_meaning_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_meaning_candidates
    ADD CONSTRAINT cultural_meaning_candidates_pkey PRIMARY KEY (meaning_id);


--
-- Name: cultural_present_connections cultural_present_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_present_connections
    ADD CONSTRAINT cultural_present_connections_pkey PRIMARY KEY (present_id);


--
-- Name: cultural_relation_claims cultural_relation_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_relation_claims
    ADD CONSTRAINT cultural_relation_claims_pkey PRIMARY KEY (claim_id);


--
-- Name: discovery_candidates discovery_candidates_discovery_code_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.discovery_candidates
    ADD CONSTRAINT discovery_candidates_discovery_code_key UNIQUE (discovery_code);


--
-- Name: discovery_candidates discovery_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.discovery_candidates
    ADD CONSTRAINT discovery_candidates_pkey PRIMARY KEY (discovery_id);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (entity_id);


--
-- Name: evidence_fragments evidence_fragments_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.evidence_fragments
    ADD CONSTRAINT evidence_fragments_pkey PRIMARY KEY (fragment_id);


--
-- Name: evidence_gate_audit evidence_gate_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.evidence_gate_audit
    ADD CONSTRAINT evidence_gate_audit_pkey PRIMARY KEY (audit_id);


--
-- Name: evidence evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: historical_change_records historical_change_records_change_key_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_change_records
    ADD CONSTRAINT historical_change_records_change_key_key UNIQUE (change_key);


--
-- Name: historical_change_records historical_change_records_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_change_records
    ADD CONSTRAINT historical_change_records_pkey PRIMARY KEY (change_id);


--
-- Name: historical_feature_anchors historical_feature_anchors_anchor_key_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_feature_anchors
    ADD CONSTRAINT historical_feature_anchors_anchor_key_key UNIQUE (anchor_key);


--
-- Name: historical_feature_anchors historical_feature_anchors_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_feature_anchors
    ADD CONSTRAINT historical_feature_anchors_pkey PRIMARY KEY (anchor_id);


--
-- Name: historical_features historical_features_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_features
    ADD CONSTRAINT historical_features_feature_key_key UNIQUE (feature_key);


--
-- Name: historical_features historical_features_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_features
    ADD CONSTRAINT historical_features_pkey PRIMARY KEY (feature_id);


--
-- Name: historical_spatial_relations historical_spatial_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_spatial_relations
    ADD CONSTRAINT historical_spatial_relations_pkey PRIMARY KEY (hs_relation_id);


--
-- Name: historical_spatial_relations historical_spatial_relations_relation_key_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_spatial_relations
    ADD CONSTRAINT historical_spatial_relations_relation_key_key UNIQUE (relation_key);


--
-- Name: historical_spatial_slices historical_spatial_slices_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_spatial_slices
    ADD CONSTRAINT historical_spatial_slices_pkey PRIMARY KEY (slice_id);


--
-- Name: human_review_decisions human_review_decisions_hr_code_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.human_review_decisions
    ADD CONSTRAINT human_review_decisions_hr_code_key UNIQUE (hr_code);


--
-- Name: human_review_decisions human_review_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.human_review_decisions
    ADD CONSTRAINT human_review_decisions_pkey PRIMARY KEY (decision_id);


--
-- Name: ingest_runs ingest_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.ingest_runs
    ADD CONSTRAINT ingest_runs_pkey PRIMARY KEY (ingest_run_id);


--
-- Name: knowledge_path_steps knowledge_path_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.knowledge_path_steps
    ADD CONSTRAINT knowledge_path_steps_pkey PRIMARY KEY (path_id, step_no);


--
-- Name: knowledge_paths knowledge_paths_path_code_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.knowledge_paths
    ADD CONSTRAINT knowledge_paths_path_code_key UNIQUE (path_code);


--
-- Name: knowledge_paths knowledge_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.knowledge_paths
    ADD CONSTRAINT knowledge_paths_pkey PRIMARY KEY (path_id);


--
-- Name: legacy_mappings legacy_mappings_legacy_source_legacy_type_legacy_id_target__key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.legacy_mappings
    ADD CONSTRAINT legacy_mappings_legacy_source_legacy_type_legacy_id_target__key UNIQUE (legacy_source, legacy_type, legacy_id, target_type);


--
-- Name: legacy_mappings legacy_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.legacy_mappings
    ADD CONSTRAINT legacy_mappings_pkey PRIMARY KEY (mapping_id);


--
-- Name: relation_evidence relation_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.relation_evidence
    ADD CONSTRAINT relation_evidence_pkey PRIMARY KEY (relation_id, evidence_id);


--
-- Name: relations relations_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_pkey PRIMARY KEY (relation_id);


--
-- Name: research_association_candidate research_association_candidate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_association_candidate
    ADD CONSTRAINT research_association_candidate_pkey PRIMARY KEY (candidate_id);


--
-- Name: research_bridge_draft research_bridge_draft_candidate_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_bridge_draft
    ADD CONSTRAINT research_bridge_draft_candidate_id_key UNIQUE (candidate_id);


--
-- Name: research_bridge_draft research_bridge_draft_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_bridge_draft
    ADD CONSTRAINT research_bridge_draft_pkey PRIMARY KEY (draft_id);


--
-- Name: research_mention research_mention_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_mention
    ADD CONSTRAINT research_mention_pkey PRIMARY KEY (mention_id);


--
-- Name: research_observation research_observation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_observation
    ADD CONSTRAINT research_observation_pkey PRIMARY KEY (observation_id);


--
-- Name: research_run research_run_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_run
    ADD CONSTRAINT research_run_pkey PRIMARY KEY (run_id);


--
-- Name: research_signal research_signal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_signal
    ADD CONSTRAINT research_signal_pkey PRIMARY KEY (signal_id);


--
-- Name: research_source_dependency research_source_dependency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_source_dependency
    ADD CONSTRAINT research_source_dependency_pkey PRIMARY KEY (dependency_id);


--
-- Name: research_source_inventory research_source_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_source_inventory
    ADD CONSTRAINT research_source_inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: research_task research_task_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_task
    ADD CONSTRAINT research_task_pkey PRIMARY KEY (task_id);


--
-- Name: review_queue review_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.review_queue
    ADD CONSTRAINT review_queue_pkey PRIMARY KEY (review_id);


--
-- Name: source_records source_records_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.source_records
    ADD CONSTRAINT source_records_pkey PRIMARY KEY (source_id);


--
-- Name: source_records source_records_provider_checksum_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.source_records
    ADD CONSTRAINT source_records_provider_checksum_key UNIQUE (provider, checksum);


--
-- Name: visual_assets visual_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.visual_assets
    ADD CONSTRAINT visual_assets_pkey PRIMARY KEY (asset_id);


--
-- Name: visual_entity_links visual_entity_links_asset_id_depicted_entity_label_key; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.visual_entity_links
    ADD CONSTRAINT visual_entity_links_asset_id_depicted_entity_label_key UNIQUE (asset_id, depicted_entity_label);


--
-- Name: visual_entity_links visual_entity_links_pkey; Type: CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.visual_entity_links
    ADD CONSTRAINT visual_entity_links_pkey PRIMARY KEY (link_id);


--
-- Name: idx_cc_subject; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_cc_subject ON public.cultural_conflicts USING btree (subject_feature_key);


--
-- Name: idx_ce_epistemic; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_ce_epistemic ON public.cultural_events USING btree (epistemic_status);


--
-- Name: idx_ce_slice; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_ce_slice ON public.cultural_events USING btree (slice_id);


--
-- Name: idx_ce_subject; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_ce_subject ON public.cultural_events USING btree (subject_feature_key);


--
-- Name: idx_cmc_slice; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_cmc_slice ON public.cultural_meaning_candidates USING btree (slice_id);


--
-- Name: idx_cmc_subject; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_cmc_subject ON public.cultural_meaning_candidates USING btree (subject_feature_key);


--
-- Name: idx_cpc_slice; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_cpc_slice ON public.cultural_present_connections USING btree (slice_id);


--
-- Name: idx_cpc_subject; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_cpc_subject ON public.cultural_present_connections USING btree (subject_feature_key);


--
-- Name: idx_crc_epistemic; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_crc_epistemic ON public.cultural_relation_claims USING btree (epistemic_status);


--
-- Name: idx_crc_existing; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_crc_existing ON public.cultural_relation_claims USING btree (existing_relation_id);


--
-- Name: idx_crc_slice; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_crc_slice ON public.cultural_relation_claims USING btree (slice_id);


--
-- Name: idx_crc_subject; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_crc_subject ON public.cultural_relation_claims USING btree (subject_feature_key);


--
-- Name: idx_ef_evidence; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_ef_evidence ON public.evidence_fragments USING btree (evidence_id);


--
-- Name: idx_ef_span; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_ef_span ON public.evidence_fragments USING btree (span_type);


--
-- Name: idx_evidence_gate_audit_obj; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_evidence_gate_audit_obj ON public.evidence_gate_audit USING btree (object_type, object_id, gate_code);


--
-- Name: idx_historical_change_records_feature; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_historical_change_records_feature ON public.historical_change_records USING btree (feature_id, change_epistemic);


--
-- Name: idx_historical_feature_anchors_feature; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_historical_feature_anchors_feature ON public.historical_feature_anchors USING btree (feature_id, spatial_status);


--
-- Name: idx_historical_features_slice; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_historical_features_slice ON public.historical_features USING btree (slice_id, feature_type);


--
-- Name: idx_historical_spatial_relations_slice; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_historical_spatial_relations_slice ON public.historical_spatial_relations USING btree (slice_id, epistemic_class);


--
-- Name: idx_hr_code; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_hr_code ON public.human_review_decisions USING btree (hr_code);


--
-- Name: idx_hr_object; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_hr_object ON public.human_review_decisions USING btree (object_type, object_ref);


--
-- Name: idx_kps_path; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_kps_path ON public.knowledge_path_steps USING btree (path_id);


--
-- Name: idx_legacy_mappings_legacy; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_legacy_mappings_legacy ON public.legacy_mappings USING btree (legacy_source, legacy_type, legacy_id);


--
-- Name: idx_research_candidate_disp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_candidate_disp ON public.research_association_candidate USING btree (disposition);


--
-- Name: idx_research_mention_obs; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_mention_obs ON public.research_mention USING btree (observation_id);


--
-- Name: idx_research_observation_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_observation_run ON public.research_observation USING btree (run_id);


--
-- Name: idx_research_observation_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_observation_source ON public.research_observation USING btree (source_id);


--
-- Name: idx_research_run_job; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_run_job ON public.research_run USING btree (job_id, started_at DESC);


--
-- Name: idx_research_signal_pair; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_signal_pair ON public.research_signal USING btree (subject_ref, object_ref);


--
-- Name: idx_research_task_candidate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_task_candidate ON public.research_task USING btree (candidate_id);


--
-- Name: idx_review_queue_tier_status; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_review_queue_tier_status ON public.review_queue USING btree (review_tier, status);


--
-- Name: idx_review_queue_triage; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_review_queue_triage ON public.review_queue USING btree (triage_outcome) WHERE (triage_outcome IS NOT NULL);


--
-- Name: idx_va_eligibility_status; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_va_eligibility_status ON public.visual_assets USING btree (eligibility_status);


--
-- Name: idx_vel_asset; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_vel_asset ON public.visual_entity_links USING btree (asset_id);


--
-- Name: idx_vel_eligibility; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_vel_eligibility ON public.visual_entity_links USING gin (eligibility_tags);


--
-- Name: idx_vel_entity; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_vel_entity ON public.visual_entity_links USING btree (entity_id);


--
-- Name: idx_vel_status; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_vel_status ON public.visual_entity_links USING btree (link_status);


--
-- Name: idx_visual_asset_eligibility; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE INDEX idx_visual_asset_eligibility ON public.visual_assets USING gin (eligibility_tags);


--
-- Name: uq_research_candidate_per_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_research_candidate_per_run ON public.research_association_candidate USING btree (run_id, subject_ref, object_ref);


--
-- Name: uq_research_dependency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_research_dependency ON public.research_source_dependency USING btree (source_id, depends_on_source_id, dependency_type);


--
-- Name: uq_research_inventory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_research_inventory ON public.research_source_inventory USING btree (run_id, source_ref);


--
-- Name: uq_review_queue_triage_per_run; Type: INDEX; Schema: public; Owner: mohen_app
--

CREATE UNIQUE INDEX uq_review_queue_triage_per_run ON public.review_queue USING btree (object_type, object_id, ingest_run_id) WHERE (ingest_run_id IS NOT NULL);


--
-- Name: claims claims_require_evidence; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER claims_require_evidence AFTER INSERT OR UPDATE OF status ON public.claims DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_published_claim_evidence();


--
-- Name: cultural_meaning_candidates cmc_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER cmc_promotion_requires_audit AFTER INSERT OR UPDATE OF review_status ON public.cultural_meaning_candidates DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_cmc_promotion_requires_audit();


--
-- Name: cultural_present_connections cpc_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER cpc_promotion_requires_audit AFTER INSERT OR UPDATE OF review_status ON public.cultural_present_connections DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_cpc_promotion_requires_audit();


--
-- Name: cultural_relation_claims crc_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER crc_promotion_requires_audit AFTER INSERT OR UPDATE OF review_status ON public.cultural_relation_claims DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_crc_promotion_requires_audit();


--
-- Name: discovery_candidates discovery_not_publishable_guard; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE TRIGGER discovery_not_publishable_guard BEFORE INSERT OR UPDATE ON public.discovery_candidates FOR EACH ROW EXECUTE FUNCTION public.guard_weave_not_publishable();


--
-- Name: entities entity_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER entity_promotion_requires_audit AFTER INSERT OR UPDATE OF status ON public.entities DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_entity_promotion_requires_audit();


--
-- Name: evidence evidence_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER evidence_promotion_requires_audit AFTER INSERT OR UPDATE OF verification_status ON public.evidence DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_evidence_promotion_requires_audit();


--
-- Name: historical_features hf_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER hf_promotion_requires_audit AFTER INSERT OR UPDATE OF review_status ON public.historical_features DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_hf_promotion_requires_audit();


--
-- Name: historical_spatial_relations hsr_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER hsr_promotion_requires_audit AFTER INSERT OR UPDATE OF status ON public.historical_spatial_relations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_hsr_promotion_requires_audit();


--
-- Name: relations relation_promotion_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER relation_promotion_requires_audit AFTER INSERT OR UPDATE OF status ON public.relations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_relation_promotion_requires_audit();


--
-- Name: review_queue review_queue_tier_c_guard; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE TRIGGER review_queue_tier_c_guard BEFORE INSERT OR UPDATE ON public.review_queue FOR EACH ROW EXECUTE FUNCTION public.guard_review_queue_tier_c();


--
-- Name: review_queue review_queue_triage_guard; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE TRIGGER review_queue_triage_guard BEFORE INSERT OR UPDATE ON public.review_queue FOR EACH ROW EXECUTE FUNCTION public.guard_review_queue_triage();


--
-- Name: visual_assets va_gate_passed_requires_audit; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE CONSTRAINT TRIGGER va_gate_passed_requires_audit AFTER INSERT OR UPDATE OF eligibility_status ON public.visual_assets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.guard_visual_asset_gate_passed_requires_audit();


--
-- Name: visual_entity_links vel_confirmed_requires_evidence; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE TRIGGER vel_confirmed_requires_evidence BEFORE INSERT OR UPDATE ON public.visual_entity_links FOR EACH ROW EXECUTE FUNCTION public.guard_confirmed_link_has_evidence();


--
-- Name: visual_entity_links vel_excluded_not_confirmed; Type: TRIGGER; Schema: public; Owner: mohen_app
--

CREATE TRIGGER vel_excluded_not_confirmed BEFORE INSERT OR UPDATE ON public.visual_entity_links FOR EACH ROW EXECUTE FUNCTION public.guard_excluded_asset_not_heritage_confirmed();


--
-- Name: claim_evidence claim_evidence_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.claim_evidence
    ADD CONSTRAINT claim_evidence_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(claim_id) ON DELETE CASCADE;


--
-- Name: claim_evidence claim_evidence_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.claim_evidence
    ADD CONSTRAINT claim_evidence_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence(evidence_id) ON DELETE CASCADE;


--
-- Name: claims claims_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_object_id_fkey FOREIGN KEY (object_id) REFERENCES public.entities(entity_id);


--
-- Name: claims claims_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.entities(entity_id);


--
-- Name: cultural_events cultural_events_slice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_events
    ADD CONSTRAINT cultural_events_slice_id_fkey FOREIGN KEY (slice_id) REFERENCES public.historical_spatial_slices(slice_id) ON DELETE CASCADE;


--
-- Name: cultural_meaning_candidates cultural_meaning_candidates_slice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_meaning_candidates
    ADD CONSTRAINT cultural_meaning_candidates_slice_id_fkey FOREIGN KEY (slice_id) REFERENCES public.historical_spatial_slices(slice_id) ON DELETE CASCADE;


--
-- Name: cultural_present_connections cultural_present_connections_slice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_present_connections
    ADD CONSTRAINT cultural_present_connections_slice_id_fkey FOREIGN KEY (slice_id) REFERENCES public.historical_spatial_slices(slice_id) ON DELETE CASCADE;


--
-- Name: cultural_relation_claims cultural_relation_claims_existing_relation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_relation_claims
    ADD CONSTRAINT cultural_relation_claims_existing_relation_id_fkey FOREIGN KEY (existing_relation_id) REFERENCES public.relations(relation_id) ON DELETE SET NULL;


--
-- Name: cultural_relation_claims cultural_relation_claims_slice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.cultural_relation_claims
    ADD CONSTRAINT cultural_relation_claims_slice_id_fkey FOREIGN KEY (slice_id) REFERENCES public.historical_spatial_slices(slice_id) ON DELETE CASCADE;


--
-- Name: evidence_fragments evidence_fragments_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.evidence_fragments
    ADD CONSTRAINT evidence_fragments_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence(evidence_id) ON DELETE CASCADE;


--
-- Name: evidence evidence_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source_records(source_id);


--
-- Name: historical_change_records historical_change_records_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_change_records
    ADD CONSTRAINT historical_change_records_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.historical_features(feature_id) ON DELETE CASCADE;


--
-- Name: historical_change_records historical_change_records_slice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_change_records
    ADD CONSTRAINT historical_change_records_slice_id_fkey FOREIGN KEY (slice_id) REFERENCES public.historical_spatial_slices(slice_id) ON DELETE CASCADE;


--
-- Name: historical_feature_anchors historical_feature_anchors_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_feature_anchors
    ADD CONSTRAINT historical_feature_anchors_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence(evidence_id) ON DELETE SET NULL;


--
-- Name: historical_feature_anchors historical_feature_anchors_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_feature_anchors
    ADD CONSTRAINT historical_feature_anchors_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.historical_features(feature_id) ON DELETE CASCADE;


--
-- Name: historical_features historical_features_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_features
    ADD CONSTRAINT historical_features_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(entity_id) ON DELETE SET NULL;


--
-- Name: historical_features historical_features_slice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_features
    ADD CONSTRAINT historical_features_slice_id_fkey FOREIGN KEY (slice_id) REFERENCES public.historical_spatial_slices(slice_id) ON DELETE CASCADE;


--
-- Name: historical_spatial_relations historical_spatial_relations_existing_relation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_spatial_relations
    ADD CONSTRAINT historical_spatial_relations_existing_relation_id_fkey FOREIGN KEY (existing_relation_id) REFERENCES public.relations(relation_id) ON DELETE SET NULL;


--
-- Name: historical_spatial_relations historical_spatial_relations_object_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_spatial_relations
    ADD CONSTRAINT historical_spatial_relations_object_feature_key_fkey FOREIGN KEY (object_feature_key) REFERENCES public.historical_features(feature_key) ON DELETE CASCADE;


--
-- Name: historical_spatial_relations historical_spatial_relations_slice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_spatial_relations
    ADD CONSTRAINT historical_spatial_relations_slice_id_fkey FOREIGN KEY (slice_id) REFERENCES public.historical_spatial_slices(slice_id) ON DELETE CASCADE;


--
-- Name: historical_spatial_relations historical_spatial_relations_subject_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.historical_spatial_relations
    ADD CONSTRAINT historical_spatial_relations_subject_feature_key_fkey FOREIGN KEY (subject_feature_key) REFERENCES public.historical_features(feature_key) ON DELETE CASCADE;


--
-- Name: knowledge_path_steps knowledge_path_steps_path_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.knowledge_path_steps
    ADD CONSTRAINT knowledge_path_steps_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.knowledge_paths(path_id) ON DELETE CASCADE;


--
-- Name: relation_evidence relation_evidence_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.relation_evidence
    ADD CONSTRAINT relation_evidence_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence(evidence_id) ON DELETE CASCADE;


--
-- Name: relation_evidence relation_evidence_relation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.relation_evidence
    ADD CONSTRAINT relation_evidence_relation_id_fkey FOREIGN KEY (relation_id) REFERENCES public.relations(relation_id) ON DELETE CASCADE;


--
-- Name: relations relations_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_object_id_fkey FOREIGN KEY (object_id) REFERENCES public.entities(entity_id);


--
-- Name: relations relations_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.entities(entity_id);


--
-- Name: research_association_candidate research_association_candidate_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_association_candidate
    ADD CONSTRAINT research_association_candidate_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.research_run(run_id) ON DELETE CASCADE;


--
-- Name: research_mention research_mention_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_mention
    ADD CONSTRAINT research_mention_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.research_observation(observation_id) ON DELETE CASCADE;


--
-- Name: research_mention research_mention_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_mention
    ADD CONSTRAINT research_mention_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.research_run(run_id) ON DELETE CASCADE;


--
-- Name: research_observation research_observation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_observation
    ADD CONSTRAINT research_observation_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.research_run(run_id) ON DELETE CASCADE;


--
-- Name: research_signal research_signal_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_signal
    ADD CONSTRAINT research_signal_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.research_run(run_id) ON DELETE CASCADE;


--
-- Name: research_source_dependency research_source_dependency_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_source_dependency
    ADD CONSTRAINT research_source_dependency_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.research_run(run_id) ON DELETE CASCADE;


--
-- Name: research_source_inventory research_source_inventory_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_source_inventory
    ADD CONSTRAINT research_source_inventory_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.research_run(run_id) ON DELETE CASCADE;


--
-- Name: research_task research_task_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_task
    ADD CONSTRAINT research_task_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.research_association_candidate(candidate_id) ON DELETE CASCADE;


--
-- Name: research_task research_task_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.research_task
    ADD CONSTRAINT research_task_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.research_run(run_id) ON DELETE CASCADE;


--
-- Name: review_queue review_queue_ingest_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.review_queue
    ADD CONSTRAINT review_queue_ingest_run_id_fkey FOREIGN KEY (ingest_run_id) REFERENCES public.ingest_runs(ingest_run_id);


--
-- Name: visual_assets visual_assets_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.visual_assets
    ADD CONSTRAINT visual_assets_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source_records(source_id);


--
-- Name: visual_entity_links visual_entity_links_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.visual_entity_links
    ADD CONSTRAINT visual_entity_links_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.visual_assets(asset_id);


--
-- Name: visual_entity_links visual_entity_links_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.visual_entity_links
    ADD CONSTRAINT visual_entity_links_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(entity_id);


--
-- Name: visual_entity_links visual_entity_links_link_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mohen_app
--

ALTER TABLE ONLY public.visual_entity_links
    ADD CONSTRAINT visual_entity_links_link_evidence_id_fkey FOREIGN KEY (link_evidence_id) REFERENCES public.evidence(evidence_id);


--
-- PostgreSQL database dump complete
--

\unrestrict 9HIseyibJmSDwLBFV5zJMyrPr7CEBMrOShX759sj1HAF3wUEpbsGvsLR8G4lssw

