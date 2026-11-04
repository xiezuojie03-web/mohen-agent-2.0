export interface StudioExecutionState {
 delegation_id:string;version:number;state:'READY'|'LEASED'|'IN_FLIGHT'|'HOLD'|'COMPLETED'|'REVOKED';
 revoked_at:string|null;revoke_reason:string|null;lease_id:string|null;lease_owner:string|null;lease_expires_at:string|null;
 input_digest:string;policy_version:string;external_attempted:boolean;unknown_cost:boolean;
 reserved_cost:string;spent_cost:string;checkpoint_payload:Record<string,unknown>;created_at:string;updated_at:string;
}
export interface StudioExecutionBinding {delegationId:string;requestId:string;expectedVersion:number;inputDigest:string;policyVersion:string;}
export interface StudioExecutionRepository {
 getState(delegationId:string,token:string):Promise<StudioExecutionState>;
 revoke(input:{delegationId:string;requestId:string;reason:string},token:string):Promise<StudioExecutionState>;
 claim(input:StudioExecutionBinding&{ownerRef:string;leaseSeconds:number},token:string):Promise<StudioExecutionState>;
 checkpoint(input:StudioExecutionBinding&{leaseId:string;state:'HOLD'|'IN_FLIGHT'|'COMPLETED';payload:Record<string,unknown>},token:string):Promise<StudioExecutionState>;
}
export function createStudioExecutionRepository(pool: {connect:Function}):StudioExecutionRepository;
