"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';

export default function PasswordSetupPage() {
  const [token,setToken]=useState(''),[email,setEmail]=useState('');
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const params=new URLSearchParams(window.location.hash.slice(1));
    setToken(params.get('token')??'');setEmail(params.get('email')??'');
    // The capability stays in memory, not server URL/access logs or storage.
    window.history.replaceState(null,'',window.location.pathname);
  },[]);
  async function submit(event:React.FormEvent) {
    event.preventDefault();setError('');
    if(password!==confirmation){setError('两次输入的密码不一致。');return;}
    setBusy(true);
    try {
      const response=await fetch('/api/auth/password-setup',{method:'POST',headers:{'content-type':'application/json'},
        cache:'no-store',body:JSON.stringify({email,token,password})});
      const result=await response.json();
      if(!response.ok||!result.ok){setError(result.reason==='password_setup_unavailable'?'密码设置暂时不可用，请稍后重试。':'设置链接已失效或输入不符合要求，请申请新的设置链接。');return;}
      setPassword('');setConfirmation('');setToken('');setDone(true);
    }catch{setError('连接失败，请稍后重试。');}finally{setBusy(false);}
  }
  return <div className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <h1>设置登录密码</h1>
    {done?<><p>密码已设置。请用你的邮箱和新密码登录。</p><Link href="/login">前往登录</Link></>:
      <><p className="auth-sub">请自行设置密码。设置链接限时且只能使用一次。</p>
        <div className="auth-field"><label htmlFor="setup-email">邮箱</label><input className="auth-input" id="setup-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div className="auth-field"><label htmlFor="setup-password">新密码（至少8位）</label><input className="auth-input" id="setup-password" type="password" autoComplete="new-password" minLength={8} maxLength={1024} value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        <div className="auth-field"><label htmlFor="setup-confirm">再次输入新密码</label><input className="auth-input" id="setup-confirm" type="password" autoComplete="new-password" minLength={8} maxLength={1024} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required /></div>
        <button className="auth-btn" type="submit" disabled={busy||!token}>{busy?'设置中…':'保存密码'}</button>
        {!token&&<p role="alert">请从有效的一次性设置链接进入。</p>}
        {error&&<p className="auth-err" role="alert">{error}</p>}
      </>}
  </form></div>;
}
