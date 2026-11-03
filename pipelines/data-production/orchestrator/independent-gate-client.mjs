// MAB-ENG-01 M3: read-only, independently operated current-Gate verifier.
// The Producer process never receives a Gate signing credential or database role.
// Request includes digests and stage identity ONLY: no original bytes, quote,
// user-provided metadata, claims, source contents or candidate payload.
const GATES = new Set(['G0','G1','G2','G3','G4','G5']);
const SHA = /^[0-9a-f]{64}$/;

async function readBoundedJson(response) {
  const limit = 16384;
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw Error('INDEPENDENT_GATE_RESPONSE_TOO_LARGE');
  if (!response.body?.getReader) throw Error('INDEPENDENT_GATE_RESPONSE_INVALID');
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const {value,done} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw Error('INDEPENDENT_GATE_RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(()=>{});reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks,size).toString('utf8')); }
  catch { throw Error('INDEPENDENT_GATE_RESPONSE_INVALID'); }
}

export function createIndependentGateClient({endpoint,credential,fetcher = fetch}={}) {
  let url;
  try { url = new URL(endpoint); } catch { throw Error('INDEPENDENT_GATE_VERIFY_CONFIG_INVALID'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
      url.search || url.hash || typeof credential !== 'string' || credential.length < 32 ||
      typeof fetcher !== 'function') throw Error('INDEPENDENT_GATE_VERIFY_CONFIG_INVALID');
  return async function verifyCurrentQualification({run,job,stage,gate,input_digest,output_digest}) {
    if (!run?.run_id || typeof run.run_id !== 'string' ||
        !job?.job_id || typeof job.job_id !== 'string' || job.stage !== stage ||
        !GATES.has(gate) || gate !== 'G'+stage?.slice(-1) ||
        !SHA.test(input_digest ?? '') || !SHA.test(output_digest ?? '')) {
      throw Error('INDEPENDENT_GATE_VERIFY_INPUT_INVALID');
    }
    const payload = {
      schema:'mohen.independent-gate-current-check.v1',
      run_id:run.run_id,job_id:job.job_id,stage,gate_code:gate,
      input_digest,output_digest,
      reviewer_binding_ref:job.implementation?.gate_reviewer_binding ?? null,
      consumer:'producer',
    };
    let response;
    try {
      response = await fetcher(url.toString(),{
        method:'POST',cache:'no-store',redirect:'error',
        headers:{'content-type':'application/json',authorization:'Bearer '+credential},
        body:JSON.stringify(payload),signal:AbortSignal.timeout(5000),
      });
    } catch { throw Error('INDEPENDENT_GATE_VERIFY_UNAVAILABLE'); }
    if (!response?.ok) throw Error('INDEPENDENT_GATE_VERIFY_DENIED');
    const type=response.headers?.get?.('content-type')||'';
    if (!type.toLowerCase().startsWith('application/json')) throw Error('INDEPENDENT_GATE_RESPONSE_INVALID');
    const receipt=await readBoundedJson(response);
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw Error('INDEPENDENT_GATE_RESPONSE_INVALID');
    // This client does not decide PASS. The existing orchestrator independently
    // checks exact input/output digests, current decision, run, stage and expiry.
    return receipt;
  };
}

export function createOptionalIndependentGateClient(environment=process.env,fetcher=fetch) {
  const endpoint=environment.MOHEN_INDEPENDENT_GATE_VERIFY_URL;
  const credential=environment.MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL;
  if(!endpoint&&!credential)return null; // no verifier -> independent Gate HOLD
  return createIndependentGateClient({endpoint,credential,fetcher});
}
