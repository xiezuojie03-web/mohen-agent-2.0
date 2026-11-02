// MAB M2 — server-only private original bytes adapter.
// Never expose its service credential or object path to public clients.
// Database ownership/RLS checks remain a separate mandatory gate.
import { createHash } from "node:crypto";

export const PRIVATE_ORIGINAL_BUCKET = "mohen-private-originals";
export const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KEY = new RegExp("^" + UUID + "/" + UUID + "\\.bin$");
const HEX256 = /^[a-f0-9]{64}$/;

export function privateOriginalKey(projectId, objectId) {
  const uuid = new RegExp("^" + UUID + "$");
  if (!uuid.test(projectId) || !uuid.test(objectId)) throw new Error("ORIGINAL_INVALID_ID");
  return projectId + "/" + objectId + ".bin";
}

export function originalHash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createPrivateOriginalStorage(options = {}) {
  const endpoint = options.endpoint ?? process.env.SUPABASE_URL ?? process.env.MOHEN_SUPABASE_URL;
  const token = options.token ?? process.env.MOHEN_PRIVATE_STORAGE_SERVICE_KEY;
  const fetcher = options.fetcher ?? fetch;
  if (!endpoint || !token) throw new Error("ORIGINAL_STORAGE_NOT_CONFIGURED");
  let base;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
        parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error("INVALID_URL");
    base = parsed.origin;
  } catch {
    throw new Error("ORIGINAL_STORAGE_NOT_CONFIGURED");
  }
  const api = key => {
    if (!KEY.test(key)) throw new Error("ORIGINAL_INVALID_KEY");
    return base + "/storage/v1/object/" + PRIVATE_ORIGINAL_BUCKET + "/" +
      key.split("/").map(encodeURIComponent).join("/");
  };
  const headers = {
    apikey: token,
    Authorization: "Bearer " + token,
  };
  async function request(method, key, bytes, mime) {
    const url = api(key);
    const response = await fetcher(url.replace("/object/" + PRIVATE_ORIGINAL_BUCKET + "/", "/object/authenticated/" + PRIVATE_ORIGINAL_BUCKET + "/"), {
      method, headers: { ...headers, ...(method === "POST" ? { "Content-Type": mime, "x-upsert": "false" } : {}) },
      ...(method === "POST" ? { body: bytes } : {}),
      cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("ORIGINAL_STORAGE_" + method + "_FAILED");
    return response;
  }
  return {
    async putVerified(key, input, mime = "application/octet-stream") {
      api(key);
      const bytes = Buffer.from(input);
      if (bytes.length < 1 || bytes.length > MAX_ORIGINAL_BYTES) throw new Error("ORIGINAL_SIZE_INVALID");
      if (typeof mime !== "string" || mime.length > 100 || /[\r\n]/.test(mime)) throw new Error("ORIGINAL_MIME_INVALID");
      const checksum = originalHash(bytes);
      // POST must target the object create endpoint (authenticated GET only).
      const url = api(key);
      const upload = await fetcher(url, {
        method: "POST", headers: { ...headers, "Content-Type": mime, "x-upsert": "false" },
        body: bytes, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
      });
      if (!upload.ok) throw new Error("ORIGINAL_STORAGE_UPLOAD_FAILED");
      const verified = await this.readVerified(key, checksum, bytes.length);
      if (!verified.equals(bytes)) throw new Error("ORIGINAL_BYTES_MISMATCH");
      return { sha256: checksum, byteSize: bytes.length, contentType: mime };
    },
    async readVerified(key, expectedSha256, expectedLength) {
      if (!HEX256.test(expectedSha256)) throw new Error("ORIGINAL_HASH_INVALID");
      const response = await request("GET", key);
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length > MAX_ORIGINAL_BYTES || (expectedLength !== undefined && data.length !== expectedLength) ||
          originalHash(data) !== expectedSha256) throw new Error("ORIGINAL_INTEGRITY_FAILED");
      return data;
    },
    async discardUnverified(key) {
      // Only call for an unqualified, newly reserved object after a failed import.
      const url = api(key);
      const res = await fetcher(url, {
        method: "DELETE", headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
      });
      if (!res.ok && res.status !== 404) throw new Error("ORIGINAL_STORAGE_CLEANUP_FAILED");
    },
  };
}
