// tests/unit/node-pg-client-password-override.test.ts
// 修复回归：MOHEN_DATABASE_PASSWORD（主库密码轮换覆盖值）不得顶掉
// 自带内嵌密码的专用身份连接串（如 mohen_gate_signer_m5_machine），
// 否则部署内机器评审等专用身份会被主库覆盖密码顶掉导致认证失败。
// 轮换覆盖值只允许作用于未内嵌密码的连接串。
import { afterEach, describe, expect, it, vi } from "vitest";

type PoolLike = { options?: { connectionString?: string } };

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  MOHEN_DATABASE_PASSWORD: process.env.MOHEN_DATABASE_PASSWORD,
};

afterEach(() => {
  if (ORIGINAL_ENV.DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_ENV.DATABASE_URL;
  if (ORIGINAL_ENV.MOHEN_DATABASE_PASSWORD === undefined) delete process.env.MOHEN_DATABASE_PASSWORD;
  else process.env.MOHEN_DATABASE_PASSWORD = ORIGINAL_ENV.MOHEN_DATABASE_PASSWORD;
  vi.resetModules();
});

async function poolConnectionString(): Promise<string> {
  vi.resetModules();
  const mod = await import("../../packages/data-access/src/node-pg-client.mjs");
  const pool = mod.getNodePgPool() as PoolLike;
  const cs = pool.options?.connectionString;
  expect(typeof cs).toBe("string");
  return cs as string;
}

function urlPassword(connectionString: string): string {
  return new URL(connectionString).password;
}

describe("node-pg-client 密码轮换覆盖边界", () => {
  it("连接串自带内嵌密码时不应用覆盖值", async () => {
    process.env.DATABASE_URL = "postgresql://svc_user.abc123:embedded_pw@db.example.com:5432/postgres";
    process.env.MOHEN_DATABASE_PASSWORD = "override_pw";
    expect(urlPassword(await poolConnectionString())).toBe("embedded_pw");
  });

  it("连接串未内嵌密码时应用覆盖值（主库轮换路径保持不变）", async () => {
    process.env.DATABASE_URL = "postgresql://svc_user.abc123@db.example.com:5432/postgres";
    process.env.MOHEN_DATABASE_PASSWORD = "override_pw";
    expect(urlPassword(await poolConnectionString())).toBe("override_pw");
  });

  it("未设置覆盖值时内嵌密码原样保留", async () => {
    process.env.DATABASE_URL = "postgresql://svc_user.abc123:embedded_pw@db.example.com:5432/postgres";
    delete process.env.MOHEN_DATABASE_PASSWORD;
    expect(urlPassword(await poolConnectionString())).toBe("embedded_pw");
  });
});
