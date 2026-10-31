#!/usr/bin/env node
// Private professional decision tool. Input JSON on stdin; never print credentials/receipts.
import fs from 'node:fs';
import pg from 'pg';
import {createGateAuthorityRepository} from '../src/gate-authority-repository.mjs';
const command=process.argv[2];
if(!['decide','revoke'].includes(command)) throw new Error('USAGE: gate-authority.mjs decide|revoke < private-input.json');
if(!process.env.MOHEN_GATE_DATABASE_URL) throw new Error('DEDICATED_GATE_DATABASE_URL_REQUIRED');
const url=new URL(process.env.MOHEN_GATE_DATABASE_URL);
const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
if(!local) url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),ssl:local?false:{rejectUnauthorized:true},max:1});
try {
 const input=JSON.parse(fs.readFileSync(0,'utf8'));
 const repo=createGateAuthorityRepository(pool);
 const result=await repo[command](input.decision,input.sessionToken);
 process.stdout.write(JSON.stringify(command==='decide'?{gate_audit_id:result}:{blocked_count:result})+'\n');
} catch(error) {
 // PostgreSQL messages may include detail; print only known machine errors.
 const safe=String(error.message??'').match(/^(?:[A-Z][A-Z0-9_]+)$/)?.[0];
 process.stderr.write((safe??'GATE_AUTHORITY_REQUEST_FAILED')+'\n');process.exitCode=1;
} finally {await pool.end();}
