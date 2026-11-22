import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const { runGateReview } = vi.hoisted(() => ({ runGateReview: vi.fn() }));
vi.mock("../../tools/rule-gate-reviewer.mjs", () => ({ runGateReview }));

import { POST } from "../../apps/web/app/api/internal/gate-review/route";

const SCHEMA = "mohen.gate-review.v1";
const CRED = "a".repeat(48);
const PROJECT = "123e4567-e89b-42d3-a456-426614174000";
const CANDIDATE = "123e4567-e89b-42d3-a456-426614174001";
const DB_URL = "postgresql://synthetic.invalid/mohen";
const ENV_KEYS = [
  "VERCEL_ENV",
  "MOHEN_GATE_REVIEW_ENABLED",
  "MOHEN_GATE_REVIEW_CREDENTIAL",
  "MOHEN_GATE_MACHINE_DATABASE_URL",
] as const;
const originals = new Map<string, string | undefined>();

function signed(
  body: Record<string, unknown>,
  opts: { time?: string; sig?: string; rawBody?: string } = {}
) {
  const time = opts.time ?? String(Date.now());
  const raw = opts.rawBody !== undefined ? opts.rawBody : JSON.stringify(body);
  const sig =
    opts.sig ??
    createHmac("sha256", CRED).update(SCHEMA + "\n" + time + "\n" + raw).digest("hex");
  return new Request("https://example.invalid/api/internal/gate-review", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-gate-review-time": time,
      "x-gate-review-signature": sig,
    },
    body: raw,
  });
}

const VALID = { gate: "G4", project_id: PROJECT, candidate_id: CANDIDATE, dry_run: true };

beforeEach(() => {
  for (const k of ENV_KEYS) originals.set(k, process.env[k]);
  process.env.VERCEL_ENV = "preview";
  process.env.MOHEN_GATE_REVIEW_ENABLED = "true";
  process.env.MOHEN_GATE_REVIEW_CREDENTIAL = CRED;
  process.env.MOHEN_GATE_MACHINE_DATABASE_URL = DB_URL;
  runGateReview.mockReset();
  runGateReview.mockResolvedValue({ status: "PASS", auditId: "audit-1" });
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = originals.get(k);
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  originals.clear();
});

describe("internal gate-review endpoint fail-closed AUTH/input contract", () => {
  it("is disabled outside Preview so the signing path never exists in production", async () => {
    process.env.VERCEL_ENV = "production";
    const response = await POST(signed(VALID));
    expect(response.status).toBe(404);
    expect((await response.json()).reason).toBe("gate_review_disabled");
    expect(runGateReview).not.toHaveBeenCalled();
  });

  it("is disabled without the explicit switch even in Preview", async () => {
    delete process.env.MOHEN_GATE_REVIEW_ENABLED;
    const response = await POST(signed(VALID));
    expect(response.status).toBe(404);
    expect((await response.json()).reason).toBe("gate_review_disabled");
    expect(runGateReview).not.toHaveBeenCalled();
  });

  it("refuses to run with a missing or too-short credential", async () => {
    delete process.env.MOHEN_GATE_REVIEW_CREDENTIAL;
    let response = await POST(signed(VALID));
    expect(response.status).toBe(503);
    expect((await response.json()).reason).toBe("gate_review_not_configured");
    process.env.MOHEN_GATE_REVIEW_CREDENTIAL = "short";
    response = await POST(signed(VALID));
    expect(response.status).toBe(503);
    expect((await response.json()).reason).toBe("gate_review_not_configured");
    expect(runGateReview).not.toHaveBeenCalled();
  });

  it("returns bad_request on malformed JSON before any HMAC or DB work", async () => {
    const response = await POST(signed(VALID, { rawBody: "{not json" }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe("bad_request");
    expect(runGateReview).not.toHaveBeenCalled();
  });

  it("denies expired, future, malformed time and any bad signature", async () => {
    const cases = [
      signed(VALID, { time: String(Date.now() - 60_000) }),
      signed(VALID, { time: String(Date.now() + 60_000) }),
      signed(VALID, { time: "not-a-number" }),
      signed(VALID, { sig: "xyz" }),
      signed(VALID, { sig: "0".repeat(64) }),
    ];
    for (const request of cases) {
      const response = await POST(request);
      expect(response.status).toBe(401);
      expect((await response.json()).reason).toBe("gate_review_denied");
    }
    expect(runGateReview).not.toHaveBeenCalled();
  });

  it("rejects invalid gate / project / candidate only after a valid HMAC", async () => {
    const cases = [
      { ...VALID, gate: "G9" },
      { ...VALID, gate: "" },
      { ...VALID, project_id: "not-a-uuid" },
      { ...VALID, candidate_id: "nope" },
    ];
    for (const body of cases) {
      const response = await POST(signed(body));
      expect(response.status).toBe(400);
      expect((await response.json()).reason).toBe("gate_review_invalid_input");
    }
    expect(runGateReview).not.toHaveBeenCalled();
  });

  it("requires the in-deployment machine signer connection", async () => {
    delete process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
    const response = await POST(signed(VALID));
    expect(response.status).toBe(503);
    expect((await response.json()).reason).toBe("machine_signer_connection_required");
    expect(runGateReview).not.toHaveBeenCalled();
  });
});

describe("internal gate-review endpoint delegates to the single signing implementation", () => {
  it("passes exact gate/project/candidate/dry_run and returns a no-store PASS", async () => {
    const response = await POST(signed(VALID));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: true, status: "PASS", auditId: "audit-1" });
    expect(runGateReview).toHaveBeenCalledTimes(1);
    expect(runGateReview).toHaveBeenCalledWith({
      gate: "G4",
      projectId: PROJECT,
      candidateId: CANDIDATE,
      attestStageBinding: true,
      dryRun: true,
    });
  });

  it("allows an omitted candidate_id (current-qualification review)", async () => {
    const body = { gate: "G5", project_id: PROJECT, dry_run: false };
    const response = await POST(signed(body));
    expect(response.status).toBe(200);
    expect(runGateReview).toHaveBeenCalledWith({
      gate: "G5",
      projectId: PROJECT,
      candidateId: null,
      attestStageBinding: true,
      dryRun: false,
    });
  });

  it("surfaces a FAIL review result as ok:false without a 5xx", async () => {
    runGateReview.mockResolvedValue({ status: "FAIL", reason: "grounding_failed" });
    const response = await POST(signed(VALID));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: false, status: "FAIL" });
  });

  it("returns only a sanitized first-line error code on signer failure", async () => {
    runGateReview.mockRejectedValue(new Error("GATE_REVIEW_FAILED\npostgres://internal/detail"));
    const response = await POST(signed(VALID));
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.reason).toBe("gate_review_failed");
    expect(json.error_code).toBe("GATE_REVIEW_FAILED");
    expect(JSON.stringify(json)).not.toContain("postgres://internal/detail");
  });
});
