// Dedicated private-byte worker login, never the Producer/Web shared pool.
import pg from 'pg';
import {rootCertificates} from 'node:tls';

export function createPrivateWorkerPool(connectionString,{ca}={}) {
  let url,user,password,database;
  try {
    url=new URL(connectionString);
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.username||!url.password||!url.pathname.slice(1))throw Error();
    // Explicit fields only: URI query options must not switch identity,
    // transport, socket, SSL verification or PostgreSQL startup role.
    const options=[...url.searchParams];
    if(url.hash||options.length>1||options.some(([key,value])=>key!=='sslmode'||value!=='verify-full'))throw Error();
    user=decodeURIComponent(url.username);password=decodeURIComponent(url.password);
    database=decodeURIComponent(url.pathname.slice(1));
  }catch{throw Error('PRIVATE_WORKER_DATABASE_CONFIG_INVALID');}
  return new pg.Pool({host:url.hostname,port:Number(url.port||5432),
    user,password,database,max:2,connectionTimeoutMillis:5000,
    ssl:{rejectUnauthorized:true,...(ca?{ca:[...rootCertificates,ca]}:{})}});
}

export async function assertPrivateWorkerIdentity(pool) {
  const {rows}=await pool.query(`select current_user as db_identity,session_user as login_identity,
    r.rolcanlogin as can_login,
    pg_has_role(session_user,'mohen_app_runtime','MEMBER') as app_worker,
    exists(select from pg_roles inherited where pg_has_role(session_user,inherited.oid,'MEMBER')
      and (inherited.rolsuper or inherited.rolbypassrls or inherited.rolcreaterole or inherited.rolcreatedb
        or inherited.rolreplication or inherited.rolname in
        ('mohen_producer','mohen_gate_signer','mohen_gate_authority','pg_read_all_data','pg_write_all_data',
         'pg_execute_server_program','pg_read_server_files','pg_write_server_files'))) as unsafe_membership
    from pg_roles r where r.rolname=session_user`);
  const identity=rows[0];
  if(rows.length!==1||identity.can_login!==true||identity.app_worker!==true||
    identity.unsafe_membership!==false||identity.db_identity!==identity.login_identity||
    typeof identity.login_identity!=='string'||!identity.login_identity||
    ['mohen_app_runtime','mohen_producer','mohen_gate_signer','mohen_gate_authority'].includes(identity.login_identity))
    throw Error('PRIVATE_WORKER_DATABASE_IDENTITY_UNSAFE');
}

// TLS-only connection factory reused for separate dedicated machine roles.
// It does not grant permissions or validate the role; call the appropriate
// actual-session identity checker immediately after connecting.
export const createDedicatedMachinePool=createPrivateWorkerPool;
