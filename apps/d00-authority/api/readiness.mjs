import pg from 'pg';
import {withIndependentGateConnection} from '../../../packages/data-access/src/gate-service-connection.mjs';
import {independentGatePoolOptions} from '../../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';

async function check(url,ca,verify){
 if(!url)return 'not_configured';
 let pool;
 try{
  pool=new pg.Pool({...independentGatePoolOptions(url,{ca}),max:1});
  pool.on('error',()=>{});
  return await verify(pool)?'ready':'identity_rejected';
 }catch(error){
  if(error?.code==='28P01'||error?.code==='28000')return 'login_rejected';
  if(error?.code==='42501')return 'permission_denied';
  return 'connection_unavailable';
 }finally{
  await pool?.end();
 }
}

export default async function readiness(req,res){
 res.setHeader('content-type','application/json');
 res.setHeader('cache-control','no-store');
 if(process.env.VERCEL_ENV!=='preview'||process.env.MOHEN_D00_READINESS_ENABLED!=='true'){
  res.statusCode=404;
  res.end('{"ok":false}');
  return;
 }
 if(req.method!=='GET'){
  res.statusCode=405;
  res.end('{"ok":false}');
  return;
 }
 const ca=process.env.MOHEN_D00_AUTHORITY_DATABASE_CA;
 const [journal,gateReader]=await Promise.all([
  check(process.env.MOHEN_D00_AUTHORITY_DATABASE_URL,ca,async pool=>{
   const {rows}=await pool.query(`select session_user='mohen_d00_authority_login'
      and current_user=session_user and pg_has_role(session_user,'mohen_d00_grant_journal','member')
      and has_table_privilege(session_user,'control.d00_execution_grant_journal','select')
      and not (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication) as ready
      from pg_roles where rolname=session_user`);
   return rows.length===1&&rows[0].ready===true;
  }),
  check(process.env.MOHEN_D00_GATE_READER_DATABASE_URL,ca,pool=>
   withIndependentGateConnection(pool,'consume',async client=>{
    const {rows}=await client.query("select session_user='mohen_d00_gate_reader_login' as ready");
    return rows.length===1&&rows[0].ready===true;
   })),
 ]);
 const ok=journal==='ready'&&gateReader==='ready';
 res.statusCode=ok?200:503;
 res.end(JSON.stringify({ok,journal,gateReader}));
}
