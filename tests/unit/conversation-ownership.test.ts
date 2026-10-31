import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ queryRows: vi.fn(), queryValue: vi.fn(), run: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
import { createConversation, getConversation } from "../../apps/web/lib/fine-capabilities";

beforeEach(() => { db.queryRows.mockReset(); db.queryValue.mockReset().mockResolvedValue("conversation"); db.run.mockReset(); });
it("does not return another creator's private conversation even when its UUID is known", async () => {
  db.queryRows.mockImplementation(async (sql, params) => sql.includes("owner_user_id = :'owner'") && params.owner === "creator-a" ? [] : [{ title: "creator-b private" }]);
  expect(await getConversation("foreign-conversation", "creator-a")).toBeNull();
});
it("persists the authenticated creator as owner, independently of message contents", async () => {
  await createConversation("private", [{ role: "user", content: "hello" }], "creator-a");
  const [sql, params] = db.run.mock.calls[0];
  expect(sql).toContain("owner_user_id");
  expect(params.owner).toBe("creator-a");
});
