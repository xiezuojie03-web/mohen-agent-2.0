// One transaction and actual least-privilege LOGIN per independent request.
const BASE_ROLES=['mohen_gate_signer','mohen_gate_reader','mohen_gate_authority','mohen_app_runtime','mohen_producer'];
export async function withIndependentGateConnection(pool,kind,operation) {
  if(!['review','consume'].includes(kind)||typeof pool?.connect!=='function')throw Error('GATE_SERVICE_CONFIG_REQUIRED');
  const expected=kind==='review'?'mohen_gate_signer':'mohen_gate_reader';
  const forbidden=[...BASE_ROLES.filter(x=>x!==expected),'pg_read_all_data','pg_write_all_data',
    'pg_execute_server_program','pg_read_server_files','pg_write_server_files'];
  const client=await pool.connect();let begun=false,discard=false;
  try {
    await client.query('begin');begun=true;
    const {rows}=await client.query(`select current_user as db_identity,session_user as login_identity,
      me.rolcanlogin as can_login,pg_has_role(session_user,$1,'MEMBER') as member,
      exists(select from pg_roles r where pg_has_role(session_user,r.oid,'MEMBER')
        and (r.rolsuper or r.rolbypassrls or r.rolcreaterole or r.rolcreatedb or r.rolreplication
          or r.rolname=any($2::text[]))) as unsafe_membership
      from pg_roles me where me.rolname=session_user`,[expected,forbidden]);
    const identity=rows[0];
    if(rows.length!==1||identity.can_login!==true||identity.member!==true||identity.unsafe_membership!==false||
      identity.db_identity!==identity.login_identity||typeof identity.login_identity!=='string'||
      !identity.login_identity||BASE_ROLES.includes(identity.login_identity))
      throw Error(kind==='review'?'INDEPENDENT_SIGNER_CONNECTION_REQUIRED':'INDEPENDENT_READER_CONNECTION_REQUIRED');
    const result=await operation(client);
    const committed=await client.query('commit');
    if(committed.command!=='COMMIT')throw Error('GATE_TRANSACTION_NOT_COMMITTED');
    begun=false;return result;
  }catch(error){if(begun){try{await client.query('rollback');}catch{discard=true;}}throw error;}
  finally{client.release(discard);}
}
