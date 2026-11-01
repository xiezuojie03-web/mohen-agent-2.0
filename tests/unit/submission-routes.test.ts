import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryRows: vi.fn(), queryValue: vi.fn(), run: vi.fn() }));
const access = vi.hoisted(() => ({ session: vi.fn(), allowed: vi.fn(), guard: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
vi.mock("../../apps/web/lib/session", () => ({ getSession: access.session, isOperatorSession: () => false }));
vi.mock("../../apps/web/lib/ownership", () => ({ canAccess: access.allowed }));
vi.mock("../../apps/web/lib/guard", () => ({ guardRoute: access.guard }));
vi.mock("../../apps/web/lib/auth", () => ({ findUserById: async () => ({ email: "creator@example.invalid" }) }));
import { POST as submitPublic } from "../../apps/web/app/api/works/[id]/submit/route";
import { POST as submitStudio } from "../../apps/web/app/api/studio/works/[id]/submissions/route";
import { POST as create } from "../../apps/web/app/api/works/route";

const work = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7";
const revision = "4790013f-43ed-422e-b047-d3f8ddbf22c3";
const params = () => ({ params: Promise.resolve({ id: work }) });
const req = (body?: unknown) => new Request("http://test.invalid/submission", {
  method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
beforeEach(() => {
  vi.clearAllMocks();
  access.session.mockResolvedValue({ uid: "creator", r: ["creator"] });
  access.allowed.mockResolvedValue(true);
  access.guard.mockResolvedValue(null);
  db.queryRows.mockResolvedValue([]);
  db.queryValue.mockResolvedValue(revision);
});

for (const [name, submit] of [["public", submitPublic], ["studio", submitStudio]] as const) {
  it(`${name} submission reports conflict when the target was not submitted`, async () => {
    const r = await submit(req({ revision_id: revision }), params());
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ ok: false, reason: "revision_not_submittable" });
  });
  it(`${name} submission rejects invalid JSON before changing any revision`, async () => {
    const r = await submit(new Request("http://test.invalid/submit", { method: "POST", body: "{" }), params());
    expect(r.status).toBe(400);
    expect(db.queryRows).not.toHaveBeenCalled();
  });
  it(`${name} submission turns a storage failure into a retryable response`, async () => {
    db.queryRows.mockRejectedValueOnce(new Error("storage unavailable"));
    const r = await submit(req({ revision_id: revision }), params());
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ ok: false, reason: "submission_unavailable" });
  });
  it(`${name} submission returns the acknowledged exact revision`, async () => {
    db.queryRows.mockResolvedValueOnce([{ work_id: work, revision_id: revision, status: "submitted" }]);
    const r = await submit(req({ revision_id: revision }), params());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, work_id: work, revision_id: revision, status: "submitted" });
  });
  it(`${name} submission preserves legacy no-body requests but binds the resolved revision`, async () => {
    db.queryRows.mockResolvedValueOnce([{ work_id: work, revision_id: revision, status: "submitted" }]);
    const r = await submit(req(), params());
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ revision_id: revision, status: "submitted" });
  });
}

it("creation returns the initial saved revision, not only the work id", async () => {
  db.queryValue.mockResolvedValueOnce(work).mockResolvedValueOnce(revision);
  db.queryRows.mockResolvedValueOnce([{ work_id: work, revision_id: revision }]);
  const r = await create(req({ title: "保存的作品", content: { beats: [] }, creation_id: work }));
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true, work_id: work, revision_id: revision });
});

it("creation refuses a conflicting creation identity without acknowledging a saved revision", async () => {
  db.queryValue.mockResolvedValueOnce(work).mockResolvedValueOnce(null);
  const r = await create(req({ title: "保存的作品", content: { beats: [] }, creation_id: work }));
  expect(r.status).toBe(409);
  expect(await r.json()).toEqual({ ok: false, reason: "creation_conflict" });
});
