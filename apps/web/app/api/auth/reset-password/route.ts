import {completePasswordReset} from '../../../../lib/password-recovery';
import {readRecoveryRequest,recoveryReply} from '../../../../lib/password-recovery-request';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:Request) {
  const body=await readRecoveryRequest(request);
  if(body instanceof Response)return body;
  try {
    const ok=await completePasswordReset({email:body.email,token:body.token,password:body.password});
    return ok?recoveryReply(200):recoveryReply(400,'reset_invalid_or_expired');
  }catch{return recoveryReply(503,'password_recovery_unavailable');}
}
