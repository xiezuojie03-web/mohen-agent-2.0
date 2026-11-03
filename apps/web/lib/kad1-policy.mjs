// KAD1 design target. Pure policy; no credentials, network, DB writes or Gate signing.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS=new Set(['world_projection','agent_context','story_seed','discovery_path','map_timeline_projection','evidence_pointer']);
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const purpose=x=>object(x)&&['namespace','code','version'].every(k=>typeof x[k]==='string'&&x[k].length>0);
export function consumerContext(consumer,raw=process.env.MOHEN_G5_CONTEXTS){
 if(!['visual_stage','agent'].includes(consumer)||!raw)return null;
 try{const x=JSON.parse(raw)[consumer];return object(x)&&purpose(x.purpose)&&object(x.scope)&&Object.keys(x.scope).length?{purpose:x.purpose,scope:x.scope}:null;}catch{return null;}
}
export function qualificationRefs(content,context,consumer){
 const refs=content?.qualification_refs;if(!Array.isArray(refs)||!refs.length||!context)return null;
 for(const x of refs){const a=x?.artifact_ref;
  if(!object(x)||!UUID.test(x.qualification_ref)||!object(a)||!KINDS.has(a.type)||!UUID.test(a.id)||typeof a.revision!=='string'||!a.revision||x.consumer!==consumer||!purpose(x.purpose)||!object(x.scope))return null;
  if(['namespace','code','version'].some(k=>x.purpose[k]!==context.purpose[k]))return null;
  if(Object.entries(context.scope).some(([k,v])=>JSON.stringify(x.scope[k])!==JSON.stringify(v)))return null;
 }
 return refs;
}
export function mediaPermitted(content,refs,now=Date.now()){
 if(!object(content))return false;const media=content.media??[];if(!Array.isArray(media))return false;
 if(!media.length)return content.rights_acknowledged===true;
 return media.every(m=>object(m)&&typeof m.license==='string'&&!!m.license.trim()&&m.rights_status==='cleared'&&object(m.artifact_ref)
  &&refs.some(r=>['type','id','revision'].every(k=>r.artifact_ref[k]===m.artifact_ref[k]))
  &&(m.valid_until===undefined||(Number.isFinite(Date.parse(m.valid_until))&&Date.parse(m.valid_until)>now)));
}
export function savedPanel(content,panel){
 if(!['storyStructure','visualStyle','voiceover','soundtrack'].includes(panel))return null;
 return object(content?.panels)&&Object.hasOwn(content.panels,panel)?content.panels[panel]:null;
}
export function revisionNumber(v){if(typeof v!=='string'||!/^\d+$/.test(v))return null;const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null;}
export const validPlayhead=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function qualifiedContentSql(alias,consumer){
 if(!['r'].includes(alias)||!['agent','visual_stage'].includes(consumer))throw new Error('INVALID_SQL_CONTEXT');
 return `jsonb_typeof(${alias}.content->'qualification_refs')='array'
 and jsonb_array_length(case when jsonb_typeof(${alias}.content->'qualification_refs')='array' then ${alias}.content->'qualification_refs' else '[]'::jsonb end)>0
 and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(${alias}.content->'qualification_refs')='array' then ${alias}.content->'qualification_refs' else '[]'::jsonb end) qr
 where not exists(select 1 from control.gate_audits g
 where g.gate_code='G5' and g.gate_audit_id::text=qr->>'qualification_ref'
 and g.object_type=qr->'artifact_ref'->>'type' and g.object_id::text=qr->'artifact_ref'->>'id'
 and g.artifact_revision=qr->'artifact_ref'->>'revision'
 and qr->>'consumer'='${consumer}'
 and g.purpose_namespace=:'purpose_namespace' and g.purpose_code=:'purpose_code' and g.purpose_version=:'purpose_version'
 and control.qualification_allows(g.gate_audit_id,'${consumer}',:'purpose_namespace',:'purpose_code',:'purpose_version',:'allowed_scope'::jsonb)))`;
}
export const contextParams=c=>({purpose_namespace:c.purpose.namespace,purpose_code:c.purpose.code,purpose_version:c.purpose.version,allowed_scope:JSON.stringify(c.scope)});
