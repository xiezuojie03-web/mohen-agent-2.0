-- Phase E legacy backfill into V2 semantic schemas.
-- NON-DESTRUCTIVE: reads public V1 tables, writes new semantic schemas only.
-- Old G0-G6 audits are quarantined and NEVER create new G0-G4 PASS.
begin;

insert into source.sources
(source_id,provider,title,source_type,carrier_type,creator,source_uri_or_catalog_no,source_date,rights,provenance_status,content_availability,original_locator,scope,created_at)
select source_id,provider,title,content_type,content_type,creator,source_uri,
       case when source_date is null then null else jsonb_build_object('legacy_text',source_date) end,
       jsonb_strip_nulls(jsonb_build_object('license_code',license_code)),
       'legacy_imported',
       case when coalesce(raw_path,'')<>'' then 'full_content'
            when content_type ilike '%image%' or content_type ilike '%map%' then 'image_scan'
            else 'catalog_only' end,
       jsonb_strip_nulls(jsonb_build_object('raw_path',raw_path)),coalesce(metadata_json,'{}'::jsonb),retrieved_at
from public.source_records
on conflict (source_id) do nothing;

insert into source.source_versions(source_version_id,source_id,version_label,retrieved_at,checksum_sha256,metadata)
select source_id,source_id,'legacy-current',retrieved_at,checksum,jsonb_build_object('legacy_table','source_records')
from public.source_records
on conflict (source_version_id) do nothing;

insert into source.raw_items(raw_item_id,source_version_id,storage_ref,media_type,checksum_sha256,created_at)
select source_id,source_id,raw_path,content_type,checksum,retrieved_at
from public.source_records where coalesce(raw_path,'')<>''
on conflict (raw_item_id) do nothing;

insert into evidence.material_evidence
(evidence_id,source_id,source_version_id,locator,media_region,modality,raw_excerpt_or_region,literal_reading,evidence_type,temporal_applicability,spatial_applicability,uncertainty,extraction_method,maturity,created_at)
select e.evidence_id,e.source_id,e.source_id,
       jsonb_strip_nulls(jsonb_build_object('legacy_locator',e.locator)),e.region_json,coalesce(e.evidence_type,'unknown'),
       jsonb_strip_nulls(jsonb_build_object('quote_text',e.quote_text,'region',e.region_json)),nullif(e.quote_text,''),e.evidence_type,
       jsonb_strip_nulls(jsonb_build_object('time_hint',e.time_hint)),jsonb_strip_nulls(jsonb_build_object('place_hint',e.place_hint)),
       jsonb_build_object('legacy_confidence',e.confidence,'legacy_status',e.verification_status::text),
       jsonb_build_object('legacy_method',e.extraction_method),
       case when e.verification_status::text in ('verified','published') then 'adjudicated'::control.maturity_status
            when e.verification_status::text='rejected' then 'rejected'::control.maturity_status else 'candidate'::control.maturity_status end,
       e.created_at
from public.evidence e join source.sources s on s.source_id=e.source_id
on conflict (evidence_id) do nothing;

-- Research observations remain candidate evidence only; unresolved source IDs stay in legacy tables for later D01/D02 reprocessing.
insert into evidence.material_evidence
(evidence_id,source_id,source_version_id,locator,media_region,modality,raw_excerpt_or_region,literal_reading,normalized_text,research_proposition,evidence_type,uncertainty,extraction_method,maturity,created_at)
select ro.observation_id,sr.source_id,sr.source_id,jsonb_strip_nulls(jsonb_build_object('legacy_locator',ro.locator)),ro.region,coalesce(ro.modality,'unknown'),
       jsonb_strip_nulls(jsonb_build_object('excerpt',ro.excerpt,'region',ro.region)),nullif(ro.excerpt,''),ro.normalized_observation,ro.normalized_observation,'research_observation',
       jsonb_strip_nulls(jsonb_build_object('legacy_uncertainty',ro.uncertainty,'association_readiness',ro.association_readiness)),jsonb_build_object('legacy_table','research_observation'),'candidate',ro.created_at
from public.research_observation ro
join public.source_records sr on sr.source_id::text=ro.source_id or sr.legacy_id=ro.source_id or sr.source_uri=ro.source_id
on conflict (evidence_id) do nothing;

insert into world.entities(entity_id,entity_type,canonical_label,aliases,temporal_scope,attributes,maturity)
select entity_id,entity_type,canonical_name,aliases,jsonb_strip_nulls(jsonb_build_object('valid_from',valid_from,'valid_to',valid_to)),
       jsonb_strip_nulls(jsonb_build_object('description',description,'legacy_id',legacy_id,'confidence',confidence)),
       case when status::text in ('verified','published') then 'adjudicated'::control.maturity_status when status::text='rejected' then 'rejected'::control.maturity_status else 'candidate'::control.maturity_status end
from public.entities
on conflict (entity_id) do nothing;

insert into world.entities(entity_id,entity_type,canonical_label,aliases,temporal_scope,attributes,maturity,created_at)
select coalesce(entity_id,feature_id),feature_type,canonical_label,array_cat(historical_labels,modern_labels),
       jsonb_strip_nulls(jsonb_build_object('attested_start',attested_time_start,'attested_end',attested_time_end,'label',attested_time_label)),
       jsonb_build_object('feature_key',feature_key,'legacy_feature_id',feature_id,'confidence',confidence),
       case when review_status='human_reviewed' then 'adjudicated'::control.maturity_status else 'candidate'::control.maturity_status end,created_at
from public.historical_features
on conflict (entity_id) do nothing;

insert into world.events(event_id,event_type,canonical_label,subject_entity_id,time_scope,space_scope,attributes,maturity,created_at)
select ce.event_id,ce.event_type,ce.canonical_label,
       (select coalesce(h.entity_id,h.feature_id) from public.historical_features h where h.feature_key=ce.subject_feature_key limit 1),
       jsonb_strip_nulls(jsonb_build_object('start',ce.time_scope_start,'end',ce.time_scope_end,'unknown',ce.time_scope_unknown,'note',ce.temporal_note)),
       jsonb_build_object('place_refs',ce.place_refs,'slice_id',ce.slice_id),
       jsonb_build_object('legacy_epistemic_status',ce.epistemic_status,'expression_rule',ce.expression_rule),
       case when ce.review_status='human_reviewed' then 'adjudicated'::control.maturity_status else 'candidate'::control.maturity_status end,ce.created_at
from public.cultural_events ce
on conflict (event_id) do nothing;

insert into world.relation_claims(relation_claim_id,relation_type,subject_entity_id,object_entity_id,object_value,time_scope,space_scope,expression_rule,maturity)
select claim_id,predicate,subject_id,object_id,object_value,'{}'::jsonb,'{}'::jsonb,
       jsonb_strip_nulls(jsonb_build_object('review_tier',review_tier,'generated_by',generated_by,'review_note',review_note,'certainty',certainty)),
       case when status::text in ('verified','published') then 'adjudicated'::control.maturity_status when status::text='rejected' then 'rejected'::control.maturity_status else 'candidate'::control.maturity_status end
from public.claims where object_id is not null or object_value is not null
on conflict (relation_claim_id) do nothing;

insert into world.relation_claims(relation_claim_id,relation_type,subject_entity_id,object_entity_id,time_scope,space_scope,expression_rule,maturity)
select relation_id,predicate,subject_id,object_id,jsonb_strip_nulls(jsonb_build_object('valid_from',valid_from,'valid_to',valid_to)),'{}'::jsonb,
       jsonb_strip_nulls(jsonb_build_object('legacy_id',legacy_id,'confidence',confidence,'source_table','relations')),
       case when status::text in ('verified','published') then 'adjudicated'::control.maturity_status when status::text='rejected' then 'rejected'::control.maturity_status else 'candidate'::control.maturity_status end
from public.relations
on conflict (relation_claim_id) do nothing;

insert into world.relation_claims(relation_claim_id,relation_type,subject_entity_id,object_entity_id,object_value,time_scope,space_scope,expression_rule,maturity,created_at)
select cr.claim_id,cr.predicate,
       (select coalesce(h.entity_id,h.feature_id) from public.historical_features h where h.feature_key=cr.subject_feature_key limit 1),
       (select coalesce(h.entity_id,h.feature_id) from public.historical_features h where h.feature_key=cr.object_feature_key limit 1),
       coalesce(to_jsonb(cr.object_value),case when cr.object_feature_key is null then null else to_jsonb(cr.object_feature_key) end),
       jsonb_strip_nulls(jsonb_build_object('start',cr.time_scope_start,'end',cr.time_scope_end,'unknown',cr.time_scope_unknown)),
       jsonb_strip_nulls(jsonb_build_object('spatial_scope',cr.spatial_scope,'slice_id',cr.slice_id)),coalesce(cr.expression_rule,'{}'::jsonb),
       case when cr.review_status in ('human_reviewed','adjudicated','runtime_eligible','published') then 'adjudicated'::control.maturity_status else 'candidate'::control.maturity_status end,cr.created_at
from public.cultural_relation_claims cr
where cr.object_feature_key is not null or cr.object_value is not null
on conflict (relation_claim_id) do nothing;

insert into world.changes(change_id,subject_entity_id,change_type,before_state,after_state,time_scope,expression_rule,maturity,created_at)
select hc.change_id,coalesce(hf.entity_id,hf.feature_id),hc.change_status::text,
       case when hc.from_state is null then null else to_jsonb(hc.from_state) end,case when hc.to_state is null then null else to_jsonb(hc.to_state) end,
       jsonb_strip_nulls(jsonb_build_object('time_hint',hc.time_hint,'slice_id',hc.slice_id)),jsonb_build_object('change_epistemic',hc.change_epistemic,'note',hc.note),
       case when hc.review_status='human_reviewed' then 'adjudicated'::control.maturity_status else 'candidate'::control.maturity_status end,hc.created_at
from public.historical_change_records hc join public.historical_features hf on hf.feature_id=hc.feature_id
on conflict (change_id) do nothing;

insert into world.historical_space_claims(historical_space_claim_id,subject_entity_id,claim_type,geometry_claim,time_scope,precision,uncertainty,expression_rule,maturity,created_at)
select hf.feature_id,coalesce(hf.entity_id,hf.feature_id),'historical_feature',
       jsonb_build_object('geometry_type',hf.geometry_type::text,'geometry_note',hf.geometry_note,
         'anchors',coalesce((select jsonb_agg(jsonb_build_object('anchor_id',a.anchor_id,'kind',a.anchor_kind,'spatial_status',a.spatial_status::text,'geometry_type',a.geometry_type::text,'coord_system',a.coord_system,'lat',a.lat,'lng',a.lng,'precision_scope',a.precision_scope,'source_label',a.source_label,'source_locator',a.source_locator,'evidence_id',a.evidence_id,'historical_position_proof',a.historical_position_proof)) from public.historical_feature_anchors a where a.feature_id=hf.feature_id),'[]'::jsonb)),
       jsonb_strip_nulls(jsonb_build_object('start',hf.attested_time_start,'end',hf.attested_time_end,'label',hf.attested_time_label)),
       jsonb_build_object('historical_position_status',hf.historical_position_status::text,'current_position_status',hf.current_position_status::text),
       jsonb_build_object('uncertainty_note',hf.uncertainty_note,'confidence',hf.confidence),
       jsonb_build_object('name_continuity_status',hf.name_continuity_status,'change_status',hf.change_status::text,'current_survival_or_site',hf.current_survival_or_site),
       case when hf.review_status='human_reviewed' then 'adjudicated'::control.maturity_status else 'candidate'::control.maturity_status end,hf.created_at
from public.historical_features hf
on conflict (historical_space_claim_id) do nothing;

insert into world.visual_objects(visual_object_id,source_id,subject_entity_id,visual_type,asset_ref,time_scope,correspondence_claim,maturity)
select va.asset_id,va.source_id,(select vel.entity_id from public.visual_entity_links vel where vel.asset_id=va.asset_id and vel.entity_id is not null and vel.link_status='confirmed' order by vel.created_at limit 1),
       va.asset_type,va.file_path,jsonb_strip_nulls(jsonb_build_object('created_date',va.created_date,'depicted_period',va.depicted_period)),
       coalesce((select jsonb_agg(jsonb_build_object('link_id',vel.link_id,'entity_id',vel.entity_id,'label',vel.depicted_entity_label,'status',vel.link_status,'evidence_id',vel.link_evidence_id)) from public.visual_entity_links vel where vel.asset_id=va.asset_id),'[]'::jsonb),
       case when va.eligibility_status='gate_passed' then 'adjudicated'::control.maturity_status when va.eligibility_status in ('gate_failed','excluded') then 'rejected'::control.maturity_status else 'candidate'::control.maturity_status end
from public.visual_assets va join source.sources s on s.source_id=va.source_id
on conflict (visual_object_id) do nothing;

insert into world.claim_evidence_links(claim_object_type,claim_object_id,evidence_id,support_type,note)
select 'relation_claim',claim_id,evidence_id,case when support_type in ('supports','contradicts','contextualizes') then support_type else 'supports' end,'legacy claim_evidence'
from public.claim_evidence ce where exists(select 1 from world.relation_claims r where r.relation_claim_id=ce.claim_id) and exists(select 1 from evidence.material_evidence e where e.evidence_id=ce.evidence_id)
on conflict do nothing;

insert into meaning.findings(finding_id,finding_type,human_question,interpretive_statement,understanding_delta,supporting_world_objects,counter_view_or_alternative,missing_evidence,uncertainty,expression_rule,discovery_method,ranking_components,maturity,created_at)
select meaning_id,'legacy_meaning_candidate',null,interpretive_text,null,to_jsonb(derived_from_claim_ids),'[]'::jsonb,'[]'::jsonb,jsonb_build_object('legacy_epistemic_status',epistemic_status),expression_rule,jsonb_build_object('legacy_table','cultural_meaning_candidates'),'{}'::jsonb,
       case when review_status in ('human_reviewed','adjudicated','runtime_eligible','published') then 'adjudicated'::control.maturity_status else 'candidate'::control.maturity_status end,created_at
from public.cultural_meaning_candidates
on conflict (finding_id) do nothing;

insert into meaning.findings(finding_id,finding_type,human_question,interpretive_statement,understanding_delta,supporting_world_objects,counter_view_or_alternative,missing_evidence,uncertainty,expression_rule,discovery_method,ranking_components,maturity,created_at)
select discovery_id,'legacy_discovery_candidate',relevance_question,relationship_change,humanistic_why,objects,'[]'::jsonb,unresolved_evidence,jsonb_build_object('legacy_epistemic_status',epistemic_status),'{}'::jsonb,jsonb_build_object('generated_by',generated_by),'{}'::jsonb,'candidate',created_at
from public.discovery_candidates
on conflict (finding_id) do nothing;

insert into meaning.present_connections(present_connection_id,connection_type,observed_state,basis_world_objects,open_questions,expression_rule,created_at)
select present_id,connection_type,observed_state,to_jsonb(basis_claim_ids),to_jsonb(open_questions),expression_rule,created_at
from public.cultural_present_connections
on conflict (present_connection_id) do nothing;

insert into read_model.discovery_paths(discovery_path_id,path_key,steps,generated_at)
select kp.path_id,kp.path_code,coalesce((select jsonb_agg(jsonb_build_object('step_no',ks.step_no,'step_kind',ks.step_kind,'ref_id',ks.ref_id,'label',ks.label,'epistemic_status',ks.epistemic_status,'evidence_ids',ks.evidence_ids) order by ks.step_no) from public.knowledge_path_steps ks where ks.path_id=kp.path_id),'[]'::jsonb),kp.created_at
from public.knowledge_paths kp
on conflict (discovery_path_id) do nothing;

insert into read_model.evidence_pointers(evidence_id,source_id,display_locator,display_excerpt)
select evidence_id,source_id,locator,literal_reading from evidence.material_evidence
on conflict (evidence_id,source_id) do nothing;

insert into control.legacy_gate_audits(legacy_audit_id,old_gate_code,old_result,object_type,object_id,reason,actor_type,created_at)
select audit_id,gate_code,result,object_type,object_id,reason,actor_type,created_at from public.evidence_gate_audit
on conflict (legacy_audit_id) do nothing;

insert into control.legacy_runs(legacy_run_key,legacy_table,legacy_run_id,payload)
select 'ingest_runs:'||ingest_run_id::text,'ingest_runs',ingest_run_id::text,to_jsonb(ir) from public.ingest_runs ir on conflict do nothing;
insert into control.legacy_runs(legacy_run_key,legacy_table,legacy_run_id,payload)
select 'research_run:'||run_id::text,'research_run',run_id::text,to_jsonb(rr) from public.research_run rr on conflict do nothing;
insert into control.legacy_reviews(legacy_review_key,legacy_table,legacy_object_id,payload)
select 'human_review_decisions:'||decision_id::text,'human_review_decisions',object_ref,to_jsonb(hr) from public.human_review_decisions hr on conflict do nothing;
insert into control.legacy_reviews(legacy_review_key,legacy_table,legacy_object_id,payload)
select 'review_queue:'||review_id::text,'review_queue',object_id,to_jsonb(rq) from public.review_queue rq on conflict do nothing;

do $$ begin
  if exists(select 1 from control.gate_audits) then raise exception 'LEGACY_BACKFILL_MUST_NOT_CREATE_NEW_GATE_PASS'; end if;
end $$;
commit;
