export interface CloudProductionInput {run_id:string;research_intent:string;scope:Record<string,unknown>;consumer_method_plan:{methods:Array<{method_id:string;method_version:string}>};owner_session_token:string;to_stage?:'D00'|'D02';}
export interface CloudProductionResult {run_id:string;status:string;stage:string;reason_code:string|null;}
export function createCloudProductionDispatch(options?:{url?:string;credential?:string;protectionBypass?:string;fetchImpl?:typeof fetch;now?:()=>number;timeoutMs?:number}):(input:CloudProductionInput)=>Promise<CloudProductionResult>;

export function createCloudProductionAuthenticator(options?:{credential?:string;now?:()=>number}):(request:Request)=>Promise<CloudProductionInput|Response>;

export function cloudProductionEndStage(input: Pick<CloudProductionInput, 'to_stage'>): 'D00' | 'D02';
