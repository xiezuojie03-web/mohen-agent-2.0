import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("../../apps/web/lib/session", () => ({
  getSession: mocks.session,
}));

import { POST } from "../../apps/web/app/api/studio/attachments/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ uid: "test-creator", r: ["creator"] });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it("rejects an anonymous original upload without accepting any bytes", async () => {
  mocks.session.mockResolvedValue(null);
  const req = new Request("http://test.invalid/api/studio/attachments", { method: "POST" });
  const res = await POST(req);
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ ok: false, reason: "login_required" });
  expect(res.headers.get("cache-control")).toBe("no-store");
});

it("fails closed for an authenticated attachment until private durable storage exists", async () => {
  vi.stubEnv("MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED", "");
  const data = new FormData();
  data.set("file", new File(["private original bytes"], "source.txt", { type: "text/plain" }));
  const req = new Request("http://test.invalid/api/studio/attachments", { method: "POST", body: data });
  const res = await POST(req);
  expect(res.status).toBe(503);
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(body.reason).toBe("private_original_storage_unavailable");
  expect(JSON.stringify(body)).not.toContain("/uploads/");
  expect(res.headers.get("cache-control")).toBe("no-store");
});

it("does not fabricate a stored asset when the upload request is empty", async () => {
  vi.stubEnv("MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED", "true");
  const res = await POST(new Request("http://test.invalid/api/studio/attachments", { method: "POST" }));
  expect(res.status).toBe(400);
  expect((await res.json()).ok).toBe(false);
});

it("rejects an incomplete authenticated upload without accepting the bytes as an original", async () => {
  vi.stubEnv("MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED", "true");
  const data = new FormData();
  data.set("file", new File(["private original bytes"], "source.txt", { type: "text/plain" }));
  const req = new Request("http://test.invalid/api/studio/attachments", { method: "POST", body: data });
  const res = await POST(req);
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(JSON.stringify(body)).not.toContain("/uploads/");
  expect(res.headers.get("cache-control")).toBe("no-store");
});
