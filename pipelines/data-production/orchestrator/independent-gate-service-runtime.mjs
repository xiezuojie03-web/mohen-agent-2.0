// Dedicated HTTPS process. Importing this module never opens a listener or pool.
import https from 'node:https';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {rootCertificates} from 'node:tls';
import {createIndependentGateService} from './independent-gate-service.mjs';

const failure=(status,reason)=>Response.json({ok:false,reason},{status,headers:{'cache-control':'no-store'}});
// Do not forward stream cancellation to IncomingMessage.destroy(): that would
// close the TLS socket before a body-read timeout can return its HTTP 408.
function requestBody(incoming) {
  let detach=()=>{};
  return new ReadableStream({
    start(controller) {
      const data=chunk=>{incoming.pause();controller.enqueue(new Uint8Array(chunk));};
      const end=()=>{detach();controller.close();};
      const error=()=>{detach();controller.error(Error('REQUEST_BODY_ABORTED'));};
      detach=()=>{
        incoming.removeListener('data',data);incoming.removeListener('end',end);
        incoming.removeListener('error',error);incoming.removeListener('aborted',error);
        incoming.pause();
      };
      incoming.on('data',data);incoming.once('end',end);
      incoming.once('error',error);incoming.once('aborted',error);incoming.pause();
    },
    pull(){incoming.resume();},
    cancel(){detach();},
  });
}
export function createIndependentGateHttpsServer({enabled=false,signerPool,readerPool,
  databaseSessionKey,tlsCert,tlsKey,bodyReadTimeoutMs=5000}={}) {
  if(enabled!==true)return null;
  if(!tlsCert?.length||!tlsKey?.length)throw Error('GATE_SERVICE_TLS_REQUIRED');
  const handle=createIndependentGateService({signerPool,readerPool,databaseSessionKey,bodyReadTimeoutMs});
  const server=https.createServer({cert:tlsCert,key:tlsKey,minVersion:'TLSv1.2'},async(incoming,outgoing)=>{
    const stream=requestBody(incoming);
    let result;
    try {
      // A fixed authority prevents client-controlled Host from changing routing.
      if(!incoming.url?.startsWith('/')||incoming.url.startsWith('//'))result=failure(400,'invalid_request');
      else {
        const headers=new Headers();
        for(const [key,value] of Object.entries(incoming.headers))if(value!==undefined)
          headers.set(key,Array.isArray(value)?value.join(', '):value);
        const request=new Request('https://independent-gate.invalid'+incoming.url,{
          method:incoming.method,headers,
          ...(!['GET','HEAD'].includes(incoming.method)?{body:stream,duplex:'half'}:{}),
        });
        result=await handle(request);
      }
    }catch {result=failure(500,'independent_gate_unavailable');}
    // Preflight may return without consuming the body. Always detach the body
    // listeners and close this request's socket after the response is written.
    try {await stream.cancel();}catch {}
    if(outgoing.destroyed)return;
    outgoing.statusCode=result.status;
    result.headers.forEach((value,key)=>outgoing.setHeader(key,value));
    outgoing.setHeader('connection','close');
    try {outgoing.end(Buffer.from(await result.arrayBuffer()),()=>incoming.destroy());}
    catch {outgoing.destroy();}
  });
  // Limit header/incomplete-request lifetime independently of the JSON deadline.
  server.headersTimeout=10000;server.requestTimeout=35000;server.keepAliveTimeout=1000;
  return server;
}

// Mirrors the private worker's explicit-field TLS policy. No URL query may
// override certificate checks, identity, socket transport, or startup role.
export function independentGatePoolOptions(connectionString,{ca}={}) {
  let url,user,password,database;
  try {
    url=new URL(connectionString);
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.username||
      !url.password||!url.pathname.slice(1)||url.search||url.hash)throw Error();
    user=decodeURIComponent(url.username);password=decodeURIComponent(url.password);
    database=decodeURIComponent(url.pathname.slice(1));
  }catch {throw Error('GATE_SERVICE_DATABASE_CONFIG_INVALID');}
  return {host:url.hostname,port:Number(url.port||5432),user,password,database,
    max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,
    statement_timeout:15000,lock_timeout:5000,query_timeout:20000,
    ssl:{rejectUnauthorized:true,...(ca?{ca:[...rootCertificates,ca]}:{})}};
}

export async function startIndependentGateHttpsRuntime({env=process.env}={}) {
  if(env.MOHEN_INDEPENDENT_GATE_SERVICE_ENABLED!=='true')return null;
  const signerUrl=env.MOHEN_GATE_SIGNER_DATABASE_URL,readerUrl=env.MOHEN_GATE_READER_DATABASE_URL;
  const databaseSessionKey=env.MOHEN_GATE_DATABASE_SESSION_KEY;
  const certPath=env.MOHEN_GATE_TLS_CERT_PATH,keyPath=env.MOHEN_GATE_TLS_KEY_PATH;
  if(!signerUrl||!readerUrl||signerUrl===readerUrl||!databaseSessionKey||databaseSessionKey.length<32||!certPath||!keyPath)
    throw Error('GATE_SERVICE_CONFIG_REQUIRED');
  const port=Number(env.MOHEN_GATE_PORT??8443);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('GATE_SERVICE_CONFIG_REQUIRED');
  // Validate URL policy before opening files, pools, or sockets.
  independentGatePoolOptions(signerUrl);independentGatePoolOptions(readerUrl);
  const [tlsCert,tlsKey,signerCa,readerCa]=await Promise.all([
    readFile(certPath),readFile(keyPath),
    env.MOHEN_GATE_SIGNER_DATABASE_CA_PATH?readFile(env.MOHEN_GATE_SIGNER_DATABASE_CA_PATH,'utf8'):undefined,
    env.MOHEN_GATE_READER_DATABASE_CA_PATH?readFile(env.MOHEN_GATE_READER_DATABASE_CA_PATH,'utf8'):undefined,
  ]);
  // Resolve the declared data-access dependency rather than a global pg install.
  const require=createRequire(new URL('../../../packages/data-access/package.json',import.meta.url));
  const {Pool}=require('pg');
  const signerPool=new Pool(independentGatePoolOptions(signerUrl,{ca:signerCa}));
  const readerPool=new Pool(independentGatePoolOptions(readerUrl,{ca:readerCa}));
  // Pool idle errors never log credentials or raw database errors.
  signerPool.on('error',()=>{});readerPool.on('error',()=>{});
  let server;
  try {
    server=createIndependentGateHttpsServer({enabled:true,signerPool,readerPool,databaseSessionKey,tlsCert,tlsKey});
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen(port,env.MOHEN_GATE_HOST??'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});
    });
  }catch(error){await Promise.allSettled([signerPool.end(),readerPool.end()]);throw error;}
  let closing;
  const close=()=>closing??=(async()=>{
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    await Promise.allSettled([signerPool.end(),readerPool.end()]);
  })();
  return {server,close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    const runtime=await startIndependentGateHttpsRuntime();
    if(runtime){
      console.log('Independent gate HTTPS service listening');
      for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{runtime.close().then(()=>{process.exitCode=0;});});
    }else console.log('Independent gate HTTPS service OFF');
  }catch {console.error('Independent gate HTTPS service startup failed');process.exitCode=1;}
}
