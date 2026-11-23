import {beforeEach,describe,expect,it,vi} from "vitest";
const {queryRows,queryValue}=vi.hoisted(()=>({
  queryRows:vi.fn(),queryValue:vi.fn(),
}));
vi.mock("@mohen/data-access",()=>({queryRows,queryValue}));
vi.mock("../../apps/web/lib/auth",()=>({hasRole:vi.fn()}));
// Legacy work-level sign-off tests: force the formal-chain probe to "not formal".
vi.mock("../../apps/web/lib/formal-publication-chain",()=>({
  getFormalRevision: vi.fn().mockResolvedValue(null),
  formalDecide: vi.fn(),
}));
import {signWorkPublication} from "../../apps/web/lib/gate-review";

const wid="123e4567-e89b-42d3-a456-426614174001";
const rid="123e4567-e89b-42d3-a456-426614174002";
const other="123e4567-e89b-42d3-a456-426614174003";
describe("HP11 exact WorkRevision publication review",()=>{
  beforeEach(()=>{queryRows.mockReset();queryValue.mockReset();});
  it("writes work-level approval only through an atomic exact submitted revision insert",async()=>{
    queryRows.mockResolvedValue([{revision_id:rid}]);
    await expect(signWorkPublication(wid,rid,"approved","reviewer@example.invalid"))
      .resolves.toEqual({ok:true});
    expect(queryRows).toHaveBeenCalledTimes(1);
    const [sql,params]=queryRows.mock.calls[0];
    expect(sql).toContain("insert into control.work_publication_decisions");
    expect(sql).toContain("r.work_id = :'wid' and r.revision_id = :'rid'");
    expect(sql).toContain("r.status = 'submitted'");
    expect(params).toMatchObject({wid,rid,dec:"approved",reviewer:"reviewer@example.invalid"});
    expect(queryValue).not.toHaveBeenCalled();
  });
  it("refuses missing or malformed revision ID without a database query",async()=>{
    for(const invalid of [null,"","rev-3","__proto__"]){
      await expect(signWorkPublication(wid,invalid,"approved","reviewer@example.invalid"))
        .resolves.toMatchObject({ok:false,reason:"revision_id_required"});
    }
    expect(queryRows).not.toHaveBeenCalled();
  });
  it("refuses arbitrary revisions belonging to a different work or no longer submitted",async()=>{
    queryRows.mockResolvedValue([]);
    queryValue.mockResolvedValue(wid);
    const result=await signWorkPublication(wid,other,"approved","reviewer@example.invalid");
    expect(result).toEqual({ok:false,reason:"revision_not_submitted"});
    expect(queryRows).toHaveBeenCalledTimes(1);
    expect(queryValue).toHaveBeenCalledTimes(1);
  });
  it("reports missing work without recording an approval",async()=>{
    queryRows.mockResolvedValue([]);
    queryValue.mockResolvedValue(null);
    expect(await signWorkPublication(wid,rid,"rejected","reviewer@example.invalid"))
      .toEqual({ok:false,reason:"work_not_found"});
  });
  it("rejects missing reviewer identity without creating a Gate or publication decision",async()=>{
    expect(await signWorkPublication(wid,rid,"approved","unknown-reviewer"))
      .toEqual({ok:false,reason:"reviewer_identity_required"});
    expect(queryRows).not.toHaveBeenCalled();
  });
});
