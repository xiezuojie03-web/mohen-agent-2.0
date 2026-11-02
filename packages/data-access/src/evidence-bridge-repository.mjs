// Private candidate connectivity only; no formal Gate or publication authority.
import {createHash,createHmac} from 'node:crypto';
import {createAppTransaction} from './app-transaction.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function identity(...values){if(values.some(x=>typeof x!=='string'||!UUID.test(x)))throw Error('BRIDGE_ID_INVALID');}
export function createEvidenceBridgeRepository(pool,{readOriginal,verificationKey=process.env.MOHEN_ORIGINAL_BRIDGE_SECRET,keyVersion='mab-original-bridge-v1'}={}){
 if(typeof readOriginal!=='function')throw Error('BYTE_VERIFIED_PRIVATE_ORIGINAL_READER_REQUIRED');
 if(typeof verificationKey!=='string'||verificationKey.length<32||typeof keyVersion!=='string'||!keyVersion)throw Error('BRIDGE_BYTE_VERIFIER_NOT_CONFIGURED');
 const transaction=createAppTransaction(pool,'STUDIO_IDENTITY_REQUIRED');
 return {
  async linkReading({originalId,evidenceId,readUnitId,extent,quote,extentOrder=1},token){
   identity(originalId,evidenceId,readUnitId);
   if(!extent||extent.kind!=='utf8_byte_range/v1'||!Number.isSafeInteger(extent.start_byte)||!Number.isSafeInteger(extent.end_byte)||extent.start_byte<0||extent.end_byte<=extent.start_byte||!Number.isSafeInteger(extentOrder)||extentOrder<1||extentOrder>10000)throw Error('BRIDGE_LOCATOR_INVALID');
   identity(extent.source_version_id,extent.raw_item_id);
   const {record,bytes}=await readOriginal(originalId,token);
   if(record.content_type!=='text/plain')throw Error('BRIDGE_READER_NOT_IMPLEMENTED');
   if(extent.end_byte>bytes.length||extent.end_byte-extent.start_byte>32768||typeof quote!=='string')throw Error('BRIDGE_LOCATOR_INVALID');
   const selected=bytes.subarray(extent.start_byte,extent.end_byte);
   if(!Buffer.from(quote,'utf8').equals(selected)||!Buffer.from(selected.toString('utf8'),'utf8').equals(selected))throw Error('BRIDGE_QUOTE_MISMATCH');
   if(extent.raw_sha256!==record.sha256||digest(bytes)!==record.sha256||extent.quote_sha256!==digest(selected))throw Error('BRIDGE_QUOTE_MISMATCH');
   return transaction(token,async(client,actor)=>{
    const now=Date.now();
    const encoded=Buffer.from(JSON.stringify({kind:'MOHEN_PRIVATE_READ_BRIDGE_V1',kid:keyVersion,uid:actor,project_id:record.project_id,original_id:originalId,raw_sha256:record.sha256,evidence_id:evidenceId,read_unit_id:readUnitId,extent,quote,extent_order:extentOrder,iat:now,exp:now+30000})).toString('base64url');
    const attestation=encoded+'.'+createHmac('sha256',verificationKey).update(encoded).digest('hex');
    const r=await client.query('select studio.bind_private_read_evidence($1,$2,$3,$4::jsonb,$5,$6,$7)::text as link_id',[originalId,evidenceId,readUnitId,JSON.stringify(extent),quote,extentOrder,attestation]);
    if(r.rows.length!==1||!r.rows[0].link_id)throw Error('BRIDGE_SAVE_FAILED');
    return {link_id:r.rows[0].link_id,qualification:'UNASSESSED'};
   });
  },
  async linkClaim({originalId,evidenceId,claimRevisionId,supportType},token){
   identity(originalId,evidenceId,claimRevisionId);
   if(!['supports','contradicts','contextualizes'].includes(supportType))throw Error('BRIDGE_CLAIM_BINDING_INVALID');
   // Re-read original integrity and current owner access; DB checks it again
   // under project/account locks in the exact bridge transaction.
   await readOriginal(originalId,token);
   return transaction(token,async client=>{
    const r=await client.query('select studio.bind_private_claim_evidence($1,$2,$3,$4)::text as link_id',[originalId,claimRevisionId,evidenceId,supportType]);
    if(r.rows.length!==1||!r.rows[0].link_id)throw Error('BRIDGE_SAVE_FAILED');
    return {link_id:r.rows[0].link_id,qualification:'UNASSESSED'};
   });
  },
 };
}
