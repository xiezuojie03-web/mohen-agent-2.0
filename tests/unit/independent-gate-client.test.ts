import {expect,it,vi} from 'vitest';
import {createIndependentGateClient,createOptionalIndependentGateClient} from '../../pipelines/data-production/orchestrator/independent-gate-client.mjs';
const input_digest='a'.repeat(64),output_digest='b'.repeat(64);
const args={
 run:{run_id:'run-synthetic'},job:{job_id:'d02.material-understanding',stage:'D02',
 implementation:{gate_reviewer_binding:'independent-G2:synthetic-ref'}},
 stage:'D02',gate:'G2',input_digest,output_digest,
 input:{private_original_text:'sensitive-secret'},
 output:{full_quote:'sensitive-private-quote'},
};
const endpoint='https://gate-verifier.example.invalid/api/current';
const credential='synthetic-read-only-gate-client-credential';
it('does not configure a fallback Gate verifier when no independent service exists',()=>{
 expect(createOptionalIndependentGateClient({},vi.fn())).toBeNull();
 expect(()=>createOptionalIndependentGateClient({MOHEN_INDEPENDENT_GATE_VERIFY_URL:endpoint},vi.fn())).toThrow('INDEPENDENT_GATE_VERIFY_CONFIG_INVALID');
});
it('rejects plaintext, embedded credentials, query strings and short credentials',()=>{
 for(const endpoint of ['http://example.invalid/verify','https://user:pass@example.invalid/verify','https://example.invalid/verify?allow=true']){
  expect(()=>createIndependentGateClient({endpoint,credential})).toThrow('INDEPENDENT_GATE_VERIFY_CONFIG_INVALID');
 }
 expect(()=>createIndependentGateClient({endpoint,credential:'short'})).toThrow('INDEPENDENT_GATE_VERIFY_CONFIG_INVALID');
});
it('sends digests and stage identity only, never a private source or Producer PASS',async()=>{
 const receipt={qualification_current:true,decision_origin:'independent_gate',result:'PASS'};
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(receipt),{status:200,headers:{'content-type':'application/json'}}));
 const verify=createIndependentGateClient({endpoint,credential,fetcher});
 expect(await verify(args)).toEqual(receipt);
 const [url,opt]=fetcher.mock.calls[0];
 expect(url).toBe(endpoint);
 expect(opt).toMatchObject({method:'POST',cache:'no-store',redirect:'error'});
 expect(opt.headers.authorization).toBe('Bearer '+credential);
 const body=JSON.parse(opt.body);
 expect(body).toMatchObject({run_id:'run-synthetic',stage:'D02',gate_code:'G2',input_digest,output_digest,
   reviewer_binding_ref:'independent-G2:synthetic-ref',consumer:'producer'});
 expect(JSON.stringify(body)).not.toContain('sensitive-private-quote');
 expect(JSON.stringify(body)).not.toContain('sensitive-secret');
 expect(JSON.stringify(body)).not.toContain(credential);
 expect(body).not.toHaveProperty('result');
 expect(body).not.toHaveProperty('qualification_current');
});
it('cannot query a different gate or an unbound input hash',async()=>{
 const fetcher=vi.fn();
 const verify=createIndependentGateClient({endpoint,credential,fetcher});
 await expect(verify({...args,gate:'G1'})).rejects.toThrow('INDEPENDENT_GATE_VERIFY_INPUT_INVALID');
 await expect(verify({...args,input_digest:'not-a-hash'})).rejects.toThrow('INDEPENDENT_GATE_VERIFY_INPUT_INVALID');
 expect(fetcher).not.toHaveBeenCalled();
});
it('fails closed on denial, upstream error, or invalid content type',async()=>{
 for(const response of [
  new Response('no',{status:403}),
  new Response('failure',{status:503}),
  new Response('text',{status:200,headers:{'content-type':'text/html'}}),
  new Response('not-json',{status:200,headers:{'content-type':'application/json'}}),
 ]){
  const verify=createIndependentGateClient({endpoint,credential,fetcher:vi.fn().mockResolvedValue(response)});
  await expect(verify(args)).rejects.toThrow(/INDEPENDENT_GATE_VERIFY_DENIED|INDEPENDENT_GATE_RESPONSE_INVALID/);
 }
 const verify=createIndependentGateClient({endpoint,credential,fetcher:vi.fn().mockRejectedValue(new Error('offline'))});
 await expect(verify(args)).rejects.toThrow('INDEPENDENT_GATE_VERIFY_UNAVAILABLE');
});
it('caps independent response size without interpreting oversize content as PASS',async()=>{
 const verify=createIndependentGateClient({endpoint,credential,
  fetcher:vi.fn().mockResolvedValue(new Response(JSON.stringify({garbage:'x'.repeat(20000)}),{
    status:200,headers:{'content-type':'application/json'}}))});
 await expect(verify(args)).rejects.toThrow('INDEPENDENT_GATE_RESPONSE_TOO_LARGE');
});
