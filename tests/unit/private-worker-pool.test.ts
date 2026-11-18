import {expect,it} from 'vitest';
import {createPrivateWorkerPool,createPrivateWorkerScopedQueryPool} from '../../packages/data-access/src/private-worker-pool.mjs';

it('requires explicit dedicated credentials and rejects connection URI overrides before creating a pool',()=>{
  for(const url of ['postgresql://worker@db.example.invalid/test',
    'postgresql://worker:@db.example.invalid/test',
    'postgresql://worker:fixture@db.example.invalid/test?sslmode=disable',
    'postgresql://worker:fixture@db.example.invalid/test?host=localhost',
    'postgresql://worker:fixture@db.example.invalid/test?options=-c%20role=postgres',
    'postgresql://%zz:fixture@db.example.invalid/test',
    'postgresql://worker:%zz@db.example.invalid/test',
    'https://worker:fixture@db.example.invalid/test','invalid'])
    expect(()=>createPrivateWorkerPool(url)).toThrow('PRIVATE_WORKER_DATABASE_CONFIG_INVALID');
});
it('always verifies TLS and uses only explicit URI fields even for localhost',async()=>{
  const pool=createPrivateWorkerPool('postgresql://worker:fi%40xture@localhost:55432/test',{ca:'test-ca'});
  const options=pool.options as Record<string,any>;
  expect(options).toMatchObject({host:'localhost',port:55432,user:'worker',password:'fi@xture',
    database:'test',ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,max:2});
  expect(options.ssl.ca).toContain('test-ca');
  expect(options.connectionString).toBeUndefined();
  await pool.end();
});

it('runs D00 and Producer-side Gate queries inside a transaction scoped to the NOLOGIN private worker role',async()=>{
  const calls=[];
  let released;
  const client={
    async query(text,values){calls.push([text,values]);return {rows:[{ok:true}]};},
    release(error){released=error;}
  };
  const pool={async connect(){return client;}};
  const scoped=createPrivateWorkerScopedQueryPool(pool);
  const result=await scoped.query('select 1 as ok',[1]);
  expect(result.rows).toEqual([{ok:true}]);
  expect(calls.map(([sql])=>sql)).toEqual(['begin','set local role mohen_private_worker','select 1 as ok','commit']);
  expect(calls[2][1]).toEqual([1]);
  expect(released).toBe(false);
});

it('rolls back a failed private-worker query and releases the client',async()=>{
  const calls=[];
  let released;
  const client={
    async query(text,values){
      calls.push([text,values]);
      if(text==='select fail')throw new Error('FIXTURE_QUERY_FAILED');
      return {rows:[]};
    },
    release(error){released=error;}
  };
  const scoped=createPrivateWorkerScopedQueryPool({async connect(){return client;}});
  await expect(scoped.query('select fail')).rejects.toThrow('FIXTURE_QUERY_FAILED');
  expect(calls.map(([sql])=>sql)).toEqual(['begin','set local role mohen_private_worker','select fail','rollback']);
  expect(released).toBe(false);
});
