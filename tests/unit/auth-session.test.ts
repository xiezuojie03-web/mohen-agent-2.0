import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryRows: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: cookie }) }) }));
let cookie: string | undefined;

import { getSessionUser, hasRole, isOperator, parseSessionToken, signSessionToken, sessionCookieOptions } from "../../apps/web/lib/auth";
import { getSession } from "../../apps/web/lib/session";

const active = { user_id: "9ab37577-1789-4e5a-9d5a-9e629cffdbf7", email: "test@example.invalid", username: "tester", roles: "member", status: "active" };

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-only-session-secret-at-least-32-characters");
  db.queryRows.mockReset().mockResolvedValue([active]);
  cookie = signSessionToken(active.user_id, ["operator", "reviewer"]);
});

describe("current account authorization", () => {
  it("uses current roles rather than unexpired cookie roles", async () => {
    expect(parseSessionToken(cookie)?.r).toContain("operator");
    expect(await getSessionUser(cookie)).toEqual({ uid: active.user_id, r: ["member"] });
    expect(await isOperator(cookie)).toBe(false);
    expect(await hasRole(cookie, "reviewer")).toBe(false);
    expect(await getSession()).toEqual({ uid: active.user_id, r: ["member"] });
  });

  it.each(["disabled", "deleted"])("rejects a %s user with a valid signed cookie", async status => {
    db.queryRows.mockResolvedValue([{ ...active, status }]);
    expect(await getSessionUser(cookie)).toBeNull();
    expect(await isOperator(cookie)).toBe(false);
  });

  it("rejects a deleted account", async () => {
    db.queryRows.mockResolvedValue([]);
    expect(await getSessionUser(cookie)).toBeNull();
  });

  it("fails closed on database failure and never falls back to cookie roles", async () => {
    db.queryRows.mockRejectedValue(new Error("database offline"));
    expect(await getSessionUser(cookie)).toBeNull();
    expect(await getSession()).toBeNull();
  });

  it("does not query users for invalid or missing authentication", async () => {
    expect(await getSessionUser("bad.token")).toBeNull();
    expect(await getSessionUser(undefined)).toBeNull();
    expect(db.queryRows).not.toHaveBeenCalled();
  });

  it("does not retain a role across later requests", async () => {
    db.queryRows.mockResolvedValueOnce([{ ...active, roles: "member,operator" }]);
    expect(await isOperator(cookie)).toBe(true);
    expect(await isOperator(cookie)).toBe(false);
  });

  it("rejects a correctly signed token without an expiry", async () => {
    const crypto = await import("node:crypto");
    const payload = Buffer.from(JSON.stringify({ uid: active.user_id, r: ["operator"] })).toString("base64url");
    const signature = crypto.createHmac("sha256", process.env.AUTH_SECRET!).update(payload).digest("base64url");
    expect(parseSessionToken(`${payload}.${signature}`)).toBeNull();
  });
});

describe("cookie flags shared by login registration and logout",()=>{
  it("always uses HttpOnly Lax and a root path",()=>{
    expect(sessionCookieOptions(86400)).toMatchObject({
      httpOnly:true,sameSite:"lax",path:"/",maxAge:86400,
    });
    expect(sessionCookieOptions(0)).toMatchObject({
      httpOnly:true,sameSite:"lax",path:"/",maxAge:0,
    });
  });
  it("uses Secure cookies on production HTTPS, not on localhost HTTP development",()=>{
    vi.stubEnv("NODE_ENV","production");
    expect(sessionCookieOptions(86400).secure).toBe(true);
    expect(sessionCookieOptions(0).secure).toBe(true);
    vi.stubEnv("NODE_ENV","development");
    expect(sessionCookieOptions(86400).secure).toBe(false);
    vi.unstubAllEnvs();
  });
});
