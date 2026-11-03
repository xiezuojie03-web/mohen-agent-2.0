import {beforeEach,expect,it,vi} from "vitest";
import {createPrivateOriginalSourceVerifier} from "../../packages/data-access/src/private-original-source-binding.mjs";

const originalId="11111111-1111-4111-8111-111111111111";
const sourceVersionId="22222222-2222-4222-8222-222222222222";
const rawItemId="33333333-3333-4333-8333-333333333333";
const sha="a".repeat(64),actor="44444444-4444-4444-8444-444444444444";
const binding={originalId,sourceVersionId,rawItemId,rawSha256:sha};
const token="synthetic-short-lived-db-session";
const query=vi.fn(),release=vi.fn(),connect=vi.fn();
const pool={connect};
beforeEach(()=>{
 vi.clearAllMocks();
 connect.mockResolvedValue({query,release});
 query.mockImplementation(async(sql:string)=>{
   if(sql.includes("current_app_user_id()"))return {rows:[{user_id:actor}]};
   if(sql.includes("select 1 as bound"))return {rows:[{bound:1}]};
   return {rows:[]};
 });
});
it("binds all source IDs to the same verified private original using one Owner transaction",async()=>{
 const verify=createPrivateOriginalSourceVerifier(pool);
 expect(await verify(binding,token)).toBe(true);
 expect(query.mock.calls.map(args=>args[0])).toEqual(expect.arrayContaining([
   "begin","set local role mohen_app_runtime","select set_config('mohen.session_token',$1,true)",
   "select control.current_app_user_id()::text as user_id","commit",
 ]));
 const found=query.mock.calls.find(args=>args[0].includes("select 1 as bound"));
 expect(found).toBeDefined();
 expect(found[1]).toEqual([originalId,rawItemId,sourceVersionId,actor,sha]);
 expect(found[0]).toContain("studio.private_originals");
 expect(found[0]).toContain("studio.asset_revisions");
 expect(found[0]).toContain("source.raw_items");
 expect(found[0]).toContain("source.source_versions");
 expect(found[0]).toContain("o.state='STORED_VERIFIED'");
 expect(release).toHaveBeenCalledWith(false);
});
it("returns false when foreign or obsolete source/reading identity is not linked",async()=>{
 query.mockImplementation(async(sql:string)=>{
   if(sql.includes("current_app_user_id()"))return {rows:[{user_id:actor}]};
   return {rows:[]};
 });
 expect(await createPrivateOriginalSourceVerifier(pool)(binding,token)).toBe(false);
 expect(query.mock.calls.map(args=>args[0])).toContain("commit");
});
it("rejects malformed identities and hashes before opening any DB connection",async()=>{
 const verify=createPrivateOriginalSourceVerifier(pool);
 await expect(verify({...binding,rawItemId:"../unsafe"},token)).rejects.toThrow("PRIVATE_SOURCE_IDENTITY_INVALID");
 await expect(verify({...binding,rawSha256:"wrong"},token)).rejects.toThrow("PRIVATE_SOURCE_IDENTITY_INVALID");
 expect(connect).not.toHaveBeenCalled();
});
it("fails closed and rolls back if low privilege SELECT is denied",async()=>{
 query.mockImplementation(async(sql:string)=>{
   if(sql.includes("current_app_user_id()"))return {rows:[{user_id:actor}]};
   if(sql.includes("select 1 as bound"))throw new Error("permission denied for source.raw_items");
   return {rows:[]};
 });
 await expect(createPrivateOriginalSourceVerifier(pool)(binding,token)).rejects.toThrow("permission denied");
 expect(query.mock.calls.map(args=>args[0])).toContain("rollback");
 expect(query.mock.calls.map(args=>args[0])).not.toContain("commit");
 expect(release).toHaveBeenCalledWith(false);
});
it("rejects missing or revoked session identity without reading any source rows",async()=>{
 query.mockImplementation(async(sql:string)=>{
   if(sql.includes("current_app_user_id()"))return {rows:[{user_id:null}]};
   return {rows:[]};
 });
 await expect(createPrivateOriginalSourceVerifier(pool)(binding,token)).rejects.toThrow("STUDIO_IDENTITY_REQUIRED");
 expect(query.mock.calls.some(args=>args[0].includes("select 1 as bound"))).toBe(false);
 expect(query.mock.calls.map(args=>args[0])).toContain("rollback");
});
