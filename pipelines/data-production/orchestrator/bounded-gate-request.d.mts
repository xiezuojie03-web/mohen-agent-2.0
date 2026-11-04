/** One deadline and byte ceiling for a JSON request stream. */
export declare function readBoundedGateJson(request:Request,options:{maxBytes:number;timeoutMs?:number}):Promise<unknown>;
