import {beforeEach,describe,expect,it,vi} from "vitest";
const {getSession,signDatabaseSessionToken,studioAssetStore,store}=vi.hoisted(()=>{
  const store={listAssetRevisions:vi.fn(),listRevisionUseEvents:vi.fn(),listAssets:vi.fn(),getRevision:vi.fn()};
  return {
    getSession:vi.fn(),signDatabaseSessionToken:vi.fn(),
    studioAssetStore:vi.fn(()=>store),store,
  };
});
vi.mock("../../apps/web/lib/session",()=>({getSession}));
vi.mock("../../apps/web/lib/auth",()=>({signDatabaseSessionToken}));
vi.mock("../../apps/web/lib/studio-assets",()=>({
  studioAssetStore,
  studioObjectBody:vi.fn(),
  studioAssetFailure:()=>new Response(JSON.stringify({ok:false,reason:"storage_unavailable"}),{status:503}),
}));
import {GET} from "../../apps/web/app/api/studio/assets/route";
const id="123e4567-e89b-42d3-a456-426614174001";
const aid="123e4567-e89b-42d3-a456-426614174002";
const rid="123e4567-e89b-42d3-a456-426614174003";
const req=(params:Record<string,string>)=>new Request("http://localhost/api/studio/assets?"+
  new URLSearchParams(params));
describe("HP03 private Studio history and use-event query routing",()=>{
  beforeEach(()=>{
    for(const mock of [getSession,signDatabaseSessionToken,studioAssetStore,...Object.values(store)])
      mock.mockReset();
    getSession.mockResolvedValue({uid:id,r:["creator"]});
    signDatabaseSessionToken.mockReturnValue("synthetic-signed-session");
    studioAssetStore.mockReturnValue(store);
    store.listAssetRevisions.mockResolvedValue([{revision_id:rid,revision_no:2}]);
    store.listRevisionUseEvents.mockResolvedValue([{asset_revision_id:rid}]);
  });
  it("requires a current session before reading asset lineage",async()=>{
    getSession.mockResolvedValue(null);
    const res=await GET(req({history:"1",project_id:id,asset_id:aid}));
    expect(res.status).toBe(401);
    expect(studioAssetStore).not.toHaveBeenCalled();
  });
  it("reads exact project/asset lineage using the signed session",async()=>{
    const res=await GET(req({history:"1",project_id:id,asset_id:aid}));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(store.listAssetRevisions).toHaveBeenCalledWith(id,aid,"synthetic-signed-session");
    expect((await res.json()).revisions[0].revision_id).toBe(rid);
  });
  it("does not guess the project or revision when querying use-events",async()=>{
    const missing=await GET(req({use_events:"1",revision_id:rid}));
    expect(missing.status).toBe(400);
    expect(store.listRevisionUseEvents).not.toHaveBeenCalled();
    const res=await GET(req({use_events:"1",project_id:id,revision_id:rid}));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(store.listRevisionUseEvents).toHaveBeenCalledWith(id,rid,"synthetic-signed-session");
    expect((await res.json()).events).toHaveLength(1);
  });
  it("does not alter existing current-asset listing contract",async()=>{
    store.listAssets.mockResolvedValue([]);
    const res=await GET(req({project_id:id}));
    expect(res.status).toBe(200);
    expect(store.listAssets).toHaveBeenCalledWith(id,"synthetic-signed-session");
  });
});
