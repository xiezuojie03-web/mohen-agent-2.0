'use client';

import Link from 'next/link';
import {useState} from 'react';

export default function PreviewOwnerPasswordForm() {
  const [password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');

  async function submit(event:React.FormEvent) {
    event.preventDefault();
    setError('');
    if(password.length<8){setError('新密码至少需要8位。');return;}
    if(password!==confirmation){setError('两次输入的密码不一致。');return;}
    setBusy(true);
    try {
      const response=await fetch('/api/auth/preview-owner-password',{
        method:'POST',
        headers:{'content-type':'application/json'},
        cache:'no-store',
        body:JSON.stringify({password,confirmation}),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.ok) {
        setError(result.reason==='owner_recovery_not_available'
          ?'当前研发环境未找到唯一有效的 Owner 账号，没有修改任何账号。'
          :result.reason==='password_invalid'
            ?'新密码至少需要8位。'
            :'密码恢复暂时不可用，请稍后重试。');
        return;
      }
      setPassword('');
      setConfirmation('');
      setDone(true);
    } catch {
      setError('连接失败，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-shell">
    <form className="auth-card" onSubmit={submit}>
      <h1>重置 Owner 密码</h1>
      {done ? <>
        <p role="status">密码已更新，旧登录会话已失效。请使用新密码重新登录。</p>
        <Link href="/login">返回登录</Link>
      </> : <>
        <p className="auth-sub">这是受保护的研发 Preview 专用恢复入口。无需旧密码、邮件或临时设置链接。</p>
        <div className="auth-field">
          <label htmlFor="owner-new-password">新密码（至少8位）</label>
          <input id="owner-new-password" className="auth-input" type="password"
            autoComplete="new-password" minLength={8} maxLength={1024}
            value={password} onChange={event=>setPassword(event.target.value)} required />
        </div>
        <div className="auth-field">
          <label htmlFor="owner-confirm-password">再次输入新密码</label>
          <input id="owner-confirm-password" className="auth-input" type="password"
            autoComplete="new-password" minLength={8} maxLength={1024}
            value={confirmation} onChange={event=>setConfirmation(event.target.value)} required />
        </div>
        <button className="auth-btn" type="submit" disabled={busy}>
          {busy?'保存中…':'保存新密码'}
        </button>
        {error&&<p className="auth-err" role="alert">{error}</p>}
        <p className="auth-switch"><Link href="/login">返回登录</Link></p>
      </>}
    </form>
  </div>;
}
