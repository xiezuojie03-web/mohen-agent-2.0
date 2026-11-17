'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';

export default function ResetPasswordPage() {
  const initialized=useRef(false);
  const [token,setToken]=useState(''),[email,setEmail]=useState('');
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(initialized.current)return;initialized.current=true;
    const fragment=new URLSearchParams(window.location.hash.slice(1));
    const value=fragment.get('token')??'';
    setToken(/^[a-f0-9]{64}$/.test(value)?value:'');setEmail(fragment.get('email')??'');
    window.history.replaceState(null,'',window.location.pathname);
  },[]);
  async function submit(event:React.FormEvent) {
    event.preventDefault();setError('');
    if(password!==confirmation){setError('两次输入的密码不一致。');return;}
    setBusy(true);
    try {
      const response=await fetch('/api/auth/reset-password',{method:'POST',headers:{'content-type':'application/json'},
        cache:'no-store',body:JSON.stringify({email,token,password})});
      if(!response.ok){setError(response.status===503?'重置密码服务暂时不可用，请稍后重试。':'链接已失效或输入不符合要求，请重新申请。');return;}
      setToken('');setPassword('');setConfirmation('');setDone(true);
    }catch{setError('连接失败，请稍后重试。');}finally{setBusy(false);}
  }
  return <div className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <h1>重置密码</h1>
    {done?<><p role="status">密码已重置，请用注册邮箱和新密码登录。</p><Link href="/login">前往登录</Link></>:
      <><p className="auth-sub">为 {email||'你的账号'} 设置新密码，无需旧密码。</p>
        {token?<><div className="auth-field"><label htmlFor="reset-password">新密码（至少8位）</label><input id="reset-password" className="auth-input" type="password" autoComplete="new-password" minLength={8} maxLength={1024} value={password} onChange={e=>setPassword(e.target.value)} required /></div>
          <div className="auth-field"><label htmlFor="reset-confirm">再次输入新密码</label><input id="reset-confirm" className="auth-input" type="password" autoComplete="new-password" minLength={8} maxLength={1024} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required /></div>
          <button className="auth-btn" type="submit" disabled={busy}>{busy?'保存中…':'保存新密码'}</button></>:
          <p role="alert">链接无效或已离开原验证页面，请重新申请。</p>}
        {error&&<p className="auth-err" role="alert">{error}</p>}
        <p className="auth-switch"><Link href="/account/forgot-password">重新申请重置链接</Link></p></>}
  </form></div>;
}
