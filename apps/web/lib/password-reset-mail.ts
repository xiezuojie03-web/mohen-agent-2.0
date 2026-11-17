import {isAuthConfigured,revocableSessionsEnabled} from './auth';
import nodemailer from 'nodemailer';

/** Only deployment-controlled origin enters emails; never trust Host/forwarded headers. */
export function passwordResetMailConfig() {
  if(process.env.MOHEN_PASSWORD_RESET_ENABLED!=='true'||!isAuthConfigured()||!revocableSessionsEnabled())return null;
  const key=process.env.MOHEN_QQ_SMTP_AUTH_CODE?.trim(),from=process.env.MOHEN_AUTH_MAIL_FROM?.trim();
  const origin=process.env.MOHEN_AUTH_PUBLIC_ORIGIN?.trim()||
    (process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'');
  if(!key||!from||!/^[a-z0-9._-]+@(qq|foxmail)\.com$/i.test(from))return null;
  try {
    const url=new URL(origin);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;
    return {key,from,origin:url.origin};
  }catch{return null;}
}

export async function sendPasswordResetMail(email:string,link:string):Promise<void> {
  const config=passwordResetMailConfig();
  if(!config)throw new Error('PASSWORD_RESET_MAIL_UNAVAILABLE');
  const transport=nodemailer.createTransport({host:'smtp.qq.com',port:465,secure:true,
    auth:{user:config.from,pass:config.key},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000,dnsTimeout:10000,
    logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  // QQ SMTP authorization code, never the mailbox/site login password.
  // Text-only transactional email. Never log body, link, SMTP transcript, or keys.
  let deadline:ReturnType<typeof setTimeout>|undefined;
  try {
    const sending=transport.sendMail({from:config.from,to:[email],subject:'墨痕｜重置登录密码',
      text:`你申请了重置墨痕登录密码。请在30分钟内打开以下链接，设置新密码：\n\n${link}\n\n链接只能使用一次。如果不是你本人申请，请忽略此邮件，你的原密码不受影响。`,
    });
    const result=await Promise.race([sending,new Promise<never>((_resolve,reject)=>{
      deadline=setTimeout(()=>reject(new Error('delivery deadline')),15000);
    })]);
    if(!result.accepted.some(address=>String(address).toLowerCase()===email.toLowerCase()))throw new Error('delivery rejected');
  }catch{throw new Error('PASSWORD_RESET_MAIL_UNAVAILABLE');}finally{clearTimeout(deadline);transport.close();}
}
