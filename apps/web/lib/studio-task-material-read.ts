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
