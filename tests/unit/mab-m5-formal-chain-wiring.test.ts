import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, expect, it } from "vitest";

// Resolve .env.local without echoing secrets; enforce a loopback isolated DB.
// Skip gracefully if .env.local is absent (e.g. CI environments without local DB fixture).
function loadEnv(): Record<string, string> {
  const root = path.resolve(process.cwd());
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = new URL(env.DATABASE_URL ?? "postgresql://x@none/none");
const host = url.hostname.toLowerCase();
const dbName = decodeURIComponent(url.pathname).replace(/^\//, "").toLowerCase();
const IS_ISOLATED = (host === "127.0.0.1" || host === "localhost" || host === "::1") &&
  /dev|isolat|test/.test(dbName);

// Formal object created and independently G5-qualified in this M5 batch.
const WORK = "3bb3458b-90e9-2b0d-4475-67f310b2ac99";
const REVISION = "5c459bc3-1750-b718-eaf5-daa16ec441e0";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const OPERATOR = "b0a11000-0000-4000-8000-0000000000b2"; // independent operator, != creator

beforeAll(() => {
  if (!IS_ISOLATED) throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${dbName}`);
});

it.skipIf(!IS_ISOLATED)("detects the formal envelope and rejects a legacy revision", async () => {
  const { getFormalRevision } = await import("../../apps/web/lib/formal-publication-chain");
  const formal = await getFormalRevision(REVISION, WORK);
  expect(formal).toMatchObject({ revisionId: REVISION, workId: WORK, projectId: PROJECT });
  const legacy = await getFormalRevision("00000000-0000-4000-8000-000000000000");
  expect(legacy).toBeNull();
});

it.skipIf(!IS_ISOLATED)("formal submit is idempotent and binds the exact revision", async () => {
  const { formalSubmit } = await import("../../apps/web/lib/formal-publication-chain");
  const res = await formalSubmit(REVISION, PROJECT, "wiring-test");
  expect(res.ok).toBe(true);
  if (res.ok) {
    expect(res.revisionId).toBe(REVISION);
    expect(res.workId).toBe(WORK);
    expect(res.formal).toBe(true);
  }
});

it.skipIf(!IS_ISOLATED)("publish → WATCH visible → withdraw → WATCH hidden (P08)", async () => {
  const { formalPublish, formalWithdraw } = await import("../../apps/web/lib/formal-publication-chain");
  const { listWatchEligible } = await import("../../apps/web/lib/publication");

  const pub = await formalPublish(WORK, REVISION, OPERATOR);
  expect(pub.ok).toBe(true);
  if (!pub.ok) return;

  const during = await listWatchEligible();
  expect(during.some((w) => w.work_id === WORK && w.revision_id === REVISION)).toBe(true);

  const wd = await formalWithdraw(WORK, OPERATOR, "wiring test withdrawal");
  expect(wd.ok).toBe(true);

  const after = await listWatchEligible();
  expect(after.some((w) => w.work_id === WORK && w.revision_id === REVISION)).toBe(false);
});

it.skipIf(!IS_ISOLATED)("rejects a publish without an APPROVED decision on a fresh work", async () => {
  const { formalPublish } = await import("../../apps/web/lib/formal-publication-chain");
  // A work/revision that never entered the formal chain: must be refused, not faked.
  const res = await formalPublish(
    "00000000-0000-4000-8000-000000000099",
    "00000000-0000-4000-8000-000000000098",
    OPERATOR
  );
  expect(res.ok).toBe(false);
});
