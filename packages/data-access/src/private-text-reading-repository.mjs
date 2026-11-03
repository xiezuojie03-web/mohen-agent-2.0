// M2 private L1 persistence. A byte attestation authorizes one candidate write,
// never a Gate decision or public consumption. No direct source-table grants.
import {createHash,createHmac} from 'node:crypto';
import {createAppTransaction} from './app-transaction.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
const uuid=x=>{const h=sha(x);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;};
function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function createPrivateTextReadingRepository(pool,{verificationKey,keyVersion}={}) {
  if(typeof verificationKey!=='string'||verificationKey.length<32||
    typeof keyVersion!=='string'||!keyVersion.trim()||keyVersion.length>128)throw Error('BRIDGE_BYTE_VERIFIER_NOT_CONFIGURED');
  const transaction=createAppTransaction(pool,'STUDIO_IDENTITY_REQUIRED');
  return {
    async save({runId,originalId,extent:requested,quote,record,bytes:originalBytes},token) {
      let extent;
      try{extent=JSON.parse(JSON.stringify(requested));}catch{throw Error('PRIVATE_READING_LOCATOR_INVALID');}
      if(![runId,originalId,record?.project_id].every(x=>typeof x==='string'&&UUID.test(x))||
        record?.original_id!==originalId||record?.state!=='STORED_VERIFIED'||record?.content_type!=='text/plain'||
        !Buffer.isBuffer(originalBytes)||!HASH.test(record?.sha256??''))throw Error('PRIVATE_READING_ORIGINAL_UNVERIFIED');
      const bytes=Buffer.from(originalBytes);
      if(bytes.length!==record.byte_size||sha(bytes)!==record.sha256||extent?.raw_sha256!==record.sha256)
        throw Error('PRIVATE_READING_ORIGINAL_UNVERIFIED');
      if(extent?.kind!=='utf8_byte_range/v1'||![extent.raw_item_id,extent.source_version_id].every(x=>typeof x==='string'&&UUID.test(x))||
        !Number.isSafeInteger(extent.start_byte)||!Number.isSafeInteger(extent.end_byte)||extent.start_byte<0||
        extent.end_byte<=extent.start_byte||extent.end_byte>bytes.length||typeof quote!=='string'||Buffer.byteLength(quote)>32768)
        throw Error('PRIVATE_READING_LOCATOR_INVALID');
      const selected=bytes.subarray(extent.start_byte,extent.end_byte);
      if(!Buffer.from(quote,'utf8').equals(selected)||!Buffer.from(selected.toString('utf8'),'utf8').equals(selected)||
        extent.quote_sha256!==sha(selected))throw Error('PRIVATE_READING_QUOTE_MISMATCH');
      const requestDigest=sha(canonical({runId,originalId,extent,quote}));
      const readRunId=uuid('mab-private-read-run:'+requestDigest),readUnitId=uuid('mab-private-read-unit:'+requestDigest);
      return transaction(token,async(client,actor)=>{
        const now=Date.now();
        const encoded=Buffer.from(JSON.stringify({kind:'MOHEN_PRIVATE_TEXT_READING_V1',kid:keyVersion,
          uid:actor,project_id:record.project_id,original_id:originalId,raw_sha256:record.sha256,
          run_id:runId,read_run_id:readRunId,read_unit_id:readUnitId,request_digest:requestDigest,
          extent,quote,iat:now,exp:now+30000})).toString('base64url');
        const attestation=encoded+'.'+createHmac('sha256',verificationKey).update(encoded).digest('hex');
        const {rows}=await client.query('select studio.persist_private_text_reading($1,$2,$3,$4,$5,$6::jsonb,$7,$8) as reading',
          [originalId,readRunId,readUnitId,requestDigest,runId,JSON.stringify(extent),quote,attestation]);
        const reading=rows.length===1?rows[0].reading:null;
        if(!reading||reading.read_run_id!==readRunId||reading.read_unit_id!==readUnitId||
          reading.request_digest!==requestDigest||!HASH.test(reading.artifact_revision??''))
          throw Error('PRIVATE_READING_NOT_PERSISTED');
        return {...reading,qualification:'UNASSESSED'};
      });
    },
  };
}
