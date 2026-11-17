import {after} from 'next/server';
import {requestPasswordReset} from '../../../../lib/password-recovery';
import {readRecoveryRequest,recoveryReply} from '../../../../lib/password-recovery-request';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

export async function POST(request:Request) {
  const body=await readRecoveryRequest(request);
  if(body instanceof Response)return body;
  try {
    // Managed post-response delivery avoids account discovery via mail-provider latency.
    await requestPasswordReset(body.email,work=>after(work));
    return recoveryReply(202);
  }catch{return recoveryReply(503,'password_recovery_unavailable');}
}
