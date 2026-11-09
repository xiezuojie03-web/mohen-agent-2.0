import { randomUUID } from 'node:crypto';
import { createAppTransaction } from './app-transaction.mjs';
import { originalHash, privateOriginalKey, MAX_ORIGINAL_BYTES } from './private-original-storage.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
// 私有原件不限制载体类型（多模态）：只校验 MIME 语法与长度，由各读法自行判断能否处理。
const MIME_TYPE=/^[a-zA-Z0-9][a-zA-Z0-9!#$%^&*_+.-]{0,126}\/[a-zA-Z0-9][a-zA-Z0-9!#$%^&*_+.-]{0,126}$/;
function id(v){if(typeof v!=='string'||!UUID.test(v))throw new Error('ORIGINAL_ID_INVALID');}
function result(r){return {original_id:r.original_id,project_id:r.project_id,asset_id:r.asset_id,
 asset_revision_id:r.asset_revision_id,state:r.state,sha256:r.sha256,
 byte_size:Number(r.byte_size),file_name:r.file_name,content_type:r.content_type};}

export function createPrivateOriginalRepository(pool){
 const tx=createAppTransaction(pool,'STUDIO_IDENTITY_REQUIRED');
 return {
  async reserve(x,token){
   const {projectId,originalId,assetId,idempotencyKey,sha256,byteSize,fileName,contentType}=x;
   id(projectId);id(originalId);id(assetId);
   if(typeof idempotencyKey!=='string'||idempotencyKey.length<8||idempotencyKey.length>200)throw new Error('ORIGINAL_IDEMPOTENCY_INVALID');
   if(!HASH.test(sha256)||!Number.isSafeInteger(byteSize)||byteSize<1||byteSize>MAX_ORIGINAL_BYTES)throw new Error('ORIGINAL_INTEGRITY_INVALID');
   if(typeof fileName!=='string'||!fileName.trim()||fileName.length>200||/[\u0000-\u001f\u007f/\\]/.test(fileName))throw new Error('ORIGINAL_FILENAME_INVALID');
   if(typeof contentType!=='string'||contentType.length>100||!MIME_TYPE.test(contentType))throw new Error('ORIGINAL_MIME_INVALID');
   const storageKey=privateOriginalKey(projectId,originalId);
   return tx(token,async(client,actor)=>{
    const p=await client.query("select project_id from studio.projects where project_id=$1 and lifecycle_status='ACTIVE'",[projectId]);
    if(p.rows.length!==1)throw new Error('STUDIO_PROJECT_NOT_FOUND');
    await client.query("insert into studio.private_originals(original_id,project_id,asset_id,owner_user_id,idempotency_key,storage_key,sha256,byte_size,file_name,content_type,rights_declared) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) on conflict do nothing",
     [originalId,projectId,assetId,actor,idempotencyKey,storageKey,sha256,byteSize,fileName,contentType]);
    const q=await client.query("select * from studio.private_originals where project_id=$1 and idempotency_key=$2 for update",[projectId,idempotencyKey]);
    const r=q.rows[0];
    if(!r||r.owner_user_id!==actor||r.sha256!==sha256||Number(r.byte_size)!==byteSize||
      r.file_name!==fileName||r.content_type!==contentType)throw new Error('ORIGINAL_IDEMPOTENCY_CONFLICT');
    return {...result(r),storage_key:r.storage_key};
   });
  },
  async finalize(originalId,expectedHash,token){
   id(originalId);
   if(!HASH.test(expectedHash))throw new Error('ORIGINAL_INTEGRITY_INVALID');
   return tx(token,async(client,actor)=>{
    const q=await client.query("select * from studio.private_originals where original_id=$1 for update",[originalId]);
    const r=q.rows[0];
    if(!r||r.owner_user_id!==actor)throw new Error('ORIGINAL_NOT_FOUND');
    if(r.sha256!==expectedHash)throw new Error('ORIGINAL_INTEGRITY_INVALID');
    if(r.state==='STORED_VERIFIED')return result(r);
    if(r.state!=='PENDING')throw new Error('ORIGINAL_NOT_PENDING');
    const p=await client.query("select project_id from studio.projects where project_id=$1 and lifecycle_status='ACTIVE'",[r.project_id]);
    if(p.rows.length!==1)throw new Error('STUDIO_PROJECT_NOT_FOUND');
    await client.query("insert into studio.asset_heads(asset_id,project_id,asset_kind) values($1,$2,'source_anchor') on conflict do nothing",[r.asset_id,r.project_id]);
    const h=await client.query("select project_id,asset_kind,current_revision_id from studio.asset_heads where asset_id=$1 for update",[r.asset_id]);
    if(h.rows.length!==1||h.rows[0].project_id!==r.project_id||h.rows[0].asset_kind!=='source_anchor'||h.rows[0].current_revision_id!==null)
      throw new Error('ORIGINAL_ASSET_BINDING_CONFLICT');
    const revisionId=randomUUID(),locator='mohen-private-originals/'+r.storage_key;
    // The anchor must point back at the verified original byte object in the
    // standard source_refs column, not only inside provenance: otherwise the
    // asset is an unbacklinked original_material and cannot be consumed.
    const sourceRefs=[{type:'private_original',id:r.original_id,revision:revisionId}];
    await client.query("insert into studio.asset_revisions(revision_id,asset_id,revision_no,actor_id,workspace_id,origin_kind,epistemic_class,payload_storage_ref,payload_format,content_hash,provenance,source_refs,idempotency_key,correlation_id) values($1,$2,1,$3,'studio','human','original_material',$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)",
      [revisionId,r.asset_id,actor,locator,r.content_type,r.sha256,JSON.stringify({private_original_id:r.original_id,
      storage_ref:locator,file_name:r.file_name,byte_size:Number(r.byte_size),rights_status:'declared_unverified'}),
      JSON.stringify(sourceRefs),
      'original:'+r.original_id,randomUUID()]);
    const u=await client.query("update studio.asset_heads set current_revision_id=$1 where asset_id=$2 and current_revision_id is null returning asset_id",
      [revisionId,r.asset_id]);
    if(u.rows.length!==1)throw new Error('ORIGINAL_ASSET_BINDING_CONFLICT');
    const f=await client.query("update studio.private_originals set state='STORED_VERIFIED',asset_revision_id=$2,verified_at=now() where original_id=$1 and state='PENDING' returning *",
      [originalId,revisionId]);
    if(f.rows.length!==1)throw new Error('ORIGINAL_FINALIZE_FAILED');
    // RETURNING alone does not recheck a withdrawal made by a later trigger.
    // Confirm current visibility before acknowledging the atomic DB commit.
    const confirmed=await client.query("select * from studio.private_originals where original_id=$1 and state='STORED_VERIFIED' and asset_revision_id=$2",[originalId,revisionId]);
    if(confirmed.rows.length!==1)throw new Error('ORIGINAL_FINALIZE_FAILED');
    return result(confirmed.rows[0]);
   });
  },
  async listForProject(projectId,token){
   id(projectId);
   return tx(token,async(client)=>{
    const q=await client.query("select * from studio.private_originals where project_id=$1 and state='STORED_VERIFIED' order by created_at desc,original_id limit 20",[projectId]);
    return q.rows.map(result);
   });
  },
  async getStored(originalId,token){
   id(originalId);
   return tx(token,async(client)=>{
    const q=await client.query("select * from studio.private_originals where original_id=$1 and state='STORED_VERIFIED'",[originalId]);
    return q.rows[0]?{...result(q.rows[0]),storage_key:q.rows[0].storage_key}:null;
   });
  },
 };
}

export function createPrivateOriginalWorkflow({repository,storage}){
 return {
  async upload(input,token){
   const {projectId,originalId,assetId,idempotencyKey,bytes,fileName,contentType}=input;
   if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX_ORIGINAL_BYTES)throw new Error('ORIGINAL_SIZE_INVALID');
   const hash=originalHash(bytes);
   const reserved=await repository.reserve({projectId,originalId,assetId,idempotencyKey,sha256:hash,
    byteSize:bytes.length,fileName,contentType},token);
   // Owner is validated in an RLS transaction before privileged Storage access.
   let exists=false;
   try{
    const previous=await storage.readVerified(reserved.storage_key,hash,bytes.length);
    if(!previous.equals(bytes))throw new Error('ORIGINAL_INTEGRITY_FAILED');
    exists=true;
   }catch(e){if(e?.message!=='ORIGINAL_NOT_FOUND')throw e;}
   if(!exists){
    try{await storage.putVerified(reserved.storage_key,bytes,contentType);}
    catch(e){
     // POST may have succeeded before timeout: recover by reading, never overwrite.
     const actual=await storage.readVerified(reserved.storage_key,hash,bytes.length);
     if(!actual.equals(bytes))throw e;
    }
   }
   const final=await repository.finalize(reserved.original_id,hash,token);
   if(final.state!=='STORED_VERIFIED'||final.sha256!==hash||!final.asset_revision_id)throw new Error('ORIGINAL_FINALIZE_FAILED');
   return final;
  },
  async download(originalId,token){
   const before=await repository.getStored(originalId,token);
   if(!before)throw new Error('ORIGINAL_NOT_FOUND');
   const bytes=await storage.readVerified(before.storage_key,before.sha256,before.byte_size);
   const after=await repository.getStored(originalId,token);
   if(!after||after.asset_revision_id!==before.asset_revision_id||after.sha256!==before.sha256)
     throw new Error('ORIGINAL_NOT_FOUND');
   return {record:before,bytes};
  },
 };
}
