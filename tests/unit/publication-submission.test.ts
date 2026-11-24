import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryRows: vi.fn(), queryValue: vi.fn(), run: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
vi.mock("../../apps/web/lib/formal-publication-chain", () => ({ getFormalRevision: vi.fn(async () => null), formalSubmit: vi.fn() }));
import { submitWork } from "../../apps/web/lib/publication";

const work = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7";
const revision = "4790013f-43ed-422e-b047-d3f8ddbf22c3";

beforeEach(() => {
  vi.clearAllMocks();
  db.queryRows.mockResolvedValue([]);
});

it("does not report a submission when no target revision was updated or already submitted", async () => {
  expect(await submitWork(work, revision)).toEqual({ ok: false, reason: "revision_not_submittable" });
});

it("acknowledges only the exact revision returned by the database", async () => {
  db.queryRows.mockResolvedValueOnce([{ work_id: work, revision_id: revision, status: "submitted" }]);
  expect(await submitWork(work, revision)).toEqual({ ok: true, work_id: work, revision_id: revision, status: "submitted" });
  const [sql, params] = db.queryRows.mock.calls[0];
  // The real write must be scoped to both identities, not every draft belonging to a work.
  expect(sql).toMatch(/work_id\s*=\s*:'wid'/);
  expect(sql).toMatch(/revision_id\s*=\s*:'rid'/);
  expect(sql).toMatch(/returning/i);
  expect(params).toEqual({ wid: work, rid: revision });
});

it("allows a repeated request only if that same revision is already submitted", async () => {
  db.queryRows.mockResolvedValueOnce([]).mockResolvedValueOnce([{ work_id: work, revision_id: revision, status: "submitted" }]);
  expect(await submitWork(work, revision)).toEqual({ ok: true, work_id: work, revision_id: revision, status: "submitted" });
  const [sql, params] = db.queryRows.mock.calls[1];
  expect(sql).toMatch(/status\s*=\s*'submitted'/);
  expect(params).toEqual({ wid: work, rid: revision });
});

it("rejects a missing or malformed target revision before a write", async () => {
  expect(await submitWork(work, "")).toEqual({ ok: false, reason: "revision_required" });
  expect(await submitWork(work, "not-a-uuid")).toEqual({ ok: false, reason: "revision_required" });
  expect(db.queryRows).not.toHaveBeenCalled();
  expect(db.run).not.toHaveBeenCalled();
});

it("propagates storage failure rather than confirming a submission", async () => {
  db.queryRows.mockRejectedValueOnce(new Error("storage unavailable"));
  await expect(submitWork(work, revision)).rejects.toThrow("storage unavailable");
});

it("acknowledges valid uppercase UUIDs using canonical database identities", async () => {
  db.queryRows.mockResolvedValueOnce([{ work_id: work, revision_id: revision, status: "submitted" }]);
  expect(await submitWork(work.toUpperCase(), revision.toUpperCase())).toEqual({ ok: true, work_id: work, revision_id: revision, status: "submitted" });
});
