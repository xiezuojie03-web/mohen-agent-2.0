import {expect,it,vi} from 'vitest';
import {inspectIndependentGateReadiness} from '../../packages/data-access/src/m3-gate-preflight.mjs';
const allPresent={policies:true,reviewers:true,signer:true,current_valid:true,candidates:true};
it('reports HOLD on absent M3 schema without querying missing tables',async()=>{
 const query=vi.fn().mockResolvedValueOnce({rows:[{policies:false,reviewers:false,signer:false,current_valid:false,candidates:true}]});
 const r=await inspectIndependentGateReadiness(query);
 expect(r.status).toBe('HOLD');expect(r.issues).toContain('M3_MISSING_SIGNER');
 expect(query).toHaveBeenCalledOnce();expect(r.professional_gate_signed).toBe(false);
});
it('cannot interpret configured schemas without policies or reviewer bindings as active Gates',async()=>{
 const q=vi.fn().mockResolvedValueOnce({rows:[allPresent]}).mockResolvedValueOnce({rows:[
 {rolname:'mohen_gate_authority',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 {rolname:'mohen_gate_signer',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 {rolname:'mohen_producer',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 {rolname:'mohen_app_runtime',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 ]}).mockResolvedValueOnce({rows:[{unsafe_membership:false}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]});
 const r=await inspectIndependentGateReadiness(q);
 expect(r.issues).toContain('M3_POLICY_NOT_ENABLED_G2');
 expect(r.issues).toContain('M3_REVIEWER_NOT_BOUND_G5');
 expect(r.production_activated).toBe(false);
});
it('does not claim Gate PASS even when every read-only configuration check succeeds',async()=>{
 const q=vi.fn().mockResolvedValueOnce({rows:[allPresent]}).mockResolvedValueOnce({rows:[
 {rolname:'mohen_gate_authority',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 {rolname:'mohen_gate_signer',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 {rolname:'mohen_producer',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 {rolname:'mohen_app_runtime',rolcanlogin:false,rolsuper:false,rolbypassrls:false},
 ]}).mockResolvedValueOnce({rows:[{unsafe_membership:false}]}).mockResolvedValueOnce({rows:['G0','G1','G2','G3','G4','G5'].map(gate_code=>({gate_code,n:1}))})
 .mockResolvedValueOnce({rows:['G0','G1','G2','G3','G4','G5'].map(gate_code=>({gate_code,n:1}))});
 const r=await inspectIndependentGateReadiness(q);
 expect(r.status).toBe('READ_ONLY_PRECHECK_COMPLETE_NOT_ACTIVATED');
 expect(r.professional_gate_signed).toBe(false);expect(r.production_activated).toBe(false);
});
it('refuses to call a missing read-only query interface',async()=>{
 await expect(inspectIndependentGateReadiness(undefined)).rejects.toThrow('M3_READ_ONLY_QUERY_REQUIRED');
});

it('holds when the independent gate authority role is missing',async()=>{
 const roles=['mohen_gate_signer','mohen_producer','mohen_app_runtime'].map(rolname=>
   ({rolname,rolcanlogin:false,rolsuper:false,rolbypassrls:false}));
 const query=vi.fn().mockResolvedValueOnce({rows:[allPresent]})
  .mockResolvedValueOnce({rows:roles}).mockResolvedValueOnce({rows:[{unsafe_membership:false}]})
  .mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]});
 const result=await inspectIndependentGateReadiness(query);
 expect(result.status).toBe('HOLD');
 expect(result.issues).toContain('M3_ROLE_MISSING_MOHEN_GATE_AUTHORITY');
});
it('holds if the independent authority is login-enabled or inherited by app and producer',async()=>{
 const roles=['mohen_gate_authority','mohen_gate_signer','mohen_producer','mohen_app_runtime'].map(rolname=>
   ({rolname,rolcanlogin:rolname==='mohen_gate_authority',rolsuper:false,rolbypassrls:false}));
 const query=vi.fn().mockResolvedValueOnce({rows:[allPresent]})
  .mockResolvedValueOnce({rows:roles}).mockResolvedValueOnce({rows:[{unsafe_membership:true}]})
  .mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]});
 const result=await inspectIndependentGateReadiness(query);
 expect(result.issues).toContain('M3_INTERNAL_ROLE_MUST_NOT_LOGIN');
 expect(result.issues).toContain('M3_GATE_AUTHORITY_ROLE_INHERITED');
 expect(result.production_activated).toBe(false);
});
