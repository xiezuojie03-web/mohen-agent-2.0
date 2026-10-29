// apps/web/lib/auth.ts — 多用户多角色认证（补缺施工第一步：身份地基）。
//
// 全员注册 + 四角色分权：member（公众/默认）、creator（创作者）、operator（运营）、
// reviewer（独立审核者，Owner 兼任）。取代旧"单账号硬编码 + HMAC(operator)"方案。
//
// 兼容约定：OPERATOR_COOKIE / isOperator(token) 的签名保持不变，内部升级为
// 携带 user_id + roles + 过期时间的签名 token，因此既有 30+ 个路由无需改动。
//
// 纪律：密码仅存 scrypt 盐+哈希、绝不落明文/不回显；token 仅存 httpOnly cookie。
import crypto from "node:crypto";
import { queryRows } from "@mohen/data-access";

const AUTH_SECRET = process.env.AUTH_SECRET || "mohen-local-dev-secret";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

/** 注册时自动授予全部角色（operator+reviewer+creator+member）的 Owner 邮箱白名单。 */
export const OWNER_EMAIL = process.env.OWNER_EMAIL || "20195689@qq.com";

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
  return crypto.createHmac("sha256", AUTH_SECRET).update(data).digest("base64url");
}

export function signSessionToken(userId: string, roles: string[]): string {
  const payload = b64url(JSON.stringify({ uid: userId, r: roles, exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string | undefined | null): { uid: string; r: string[] } | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
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

// ---------- 旧环境变量 admin 兜底（仅本地开发；正式环境应通过真实用户登录） ----------
export function verifyLogin(username: unknown, password: unknown): boolean {
  const u = process.env.OPS_USERNAME || "admin";
  const p = process.env.OPS_PASSWORD || "mohen-ops-2026";
  return typeof username === "string" && typeof password === "string" && username === u && password === p;
}

export function signOperatorToken(): string {
  // 旧无状态 operator token：不再由登录接口签发，仅保留以兼容潜在历史调用。
  return crypto.createHmac("sha256", AUTH_SECRET).update("operator").digest("hex");
}
