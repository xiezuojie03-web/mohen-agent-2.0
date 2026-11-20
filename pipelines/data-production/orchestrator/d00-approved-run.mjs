import {executionDigest} from './execution-authority.mjs';
import {buildSourceIntakeInput} from './orchestrator.mjs';
import {readMethodPlanArg} from '../../../tools/lib/method-plan-input.mjs';

export function resolveD00ApprovedRun(config,input){
 if(config===undefined)return null;
 let approval;
 try{approval=JSON.parse(config);}catch{throw Error('D00_APPROVED_RUN_CONFIG_INVALID');}
 if(typeof approval?.runId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(approval.runId)||
  typeof approval.inputDigest!=='string'||!/^[a-f0-9]{64}$/.test(approval.inputDigest)){
  throw Error('D00_APPROVED_RUN_CONFIG_INVALID');
 }
 const consumer_method_plan=readMethodPlanArg(JSON.stringify(input.consumer_method_plan));
 if(executionDigest(buildSourceIntakeInput({...input,consumer_method_plan}))!==approval.inputDigest)throw Error('D00_APPROVED_RUN_INPUT_MISMATCH');
 return approval.runId;
}
