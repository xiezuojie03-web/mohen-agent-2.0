// M3 single qualification context for Producer-stage and consumer-scoped reads.
// The caller's "PASS" or current_valid flag alone never grants knowledge usage.
const CONSUMERS = new Set(['producer','watch','visual_stage','agent','evidence_on_demand']);
export function requireQualifiedReadContext(context) {
  const purpose=context?.purpose;
  const field=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128;
  const scope=context?.scope;
  if(!CONSUMERS.has(context?.consumer)||
    !field(purpose?.namespace)||!field(purpose?.code)||!field(purpose?.version)||
    !scope||typeof scope!=='object'||Array.isArray(scope)||Object.keys(scope).length===0) {
    throw Error('QUALIFICATION_CONTEXT_REQUIRED');
  }
  let encoded;
  try {encoded=JSON.stringify(scope);}catch {throw Error('QUALIFICATION_CONTEXT_REQUIRED');}
  if(typeof encoded!=='string'||encoded.length>4096)throw Error('QUALIFICATION_CONTEXT_REQUIRED');
  return [context.consumer,purpose.namespace,purpose.code,purpose.version,encoded];
}
