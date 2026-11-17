export interface CloudExecutionReadiness {
  schema:'mohen.cloud-execution-readiness.v1';
  configuration_ready:boolean;
  runtime_verified:false;
  gate_qualification:'NOT_VERIFIED';
  machine_variable_presence:Record<
    'MOHEN_PRODUCER_DATABASE_URL'|'MOHEN_PRODUCER_DATABASE_PASSWORD'|
    'MOHEN_PRIVATE_WORKER_DATABASE_URL'|'MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD',boolean>;
  components:Array<{id:string;reason_code:string;status:'MISSING'|'INVALID'|'CONFIGURED';missing_keys:string[]}>;
}
export function cloudExecutionReadiness(environment?:NodeJS.ProcessEnv):CloudExecutionReadiness;
export function assertCloudExecutionConfiguration(environment:NodeJS.ProcessEnv):void;
