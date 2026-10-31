"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/studio", label: "创作 Studio" },
  { href: "/watch", label: "观看 WATCH" },
  { href: "/explore", label: "探索 EXP" },
];

const ROLE_LABELS: Record<string, string> = {
  member: "访客",
  creator: "创作者",
  operator: "运营",
  reviewer: "审核",
};

type SearchWorks = { work_id: string; title: string; revision_no: string }[];
type SearchKnowledge = { id: string; kind: string; snippet: string }[];
type Notification = { id: string; type: string; title: string; body: string; read: boolean; created_at: string };
type SessionUser = { user_id: string; email: string; username: string; roles: string[] };

export default function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [openMenu, setOpenMenu] = useState<"" | "search" | "notify" | "user">("");
  const [searchQ, setSearchQ] = useState("");
  const [works, setWorks] = useState<SearchWorks>([]);
  const [knowledge, setKnowledge] = useState<SearchKnowledge>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/session/me")
      .then((r) => r.json())
      .then((j) => setUser(j.authenticated ? j.user : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenMenu("");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function runSearch() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch("/api/search?q=" + encodeURIComponent(q));
      const json = (await res.json()) as { ok?: boolean; works?: SearchWorks; knowledge?: SearchKnowledge };
      setWorks(json.works ?? []);
      setKnowledge(json.knowledge ?? []);
    } catch {
      setWorks([]);
      setKnowledge([]);
    } finally {
      setSearching(false);
    }
  }

  async function openNotify() {
    setOpenMenu(openMenu === "notify" ? "" : "notify");
    if (openMenu === "notify") return;
    try {
      const res = await fetch("/api/notifications");
      const json = (await res.json()) as { notifications?: Notification[] };
      setNotifications(json.notifications ?? []);
    } catch {
      setNotifications([]);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* 忽略 */
    }
    setUser(null);
    setOpenMenu("");
    router.push("/");
    router.refresh();
  }

  const roles = user?.roles ?? [];
  const isOperator = roles.includes("operator") || roles.includes("reviewer");
  const hasResults = works.length > 0 || knowledge.length > 0;
  const modeNavigation = pathname === "/" ? [] : NAV_ITEMS;
  const visibleNav = isOperator
    ? [...modeNavigation, { href: "/admin", label: "运营管理 Admin" }]
    : modeNavigation;

  return (
    <div className="mo-nav-wrap" ref={wrapRef}>
      <nav className="mo-nav">
        <Link href="/" className="mo-nav__brand">
          <strong>墨痕</strong>
          <span>MoHen</span>
        </Link>

        <div className="mo-nav__links">
          {visibleNav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mo-nav__link${active ? " is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mo-nav__tools">
          <button
            className="mo-nav__tool"
            title="搜索"
            aria-label="搜索"
            onClick={() => setOpenMenu(openMenu === "search" ? "" : "search")}
          >
            搜
          </button>
          <button className="mo-nav__tool" title="通知" aria-label="通知" onClick={() => void openNotify()}>
            讯
          </button>
          <button
            className="mo-nav__tool mo-nav__tool--avatar"
            title={user ? user.username : "登录"}
            aria-label="用户"
            onClick={() => setOpenMenu(openMenu === "user" ? "" : "user")}
          >
            {user ? (user.username || user.email).slice(0, 1) : "登"}
          </button>
        </div>
      </nav>

      {openMenu === "search" && (
        <div className="mo-nav__panel">
          <div className="mo-nav__search-row">
            <input
              className="mo-nav__search-input"
              placeholder="搜作品或历史知识…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch();
              }}
              autoFocus
            />
            <button className="mo-nav__search-go" onClick={() => void runSearch()} disabled={searching}>
              {searching ? "…" : "搜索"}
            </button>
          </div>
          {searched && !hasResults && (
            <div className="mo-nav__empty">没有找到匹配的作品或知识。</div>
          )}
          {works.length > 0 && (
            <div className="mo-nav__result-group">
              <div className="mo-nav__result-label">作品</div>
              {works.map((w) => (
                <Link key={w.work_id} href="/watch" className="mo-nav__result">
                  {w.title}
                </Link>
              ))}
            </div>
          )}
          {knowledge.length > 0 && (
            <div className="mo-nav__result-group">
              <div className="mo-nav__result-label">知识</div>
              {knowledge.map((k) => (
                <div key={k.id} className="mo-nav__result mo-nav__result--knowledge">
                  {k.snippet}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {openMenu === "notify" && (
        <div className="mo-nav__panel">
          {notifications.length === 0 ? (
            <div className="mo-nav__empty">暂无通知。</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="mo-nav__notify">
                <strong>{n.title}</strong>
                <span>{n.body}</span>
              </div>
            ))
          )}
        </div>
      )}

      {openMenu === "user" && (
        <div className="mo-nav__panel">
          {user ? (
            <>
              <div className="mo-nav__result-label">{user.email}</div>
              <div className="mo-nav__user-line">
                {roles.map((r) => ROLE_LABELS[r] || r).join(" · ") || "访客"}
              </div>
              {isOperator && (
                <Link href="/admin" className="mo-nav__user-action">
                  进入运营后台
                </Link>
              )}
              <button className="mo-nav__user-action mo-nav__user-logout" onClick={() => void logout()}>
                退出登录
              </button>
            </>
          ) : (
            <>
              <div className="mo-nav__result-label">尚未登录</div>
              <Link href="/login" className="mo-nav__user-action">
                登录
              </Link>
              <Link href="/register" className="mo-nav__user-action">
                注册
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
