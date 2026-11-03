#!/usr/bin/env node
// MAB-ENG-01 M1 — anonymous production READ-ONLY acceptance checks.
// No login, no Cookie, no credentials, no POST, no data/Storage mutations.
// Vercel protection or non-JSON pages are NOT interpreted as an app PASS.
const origin='https://mohen-agent-2-0.vercel.app';
const targets=[
  ['/api/auth/me',200,'auth'],
  ['/api/studio/projects',401,'login'],
  ['/api/studio/materials/import',401,'login'],
  ['/api/studio/materials/import?material_id=11111111-1111-4111-8111-111111111111',401,'login'],
];
for (const [path,code,kind] of targets) {
  const response=await fetch(origin+path,{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{accept:'application/json','user-agent':'MoHen-MAB-M1-anonymous-readonly/1.0'},
  });
  if(response.status!==code)throw Error('M1_ANON_HTTP_STATUS_INVALID '+path+' '+response.status);
  if(!(response.headers.get('content-type')||'').includes('application/json'))
    throw Error('M1_ANON_JSON_CONTENT_TYPE_REQUIRED '+path);
  const declared=Number(response.headers.get('content-length'));
  if(declared>4096)throw Error('M1_ANON_RESPONSE_TOO_LARGE '+path);
  const text=await response.text();
  if(Buffer.byteLength(text)>4096)throw Error('M1_ANON_RESPONSE_TOO_LARGE '+path);
  let data;try{data=JSON.parse(text);}catch{throw Error('M1_ANON_RESPONSE_NOT_JSON '+path);}
  if(kind==='auth'&&(data?.authenticated!==false||data.user!==null))
    throw Error('M1_ANON_SESSION_NOT_REJECTED '+path);
  if(kind==='login'&&(data?.ok!==false||data?.reason!=='login_required'))
    throw Error('M1_ANON_PRIVATE_ACCESS_NOT_REJECTED '+path);
  if(path.startsWith('/api/studio/materials/import') &&
    !(response.headers.get('cache-control')||'').includes('no-store'))
    throw Error('M1_ANON_PRIVATE_CACHE_NOT_DISABLED '+path);
  console.log('M1_ANON_HTTP_PASS',path,code,kind);
}
console.log('M1_ANON_PRODUCTION_GET_ONLY_PASS',targets.length);
