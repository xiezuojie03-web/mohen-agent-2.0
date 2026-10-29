"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const REASON_ZH: Record<string, string> = {
  bad_request: "请求格式错误",
  invalid_credentials: "邮箱或密码不正确",
  disabled: "该账号已被停用",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { ok?: boolean; reason?: string };
      if (!res.ok || !json.ok) {
        setErr(REASON_ZH[json.reason ?? ""] ?? "登录失败，请重试");
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
        <h1>登录</h1>
        <p className="auth-sub">进入墨痕，继续你的历史探索与创作。</p>

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
          <label htmlFor="password">密码</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "登录中…" : "登录"}
        </button>

        {err && <p className="auth-err">{err}</p>}

        <p className="auth-switch">
          还没有账号？<Link href="/register">去注册</Link>
        </p>
      </form>
    </div>
  );
}
