import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ queryRows: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
import { NextRequest } from "next/server";
import { middleware } from "../../apps/web/middleware";
import { signSessionToken } from "../../apps/web/lib/auth";
const uid = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7";
beforeEach(() => { vi.stubEnv("AUTH_SECRET", "test-only-secret-long-enough-for-session-signing"); db.queryRows.mockReset(); });
function request(path = "/api/admin/settings") {
  return new NextRequest(`http://test.invalid${path}`, { headers: { cookie: `mohen_role=${signSessionToken(uid, ["operator"])}` } });
}
it("rejects a disabled account at the common middleware boundary", async () => {
  db.queryRows.mockResolvedValue([{ user_id: uid, status: "disabled", roles: "operator" }]);
  expect((await middleware(request())).status).toBe(401);
});
it("distinguishes an unavailable account store from missing authentication", async () => {
  db.queryRows.mockRejectedValue(new Error("database unavailable"));
  const response = await middleware(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ reason: "auth_dependency_unavailable" });
});
it("does not make the public homepage and help API depend on the account database", async () => {
  expect((await middleware(request("/api/help/articles"))).status).toBe(200);
  expect(db.queryRows).not.toHaveBeenCalled();
});
