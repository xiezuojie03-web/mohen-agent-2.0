import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryRows: vi.fn(), queryValue: vi.fn(), run: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
import { GET as getSettings } from "../../apps/web/app/api/admin/settings/route";
import { POST as changeStatus } from "../../apps/web/app/api/admin/users/[id]/status/route";
import { POST as setRoles } from "../../apps/web/app/api/admin/acl/route";
import { signSessionToken } from "../../apps/web/lib/auth";

const operator = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7";
const other = "4790013f-43ed-422e-b047-d3f8ddbf22c3";
const operatorRow = [{ user_id: operator, email: "op@test.invalid", username: "op", roles: "operator", status: "active" }];

function request(body: unknown) {
  return Object.assign(new Request("http://test.invalid/api/admin/users/" + other + "/status", {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), { cookies: { get: () => ({ value: signSessionToken(operator, ["operator"]) }) } });
}
function aclRequest(body: unknown) {
  return Object.assign(new Request("http://test.invalid/api/admin/acl", {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), { cookies: { get: () => ({ value: signSessionToken(operator, ["operator"]) }) } });
}

// getSessionUser 经 queryRows 解析当前账户；kad1 事务也经 queryRows 调用。
// 按 SQL 分派：会话查询回操作员行，kad1_change_account 回指定 reason。
function dispatchKad1(reason: string) {
  db.queryRows.mockImplementation(async (sql: unknown) => {
    const text = String(sql);
    if (text.includes("kad1_change_account")) return [{ reason }];
    return operatorRow;
  });
}
const kad1Calls = () => db.queryRows.mock.calls.filter((c) => String(c[0]).includes("kad1_change_account"));

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-only-secret-at-least-thirty-two-characters");
  db.queryRows.mockReset().mockResolvedValue(operatorRow);
  db.queryValue.mockReset();
  db.run.mockReset();
});

it("a non-operator cannot read all application settings", async () => {
  db.queryRows.mockResolvedValue([{ user_id: operator, email: "op@test.invalid", username: "op", roles: "member", status: "active" }]);
  const response = await getSettings(request({}) as never);
  expect(response.status).toBe(403);
  expect(db.queryRows).toHaveBeenCalledTimes(1);
});

// KAD1 生成代（交付包 20261102 目标）：角色/状态变更收敛为库内事务
// control.kad1_change_account；路由只做输入校验与 reason→状态码映射。
it("an unknown status never reaches the kad1 transaction", async () => {
  const response = await changeStatus(request({ status: "typo" }) as never, { params: Promise.resolve({ id: other }) });
  expect(response.status).toBe(400);
  expect(kad1Calls()).toHaveLength(0);
  expect(db.run).not.toHaveBeenCalled();
});

it("a malformed account id is rejected before any database call", async () => {
  const response = await changeStatus(request({ status: "disabled" }) as never, { params: Promise.resolve({ id: "not-a-uuid" }) });
  expect(response.status).toBe(400);
  expect(kad1Calls()).toHaveLength(0);
});

it("the kad1 reviewer-lock reason maps to 409 without any direct write", async () => {
  dispatchKad1("last_reviewer");
  const response = await changeStatus(request({ status: "disabled" }) as never, { params: Promise.resolve({ id: other }) });
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ reason: "last_reviewer" });
  expect(db.run).not.toHaveBeenCalled();
});

it("kad1 not_found and self_change reasons map to 404 and 403", async () => {
  dispatchKad1("not_found");
  const missing = await changeStatus(request({ status: "disabled" }) as never, { params: Promise.resolve({ id: other }) });
  expect(missing.status).toBe(404);
  dispatchKad1("self_change_forbidden");
  const selfChange = await changeStatus(request({ status: "disabled" }) as never, { params: Promise.resolve({ id: operator }) });
  expect(selfChange.status).toBe(403);
  expect(db.run).not.toHaveBeenCalled();
});

it("a successful kad1 status change acknowledges the exact target", async () => {
  dispatchKad1("ok");
  const response = await changeStatus(request({ status: "disabled" }) as never, { params: Promise.resolve({ id: other }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, user_id: other, status: "disabled" });
  const [sql, params] = kad1Calls()[0];
  expect(String(sql)).toContain("kad1_change_account");
  expect(params.status).toBe("disabled");
  expect(params.roles).toBeNull();
});

it("an invalid roles payload never reaches the kad1 transaction", async () => {
  const response = await setRoles(aclRequest({ user_id: other, roles: ["admin"] }) as never);
  expect(response.status).toBe(400);
  expect(kad1Calls()).toHaveLength(0);
});

it("kad1 operator_required keeps non-operators from granting roles", async () => {
  dispatchKad1("operator_required");
  const response = await setRoles(aclRequest({ user_id: other, roles: ["member"] }) as never);
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ reason: "operator_required" });
});

it("a successful kad1 role change returns the acknowledged roles", async () => {
  dispatchKad1("ok");
  const response = await setRoles(aclRequest({ user_id: other, roles: ["member", "creator"] }) as never);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, user_id: other, roles: ["member", "creator"] });
  const [sql, params] = kad1Calls()[0];
  expect(String(sql)).toContain("kad1_change_account");
  expect(params.roles).toBe("{member,creator}");
  expect(params.status).toBeNull();
});
