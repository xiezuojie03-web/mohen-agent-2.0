import type {Buffer} from 'node:buffer';

export interface StudioReceiveSource {
 original_id:string;source_version_id:string;raw_item_id:string;raw_sha256:string;
}
export interface StudioReceiveCandidateRef {
 schema:'mohen.studio-stage-candidate-ref.v1';run_id:string;stage:'D00'|'D01'|'D02'|'D03'|'D04'|'D05';
 job_id:string;reviewer_binding_ref:string;consumer:'producer';object_type:string;object_id:string;
 artifact_revision:string;input_digest:string;output_digest:string;
}
export interface StudioReceiveContext {
 actor_id:string;project_id:string;consumer:'producer';purpose:{namespace:string;code:string;version:string};
 scope:Record<string,unknown>;policy_version:string;profile_version:string;token?:string;
}
export interface StudioReceiveItem {
 schema:'mohen.studio-receive-item.v1';candidate_ref:StudioReceiveCandidateRef;source:StudioReceiveSource;
 provenance:{kind:'tool_candidate';provider:string;engine_version:string};
 extent:{kind:'utf8_byte_range/v1';start_byte:number;end_byte:number;quote_sha256:string};
 original_quote:string;transcription_candidate:null|{kind:'transcription_candidate';text:string};
 interpretation:null|{kind:'interpretation';text:string};operation:'internal_candidate_read'|'thirdparty_transfer';
 transfer_target?:{provider:string;purpose:string};
}
export interface StudioReceiveInput {
 delegation:{delegation_id:string;request_hash:string;provider:string;engine_version:string;expires_at:string;
  requester:string;project_id:string;policy_version:string;allowed_actions:string[];
  input_manifest:{source_refs:StudioReceiveSource[];[key:string]:unknown};[key:string]:unknown};
 receipt:{receipt_id:string;delegation_id:string;request_hash:string;actual_provider:string;actual_engine_version:string;
  candidate_refs:StudioReceiveCandidateRef[];[key:string]:unknown};
 items:StudioReceiveItem[];
}
export interface StudioReceiveCheckRequest extends Omit<StudioReceiveContext,'token'> {
 check:'source'|'rights'|'lineage'|'semantics';delegation_id:string;receipt_id:string;delegation_request_hash:string;
 source:StudioReceiveSource;operation:StudioReceiveItem['operation'];transfer_target:StudioReceiveItem['transfer_target']|null;
 candidate_ref:StudioReceiveCandidateRef;item_fingerprint:string;request_fingerprint:string;
}
interface CurrentEvidence {
 request_fingerprint:string;decision_id:string;current:boolean;valid_until:string;
}
export interface StudioReceiveSourceEvidence extends CurrentEvidence {
 schema:'mohen.studio-source-current.v1';matches:boolean;
}
export interface StudioReceiveRightsEvidence extends CurrentEvidence {
 schema:'mohen.studio-rights-current.v1';decision:'ALLOW'|'DENY'|'UNKNOWN';explicit_transfer:boolean;
}
export interface StudioReceiveLineageEvidence extends CurrentEvidence {
 schema:'mohen.studio-lineage-current.v1';family_id:string;lineage_refs:StudioReceiveSource[];
}
export interface StudioReceiveSemanticEvidence extends CurrentEvidence {
 schema:'mohen.studio-semantic-current.v1';result:'PASS'|'CONFLICT'|'UNSUPPORTED';
}
export interface StudioReceiveQualificationRequest {
 run:{run_id:string};job:{job_id:string;stage:StudioReceiveCandidateRef['stage'];implementation:{gate_reviewer_binding:string}};
 stage:StudioReceiveCandidateRef['stage'];gate:string;input_digest:string;output_digest:string;
}
export interface StudioReceiveQualificationEvidence extends Omit<StudioReceiveCandidateRef,'schema'> {
 schema:'mohen.independent-gate-current-receipt.v1';gate_code:string;gate_audit_id:string;
 qualification_current:boolean;decision_origin:'independent_gate';result:string;valid_until:string;
}
type MaybeAsync<T>=T|Promise<T>;
type Check<T>=(request:StudioReceiveCheckRequest,context:StudioReceiveContext)=>MaybeAsync<T|null|undefined>;
export interface StudioCandidateReceiverDependencies {
 readOriginal?:(originalId:string,context:StudioReceiveContext)=>MaybeAsync<{
  record:{original_id:string;project_id:string;state:string;content_type:string;byte_size:number;sha256:string;[key:string]:unknown};bytes:Buffer;
 }|null|undefined>;
 verifySource?:Check<StudioReceiveSourceEvidence>;checkRights?:Check<StudioReceiveRightsEvidence>;
 resolveLineage?:Check<StudioReceiveLineageEvidence>;verifySemantics?:Check<StudioReceiveSemanticEvidence>;
 verifyCurrent?:(request:StudioReceiveQualificationRequest,context:StudioReceiveContext)=>MaybeAsync<StudioReceiveQualificationEvidence|null|undefined>;
 timeoutMs?:number;
}
export interface StudioReceiveResult {
 schema:'mohen.studio-receive-candidate-result.v1';receipt_id:string|null;state:'HOLD';
 execution_authorized:false;knowledge_use_authorized:false;input_fingerprint:string;request_fingerprint:string;
 result_fingerprint:string;independent_family_count:number;
 items:Array<{index:number;state:'accept'|'quarantine'|'reject'|'request_stage'|'hold';
  acceptance:'ACCEPT_AS_CANDIDATE'|null;knowledge_use_authorized:false;code:string;item_fingerprint:string;
  checks:Record<'T1'|'T2'|'T3'|'T4'|'T5'|'T6'|'T7',string>;source_family_id?:string;
  evidence_refs:Partial<Record<'T1'|'T3'|'T5'|'T6',{decision_id:string;request_fingerprint:string;valid_until:string}>>&
   {T7?:{gate_audit_id:string;valid_until:string}};
 }>;
}
/** Server constructed dependencies only. Candidate acceptance never grants knowledge use. */
export function createStudioCandidateReceiver(dependencies?:StudioCandidateReceiverDependencies):{
 receive(input:StudioReceiveInput,context:StudioReceiveContext):Promise<StudioReceiveResult>;
};
