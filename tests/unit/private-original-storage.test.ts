import { describe, it, expect, vi } from "vitest";
import { createPrivateOriginalStorage, privateOriginalKey, originalHash } from "../../packages/data-access/src/private-original-storage.mjs";

const project = "11111111-1111-4111-8111-111111111111";
const object = "22222222-2222-4222-8222-222222222222";
const key = privateOriginalKey(project, object);
const storageUrl = "https://example.supabase.co/";
const token = "test-service-key-not-production";
function mockStore() {
  const stored = new Map<string, Uint8Array>();
  const calls: Array<{ method: string; path: string; options: RequestInit }> = [];
  const fetcher = vi.fn(async (url: string, options: RequestInit) => {
    const method = options.method ?? "GET";
    const u = new URL(url);
    calls.push({ method, path: u.pathname, options });
    if (method === "POST") {
      if (stored.has(u.pathname.replace("/object/", "/object/authenticated/"))) return new Response("", { status: 409 });
      stored.set(u.pathname.replace("/object/", "/object/authenticated/"), new Uint8Array(options.body as Uint8Array));
      return new Response("{}", { status: 200 });
    }
    if (method === "GET") {
      const bytes = stored.get(u.pathname);
      return bytes ? new Response(bytes) : new Response("", { status: 404 });
    }
    if (method === "DELETE") {
      stored.delete(u.pathname.replace("/object/", "/object/authenticated/"));
      return new Response("", { status: 200 });
    }
    return new Response("", { status: 405 });
  });
  return { stored, calls, fetcher, client: createPrivateOriginalStorage({ endpoint: storageUrl, token, fetcher }) };
}

describe("private original bytes; M2 not activated until DB ownership and storage binding", () => {
  it("fails closed without explicit server credential", () => {
    expect(() => createPrivateOriginalStorage({ endpoint: storageUrl, token: "" })).toThrow("ORIGINAL_STORAGE_NOT_CONFIGURED");
    expect(() => createPrivateOriginalStorage({ endpoint: "http://example.invalid/", token })).toThrow("ORIGINAL_STORAGE_NOT_CONFIGURED");
  });
  it("only constructs server-issued project/object UUID keys", () => {
    expect(key).toBe(project + "/" + object + ".bin");
    expect(() => privateOriginalKey("../../etc", object)).toThrow("ORIGINAL_INVALID_ID");
  });
  it("uploads without upsert, reads authenticated bytes back and checks the exact hash", async () => {
    const s = mockStore();
    const raw = Buffer.from("synthetic private bytes, NOT a real source");
    const result = await s.client.putVerified(key, raw, "text/plain");
    expect(result).toEqual({ sha256: originalHash(raw), byteSize: raw.length, contentType: "text/plain" });
    expect(await s.client.readVerified(key, result.sha256, raw.length)).toEqual(raw);
    expect(s.calls.map(c => c.method)).toEqual(["POST", "GET", "GET"]);
    expect(s.calls[0].options.headers).toMatchObject({ "x-upsert": "false", Authorization: "Bearer " + token });
    expect(s.calls[1].path).toContain("/object/authenticated/mohen-private-originals/");
    expect(s.calls.some(c => c.path.includes("/object/public/"))).toBe(false);
  });
  it("refuses duplicate writes to an existing immutable object key", async () => {
    const s = mockStore();
    await s.client.putVerified(key, Buffer.from("first"));
    await expect(s.client.putVerified(key, Buffer.from("other"))).rejects.toThrow("ORIGINAL_STORAGE_UPLOAD_FAILED");
  });
  it("rejects missing, corrupted and incorrect-length object bytes", async () => {
    const s = mockStore();
    await expect(s.client.readVerified(key, originalHash(Buffer.from("missing")))).rejects.toThrow("ORIGINAL_NOT_FOUND");
    const raw = Buffer.from("original");
    await s.client.putVerified(key, raw);
    s.stored.set(s.calls.at(-1)!.path, Buffer.from("tampered"));
    await expect(s.client.readVerified(key, originalHash(raw), raw.length)).rejects.toThrow("ORIGINAL_INTEGRITY_FAILED");
  });
  it("never uploads oversize, empty, invalid names, or header-injection MIME", async () => {
    const s = mockStore();
    await expect(s.client.putVerified(key, Buffer.alloc(0))).rejects.toThrow("ORIGINAL_SIZE_INVALID");
    await expect(s.client.putVerified(key, Buffer.alloc(10 * 1024 * 1024 + 1))).rejects.toThrow("ORIGINAL_SIZE_INVALID");
    await expect(s.client.putVerified("../secret", Buffer.from("a"))).rejects.toThrow("ORIGINAL_INVALID_KEY");
    await expect(s.client.putVerified(key, Buffer.from("a"), "image/png\r\nX-Foo:1")).rejects.toThrow("ORIGINAL_MIME_INVALID");
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it("can compensate an unverified object without touching any other key", async () => {
    const s = mockStore();
    await s.client.putVerified(key, Buffer.from("test"));
    await s.client.discardUnverified(key);
    await expect(s.client.readVerified(key, originalHash(Buffer.from("test")))).rejects.toThrow("ORIGINAL_NOT_FOUND");
  });
});

it('recognizes the official HTTP400 object-not-found envelope without treating permission errors as missing',async()=>{
 const missing=createPrivateOriginalStorage({endpoint:storageUrl,token,fetcher:async()=>new Response(JSON.stringify({statusCode:'404',error:'not_found',message:'Object not found'}),{status:400})});
 await expect(missing.readVerified(key,'a'.repeat(64))).rejects.toThrow('ORIGINAL_NOT_FOUND');
 const denied=createPrivateOriginalStorage({endpoint:storageUrl,token,fetcher:async()=>new Response(JSON.stringify({statusCode:'403',error:'Unauthorized'}),{status:400})});
 await expect(denied.readVerified(key,'a'.repeat(64))).rejects.toThrow('ORIGINAL_STORAGE_GET_FAILED');
});
it('stops an oversized streaming download before buffering the full response',async()=>{
 let chunks=0;
 const client=createPrivateOriginalStorage({endpoint:storageUrl,token,fetcher:async()=>new Response(new ReadableStream({pull(controller){chunks++;controller.enqueue(new Uint8Array(1024*1024));if(chunks===14)controller.close();}}))});
 await expect(client.readVerified(key,'a'.repeat(64))).rejects.toThrow('ORIGINAL_INTEGRITY_FAILED');
 expect(chunks).toBeLessThan(14);
});
