import {expect,it,vi} from 'vitest';
import {createGateAuthorityRepository} from '../../packages/data-access/src/gate-authority-repository.mjs';
function fixture(overrides:Record<string,unknown>={}) {
 const identity={db_identity:'synthetic_signer_login',signer:true,privileged:false,
  login_identity:'synthetic_signer_login',login_signer:true,login_canlogin:true,
  login_privileged:false,login_privileged_membership:false,producer_login:false,web_login:false,authority_login:false,...overrides};
 const query=vi.fn(async (sql:string)=>sql.includes('current_user as db_identity')?{rows:[identity]}:
  sql.includes('revoke_gate_qualification')?{rows:[{blocked_count:0}]}:{rows:[]});
 const release=vi.fn();
 return {repo:createGateAuthorityRepository({connect:async()=>({query,release})}),query,release};
}
const input={auditId:'11111111-1111-4111-8111-111111111111',requestId:'22222222-2222-4222-8222-222222222222',reason:'synthetic'};
it('rejects a privileged shared login disguised by SET ROLE to gate_signer',async()=>{
 const {repo,query,release}=fixture({db_identity:'mohen_gate_signer',login_identity:'shared_web_login',login_privileged:true});
 await expect(repo.revoke(input,'synthetic-reviewer-session')).rejects.toThrow('INDEPENDENT_SIGNER_CONNECTION_REQUIRED');
 expect(query.mock.calls.some(([sql])=>sql.includes('revoke_gate_qualification'))).toBe(false);
 expect(query.mock.calls.some(([sql])=>sql==='rollback')).toBe(true);expect(release).toHaveBeenCalledWith(false);
});
it.each(['producer_login','web_login','authority_login','login_privileged_membership'])('rejects a signer login that also inherits %s',async field=>{
 const {repo,query}=fixture({[field]:true});
 await expect(repo.revoke(input,'synthetic-reviewer-session')).rejects.toThrow('INDEPENDENT_SIGNER_CONNECTION_REQUIRED');
 expect(query.mock.calls.some(([sql])=>sql.includes('revoke_gate_qualification'))).toBe(false);
});
it('permits an actual independent low privilege signer login',async()=>{
 const {repo}=fixture();expect(await repo.revoke(input,'synthetic-reviewer-session')).toBe(0);
});
it('requires the effective signer identity to remain the actual login identity',async()=>{
 const {repo,query}=fixture({db_identity:'mohen_gate_signer'});
 await expect(repo.revoke(input,'synthetic-reviewer-session')).rejects.toThrow('INDEPENDENT_SIGNER_CONNECTION_REQUIRED');
 expect(query.mock.calls.some(([sql])=>sql.includes('revoke_gate_qualification'))).toBe(false);
});
