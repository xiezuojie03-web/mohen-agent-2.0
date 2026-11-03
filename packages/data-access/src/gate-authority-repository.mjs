/** Private authority channel. The supplied pool must use a distinct low-privilege signer login.
 * Never pass the ordinary Web/Producer pool. No credentials or user roles are inferred here.
 */
export function createGateAuthorityRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('TRANSACTIONAL_SIGNER_POOL_REQUIRED');
  async function transaction(sessionToken, operation) {
    if (typeof sessionToken !== 'string' || !sessionToken) throw new Error('REVIEWER_IDENTITY_REQUIRED');
    const client=await pool.connect();
    let begun=false;
    let discard=false;
    try {
      await client.query('begin'); begun=true;
      const {rows}=await client.query(`select current_user as db_identity, session_user as login_identity,
        pg_has_role(current_user,'mohen_gate_signer','MEMBER') as signer,
        (select rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication from pg_roles where rolname=current_user) as privileged,
        pg_has_role(session_user,'mohen_gate_signer','MEMBER') as login_signer,
        (select rolcanlogin from pg_roles where rolname=session_user) as login_canlogin,
        (select rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication from pg_roles where rolname=session_user) as login_privileged,
        exists(select from pg_roles r where pg_has_role(session_user,r.oid,'MEMBER')
          and (r.rolsuper or r.rolbypassrls or r.rolcreaterole or r.rolcreatedb or r.rolreplication
            or r.rolname in ('pg_read_all_data','pg_write_all_data','pg_execute_server_program','pg_read_server_files','pg_write_server_files'))) as login_privileged_membership,
        pg_has_role(session_user,'mohen_producer','MEMBER') as producer_login,
        pg_has_role(session_user,'mohen_app_runtime','MEMBER') as web_login,
        pg_has_role(session_user,'mohen_gate_authority','MEMBER') as authority_login`);
      const identity=rows[0];
      // SET ROLE cannot hide a shared Web/Producer/admin credential. Both the
      // effective role and actual login must be independently least privileged.
      if (rows.length!==1 || identity.signer!==true || identity.privileged!==false ||
          identity.login_signer!==true || identity.login_canlogin!==true ||
          identity.db_identity!==identity.login_identity ||
          identity.login_privileged!==false || identity.login_privileged_membership!==false ||
          identity.producer_login!==false || identity.web_login!==false || identity.authority_login!==false ||
          typeof identity.login_identity!=='string' || !identity.login_identity ||
          ['mohen_gate_signer','mohen_gate_authority','mohen_app_runtime','mohen_producer'].includes(identity.login_identity)) {
        throw new Error('INDEPENDENT_SIGNER_CONNECTION_REQUIRED');
      }
      await client.query("select set_config('mohen.session_token',$1,true)",[sessionToken]);
      const result=await operation(client);
      await client.query('commit'); begun=false;
      return result;
    } catch (error) {
      if (begun) { try { await client.query('rollback'); } catch { discard=true; } }
      throw error;
    } finally { client.release(discard); }
  }
  return {
    decide({candidateId,requestId,result,ruleVersion,validUntil,receipt,expectedAuditId=null},sessionToken) {
      return transaction(sessionToken,async client=>{
        const response=await client.query('select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id',
          [candidateId,requestId,result,ruleVersion,validUntil,JSON.stringify(receipt),expectedAuditId]);
        if(response.rows.length!==1 || !response.rows[0].gate_audit_id) throw new Error('GATE_DECISION_NOT_PERSISTED');
        return response.rows[0].gate_audit_id;
      });
    },
    revoke({auditId,requestId,reason},sessionToken) {
      return transaction(sessionToken,async client=>{
        const response=await client.query('select control.revoke_gate_qualification($1,$2,$3) as blocked_count',[auditId,requestId,reason]);
        if(response.rows.length!==1 || response.rows[0].blocked_count==null) throw new Error('GATE_REVOCATION_NOT_PERSISTED');
        return Number(response.rows[0].blocked_count);
      });
    },
  };
}
