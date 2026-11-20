import type {CloudProductionInput} from './cloud-production-dispatch.mjs';
export function cloudProductionInputDigest(input:CloudProductionInput):string;

export function probeCloudProductionRunner(options:{projectRoot:string;environment?:NodeJS.ProcessEnv}):Promise<{ok:boolean;reason:string}>;
