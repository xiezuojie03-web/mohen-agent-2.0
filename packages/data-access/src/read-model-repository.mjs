import {requireQualifiedReadContext} from './qualification-read-context.mjs';
const MODELS = Object.freeze({
 world_projection:['read_model.world_projections','projection_id'],
 agent_context:['read_model.agent_contexts','agent_context_id'],
 story_seed:['read_model.story_seeds','story_seed_id'],
 discovery_path:['read_model.discovery_paths','discovery_path_id'],
 map_timeline_projection:['read_model.map_timeline_projections','map_timeline_projection_id'],
 evidence_pointer:['read_model.evidence_pointers','evidence_pointer_id'],
});
export const CONSUMERS=Object.freeze(['visual_stage','agent','evidence_on_demand']);
export function assertConsumer(consumer) {
 if(!CONSUMERS.includes(consumer)) throw new Error('QUALIFICATION_CONTEXT_REQUIRED');
 return true;
}
export function assertQualificationContext(options) {
 assertConsumer(options?.consumer);
 // A missing or {} scope is not a restriction. Refuse global reads whose
 // caller has not specified an actual qualification context.
 requireQualifiedReadContext(options);
 return options;
}
export function createReadModelRepository(db) {
 if(!db || typeof db.query!=='function') throw new Error('DB_QUERY_INTERFACE_REQUIRED');
 async function read(kind,id,options) {
  const model=MODELS[kind];if(!model)throw new Error(`UNKNOWN_READ_MODEL_KIND:${kind}`);
  const {consumer,purpose,scope}=assertQualificationContext(options);
  const [table,key]=model;
  const params=[kind,consumer,purpose.namespace,purpose.code,purpose.version,JSON.stringify(scope)];
  if(id!==undefined)params.push(id);
  // EXISTS returns each physical immutable-content fingerprint once, even with independent facets.
  const {rows}=await db.query(`select t.* from ${table} t where exists (
   select 1 from control.qualification_current q join control.gate_audits g on g.gate_audit_id=q.gate_audit_id
   where q.gate_code='G5' and q.object_type=$1 and q.object_id=t.${key}
    and control.qualification_allows(g.gate_audit_id,$2,$3,$4,$5,$6::jsonb)
  )${id===undefined?'':` and t.${key}=$7 limit 1`}`,params);
  return rows;
 }
 return {
  listRuntimeEligible(kind,options) {return read(kind,undefined,options);},
  async getRuntimeEligible(kind,id,options) {return (await read(kind,id,options))[0]??null;},
 };
}
