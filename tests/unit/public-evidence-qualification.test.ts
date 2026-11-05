import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), pool: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../packages/data-access/src/index.mjs")>();
  return { ...actual, getNodePgPool: mocks.pool };
});
import { GET } from "../../apps/web/app/api/public/evidence/[id]/route";

const id = "11111111-1111-4111-8111-111111111111";
const config = JSON.stringify({
  consumer: "evidence_on_demand",
  purpose: { namespace: "test-only", code: "public-evidence", version: "test-v1" },
  scope: { requested_action: "quote" },
});
const call = (value = id) => GET(new Request("http://test.invalid/api/public/evidence/" + value),
  { params: Promise.resolve({ id: value }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MOHEN_PUBLIC_EVIDENCE_QUALIFICATION_CONTEXT", config);
  mocks.pool.mockReturnValue({ query: mocks.query });
  mocks.query.mockResolvedValue({ rows: [] });
});
it("refuses to read unconfigured or malformed public evidence qualification", async () => {
  vi.stubEnv("MOHEN_PUBLIC_EVIDENCE_QUALIFICATION_CONTEXT", "");
  expect((await call()).status).toBe(503);
  vi.stubEnv("MOHEN_PUBLIC_EVIDENCE_QUALIFICATION_CONTEXT", JSON.stringify({
    consumer: "agent", purpose: { namespace: "test-only", code: "public-evidence", version: "1" }, scope: {},
  }));
  expect((await call()).status).toBe(503);
  expect(mocks.pool).not.toHaveBeenCalled();
});
it("rejects invalid evidence identity before DB access", async () => {
  expect((await call("../other")).status).toBe(400);
  expect(mocks.query).not.toHaveBeenCalled();
});
it("does not disclose an unqualified pointer even if it physically exists", async () => {
  const response = await call();
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.query).toHaveBeenCalledOnce();
  const [sql, params] = mocks.query.mock.calls[0];
  expect(sql).toContain("control.qualification_allows(");
  expect(sql).toContain("q.gate_code='G5'");
  expect(params).toEqual(["evidence_pointer","evidence_on_demand","test-only","public-evidence","test-v1",
    JSON.stringify({requested_action:"quote"}),id]);
  expect(sql).not.toContain("public.imported_materials");
});
it("preserves the successful response shape but only after qualification query accepts", async () => {
  mocks.query.mockResolvedValueOnce({rows:[{evidence_pointer_id:id,display_locator:{source:"test-only"},
    display_excerpt:"synthetic private-free sample",unrelated_secret:"DO_NOT_RETURN"}]});
  const response = await call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ok:true,evidence:{id,display_locator:{source:"test-only"},
    display_excerpt:"synthetic private-free sample"}});
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("fails closed on a missing G5 table, failed policy, or database connection", async () => {
  mocks.query.mockRejectedValueOnce(new Error("internal SQL role and token details"));
  const response = await call();
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("internal SQL");
});
it.each([{}, {requested_action:'read'}, {requested_action:'download'}])('refuses a context without the Evidence quote operation: %j',async scope=>{
 vi.stubEnv('MOHEN_PUBLIC_EVIDENCE_QUALIFICATION_CONTEXT',JSON.stringify({...JSON.parse(config),scope}));
 expect((await call()).status).toBe(503);
 expect(mocks.pool).not.toHaveBeenCalled();
});
