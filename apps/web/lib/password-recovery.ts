import crypto from 'node:crypto';
import {queryRows} from '@mohen/data-access';
import {hashPassword,revocableSessionsEnabled} from './auth';
import {passwordResetMailConfig,sendPasswordResetMail} from './password-reset-mail';

const normalizeEmail=(value:unknown)=>typeof value==='string'&&value.trim().length<=254&&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())?value.trim().toLowerCase():null;
const digest=(token:string)=>crypto.createHash('sha256').update('mohen-password-reset-v1\n'+token).digest('hex');

/** Uniform acknowledgement: never return account existence or reset capabilities. */
export async function requestPasswordReset(input:unknown,defer?:(work:()=>Promise<void>)=>void):Promise<void> {
  const config=passwordResetMailConfig(),email=normalizeEmail(input);
  if(!config)throw new Error('PASSWORD_RESET_UNAVAILABLE');
  if(!email)return;
  // One bounded row survives across function instances. No IP/email address ledger.
  const budget=await queryRows(`insert into control.web_password_reset_request_budget as b
    (singleton,window_started_at,requests) values(true,clock_timestamp(),1)
    on conflict(singleton) do update set
      requests=case when b.window_started_at<=clock_timestamp()-interval '1 minute' then 1 else b.requests+1 end,
      window_started_at=case when b.window_started_at<=clock_timestamp()-interval '1 minute' then clock_timestamp() else b.window_started_at end
    where b.window_started_at<=clock_timestamp()-interval '1 minute' or b.requests<30
    returning singleton as allowed`);
  if(!budget.length)return;
  const token=crypto.randomBytes(32).toString('hex'),token_hash=digest(token);
  const rows=await queryRows(`with locked_account as materialized (
    select user_id,email,session_not_before from public.users
    where lower(email)=:'email' and status='active' for update
  ) insert into control.web_password_resets as r
    (user_id,token_hash,expires_at,session_epoch,last_requested_at,window_started_at,requests)
    select user_id,:'token_hash',clock_timestamp()+interval '30 minutes',session_not_before,
      clock_timestamp(),clock_timestamp(),1 from locked_account
    on conflict(user_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,
      session_epoch=excluded.session_epoch,last_requested_at=excluded.last_requested_at,
      requests=case when r.window_started_at<=clock_timestamp()-interval '1 hour' then 1 else r.requests+1 end,
      window_started_at=case when r.window_started_at<=clock_timestamp()-interval '1 hour' then clock_timestamp() else r.window_started_at end
    where r.last_requested_at<=clock_timestamp()-interval '60 seconds'
      and (r.window_started_at<=clock_timestamp()-interval '1 hour' or r.requests<5)
    returning user_id::text,(select email from public.users u where u.user_id=r.user_id) as email`,{email,token_hash});
  if(rows.length!==1)return;
  const fragment=new URLSearchParams({email:String(rows[0].email),token});
  const deliver=async()=>{try {
    await sendPasswordResetMail(String(rows[0].email),`${config.origin}/account/reset-password#${fragment}`);
  }catch {
    // Keep cooldown/budget; invalidate this delivery only, never a concurrent newer token.
    try {await queryRows(`update control.web_password_resets set token_hash=null,expires_at=null
      where user_id=:'id'::uuid and token_hash=:'token_hash' returning user_id`,{id:rows[0].user_id,token_hash});}
    catch{/* Capability still expires; never include underlying DB/provider errors in logs. */}
    console.warn('PASSWORD_RESET_MAIL_FAILED');
  }};
  if(defer)defer(deliver);else await deliver();
}

export async function completePasswordReset(input:{email:unknown;token:unknown;password:unknown}):Promise<boolean> {
  const email=normalizeEmail(input.email);
  if(!revocableSessionsEnabled()||!email||typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token)||
    typeof input.password!=='string'||input.password.length<8||Buffer.byteLength(input.password)>1024)return false;
  // Lock both rows, then update and consume within ONE statement/transaction.
  // Account-change trigger advances the epoch, revoking earlier browser sessions.
  const rows=await queryRows(`with locked_account as materialized (
      select user_id,session_not_before from public.users
      where lower(email)=:'email' and status='active' for update
    ), candidate as (
      select r.user_id,r.session_epoch from control.web_password_resets r join locked_account u using(user_id)
      where r.token_hash=:'token_hash'
        and r.expires_at>clock_timestamp() and u.session_not_before=r.session_epoch for update of r
    ), changed as (
      update public.users u set password_hash=:'password_hash',updated_at=now() from candidate c
      where u.user_id=c.user_id and u.status='active' and u.session_not_before=c.session_epoch returning u.user_id
    ), consumed as (
      update control.web_password_resets r set token_hash=null,expires_at=null from changed c
      where r.user_id=c.user_id returning r.user_id
    ) select user_id::text from consumed`,{email,token_hash:digest(input.token),password_hash:hashPassword(input.password)});
  return rows.length===1;
}
