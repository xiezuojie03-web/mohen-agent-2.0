'use client';
import Link from 'next/link';
import {useState} from 'react';

export default function ForgotPasswordPage() {
  const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
  async function submit(event:React.FormEvent) {
    event.preventDefault();setError('');setBusy(true);
    try {
      const response=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'content-type':'application/json'},
        cache:'no-store',body:JSON.stringify({email})});
      if(!response.ok){setError('找回密码服务暂时不可用，请稍后重试。');return;}
      setDone(true);
    }catch{setError('连接失败，请稍后重试。');}finally{setBusy(false);}
  }
  return <div className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <h1>找回密码</h1>
    {done?<><p role="status">如果此邮箱对应可用账号，你将收到重置密码邮件。请检查收件箱和垃圾邮件，链接30分钟内有效。</p>
      <p className="auth-sub">若未收到，请稍后重新申请。</p><button className="auth-btn" type="button" onClick={()=>setDone(false)}>重新申请</button></>:
      <><p className="auth-sub">输入注册邮箱，通过邮件验证后设置新密码。</p>
        <div className="auth-field"><label htmlFor="recovery-email">注册邮箱</label><input id="recovery-email" className="auth-input" type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <button className="auth-btn" type="submit" disabled={busy}>{busy?'提交中…':'申请重置密码'}</button>
        {error&&<p className="auth-err" role="alert">{error}</p>}</>}
    <p className="auth-switch"><Link href="/login">返回登录</Link></p>
  </form></div>;
}
