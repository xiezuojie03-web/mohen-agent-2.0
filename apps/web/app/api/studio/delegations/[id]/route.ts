import {NextResponse} from 'next/server';
import {getSession} from '../../../../../lib/session';
import {signDatabaseSessionToken} from '../../../../../lib/auth';
import {createStudioDelegationRepository,getNodePgPool} from '@mohen/data-access';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Owner-only inspection through project owner_user_id RLS. No dispatch or approval. */
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 const session=await getSession();
 if(!session)return NextResponse.json({ok:false,reason:'login_required'},{status:401});
 const {id}=await context.params;
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))
  return NextResponse.json({ok:false,reason:'invalid_delegation_id'},{status:400});
 try{
  const store=createStudioDelegationRepository(getNodePgPool()),token=signDatabaseSessionToken(session);
  const delegation=await store.getDelegation(id,token);
  if(!delegation)return NextResponse.json({ok:false,reason:'not_found'},{status:404,headers:{'cache-control':'no-store'}});
  const receipts=await store.listReceipts(id,token);
  return NextResponse.json({ok:true,delegation,receipts,execution_authorized:false},{headers:{'cache-control':'no-store'}});
 }catch(error){
  const unauthorized=error instanceof Error&&error.message==='STUDIO_IDENTITY_REQUIRED';
  return NextResponse.json({ok:false,reason:unauthorized?'login_required':'studio_storage_unavailable'},
   {status:unauthorized?401:503,headers:{'cache-control':'no-store'}});
 }
}
