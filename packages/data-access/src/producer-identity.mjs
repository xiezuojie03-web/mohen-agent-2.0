/** Inspect the actual connection, not the name declared in configuration. */
export async function assertProducerIdentity(queryRows,{cloud=false}={}) {
  const rows=await queryRows(`select current_user::text as role,session_user::text as login_role,
    r.rolcanlogin as can_login,r.rolsuper as is_superuser,
    r.rolbypassrls as bypass_rls,r.rolcreaterole as can_create_role,
    pg_has_role(session_user,'mohen_producer','MEMBER') as producer_member,
    pg_has_role(session_user,'mohen_gate_signer','MEMBER') as can_sign,
    pg_has_role(session_user,'mohen_gate_reader','MEMBER') as can_read_gate,
    pg_has_role(session_user,'mohen_gate_authority','MEMBER') as gate_authority_member,
    pg_has_role(session_user,'mohen_app_runtime','MEMBER') as app_member,
    pg_has_role(session_user,'pg_read_all_data','MEMBER') as all_read,
    pg_has_role(session_user,'pg_write_all_data','MEMBER') as all_write
    from pg_roles r where r.rolname=session_user`);
  const a=rows[0],no=v=>v===false||v==='f'||v==='false';
  const yes=v=>v===true||v==='t'||v==='true';
  if(!a||!no(a.is_superuser)||!no(a.bypass_rls)||!no(a.can_sign))throw Error('PRODUCER_DATABASE_IDENTITY_UNSAFE');
  if(cloud){
    if(!yes(a.can_login)||!yes(a.producer_member)||!no(a.can_create_role)||
      !no(a.can_read_gate)||!no(a.gate_authority_member)||!no(a.app_member)||
      !no(a.all_read)||!no(a.all_write)||a.role!==a.login_role||
      ['postgres','supabase_admin','mohen_producer','mohen_app_runtime','mohen_gate_signer',
       'mohen_gate_authority','mohen_gate_reader'].includes(a.role))
      throw Error('PRODUCER_DATABASE_IDENTITY_UNSAFE');
  }else if(a.role!=='mohen_producer')throw Error('PRODUCER_DATABASE_IDENTITY_UNSAFE');
}
