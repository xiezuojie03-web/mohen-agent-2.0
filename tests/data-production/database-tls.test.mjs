import test from "node:test";
import assert from "node:assert/strict";

test("remote PostgreSQL connections verify server certificates", async () => {
  const old = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://fixture:fixture@db.example.invalid/fixture_test";
  const { getNodePgPool } = await import("../../packages/data-access/src/node-pg-client.mjs?tls-test");
  const pool = getNodePgPool();
  try { assert.equal(pool.options.ssl.rejectUnauthorized, true); }
  finally { await pool.end(); old === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = old; }
});
