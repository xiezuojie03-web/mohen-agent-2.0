import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { signDatabaseSessionToken } from "../../../../lib/auth";
import { getNodePgPool, createPrivateOriginalRepository, createPrivateOriginalWorkflow } from "@mohen/data-access";
import { createPrivateOriginalStorage, MAX_ORIGINAL_BYTES } from "../../../../../../packages/data-access/src/private-original-storage.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED=new Set(["application/pdf","text/plain","image/png","image/jpeg","image/webp","application/octet-stream"]);
const noStore={"Cache-Control":"no-store"};
function fail(reason:string,status:number){return NextResponse.json({ok:false,reason},{status,headers:noStore});}
function errorResult(e:unknown){
 const code=e instanceof Error?e.message:"";
 if(code==="STUDIO_IDENTITY_REQUIRED")return fail("login_required",401);
 if(code==="STUDIO_PROJECT_NOT_FOUND"||code==="ORIGINAL_NOT_FOUND")return fail("not_found",404);
 if(code==="ORIGINAL_IDEMPOTENCY_CONFLICT"||code==="ORIGINAL_ASSET_BINDING_CONFLICT")return fail("original_conflict",409);
 if(["ORIGINAL_ID_INVALID","ORIGINAL_IDEMPOTENCY_INVALID","ORIGINAL_INTEGRITY_INVALID","ORIGINAL_FILENAME_INVALID","ORIGINAL_MIME_INVALID","ORIGINAL_SIZE_INVALID"].includes(code))return fail("invalid_original",400);
 return fail("private_original_storage_unavailable",503);
}
function enabled(){return process.env.MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED==="true";}
function workflow(){
 const repository=createPrivateOriginalRepository(getNodePgPool());
 return createPrivateOriginalWorkflow({repository,storage:createPrivateOriginalStorage()});
}
// Original bytes are only available to the authenticated owner by a fresh DB
// RLS transaction. Never mint a public/signed URL or return a storage key.
export async function POST(req:Request){
 const session=await getSession();
 if(!session)return fail("login_required",401);
 if(!enabled())return fail("private_original_storage_unavailable",503);
 const size=Number(req.headers.get("content-length")||0);
 if(size>MAX_ORIGINAL_BYTES+4096)return fail("file_too_large",413);
 let form:FormData;
 try{form=await req.formData();}catch{return fail("bad_request",400);}
 const file=form.get("file");
 if(!(file instanceof File))return fail("file_required",400);
 if(file.size===0||file.size>MAX_ORIGINAL_BYTES)return fail("file_size_invalid",413);
 const projectId=form.get("project_id"),key=form.get("idempotency_key");
 if(typeof projectId!=="string"||!UUID.test(projectId)||
    typeof key!=="string"||key.length<8||key.length>200||
    form.get("rights_declared")!=="true"||
    !file.name||file.name.length>200||!ALLOWED.has(file.type||"application/octet-stream"))return fail("invalid_original",400);
 try{
  const bytes=Buffer.from(await file.arrayBuffer());
  const data=await workflow().upload({projectId,originalId:randomUUID(),assetId:randomUUID(),
   idempotencyKey:key,bytes,fileName:file.name,contentType:file.type||"application/octet-stream"},
   signDatabaseSessionToken(session));
  return NextResponse.json({ok:true,original_id:data.original_id,asset_id:data.asset_id,
    revision_id:data.asset_revision_id,sha256:data.sha256,byte_size:data.byte_size,
    state:data.state,rights_status:"declared_unverified"},{status:201,headers:noStore});
 }catch(e){return errorResult(e);}
}
export async function GET(req:Request){
 const session=await getSession();
 if(!session)return fail("login_required",401);
 if(!enabled())return fail("private_original_storage_unavailable",503);
 const originalId=new URL(req.url).searchParams.get("original_id");
 if(!originalId||!UUID.test(originalId))return fail("bad_request",400);
 try{
  const {record,bytes}=await workflow().download(originalId,signDatabaseSessionToken(session));
  return new NextResponse(new Uint8Array(bytes),{status:200,headers:{
   ...noStore,"Content-Type":record.content_type,"Content-Length":String(bytes.length),
   "X-Content-Type-Options":"nosniff",
   "Content-Disposition":"attachment; filename=\"original\"",
  }});
 }catch(e){return errorResult(e);}
}
