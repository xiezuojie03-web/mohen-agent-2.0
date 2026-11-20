// Verify the D01 attestor's real least-privilege connection can perform every
// read required to rebuild the D01 input under RLS, and that it is NOT superuser
// / BYPASSRLS and has no write privilege on the journal.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const ROOT=process.cwd();const require=createRequire(path.join(ROOT,'packages','data-access','package.json'));const pg=require('pg');
const {rebuildD01ResumeInput}=await import('../pipelines/data-production/orchestrator/d01-resume-input.mjs');
const {executionDigest}=await import('../pipelines/data-production/orchestrator/execution-authority.mjs');
import registry from '../specs/data-production/production-registry.json' with {type:'json'};
const url=fs.readFileSync('.secrets/d01-attestor-database-url.txt','utf8').trim();
const ca=fs.readFileSync('.secrets/supabase-ca/prod-ca-2021.crt','utf8');
const pool=new pg.Pool({connectionString:url,ssl:{ca,rejectUnauthorized:true},max:2,connectionTimeoutMillis:20000});
const RUN='bfcdfad6-bbcb-4b68-946a-82e1302eeb80',PROJ='e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5';
const aq=async(sql,params={})=>{const v=[];const t=sql.replace(/:'([^']+)'/g,(_m,n)=>{v.push(params[n]);return '$'+v.length;});return (await pool.query(t,v)).rows;};
const json=v=>typeof v==='string'?JSON.parse(v):v;
try{
 const id=await aq(`select current_user::text as u, (select rolsuper from pg_roles where rolname=current_user) as super, (select rolbypassrls from pg_roles where rolname=current_user) as bypass`);
 console.log('IDENTITY='+JSON.stringify(id));
 const g0rows=await aq(["select a.gate_audit_id::text as audit_id,a.candidate_id::text as candidate_id,a.details->'stage_binding'->>'output_digest' as output_digest","from control.qualification_current q join control.gate_audits a on a.gate_audit_id=q.gate_audit_id","where a.run_id=:'run'::uuid and a.stage='D00' and a.gate_code='G0' and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true and q.consumer='producer' and q.object_type='source_version' and (q.valid_until is null or q.valid_until>now()) and (a.valid_until is null or a.valid_until>now()) limit 2"].join(' '),{run:RUN});
 console.log('CURRENT_G0='+g0rows.length+' '+JSON.stringify(g0rows.map(g=>({c:g.candidate_id,o:g.output_digest}))));
 if(g0rows.length!==1)throw Error('current G0 not unique under attestor RLS');
 const g0=g0rows[0];
 const crows=await aq(["select c.candidate_id::text as candidate_id,c.object_id::text as object_id,c.gate_code,c.stage,c.consumer,c.artifact_revision,c.allowed_scope::text as scope,c.evidence_refs::text as evidence_refs","from control.gate_candidates c where c.candidate_id=:'candidate'::uuid and c.consumer='producer' limit 1"].join(' '),{candidate:g0.candidate_id});
 const candidate=crows[0];candidate.scope=json(candidate.scope);candidate.evidence_refs=json(candidate.evidence_refs);
 const request={run_id:RUN,stage:'D00',gate_code:'G0',output_digest:g0.output_digest};
 const resumeInput=await rebuildD01ResumeInput({query:aq,candidate,request,registry,projectId:PROJ});
 const digest=executionDigest(resumeInput);
 console.log('REBUILD_MATCH='+(digest===g0.output_digest)+' digest='+digest);
 // Negative: attestor must NOT write the journal (no insert privilege).
 let writeBlocked=false;
 try{await aq("insert into control.d01_resume_grant_journal(run_id,binding,expires_at) values ($1,$2,now()+interval '1 minute')",[RUN,JSON.stringify({run_id:RUN,stage:'D01',mode:'attended'})]);}
 catch{writeBlocked=true;}
 console.log('JOURNAL_WRITE_BLOCKED='+writeBlocked);
 console.log('RESULT='+(id[0].u==='mohen_d01_attestor_login'&&!id[0].super&&!id[0].bypass&&digest===g0.output_digest&&writeBlocked?'PASS':'FAIL'));
}catch(e){console.log('VERIFY_ERR='+e.message);}finally{await pool.end();}
