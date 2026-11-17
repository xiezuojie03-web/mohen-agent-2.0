export interface StudioKnowledgeRouting {
  schema:"mohen.studio-knowledge-routing.v1";
  disposition:"HOLD"|"REUSE_QUALIFIED"|"QUALIFICATION_REQUIRED"|"SOURCE_GAP_CONFIRMED"|"SOURCE_GAP_UNCONFIRMED";
  next_action:string;
  reason:string;
  coverage:{
    qualified_l5:number;project_l0:number;project_l1_read_units:number;
    project_l2_links:number;project_asset_candidates:number;blocked_asset_candidates:number;
    shared_l0_l4_coverage:"VERIFIED_COMPLETE"|"NOT_VERIFIED";
  };
  should_discover_sources:boolean;
  may_reuse_l5:boolean;
  may_use_project_candidates_as_facts:false;
  production_started:false;
  gate_signed:false;
  external_processing_allowed:false;
}
export function planStudioKnowledgeRoute(options?:{
  qualifiedL5?:Array<{id:string;epistemic:string}>;
  projectSnapshot?:Record<string,unknown>|null;
  lookupDegraded?:boolean;
  sharedL0L4CoverageComplete?:boolean;
}):StudioKnowledgeRouting;
