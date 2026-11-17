-- M5 only: narrow, Owner-scoped qualified formal L0-L4 read bridge.
-- Reuse existing Gate's current_qualification_is_valid via qualification_allows.
-- No new Gate, RLS policy, globally granted SELECT, production user or data copy.
-- SECURITY DEFINER is deliberate: tables are *not* directly readable by the
-- application role; only this fixed, bounded, gate-guarded projection is.
-- Existing studio.read_private_text_reading uses the same signed-user boundary.
-- Function is private to studio schema and EXECUTE is removed from PUBLIC.
CREATE OR REPLACE FUNCTION studio.search_qualified_project_layers(
 p_project_id uuid,p_namespace text,p_code text,p_version text,
 p_scope jsonb,p_terms text[],p_limit integer DEFAULT 24
) RETURNS TABLE(layer text,gate text,object_type text,object_id text,revision text,snippet text,source_ref text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $m5_formal$
DECLARE
 app_user uuid;
BEGIN
 -- The caller must have entered the existing restricted application role.
 -- Never accept the generic DB connection or a forged browser project id.
 IF current_setting('role',true) IS DISTINCT FROM 'mohen_app_runtime' THEN
  RAISE EXCEPTION 'M5_FORMAL_READ_ROLE_REQUIRED' USING ERRCODE='42501';
 END IF;
 app_user:=control.current_app_user_id();
 IF app_user IS NULL OR p_project_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM studio.projects p WHERE p.project_id=p_project_id
   AND p.owner_user_id=app_user AND p.lifecycle_status='ACTIVE'
 ) THEN
  RAISE EXCEPTION 'M5_FORMAL_READ_OWNER_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF p_namespace IS NULL OR p_code IS NULL OR p_version IS NULL OR
    length(trim(p_namespace)) NOT BETWEEN 1 AND 128 OR
    length(trim(p_code)) NOT BETWEEN 1 AND 128 OR
    length(trim(p_version)) NOT BETWEEN 1 AND 128 OR
    jsonb_typeof(p_scope) IS DISTINCT FROM 'object' OR
    p_scope->>'project_id' IS DISTINCT FROM p_project_id::text OR
    p_scope->>'requested_action' IS DISTINCT FROM 'read' OR
    length(p_scope::text)>4096 OR
    p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 24 OR
    array_length(p_terms,1) IS NULL OR array_length(p_terms,1)>8 OR
    EXISTS(SELECT 1 FROM unnest(p_terms) t
      WHERE t IS NULL OR length(trim(t)) NOT BETWEEN 2 AND 90)
 THEN
  RAISE EXCEPTION 'M5_FORMAL_READ_CONTEXT_INVALID' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 
 with qualified as (
  select q.gate_code,q.object_type,q.object_id,q.artifact_revision
  from control.qualification_current q
  join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
  where q.gate_code in ('G0','G1','G2','G3','G4')
    and q.object_type in ('source','read_run','material_evidence','relation_claim','finding')
    and q.gate_code=g.gate_code and q.object_type=g.object_type and q.object_id=g.object_id
    and q.artifact_revision=g.artifact_revision
    and control.qualification_allows(g.gate_audit_id,'agent',p_namespace,p_code,p_version,p_scope)
 ), matched as (
  select 'L0'::text as layer,'G0'::text as gate,q.object_type,q.object_id::text as object_id,
   q.artifact_revision as revision,coalesce(s.title,'') as snippet,
   '正式来源目录 · 已有当前G0（用途限定，需再核原件读取权）'::text as source_ref
  from qualified q join source.sources s on s.source_id=q.object_id
  where q.gate_code='G0' and q.object_type='source'
  union all
  select 'L1','G1',q.object_type,q.object_id::text,q.artifact_revision,
   coalesce(s.title,'')||' · G1读取运行 '||left(rr.read_run_id::text,8),
   '原件读取定位 · 当前G1，非材料解释'
  from qualified q join source.read_runs rr on rr.read_run_id=q.object_id
  left join source.raw_items raw on raw.raw_item_id=rr.raw_item_id
  left join source.source_versions sv on sv.source_version_id=raw.source_version_id
  left join source.sources s on s.source_id=sv.source_id
  where q.gate_code='G1' and q.object_type='read_run'
  union all
  select 'L2','G2',q.object_type,q.object_id::text,q.artifact_revision,
   left(coalesce(nullif(e.literal_reading,''),nullif(e.research_proposition,''),''),620),
   'G2材料观察 · 不是直接历史事实'
  from qualified q join evidence.material_evidence e on e.evidence_id=q.object_id
  where q.gate_code='G2' and q.object_type='material_evidence'
  union all
  select 'L3','G3',q.object_type,q.object_id::text,q.artifact_revision,
   coalesce(subject.canonical_label,'历史实体')||' · '||w.relation_type||' · '||
     coalesce(target.canonical_label,left(w.object_value::text,160),'关系对象'),
   'G3关系主张 · 限定用途和现行资格'
  from qualified q join world.relation_claims w on w.relation_claim_id=q.object_id
  left join world.entities subject on subject.entity_id=w.subject_entity_id
  left join world.entities target on target.entity_id=w.object_entity_id
  where q.gate_code='G3' and q.object_type='relation_claim'
  union all
  select 'L4','G4',q.object_type,q.object_id::text,q.artifact_revision,
   left(coalesce(nullif(m.interpretive_statement,''),nullif(m.human_question,''),''),620),
   'G4人文解释 · 不等于原件事实'
  from qualified q join meaning.findings m on m.finding_id=q.object_id
  where q.gate_code='G4' and q.object_type='finding'
 ), terms as (
  select trim(t) as term from unnest(p_terms) t
  where length(trim(t))>1
 )
 select m.layer,m.gate,m.object_type,m.object_id,m.revision,m.snippet,m.source_ref
 from matched m where nullif(trim(m.snippet),'') is not null
  and exists(select 1 from terms where position(lower(term) in lower(m.snippet))>0)
 order by case layer when 'L4' then 1 when 'L3' then 2 when 'L2' then 3 when 'L1' then 4 else 5 end,
  object_id limit (p_limit+1)
 
;
END;
$m5_formal$;

-- Atomic migration: no interval where a new privileged function is public.
REVOKE ALL ON FUNCTION studio.search_qualified_project_layers(uuid,text,text,text,jsonb,text[],integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION studio.search_qualified_project_layers(uuid,text,text,text,jsonb,text[],integer) FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION studio.search_qualified_project_layers(uuid,text,text,text,jsonb,text[],integer) TO mohen_app_runtime;

COMMENT ON FUNCTION studio.search_qualified_project_layers(uuid,text,text,text,jsonb,text[],integer)
IS 'M5 Studio internal Owner-only bounded G0-G4 current qualified read; no direct table grants, no raw storage bytes, no Gate signing; cross-project sharing forbidden.';
