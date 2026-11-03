import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const {verifyReviewer,signWorkPublication,getSessionUser,findUserById}=vi.hoisted(()=>({
  verifyReviewer:vi.fn(),signWorkPublication:vi.fn(),
  getSessionUser:vi.fn(),findUserById:vi.fn(),
}));
vi.mock("../../apps/web/lib/gate-review",()=>({verifyReviewer,signWorkPublication}));
vi.mock("../../apps/web/lib/auth",()=>({
  OPERATOR_COOKIE:"mohen_role",getSessionUser,findUserById,
}));
import {POST} from "../../apps/web/app/api/governance/gates/decisions/route";
const wid="123e4567-e89b-42d3-a456-426614174001",rid="123e4567-e89b-42d3-a456-426614174002";
const request=(body:unknown)=>{
  const r=new NextRequest("https://example.invalid/api/governance/gates/decisions",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify(body),
  });
  r.cookies.set("mohen_role","synthetic-session");
  return r;
};
describe("HP11 authenticated work-review API exact revision",()=>{
  beforeEach(()=>{
    for(const fn of [verifyReviewer,signWorkPublication,getSessionUser,findUserById])fn.mockReset();
    verifyReviewer.mockResolvedValue(true);
    getSessionUser.mockResolvedValue({uid:wid,r:["reviewer"]});
    findUserById.mockResolvedValue({email:"reviewer@example.invalid"});
    signWorkPublication.mockResolvedValue({ok:true});
  });
  it("sends exact revision and current reviewer to work-review repository",async()=>{
    const response=await POST(request({work_id:wid,revision_id:rid,decision:"approved"}));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(signWorkPublication).toHaveBeenCalledWith(
      wid,rid,"approved","reviewer@example.invalid",undefined
    );
  });
  it.each([undefined,null,"", "revision-one", "abc"])( "refuses invalid revision %s without writing",async rev=>{
    const response=await POST(request({work_id:wid,revision_id:rev,decision:"approved"}));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe("revision_id_required");
    expect(signWorkPublication).not.toHaveBeenCalled();
  });
  it("rejects non-reviewer and never calls decision writer",async()=>{
    verifyReviewer.mockResolvedValue(false);
    const response=await POST(request({work_id:wid,revision_id:rid,decision:"approved"}));
    expect(response.status).toBe(403);
    expect(signWorkPublication).not.toHaveBeenCalled();
  });
  it("rejects missing current authenticated identity even if reviewer check was mocked true",async()=>{
    getSessionUser.mockResolvedValue(null);
    findUserById.mockResolvedValue(null);
    const response=await POST(request({work_id:wid,revision_id:rid,decision:"approved"}));
    expect(response.status).toBe(403);
    expect(signWorkPublication).not.toHaveBeenCalled();
  });
});
