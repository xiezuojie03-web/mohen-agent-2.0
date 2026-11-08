// Read-only MHKA WorkRevision -> exact L5/current G5 bridge. No signing,
// copying knowledge bodies, editorial approval or author-supplied permission.
import {createHash} from 'node:crypto';
import {requireQualifiedReadContext} from './qualification-read-context.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const KINDS=new Set(['world_projection','agent_context','story_seed','discovery_path','map_timeline_projection','evidence_pointer']);
// 消费方 → 规范动作（CP2-A 词典；旧写法 read 已归并为 access_view）。
const ACTIONS=Object.freeze({watch:'display',visual_stage:'display',agent:'access_view',evidence_on_demand:'quote'});
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':object(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export const workContentDigest=content=>createHash('sha256').update(canonical(content)).digest('hex');
export function createWorkQualificationReader(db){
 if(!db||typeof db.query!=='function')throw Error('DB_QUERY_INTERFACE_REQUIRED');
 return {async check(workId,revisionId,context,content){
  try{
   requireQualifiedReadContext(context);
   const action=ACTIONS[context.consumer];
   if(!action||!UUID.test(workId)||!UUID.test(revisionId)||!object(content))return false;
   // Freeze every caller-owned input before the first await.
   const snapshot=JSON.parse(JSON.stringify(content));
   const purpose=JSON.parse(JSON.stringify(context.purpose)),scope=JSON.parse(JSON.stringify(context.scope)),consumer=context.consumer;
   // Editable qualification_refs are provenance hints only. The authoritative
   // artifact mapping is the current G5 audit carrying the signed binding.
   // This also avoids a circular hash of a not-yet-issued audit UUID.
   const media=snapshot.media??[];
   if(!Array.isArray(media)||(!media.length&&snapshot.rights_acknowledged!==true))return false;
   if(media.some(m=>!object(m)||m.rights_status!=='cleared'||typeof m.license!=='string'||!m.license.trim()||
    (m.valid_until!==undefined&&!(Date.parse(m.valid_until)>Date.now()))))return false;
   // The binding belongs to the independent signed receipt, never to editable
   // content. Its digest covers the entire persisted work, including references
   // and media. The G5 receipt must attest this same complete work/action.
   const binding={schema:'mohen.work-revision-g5-binding.v1',work_id:workId.toLowerCase(),revision_id:revisionId.toLowerCase(),
    content_sha256:workContentDigest(snapshot),complete_work:true,consumer,purpose,scope,rights_by_action:{[action]:'allowed'}};
   const {rows}=await db.query(`select r.revision_id from publication.work_revisions r
    where r.work_id=$1::uuid and r.revision_id=$2::uuid and r.content=$3::jsonb
    and exists(select 1 from control.gate_audits g join control.qualification_current q on q.gate_audit_id=g.gate_audit_id
     join control.gate_policy_versions policy on policy.gate_code=g.gate_code and policy.rule_version=g.rule_version
     where g.gate_code='G5' and g.object_type=any($4::text[])
      and g.decision_origin='independent_gate'
      and policy.required_checks @> array['work_revision_binding','rights_by_operation']::text[]
      and g.details->'checks' @> '{"work_revision_binding":true,"rights_by_operation":true}'::jsonb
      and g.details->'work_revision_binding'->>'title'=r.title
      and g.details->'work_revision_binding'->>'description'=r.description
      and g.details->'work_revision_binding'->'scope'=$10::jsonb
      and g.details->'work_revision_binding' @> $5::jsonb
      and (g.details->'work_revision_binding'->>'rights_valid_until')::timestamptz>statement_timestamp()
      and control.qualification_allows(g.gate_audit_id,$6,$7,$8,$9,$10::jsonb))`,
    [workId,revisionId,JSON.stringify(snapshot),[...KINDS],JSON.stringify(binding),consumer,purpose.namespace,purpose.code,purpose.version,JSON.stringify(scope)]);
   return rows.length===1;
  }catch{return false;}
 }};
}
