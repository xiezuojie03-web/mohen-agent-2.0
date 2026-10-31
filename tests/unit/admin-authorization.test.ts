import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryRows: vi.fn(), queryValue: vi.fn(), run: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
import { GET as getSettings } from "../../apps/web/app/api/admin/settings/route";
import { POST as changeStatus } from "../../apps/web/app/api/admin/users/[id]/status/route";
import { signSessionToken } from "../../apps/web/lib/auth";

const operator = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7";
const other = "4790013f-43ed-422e-b047-d3f8ddbf22c3";
function request(body: unknown) {
  return Object.assign(new Request("http://test.invalid/api/admin/users/" + other + "/status", {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), { cookies: { get: () => ({ value: signSessionToken(operator, ["operator"]) }) } });
}
beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-only-secret-at-least-thirty-two-characters");
  db.queryRows.mockReset().mockResolvedValue([{ user_id: operator, status: "active", roles: "operator" }]);
  db.queryValue.mockReset();
  db.run.mockReset();
});

it("a non-operator cannot read all application settings", async () => {
  db.queryRows.mockResolvedValue([{ user_id: operator, status: "active", roles: "member" }]);
  const response = await getSettings(request({}) as never);
  expect(response.status).toBe(403);
  expect(db.queryRows).toHaveBeenCalledTimes(1);
});

it("an unknown status cannot silently disable a user", async () => {
  db.queryValue.mockResolvedValue(other);
  const response = await changeStatus(request({ status: "typo" }) as never, { params: Promise.resolve({ id: other }) });
  expect(response.status).toBe(400);
  expect(db.run).not.toHaveBeenCalled();
});

it("the last active work reviewer cannot be disabled", async () => {
  db.queryValue.mockResolvedValueOnce(other).mockResolvedValueOnce("reviewer").mockResolvedValueOnce("1");
  const response = await changeStatus(request({ status: "disabled" }) as never, { params: Promise.resolve({ id: other }) });
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ reason: "last_reviewer" });
  expect(db.run).not.toHaveBeenCalled();
});
