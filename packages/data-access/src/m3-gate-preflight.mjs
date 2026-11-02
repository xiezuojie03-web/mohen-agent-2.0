// Read-only M3 activation preflight. Reports evidence; never provisions a role,
// signs a Gate, enables a policy, or reports professional acceptance.
export const GATE_CODES=Object.freeze(['G0','G1','G2','G3','G4','G5']);
const empty=()=>Object.fromEntries(GATE_CODES.map(code=>[code,{policy_versions:0,reviewer_bindings:0}]));
function yes(v){return v===true||v==='t'||v==='true';}
function count(v){const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:0;}
export async function inspectIndependentGateReadiness(query) {
 if(typeof query!=='function')throw Error('M3_READ_ONLY_QUERY_REQUIRED');
 const issues=[];
 let checks=null;
 try {
  const {rows}=await query("select to_regclass('control.gate_policy_versions') is not null as policies, to_regclass('control.gate_reviewer_bindings') is not null as reviewers, to_regprocedure('control.sign_gate_candidate(uuid,uuid,text,text,timestamp with time zone,jsonb,uuid)') is not null as signer, to_regprocedure('control.current_qualification_is_valid(uuid)') is not null as current_valid, to_regclass('control.gate_candidates') is not null as candidates");
  checks=rows?.[0]??null;
 } catch { issues.push('M3_SCHEMA_CHECK_UNAVAILABLE'); }
 const structural=['policies','reviewers','signer','current_valid','candidates'];
 for(const key of structural)if(!yes(checks?.[key]))issues.push('M3_MISSING_'+key.toUpperCase());
 let roles=[],perGate=empty();
 if(issues.length===0){
  try {
   const r=await query("select rolname,rolcanlogin,rolsuper,rolbypassrls from pg_roles where rolname in ('mohen_gate_signer','mohen_producer','mohen_app_runtime')");
   roles=r.rows??[];
   const names=new Set(roles.map(row=>row.rolname));
   for(const role of ['mohen_gate_signer','mohen_producer','mohen_app_runtime']){
    if(!names.has(role))issues.push('M3_ROLE_MISSING_'+role.toUpperCase());
   }
   if(roles.some(x=>yes(x.rolsuper)||yes(x.rolbypassrls)))issues.push('M3_UNSAFE_PRIVILEGED_ROLE');
   if(roles.some(x=>x.rolname==='mohen_gate_signer'&&yes(x.rolcanlogin)))issues.push('M3_SIGNER_ROLE_MUST_NOT_LOGIN');
   const p=await query("select gate_code,count(*)::int as n from control.gate_policy_versions where enabled=true group by gate_code");
   const b=await query("select gate_code,count(*)::int as n from control.gate_reviewer_bindings where active=true and valid_from<=now() and valid_until>now() group by gate_code");
   for(const row of p.rows??[])if(perGate[row.gate_code])perGate[row.gate_code].policy_versions=count(row.n);
   for(const row of b.rows??[])if(perGate[row.gate_code])perGate[row.gate_code].reviewer_bindings=count(row.n);
   for(const [gate,state] of Object.entries(perGate)){
    if(state.policy_versions===0)issues.push('M3_POLICY_NOT_ENABLED_'+gate);
    if(state.reviewer_bindings===0)issues.push('M3_REVIEWER_NOT_BOUND_'+gate);
   }
  }catch{issues.push('M3_ROLE_OR_POLICY_CHECK_UNAVAILABLE');}
 }
 // Even with six configured policies, this does not prove a real reviewer
 // login, valid independent receipt, actual business scope, or signed runtime Gate.
 return {status:issues.length?'HOLD':'READ_ONLY_PRECHECK_COMPLETE_NOT_ACTIVATED',
   inspection:'READ_ONLY',issues,per_gate:perGate,
   reviewer_identity_verified:false,professional_gate_signed:false,production_activated:false};
}
