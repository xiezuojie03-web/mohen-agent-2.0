// apps/web/lib/auth.ts — 多用户多角色认证。
//
// 角色：member（默认）、creator、operator、reviewer（独立审核者）。
// P0 安全止血（2026-10-29）后：
// - 注册改为邀请制（MOHEN_INVITE_CODE）；Owner 首次开通需 OWNER_EMAIL + OWNER_SETUP_TOKEN；
// - AUTH_SECRET 不再有默认值；未配置时所有签发/验签直接失败（fail-closed）；
// - 删除 app 层 admin 环境变量后门（OPS_USERNAME/OPS_PASSWORD）；
// - 保留 Cookie 和 HTTP 形状；请求授权必须异步读取当前账户，签名角色不作授权。
//
// 纪律：密码仅存 scrypt 盐+哈希、绝不落明文/不回显；token 仅存 httpOnly cookie。
import crypto from "node:crypto";
import { queryRows, run } from "@mohen/data-access";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

/** 是否已配置会话密钥（部署自检与登录接口用）。 */
export function isAuthConfigured(): boolean {
  return typeof process.env.AUTH_SECRET === "string" && process.env.AUTH_SECRET.trim().length >= 32;
}

function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.trim().length < 32) {
    throw new Error(
      "AUTH_SECRET 未配置或长度不足 32（拒绝使用默认密钥）。请在各环境注入随机密钥后再启动认证。"
    );
  }
  return s;
}

export const OPERATOR_COOKIE = "mohen_role";

/** Cookie policy: HTTPS-only in deployed production, usable on HTTP localhost.
 * All login/register/logout handlers must share identical flags and path.
 */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// ---------- 密码哈希（scrypt，随机盐） ----------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, 64);
  const expect = Buffer.from(hash, "hex");
  return calc.length === expect.length && crypto.timingSafeEqual(calc, expect);
}

// ---------- 签名 session token：base64url(payload) + "." + HMAC ----------
type SessionPayload = { uid: string; r: string[]; exp: number; iat?: number; jti?: string };

export const revocableSessionsEnabled = () => process.env.MOHEN_REVOCABLE_SESSIONS_ENABLED === "true";

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}
function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}
function sign(data: string): string {
  return crypto.createHmac("sha256", authSecret()).update(data).digest("base64url");
}

export function signSessionToken(userId: string, roles: string[]): string {
  const now = Date.now();
  const payload = b64url(JSON.stringify({ uid: userId, r: roles, iat: now, jti: crypto.randomUUID(), exp: now + SESSION_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

function verifiedSessionPayload(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  if (!isAuthConfigured()) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;
  const expected = sign(payload);
  // 定长比较，避免时序侧信道
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(payload)) as SessionPayload;
    if (!data || typeof data.uid !== "string" || !data.uid.trim() ||
        !Array.isArray(data.r) || !data.r.every(r => typeof r === "string")) return null;
    if (!Number.isSafeInteger(data.exp) || data.exp <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseSessionToken(token: string | undefined | null): {uid: string; r: string[]} | null {
  const data = verifiedSessionPayload(token);
  return data ? {uid: data.uid, r: data.r} : null;
}

/** Persist only a digest. Raw cookies and signing keys must never enter SQL/logs. */
export async function revokeSessionToken(token: string | undefined): Promise<void> {
  const signed = verifiedSessionPayload(token);
  if (!signed) return;
  const persisted = await run(`insert into control.web_session_revocations(token_hash,user_id,expires_at)
    values(:'hash',:'uid',to_timestamp(:'exp'::numeric/1000))
    on conflict(token_hash) do nothing`, {
    hash: crypto.createHash('sha256').update(token!).digest('hex'), uid: signed.uid, exp: signed.exp,
  });
  if (persisted !== true) throw new Error('SESSION_REVOCATION_NOT_ACKNOWLEDGED');
}

// ---------- 兼容旧接口（既有路由零改动） ----------
export async function isOperator(token: string | undefined | null): Promise<boolean> {
  return hasRole(token, "operator");
}

export async function hasRole(token: string | undefined | null, role: string): Promise<boolean> {
  const s = await getSessionUser(token);
  return !!s && s.r.includes(role);
}

export async function getSessionUser(token: string | undefined | null): Promise<{ uid: string; r: string[] } | null> {
  const resolution = await resolveSession(token);
  return resolution.state === "authenticated" ? resolution.session : null;
}

type SessionResolution =
  | { state: "authenticated"; session: { uid: string; r: string[] } }
  | { state: "unauthenticated" | "unavailable" };

/** Middleware can report dependency failure distinctly while compatibility callers fail closed. */
export async function resolveSession(token: string | undefined | null): Promise<SessionResolution> {
  const signed = verifiedSessionPayload(token);
  if (!signed) return { state: "unauthenticated" };
  try {
    let user: AuthUser | null;
    if (revocableSessionsEnabled()) {
      // Existing cookies without issuance identity cannot cross the cutover.
      if (!Number.isSafeInteger(signed.iat) || !signed.jti || signed.iat! > Date.now() || signed.iat! >= signed.exp) {
        return {state: "unauthenticated"};
      }
      const rows = await queryRows(`select u.user_id::text as user_id,u.email,u.username,
        array_to_string(u.roles, ',') as roles,u.status,u.session_not_before,
        exists(select 1 from control.web_session_revocations s
          where s.token_hash=:'hash' and s.user_id=u.user_id) as session_revoked
        from public.users u where u.user_id=:'id'`, {
        id: signed.uid, hash: crypto.createHash('sha256').update(token!).digest('hex'),
      });
      if (!rows.length) return {state: "unauthenticated"};
      const row: Record<string, unknown> = rows[0];
      const floor = Number(row.session_not_before);
      if (row.session_not_before == null || !Number.isSafeInteger(floor) || floor < 0 ||
          (row.session_revoked !== true && row.session_revoked !== false && row.session_revoked !== 't' && row.session_revoked !== 'f')) return {state: "unavailable"};
      if (row.session_revoked === true || row.session_revoked === 't' || signed.iat! <= floor) {
        return {state: "unauthenticated"};
      }
      user = rowToUser(row);
    } else {
      user = await findUserById(signed.uid);
    }
    if (!user || user.status !== "active") return { state: "unauthenticated" };
    return { state: "authenticated", session: { uid: user.user_id, r: user.roles } };
  } catch {
    // A dependency failure must never restore the stale signed role list.
    return { state: "unavailable" };
  }
}

// ---------- 用户查询（roles 用 array_to_string 归一化，兼容 psql/node-pg 双通道） ----------
export type AuthUser = {
  user_id: string;
  email: string;
  username: string;
  roles: string[];
  status: string;
};

function rowToUser(r: Record<string, unknown>): AuthUser {
  return {
    user_id: String(r.user_id),
    email: String(r.email),
    username: String(r.username),
    roles: String(r.roles || "").split(",").filter(Boolean),
    status: String(r.status),
  };
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const rows = await queryRows(
    "select user_id::text as user_id, email, username, array_to_string(roles, ',') as roles, status " +
      "from public.users where lower(email) = lower(:'email')",
    { email }
  );
  return rows.length ? rowToUser(rows[0]) : null;
}

/** 登录校验专用：返回含 password_hash 的完整记录（仅服务端使用，绝不回传前端）。 */
export async function findUserCredentials(
  email: string
): Promise<(AuthUser & { password_hash: string }) | null> {
  const rows = await queryRows(
    "select user_id::text as user_id, email, username, array_to_string(roles, ',') as roles, status, password_hash " +
      "from public.users where lower(email) = lower(:'email')",
    { email }
  );
  if (!rows.length) return null;
  return { ...rowToUser(rows[0]), password_hash: String(rows[0].password_hash) };
}

/** Redeem an engineering-issued, expiring capability for an existing account.
 * No issuance API, role changes, auto-login, or plaintext password persistence.
 * The existing account-change trigger invalidates all earlier browser sessions.
 */
export async function completePasswordSetup(input:{email:unknown;token:unknown;password:unknown}):Promise<boolean> {
  if(!revocableSessionsEnabled()||typeof input.email!=='string'||typeof input.token!=='string'||
    !/^[a-f0-9]{64}$/.test(input.token)||typeof input.password!=='string'||input.password.length<8||
    Buffer.byteLength(input.password)>1024)return false;
  const email=input.email.trim().toLowerCase();
  if(!email||email.length>254)return false;
  const account=await findUserCredentials(email);
  if(!account||account.status!=='active')return false;
  const match=/^setup-v1\$(\d{13})\$([a-f0-9]{64})$/.exec(account.password_hash);
  if(!match||Number(match[1])<=Date.now())return false;
  const digest=crypto.createHash('sha256').update('mohen-password-setup-v1\n'+input.token).digest('hex');
  if(!crypto.timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(match[2],'hex')))return false;
  const rows=await queryRows(`update public.users set password_hash=:'hash',updated_at=now()
    where user_id=:'id'::uuid and password_hash=:'expected' and status='active'
      and extract(epoch from clock_timestamp())*1000 < :'expires'::numeric
    returning user_id::text`,{id:account.user_id,expected:account.password_hash,
    hash:hashPassword(input.password),expires:match[1]});
  return rows.length===1&&String(rows[0].user_id)===account.user_id;
}

/**
 * Reset the single active Owner password on a protected development Preview.
 * The Vercel Preview SSO gate is the human recovery proof; no email, old password,
 * temporary capability, or new account is required. The DB trigger revokes old sessions.
 */
export async function resetPreviewOwnerPassword(password: unknown): Promise<boolean> {
  if (!revocableSessionsEnabled() || typeof password !== "string" ||
      password.length < 8 || Buffer.byteLength(password) > 1024) return false;
  const rows = await queryRows(`
    with sole_owner as materialized (
      select user_id
      from public.users
      where status = 'active' and 'operator' = any(roles)
        and (select count(*) from public.users
             where status = 'active' and 'operator' = any(roles)) = 1
      for update
    )
    update public.users as u
    set password_hash = :'hash', updated_at = clock_timestamp()
    from sole_owner as owner
    where u.user_id = owner.user_id and u.status = 'active'
    returning u.user_id::text as user_id
  `, { hash: hashPassword(password) });
  return rows.length === 1;
}

export async function findUserById(userId: string): Promise<AuthUser | null> {
  const rows = await queryRows(
    "select user_id::text as user_id, email, username, array_to_string(roles, ',') as roles, status " +
      "from public.users where user_id = :'id'",
    { id: userId }
  );
  return rows.length ? rowToUser(rows[0]) : null;
}

/** Server-only short-lived DB attestation after getSession has authenticated the request.
 * Its dedicated key is provisioned separately; browser AUTH_SECRET never enters PG.
 * ttlMs defaults to 30s for one-shot request-local use; a cloud production run must
 * pass a longer ttl so the token stays valid across dispatch→executor→Runner.
 */
export function signDatabaseSessionToken(session: { uid: string; r: string[] }, ttlMs: number = 30_000): string {
  const key = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (!key || key.trim().length < 32) throw new Error("DATABASE_SESSION_KEY_UNAVAILABLE");
  const payload = b64url(JSON.stringify({ uid: session.uid, r: session.r, exp: Date.now() + ttlMs }));
  return `${payload}.${crypto.createHmac("sha256", key).update(payload).digest("base64url")}`;
}
