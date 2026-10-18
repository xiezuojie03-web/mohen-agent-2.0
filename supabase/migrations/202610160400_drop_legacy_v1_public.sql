-- 授权 X：退役第一代 public schema（37 张表 + 1 个视图 effective_visual_assets）
-- 前置备份：D:\MoHen\backups\ARCH-MIG-01_M2_drop37_20261016\public_schema_pre_drop.sql（86,223,101 字节）
-- 依赖核验：跨 schema 仅 pg_toast（随父表自动删），第二代 6 schema 无依赖。
BEGIN;

DROP VIEW IF EXISTS public.effective_visual_assets CASCADE;

DROP TABLE IF EXISTS
  public.claim_evidence,
  public.claims,
  public.cultural_conflicts,
  public.cultural_events,
  public.cultural_meaning_candidates,
  public.cultural_present_connections,
  public.cultural_relation_claims,
  public.discovery_candidates,
  public.entities,
  public.evidence,
  public.evidence_fragments,
  public.evidence_gate_audit,
  public.historical_change_records,
  public.historical_feature_anchors,
  public.historical_features,
  public.historical_spatial_relations,
  public.historical_spatial_slices,
  public.human_review_decisions,
  public.ingest_runs,
  public.knowledge_path_steps,
  public.knowledge_paths,
  public.legacy_mappings,
  public.relation_evidence,
  public.relations,
  public.research_association_candidate,
  public.research_bridge_draft,
  public.research_mention,
  public.research_observation,
  public.research_run,
  public.research_signal,
  public.research_source_dependency,
  public.research_source_inventory,
  public.research_task,
  public.review_queue,
  public.source_records,
  public.visual_assets,
  public.visual_entity_links
CASCADE;

COMMIT;
