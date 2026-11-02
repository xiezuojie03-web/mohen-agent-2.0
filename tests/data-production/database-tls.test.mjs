import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { rootCertificates } from "node:tls";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";
const { Client } = createRequire(new URL("../../packages/data-access/package.json", import.meta.url))("pg");

test("separate database password overrides stale URI credentials without losing special characters or TLS", async () => {
  const oldUrl = process.env.DATABASE_URL, oldPassword = process.env.MOHEN_DATABASE_PASSWORD;
  process.env.DATABASE_URL = "postgresql://fixture:old@db.example.invalid/fixture_test?application_name=rotation";
  const password = " fixture:@/?#%+密码 ";
  process.env.MOHEN_DATABASE_PASSWORD = password;
  let pool;
  try {
    const { getNodePgPool } = await import("../../packages/data-access/src/node-pg-client.mjs?password-rotation-test");
    pool = getNodePgPool();
    const actual = new Client(pool.options).connectionParameters;
    assert.ok(actual.password === password, "the new password must arrive intact without logging it");
    assert.equal(actual.ssl.rejectUnauthorized, true);
    assert.equal(actual.application_name, "rotation");
  } finally {
    if (pool) await pool.end();
    oldUrl === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = oldUrl;
    oldPassword === undefined ? delete process.env.MOHEN_DATABASE_PASSWORD : process.env.MOHEN_DATABASE_PASSWORD = oldPassword;
  }
});

test("an explicitly empty password override fails before opening a connection", async () => {
  const oldUrl = process.env.DATABASE_URL, oldPassword = process.env.MOHEN_DATABASE_PASSWORD;
  process.env.DATABASE_URL = "postgresql://fixture:old@db.example.invalid/fixture_test";
  process.env.MOHEN_DATABASE_PASSWORD = "";
  try {
    const { getNodePgPool } = await import("../../packages/data-access/src/node-pg-client.mjs?empty-password-test");
    assert.throws(() => getNodePgPool(), /MOHEN_DATABASE_PASSWORD/);
  } finally {
    oldUrl === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = oldUrl;
    oldPassword === undefined ? delete process.env.MOHEN_DATABASE_PASSWORD : process.env.MOHEN_DATABASE_PASSWORD = oldPassword;
  }
});

test("remote PostgreSQL connections verify server certificates", async () => {
  const old = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://fixture:fixture@db.example.invalid/fixture_test";
  const { getNodePgPool } = await import("../../packages/data-access/src/node-pg-client.mjs?tls-test");
  const pool = getNodePgPool();
  try { assert.equal(pool.options.ssl.rejectUnauthorized, true); }
  finally { await pool.end(); old === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = old; }
});

test("explicit client certificate key and CA are retained when enforcing remote TLS", async () => {
  const oldUrl = process.env.DATABASE_URL;
  const directory = mkdtempSync(join(tmpdir(), "mohen-tls-fixture-"));
  const key = generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "pem" });
  const caPath = join(directory, "ca.pem"), keyPath = join(directory, "key.pem");
  writeFileSync(caPath, rootCertificates[0]);
  writeFileSync(keyPath, key, { mode: 0o600 });
  const connection = new URL("postgresql://fixture:fixture@db.example.invalid/fixture_test");
  connection.searchParams.set("sslrootcert", caPath);
  connection.searchParams.set("sslkey", keyPath);
  process.env.DATABASE_URL = connection.toString();
  const { getNodePgPool } = await import("../../packages/data-access/src/node-pg-client.mjs?tls-existing-key-test");
  const pool = getNodePgPool();
  try {
    const actual = new Client(pool.options).connectionParameters;
    assert.ok(actual.ssl.key === key, "retain the configured client key without logging its value");
    assert.equal(actual.ssl.ca, rootCertificates[0]);
    assert.equal(actual.ssl.rejectUnauthorized, true);
  } finally {
    await pool.end();
    oldUrl === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = oldUrl;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("configured database CA reaches the actual pg client despite connection-string SSL flags", async () => {
  const oldUrl = process.env.DATABASE_URL;
  const oldCa = process.env.MOHEN_DATABASE_CA_CERT;
  process.env.DATABASE_URL = "postgresql://fixture:fixture@db.example.invalid/fixture_test?sslmode=no-verify&uselibpqcompat=true&application_name=mohen-test";
  process.env.MOHEN_DATABASE_CA_CERT = rootCertificates[0];
  const { getNodePgPool } = await import("../../packages/data-access/src/node-pg-client.mjs?tls-custom-ca-test");
  const pool = getNodePgPool();
  try {
    const actual = new Client(pool.options).connectionParameters;
    assert.ok(Array.isArray(actual.ssl.ca) && actual.ssl.ca.includes(rootCertificates[0]), "the database CA must not be dropped by pg URL parsing");
    assert.equal(actual.ssl.rejectUnauthorized, true);
    assert.equal(actual.ssl.checkServerIdentity, undefined, "hostname verification must not be replaced with a bypass");
    assert.equal(actual.application_name, "mohen-test");
  } finally {
    await pool.end();
    oldUrl === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = oldUrl;
    oldCa === undefined ? delete process.env.MOHEN_DATABASE_CA_CERT : process.env.MOHEN_DATABASE_CA_CERT = oldCa;
  }
});
