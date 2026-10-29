// apps/web/lib/auth.ts — 多用户多角色认证。
//
// 角色：member（默认）、creator、operator、reviewer（独立审核者）。
// P0 安全止血（2026-10-29）后：
// - 注册改为邀请制（MOHEN_INVITE_CODE）；Owner 首次开通需 OWNER_EMAIL + OWNER_SETUP_TOKEN；
// - AUTH_SECRET 不再有默认值；未配置时所有签发/验签直接失败（fail-closed）；
// - 删除 app 层 admin 环境变量后门（OPS_USERNAME/OPS_PASSWORD）；
// - 兼容约定 OPERATOR_COOKIE / isOperator(token) 保持不变，既有路由无需改动。
//
// 纪律：密码仅存 scrypt 盐+哈希、绝不落明文/不回显；token 仅存 httpOnly cookie。
import crypto from "node:crypto";
import { queryRows } from "@mohen/data-access";

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
type SessionPayload = { uid: string; r: string[]; exp: number };

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
  const payload = b64url(JSON.stringify({ uid: userId, r: roles, exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string | undefined | null): { uid: string; r: string[] } | null {
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
    if (!data || typeof data.uid !== "string" || !Array.isArray(data.r)) return null;
    if (typeof data.exp === "number" && data.exp < Date.now()) return null;
    return { uid: data.uid, r: data.r };
  } catch {
    return null;
  }
}

// ---------- 兼容旧接口（既有路由零改动） ----------
export function isOperator(token: string | undefined | null): boolean {
  return hasRole(token, "operator");
}

export function hasRole(token: string | undefined | null, role: string): boolean {
  const s = parseSessionToken(token);
  return !!s && s.r.includes(role);
}

export function getSessionUser(token: string | undefined | null): { uid: string; r: string[] } | null {
  return parseSessionToken(token);
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

export async function findUserById(userId: string): Promise<AuthUser | null> {
  const rows = await queryRows(
    "select user_id::text as user_id, email, username, array_to_string(roles, ',') as roles, status " +
      "from public.users where user_id = :'id'",
    { id: userId }
  );
  return rows.length ? rowToUser(rows[0]) : null;
}
