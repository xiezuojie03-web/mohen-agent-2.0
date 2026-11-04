import {createWorkQualificationReader,getNodePgPool} from '@mohen/data-access';
import {consumerContext} from './kad1-policy.mjs';
export type WorkPublicationG5Result =
 | {ok:true}
 | {ok:false;reason:'independent_g5_required'};
type Consumer='watch'|'visual_stage'|'agent'|'evidence_on_demand';
/** Publication requires WATCH's own current display qualification in addition
 * to the separate editorial review. No default purpose/scope, legacy fallback
 * or automatic Gate signing. Production configuration stays independently HOLD.
 */
export async function requireIndependentWorkPublicationG5(workId:string,revisionId:string,content:Record<string,unknown>):Promise<WorkPublicationG5Result>{
 return requireCurrentWorkConsumerQualification(workId,revisionId,'watch',content);
}
export async function requireCurrentWorkConsumerQualification(workId:string,revisionId:string,consumer:Consumer,content:Record<string,unknown>):Promise<WorkPublicationG5Result>{
 const context=consumerContext(consumer);
 if(!context)return {ok:false,reason:'independent_g5_required'};
 try {
 const ok=await createWorkQualificationReader(getNodePgPool()).check(workId,revisionId,{...context,consumer},content);
 return ok?{ok:true}:{ok:false,reason:'independent_g5_required'};
 }catch{return {ok:false,reason:'independent_g5_required'};}
}
