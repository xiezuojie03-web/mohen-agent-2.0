"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProductionRelationSummary } from "../../lib/read-model-bridge";
import type { SubmittedWork } from "../../lib/publication";
import type { Beat } from "../../lib/studio-creation";

function parseBeats(content: string): Beat[] {
  try {
    const c = JSON.parse(content || "{}") as { beats?: Beat[] };
    return Array.isArray(c.beats) ? c.beats : [];
  } catch {
    return [];
  }
}

const NAV_ITEMS = [
  "运行概览",
  "资格审核",
  "作品审核",
  "发布管理",
  "知识资产",
  "权限与撤权",
  "用户管理",
  "数据统计",
  "系统设置",
];

const REVIEW_TABS = ["待审核", "待修改", "已通过", "已拒绝"];
const PUBLISH_TABS = ["已发布", "定时发布", "下架撤回"];

type SessionUser = { user_id: string; email: string; username: string; roles: string[] };
type PendingWork = {
  work_id: string;
  revision_id: string;
  title: string;
  revision_no: string;
  content: string;
  created_at: string;
};
type AdminUser = {
  user_id: string;
  email: string;
  username: string;
  roles: string[];
  status: string;
  created_at: string;
};

export default function AdminWorkbench({ summary }: { summary: ProductionRelationSummary }) {
  const [active, setActive] = useState(0);
  const [reviewTab, setReviewTab] = useState(0);
  const [publishTab, setPublishTab] = useState(0);

  // 登录状态
  const [user, setUser] = useState<SessionUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState(false);

  // 审核队列（operator）
  const [submitted, setSubmitted] = useState<SubmittedWork[]>([]);
  const [submittedLoading, setSubmittedLoading] = useState(false);

  // 资格审核队列（reviewer）
  const [pending, setPending] = useState<PendingWork[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // 用户列表
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // 操作反馈
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const roles = user?.roles ?? [];
  const isOperator = roles.includes("operator");
  const isReviewer = roles.includes("reviewer");

  const knowledgeCount = summary.entities.length + summary.stories.length;

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = (await res.json()) as { authenticated?: boolean; user?: SessionUser };
      setUser(json.authenticated ? json.user ?? null : null);
    } catch {
      setUser(null);
    }
  }, []);

  const refreshSubmitted = useCallback(async () => {
    setSubmittedLoading(true);
    try {
      const res = await fetch("/api/works/submitted");
      if (res.ok) {
        const json = (await res.json()) as { works?: SubmittedWork[] };
        setSubmitted(json.works ?? []);
      } else {
        setSubmitted([]);
      }
    } catch {
      setSubmitted([]);
    } finally {
      setSubmittedLoading(false);
    }
  }, []);

  const refreshPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/governance/gates/pending");
      if (res.ok) {
        const json = (await res.json()) as { works?: PendingWork[] };
        setPending(json.works ?? []);
      } else {
        setPending([]);
      }
    } catch {
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = (await res.json()) as { users?: AdminUser[] };
        setUsers(json.users ?? []);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (isOperator) void refreshSubmitted();
  }, [isOperator, refreshSubmitted]);

  useEffect(() => {
    if (isReviewer) void refreshPending();
  }, [isReviewer, refreshPending]);

  async function login() {
    setLoginBusy(true);
    setLoginError(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        setPassword("");
        await refreshUser();
      } else {
        setLoginError(true);
      }
    } catch {
      setLoginError(true);
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSubmitted([]);
    setPending([]);
  }

  async function decide(workId: string, revisionId: string, decision: "approved" | "rejected") {
    setFeedback(null);
    const res = await fetch("/api/governance/gates/decisions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ work_id: workId, revision_id: revisionId, decision }),
    });
    const json = (await res.json()) as { ok?: boolean; reason?: string };
    if (res.ok && json.ok) {
      setFeedback({ ok: true, text: decision === "approved" ? "已签核通过，可交给运营发布。" : "已签核拒绝。" });
    } else {
      setFeedback({ ok: false, text: json.reason === "reviewer_forbidden" ? "无独立审核权限" : "签核失败" });
    }
    await refreshPending();
  }

  async function publish(workId: string) {
    setFeedback(null);
    const res = await fetch(`/api/works/${workId}/publish`, { method: "POST" });
    const json = (await res.json()) as { ok?: boolean; reason?: string };
    if (res.ok && json.ok) {
      setFeedback({ ok: true, text: "已发布，作品对公众可见。" });
    } else {
      const zh: Record<string, string> = {
        reviewer_not_approved: "独立审核者尚未签核通过，暂不能发布。",
        no_submitted_revision: "没有待审修订。",
        no_provenance_refs: "作品缺少来源引用，暂不能发布。",
      };
      setFeedback({ ok: false, text: zh[json.reason ?? ""] ?? "发布失败" });
    }
    await refreshSubmitted();
  }

  async function toggleUserStatus(userId: string, status: "active" | "disabled") {
    setFeedback(null);
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setFeedback({ ok: true, text: status === "disabled" ? "已禁用该账号。" : "已启用该账号。" });
    } else {
      setFeedback({ ok: false, text: "操作失败" });
    }
    await refreshUsers();
  }

  function showLogin(): boolean {
    return !user;
  }

  return (
    <div className="admin">
      <div className="admin__body">
        <aside className="admin__sidebar">
          <div className="admin__sidebar-brand">运营管理 · 墨痕</div>
          <nav className="admin__nav">
            {NAV_ITEMS.map((item, i) => (
              <button
                key={item}
                className={`admin__nav-item${active === i ? " is-active" : ""}`}
                onClick={() => {
                  setActive(i);
                  setFeedback(null);
                  if (i === 6 && isOperator) void refreshUsers();
                }}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="admin__auth">
            {user ? (
              <>
                <span className="admin__auth-role">
                  {roles.map((r) => ({ member: "访客", creator: "创作者", operator: "运营", reviewer: "审核" }[r] || r)).join(" · ")}
                </span>
                <span style={{ fontSize: 11, color: "var(--mo-muted)" }}>{user.email}</span>
                <button className="admin__auth-btn" onClick={() => void logout()}>
                  退出登录
                </button>
              </>
            ) : (
              <span className="admin__auth-role">未登录</span>
            )}
          </div>
        </aside>

        <main className="admin__content">
          <div className="admin__header">
            <h1>{NAV_ITEMS[active]}</h1>
            <p>运营负责人工作台 · 作品审核、发布与知识资产管理</p>
          </div>

          {feedback && (
            <div
              className="admin__hint"
              style={{ color: feedback.ok ? "#2f6b4f" : "#b0413e", borderColor: feedback.ok ? "#bfd8c9" : "#e6c3c0" }}
            >
              {feedback.text}
            </div>
          )}

          {/* 运行概览 */}
          {active === 0 && (
            <>
              <div className="admin__kpis">
                <div className="admin__kpi">
                  <div className="admin__kpi-label">待审作品</div>
                  <div className="admin__kpi-value">{isOperator ? submitted.length : "—"}</div>
                  <div className="admin__kpi-note">{isOperator ? "待处理" : "登录后可见"}</div>
                </div>
                <div className="admin__kpi">
                  <div className="admin__kpi-label">待签核作品</div>
                  <div className="admin__kpi-value">{isReviewer ? pending.length : "—"}</div>
                  <div className="admin__kpi-note">{isReviewer ? "待资格审核" : "审核身份可见"}</div>
                </div>
                <div className="admin__kpi">
                  <div className="admin__kpi-label">知识资产总量</div>
                  <div className="admin__kpi-value">{knowledgeCount}</div>
                  <div className="admin__kpi-note">
                    对象 {summary.entities.length} · 故事 {summary.stories.length}
                  </div>
                </div>
                <div className="admin__kpi">
                  <div className="admin__kpi-label">用户总数</div>
                  <div className="admin__kpi-value">{isOperator ? users.length : "—"}</div>
                  <div className="admin__kpi-note">注册账号</div>
                </div>
              </div>

              <div className="admin__panel">
                <h2>运营说明</h2>
                <div className="admin__hint">
                  历史知识资格由独立专业Reviewer签发；运营审核与作品发布不能代签G0—G5。
                  作品发布前还需独立审核知识引用与媒体权利。此处作品签核不等于知识资格签发；知识覆盖只反映当前读取结果。
                </div>
              </div>
            </>
          )}

          {/* 资格审核（reviewer） */}
          {active === 1 && (
            <div className="admin__panel">
              <h2>资格审核 · 待签核作品</h2>
              {showLogin() ? (
                <div className="admin__login">
                  <p className="admin__login-tip">请用审核者账号登录。</p>
                </div>
              ) : !isReviewer ? (
                <div className="admin__empty">
                  你的账号没有独立审核权限。
                  <br />
                  独立审核者负责签核作品的「知识引用 + 媒体权利」，与运营分权，不能互相代签。
                </div>
              ) : pendingLoading ? (
                <div className="admin__empty">加载中…</div>
              ) : pending.length === 0 ? (
                <div className="admin__empty">暂无待签核作品。</div>
              ) : (
                <div className="admin__assets">
                  {pending.map((w) => (
                    <div className="admin__asset" key={w.work_id}>
                      <div className="admin__asset-head">
                        <span className="admin__asset-title">{w.title}</span>
                        <span style={{ display: "flex", gap: 6 }}>
                          <button className="admin__send" onClick={() => void decide(w.work_id, w.revision_id, "approved")}>
                            签核通过
                          </button>
                          <button className="admin__send" onClick={() => void decide(w.work_id, w.revision_id, "rejected")}>
                            拒绝
                          </button>
                        </span>
                      </div>
                      <div className="admin__asset-meta">版本 {w.revision_no} · 提交于 {w.created_at}</div>
                      {parseBeats(w.content).length > 0 && (
                        <div className="admin__asset-beats">
                          {parseBeats(w.content).map((b, i) => (
                            <div className="admin__asset-beat" key={i}>
                              <strong>
                                {String(i + 1).padStart(2, "0")} · {b.title}
                              </strong>
                              <span>{b.narration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 作品审核（operator） */}
          {active === 2 && (
            <div className="admin__panel">
              <h2>作品审核队列</h2>
              {showLogin() ? (
                <div className="admin__login">
                  <p className="admin__login-tip">审核与发布需要运营负责人登录。</p>
                  <div className="admin__login-row">
                    <input
                      className="admin__login-input"
                      placeholder="邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      className="admin__login-input"
                      placeholder="密码"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void login();
                      }}
                    />
                    <button className="admin__send" disabled={loginBusy} onClick={() => void login()}>
                      {loginBusy ? "登录中…" : "登录"}
                    </button>
                  </div>
                  {loginError && <p className="admin__login-err">邮箱或密码不对。</p>}
                </div>
              ) : !isOperator ? (
                <div className="admin__empty">你的账号没有运营权限。</div>
              ) : (
                <>
                  <div className="admin__tabs">
                    {REVIEW_TABS.map((t, i) => (
                      <button
                        key={t}
                        className={`admin__tab${reviewTab === i ? " is-active" : ""}`}
                        onClick={() => setReviewTab(i)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {submittedLoading ? (
                    <div className="admin__empty">加载中…</div>
                  ) : submitted.length === 0 ? (
                    <div className="admin__empty">
                      暂无投稿作品。
                      <br />
                      作品在创作 Studio 里“提交审核”后，会进入这里等待处理。
                    </div>
                  ) : (
                    <div className="admin__assets">
                      {submitted.map((w) => (
                        <div className="admin__asset" key={w.work_id}>
                          <div className="admin__asset-head">
                            <span className="admin__asset-title">{w.title}</span>
                            <button className="admin__send" onClick={() => void publish(w.work_id)}>
                              发布
                            </button>
                          </div>
                          <div className="admin__asset-meta">版本 {w.revision_no} · 提交于 {w.created_at}</div>
                          {parseBeats(w.content).length > 0 && (
                            <div className="admin__asset-beats">
                              {parseBeats(w.content).map((b, i) => (
                                <div className="admin__asset-beat" key={i}>
                                  <strong>
                                    {String(i + 1).padStart(2, "0")} · {b.title}
                                  </strong>
                                  <span>{b.narration}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 发布管理 */}
          {active === 3 && (
            <div className="admin__panel">
              <h2>发布管理</h2>
              <div className="admin__tabs">
                {PUBLISH_TABS.map((t, i) => (
                  <button
                    key={t}
                    className={`admin__tab${publishTab === i ? " is-active" : ""}`}
                    onClick={() => setPublishTab(i)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="admin__empty">
                已发布的作品会列在这里（含定时发布、下架撤回）。
                <br />
                作品在“作品审核”里发布后，自动进入“已发布”。
              </div>
            </div>
          )}

          {/* 知识资产 */}
          {active === 4 && (
            <div className="admin__panel">
              <h2>知识资产（真实数据 · G5 已发布）</h2>
              {summary.available ? (
                <div className="admin__assets">
                  <div className="admin__asset">
                    <div className="admin__asset-head">
                      <span className="admin__asset-title">
                        {summary.title ? `世界投影 · ${summary.title}` : "世界投影"}
                      </span>
                      <span className="admin__badge">合格已发布</span>
                    </div>
                    <p className="admin__asset-text">
                      登记对象：{summary.entities.join("、") || "（无）"}
                    </p>
                    <div className="admin__asset-meta">
                      关系 {summary.relations.length} 条 · 史料 {summary.evidence.length} 条
                    </div>
                  </div>

                  {summary.stories.map((s, i) => (
                    <div className="admin__asset" key={i}>
                      <div className="admin__asset-head">
                        <span className="admin__asset-title">故事 · {s.title}</span>
                        <span className="admin__badge">合格已发布</span>
                      </div>
                      <p className="admin__asset-text">{s.statement}</p>
                    </div>
                  ))}

                  {summary.timeline && (
                    <div className="admin__asset">
                      <div className="admin__asset-head">
                        <span className="admin__asset-title">时间投影 · {summary.timeline.title}</span>
                        <span className="admin__badge">合格已发布</span>
                      </div>
                      <div className="admin__asset-meta">事件 {summary.timeline.events.length} 条</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="admin__empty">知识库暂无已发布的合格资产。</div>
              )}
            </div>
          )}

          {/* 权限与撤权 */}
          {active === 5 && (
            <div className="admin__panel">
              <h2>权限与撤权</h2>
              <div className="admin__empty">
                权限与角色管理在“用户管理”中调整；知识资格撤权走独立审核链，避免 Operator 代签。
              </div>
            </div>
          )}

          {/* 用户管理 */}
          {active === 6 && (
            <div className="admin__panel">
              <h2>用户管理</h2>
              {!isOperator ? (
                <div className="admin__empty">需要运营权限。</div>
              ) : usersLoading ? (
                <div className="admin__empty">加载中…</div>
              ) : users.length === 0 ? (
                <div className="admin__empty">暂无注册用户。</div>
              ) : (
                <div className="admin__assets">
                  {users.map((u) => (
                    <div className="admin__asset" key={u.user_id}>
                      <div className="admin__asset-head">
                        <span className="admin__asset-title">{u.username || u.email}</span>
                        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span className="admin__badge">{u.status === "active" ? "正常" : "已停用"}</span>
                          <button
                            className="admin__send"
                            onClick={() => void toggleUserStatus(u.user_id, u.status === "active" ? "disabled" : "active")}
                          >
                            {u.status === "active" ? "禁用" : "启用"}
                          </button>
                        </span>
                      </div>
                      <div className="admin__asset-meta">
                        {u.email} · 角色 {u.roles.join(" / ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 数据统计 */}
          {active === 7 && (
            <div className="admin__panel">
              <h2>数据统计</h2>
              <div className="admin__empty">观看、收藏、评论等统计，在作品发布后开始积累。</div>
            </div>
          )}

          {/* 系统设置 */}
          {active === 8 && (
            <div className="admin__panel">
              <h2>系统设置</h2>
              <div className="admin__empty">系统健康、任务恢复与模型预算等设置待接入。</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
