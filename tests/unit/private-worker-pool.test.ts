import {expect,it} from 'vitest';
import {createPrivateWorkerPool} from '../../packages/data-access/src/private-worker-pool.mjs';

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
