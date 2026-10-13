
export function makeStageAdapters() {
  return {
    D01: async () => ({disposition:"PASS",output:[{source_id:"s1",title:"Fixture Source"}],gate_evidence:{checks:["source_identity","provenance"]},content_stats:{sources:1},review_records:[{source_id:"s1"}]}),
    D02: async ({ input }) => ({disposition:"PASS",output:[{evidence_id:"e1",source_id:input[0].source_id,literal_reading:"Fixture excerpt"}],gate_evidence:{checks:["locator","literal_reading","source_voice"]},content_stats:{evidence_units:1},review_records:[{evidence_id:"e1"}]}),
    D03: async ({ input }) => ({disposition:"PASS",output:[{object_ref:"event:w1",event_id:"w1",canonical_label:"Fixture Event",evidence_ids:[input[0].evidence_id]}],gate_evidence:{checks:["identity","time","space","claim_evidence"]},content_stats:{world_objects:1},review_records:[{object_ref:"event:w1"}]}),
    D04: async () => ({disposition:"PASS",output:[{finding_id:"f1",human_question:"What changed?",interpretive_statement:"Fixture interpretation",understanding_delta:"Fixture delta",world_refs:[{type:"event",id:"w1"}]}],gate_evidence:{checks:["firewall","counter_view","understanding_delta"]},content_stats:{findings:1},review_records:[{finding_id:"f1"}]}),
    D05: async ({ input }) => ({disposition:"PASS",output:[{story_seed_id:"story1",evidence_pointer_id:"p1",derived_from_finding_ids:[input[0].finding_id]}],gate_evidence:{checks:["lineage","evidence_pointer","runtime_eligibility"]},content_stats:{read_models:1},review_records:[{story_seed_id:"story1"}]}),
  };
}
export function makeLineageRepo() {
  return {
    getEvidencePointer: async () => ({evidence_pointer_id:"p1",finding_ids:["f1"]}),
    getFinding: async () => ({finding_id:"f1",world_refs:[{type:"event",id:"w1"}]}),
    getWorldObject: async () => ({object_ref:"event:w1",evidence_ids:["e1"]}),
    getEvidence: async () => ({evidence_id:"e1",source_id:"s1"}),
    getSource: async () => ({source_id:"s1",title:"Fixture Source"}),
  };
}
