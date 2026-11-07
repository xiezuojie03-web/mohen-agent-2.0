#!/usr/bin/env node
// MAB M5 (LOCAL ISOLATED ONLY): session minting for the machine rule reviewer.
// The token may only ever represent the machine reviewer itself; minting a token
// for another principal (the Owner or any human) is refused outright. The token
// is never printed, logged or written to disk.
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export const MACHINE_REVIEWER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
export const MACHINE_REVIEWER_EMAIL = "machine-reviewer@mohen.local";
export const MACHINE_SIGNER_LOGIN = "mohen_gate_signer_m5_machine";
export const MAX_SESSION_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_SESSION_TTL_MS = 5 * 60 * 1000;

/** Mint a short-lived token for the machine reviewer and nothing else. */
export function mintMachineSessionToken({
  uid,
  ttlMs = DEFAULT_SESSION_TTL_MS,
  secret = process.env.MOHEN_DATABASE_SESSION_SECRET,
} = {}) {
  if (uid !== MACHINE_REVIEWER_USER_ID) throw Error("MACHINE_TOKEN_FOR_FOREIGN_PRINCIPAL_FORBIDDEN");
  if (typeof secret !== "string" || secret.length < 32) throw Error("MOHEN_DATABASE_SESSION_SECRET_REQUIRED");
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_SESSION_TTL_MS) throw Error("MACHINE_SESSION_TTL_INVALID");
  // Same payload contract as the Web session token: {uid, r, exp}.
  const payload = Buffer.from(JSON.stringify({ uid, r: [], exp: Date.now() + ttlMs })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Reads for the reviewer run as the dedicated machine login. Importing
 * data-access loads .env.local; once that URL is known it is replaced before
 * any connection is opened, so every verification query uses the machine
 * identity instead of the admin credential.
 */
export async function openMachineQuery() {
  const dataAccess = await import("../packages/data-access/src/index.mjs");
  const url = process.env.MOHEN_GATE_MACHINE_DATABASE_URL;
  if (!url) throw Error("MACHINE_GATE_DATABASE_URL_REQUIRED");
  process.env.DATABASE_URL = url;
  return dataAccess.queryRows;
}

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const uid = argument("uid");
  if (!uid) throw Error("MACHINE_REVIEWER_UID_REQUIRED");
  // The session secret lives in .env.local, which data-access loads on import.
  const queryRows = await openMachineQuery();
  const token = mintMachineSessionToken({ uid });
  const rows = await queryRows(`select control.current_app_user_id()::text as uid
    from (select set_config('mohen.session_token', :'token', false)) s`, { token });
  const verified = rows[0]?.uid ?? "";
  if (verified !== MACHINE_REVIEWER_USER_ID) throw Error("MACHINE_SESSION_UNVERIFIED");
  console.log(`MACHINE_SESSION_READY uid=${uid} login=${MACHINE_SIGNER_LOGIN} ttl_seconds=${DEFAULT_SESSION_TTL_MS / 1000} verified_uid=${verified}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.log(`MACHINE_SESSION_FAILED ${String(error?.message ?? error).split("\n")[0]}`);
    process.exitCode = 1;
  }
}
