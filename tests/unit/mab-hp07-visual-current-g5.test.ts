import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";

const {queryRows}=vi.hoisted(()=>({queryRows:vi.fn()}));
vi.mock("@mohen/data-access",()=>({queryRows}));
import {readProductionRelationSummary} from "../../apps/web/lib/read-model-bridge";

const oldContext=process.env.MOHEN_G5_CONTEXTS;
const ctx={purpose:{namespace:"test",code:"visual-display",version:"1"},scope:{project:"synthetic"}};
describe("HP07 visual stage exact current G5 and safe topic filtering",()=>{
  beforeEach(()=>{
    queryRows.mockReset();
    process.env.MOHEN_G5_CONTEXTS=JSON.stringify({visual_stage:ctx});
  });
  afterEach(()=>{if(oldContext===undefined)delete process.env.MOHEN_G5_CONTEXTS;
    else process.env.MOHEN_G5_CONTEXTS=oldContext;});
  it("fails closed without explicitly scoped visual-stage context",async()=>{
    delete process.env.MOHEN_G5_CONTEXTS;
    const data=await readProductionRelationSummary("topic");
    expect(data.available).toBe(false);
    expect(queryRows).not.toHaveBeenCalled();
  });
  it("escapes wildcard and quote input through a bound parameter",async()=>{
    queryRows.mockResolvedValueOnce([]);
    const key="Shanghai%_#'old";
    const data=await readProductionRelationSummary(key);
    expect(data.available).toBe(false);
    expect(queryRows).toHaveBeenCalledTimes(1);
    const [sql,params]=queryRows.mock.calls[0];
    expect(sql).toContain("escape '#'");
    expect(sql).toContain(":'topic_pattern'");
    expect(sql).not.toContain(key);
    expect(params.topic_pattern).toBe("Shanghai#%#_##'old%");
    expect(params.purpose_namespace).toBe("test");
    expect(params.allowed_scope).toBe(JSON.stringify(ctx.scope));
    expect(sql).toContain("control.qualification_allows");
    expect(sql).toContain("control.qualification_current q");
    expect(sql).not.toContain("g.current_valid=true");
  });
  it("uses separate current G5 check for every L5 visual facet in the same run",async()=>{
    queryRows
      .mockResolvedValueOnce([{pid:"synthetic-projection",run_id:"synthetic-run",
        payload:JSON.stringify({title:"synthetic"})}])
      .mockResolvedValueOnce([{cnt:"0"}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{excerpt:"photo",source_title:"synthetic",
        display_url:"/safe-photo",license:"CC-BY",artist:"owner",
        time_identity:"today",entities:"Shanghai",commons_title:"TEST_ONLY"}]);
    const data=await readProductionRelationSummary("topic");
    expect(data.available).toBe(true);
    expect(data.visuals).toHaveLength(1);
    expect(queryRows).toHaveBeenCalledTimes(6);
    for(const [sql,params] of queryRows.mock.calls){
      expect(sql).toContain("control.qualification_current q");
      expect(sql).toContain("control.qualification_allows");
      expect(params.purpose_code).toBe(ctx.purpose.code);
      expect(params.purpose_version).toBe(ctx.purpose.version);
    }
    expect(queryRows.mock.calls[5][0]).toContain("rights_status' = 'cleared'");
  });
  it("does not expose unlicensed media even if a broken row reached the presentation adapter",async()=>{
    queryRows
      .mockResolvedValueOnce([{pid:"synthetic-projection",run_id:"synthetic-run",
        payload:JSON.stringify({})}])
      .mockResolvedValueOnce([{cnt:"0"}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{display_url:"/unsafe-photo",license:""}]);
    const data=await readProductionRelationSummary();
    expect(data.available).toBe(true);
    expect(data.visuals).toEqual([]);
  });
  it("fails closed rather than displaying old legacy PASS data when the DB qualifier fails",async()=>{
    queryRows.mockRejectedValueOnce(new Error("CURRENT_G5_UNAVAILABLE"));
    const data=await readProductionRelationSummary();
    expect(data.available).toBe(false);
    expect(data.stories).toEqual([]);
    expect(data.evidence).toEqual([]);
  });
});
