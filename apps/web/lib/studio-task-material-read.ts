import type {Material} from '@mohen/agent-runtime';
type Obj=Record<string,unknown>;
const object=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};

/** A checkpoint is recovery evidence, never a current material read grant.
 * Preserve operational fields; withhold all dependent prose on any failed read.
 */
export async function currentTaskCheckpoint(checkpoint:Obj,sessionToken?:string):Promise<Obj>{
  const decision=object(checkpoint.decision);
  const materials=Array.isArray(decision.materials)?decision.materials as Material[]:[];
  const hasPartial=checkpoint.partial_result!=null;
  if(!materials.length&&!hasPartial&&checkpoint.decision==null)return checkpoint;
  // An unfinished partial decision is never a current material grant.
  if(hasPartial)return {...checkpoint,decision:null,researchLeads:[],partial_result:null,
    materialRead:{state:'HOLD',reason:'UNREVALIDATED_RESEARCH_RESULT'}};
  let reason='CURRENT_MATERIAL_AUTHORITY_UNAVAILABLE';
  try{
    let privateMaterials:Material[]|undefined;
    const current:Material[]=[];
    for(const saved of materials){
      if(!saved||typeof saved.id!=='string'||typeof saved.snippet!=='string'||!saved.snippet.trim())
        throw new Error('INVALID_MATERIAL_REFERENCE');
      let candidates:Material[];
      if(/^(studio:|private-evidence:|private-read-unit:)/.test(saved.id)){
        const projectId=object(checkpoint.studio).project_id;
        if(!sessionToken||typeof projectId!=='string')throw new Error('PROJECT_READ_CONTEXT_REQUIRED');
        if(!privateMaterials){
          const {readStudioResearchProject}=await import('./studio-research-read');
          privateMaterials=(await readStudioResearchProject(projectId,sessionToken,{persistReadingNotes:false})).materials;
        }
        candidates=privateMaterials;
      }else if(/^(formal:)/.test(saved.id)){
        // 正式层材料按精确资格复检：材料 id 自带 layer/object/revision，
        // 重验该对象当前是否仍有 agent 用途的合格审计（与签发时同一判据）。
        const parsed=/^formal:(L[0-4]):([0-9a-f-]{36})@([0-9a-f]{64})$/i.exec(saved.id);
        if(!parsed)throw new Error('INVALID_MATERIAL_REFERENCE');
        const layerMap:Record<string,[string,string]>={
          L0:['G0','source'],L1:['G1','read_run'],L2:['G2','material_evidence'],
          L3:['G3','relation_claim'],L4:['G4','finding'],
        };
        const [gate,objectType]=layerMap[parsed[1]]??[];
        if(!gate||!objectType)throw new Error('INVALID_MATERIAL_REFERENCE');
        const {consumerContext}=await import('./kad1-policy.mjs');
        const context=consumerContext('agent');
        if(!context||context.scope.requested_action!=='read')throw new Error('QUALIFICATION_CONTEXT_REQUIRED');
        const projectId=object(checkpoint.studio).project_id;
        const {queryRows}=await import('@mohen/data-access');
        const rows=await queryRows(
          `select 1 from control.gate_audits g
            where g.gate_code=:'gate' and g.object_type=:'objectType' and g.object_id=:'objectId'::uuid
              and g.artifact_revision=:'revision' and g.result='PASS' and g.current_valid
              and (g.valid_until is null or g.valid_until>now())
              and control.qualification_allows(g.gate_audit_id,'agent',:'ns',:'code',:'ver',:'scope'::jsonb)
            limit 1`,
          {gate,objectType,objectId:parsed[2],revision:parsed[3],
           ns:context.purpose.namespace,code:context.purpose.code,ver:context.purpose.version,
           scope:JSON.stringify({...context.scope,project_id:projectId})});
        if(!rows.length)throw new Error('MATERIAL_REVOKED_OR_CHANGED');
        current.push(saved);
        continue;
      }else{
        const {consumerContext}=await import('./kad1-policy.mjs');
        const context=consumerContext('agent');
        if(!context||context.scope.requested_action!=='read')throw new Error('QUALIFICATION_CONTEXT_REQUIRED');
        const {retrieveMaterials}=await import('./mohen-agent/retrieve');
        const result=await retrieveMaterials([saved.snippet],24,{qualification:{consumer:'agent',...context}});
        if(result.degraded)throw new Error('QUALIFIED_READ_UNAVAILABLE');
        candidates=result.materials;
      }
      const match=candidates.find(m=>m.id===saved.id&&m.kind===saved.kind&&m.snippet===saved.snippet&&m.sourceRef===saved.sourceRef&&m.epistemic===saved.epistemic);
      if(!match)throw new Error('MATERIAL_REVOKED_OR_CHANGED');
      current.push(match);
    }
    // Empty decisions have no verifiable material basis for their prose.
    if(!current.length)throw new Error('MATERIAL_BASIS_REQUIRED');
    // External research leads are recovered observation notes, not read grants.
    // They stay on the checkpoint for provenance but are stripped from the
    // current decision so unrevalidated lead prose can never be consumed.
    const {researchLeads:_leads,...rest}=checkpoint;
    return {...rest,decision:{...decision,materials:current},materialRead:{state:'CURRENT'}};
  }catch(error){
    if(error instanceof Error&&/^[A-Z_]+$/.test(error.message))reason=error.message;
    return {...checkpoint,decision:null,researchLeads:[],partial_result:null,materialRead:{state:'HOLD',reason}};
  }
}
