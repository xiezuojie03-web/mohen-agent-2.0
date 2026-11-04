// Bounds the complete body read, including streams whose cancellation never settles.
export async function readBoundedGateJson(request,{maxBytes,timeoutMs=5000}={}) {
  if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>65536||
    !Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)
    throw Error('BAD_REQUEST_JSON');
  const declared=request?.headers?.get('content-length');
  if(declared!==null&&declared!==undefined&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))
    throw Error('REQUEST_TOO_LARGE');
  if(!request?.body?.getReader)throw Error('REQUEST_BODY_REQUIRED');
  let reader;
  try {reader=request.body.getReader();}catch {throw Error('BAD_REQUEST_JSON');}
  const chunks=[];
  let size=0,timer;
  const deadline=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Error('REQUEST_BODY_TIMEOUT')),timeoutMs);
  });
  try {
    while(true) {
      // Promise.race attaches rejection handlers to reads even after timeout.
      const {done,value}=await Promise.race([reader.read(),deadline]);
      if(done)break;
      size+=value.byteLength;
      if(size>maxBytes)throw Error('REQUEST_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
    try {return JSON.parse(Buffer.concat(chunks,size).toString('utf8'));}
    catch {throw Error('BAD_REQUEST_JSON');}
  } catch(error) {
    if(['REQUEST_BODY_TIMEOUT','REQUEST_TOO_LARGE','BAD_REQUEST_JSON'].includes(error?.message))throw error;
    throw Error('BAD_REQUEST_JSON');
  } finally {
    clearTimeout(timer);
    // Cancellation closes pending reads synchronously for standard streams, but
    // its underlying source promise may never settle. Never await that promise.
    try {Promise.resolve(reader.cancel()).catch(()=>{});}catch {}
    try {reader.releaseLock();}catch {}
  }
}
