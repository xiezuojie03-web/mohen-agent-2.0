"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const REASON_ZH: Record<string, string> = {
  bad_request: "请求格式错误",
  invalid_email: "邮箱格式不正确",
  invalid_username: "用户名至少 2 个字",
  weak_password: "密码至少 8 位",
  email_taken: "该邮箱已注册，请直接登录",
  registration_disabled: "注册暂未开放",
  invalid_invite: "邀请码不正确",
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const json = (await res.json()) as { ok?: boolean; reason?: string };
      if (!res.ok || !json.ok) {
        setErr(REASON_ZH[json.reason ?? ""] ?? "注册失败，请重试");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErr("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h1>注册</h1>
        <p className="auth-sub">创建账号，开启你的墨痕之旅。</p>

        <div className="auth-field">
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="username">用户名</label>
          <input
            id="username"
            className="auth-input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="怎么称呼你"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">密码</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 8 位"
            required
          />
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "注册中…" : "注册"}
        </button>

        {err && <p className="auth-err">{err}</p>}

        <p className="auth-switch">
          已有账号？<Link href="/login">去登录</Link>
        </p>
      </form>
    </div>
  );
}
