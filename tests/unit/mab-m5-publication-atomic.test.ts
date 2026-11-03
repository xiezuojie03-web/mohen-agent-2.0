import {beforeEach, describe, expect, it, vi} from "vitest";

const {queryRows, queryValue, run, reflowWorkToAssets} = vi.hoisted(() => ({
  queryRows: vi.fn(),
  queryValue: vi.fn(),
  run: vi.fn(),
  reflowWorkToAssets: vi.fn(),
}));
vi.mock("@mohen/data-access", () => ({queryRows,queryValue,run}));
vi.mock("../../apps/web/lib/asset-reflow", () => ({reflowWorkToAssets}));

import {publishWork,listPublished,getWorkStageStatus} from "../../apps/web/lib/publication";

const wid="123e4567-e89b-42d3-a456-426614174001";
const rid="123e4567-e89b-42d3-a456-426614174002";

function passReview() {
  queryRows.mockImplementation(async (sql: string) => {
    if(sql.includes("from publication.work_revisions where work_id") &&
       sql.includes("status = 'submitted'"))
      return [{revision_id:rid,content:JSON.stringify({
        beats:[{provenanceRefs:["synthetic-source"]}],rights_acknowledged:true,
      })}];
    if(sql.includes("from control.work_publication_decisions"))
      return [{decision:"approved",reviewer:"synthetic-independent-reviewer",revision_id:rid}];
    if(sql.includes("with promoted as"))
      return [{work_id:wid,revision_id:rid}];
    throw Error("UNEXPECTED_QUERY:"+sql);
  });
  queryValue.mockResolvedValue(rid);
  reflowWorkToAssets.mockResolvedValue(undefined);
}

describe("MAB M5 publish revision/pointer atomic transition", () => {
  beforeEach(() => {
    queryRows.mockReset(); queryValue.mockReset(); run.mockReset();
    reflowWorkToAssets.mockReset();
  });
  it("uses one atomic submitted-state CAS and pointer insertion, not two separate writes", async () => {
    passReview();
    const result=await publishWork(wid,"scheduler");
    expect(result).toEqual({ok:true});
    expect(run).not.toHaveBeenCalled();
    const stmt=queryRows.mock.calls.find(([sql]:[string])=>sql.includes("with promoted as"))?.[0] as string;
    expect(stmt).toContain("status = 'submitted'");
    expect(stmt).toContain("insert into publication.published_pointers");
    expect(stmt).toContain("select work_id, revision_id, :'by' from promoted");
    expect(reflowWorkToAssets).toHaveBeenCalledWith(wid,rid);
  });
  it("does not report publication success or run asset reflow when concurrent state change prevents promotion", async () => {
    passReview();
    const original=queryRows.getMockImplementation()!;
    queryRows.mockImplementation(async (...args:unknown[]) => {
      if(String(args[0]).includes("with promoted as")) return [];
      return original(...args);
    });
    await expect(publishWork(wid,"scheduler")).resolves.toEqual({
      ok:false,reason:"revision_not_submittable",
    });
    expect(reflowWorkToAssets).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
  it("propagates pointer write failure rather than reporting success", async () => {
    passReview();
    const original=queryRows.getMockImplementation()!;
    queryRows.mockImplementation(async (...args:unknown[]) => {
      if(String(args[0]).includes("with promoted as")) throw Error("DB_POINTER_WRITE_FAILED");
      return original(...args);
    });
    await expect(publishWork(wid,"scheduler")).rejects.toThrow("DB_POINTER_WRITE_FAILED");
    expect(reflowWorkToAssets).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("does not claim delegated, researched or directed when no persisted work exists",async()=>{
    queryRows.mockResolvedValue([{
      delegated:false,researched:false,directed:false,revisioned:false,
    }]);
    const status=await getWorkStageStatus(wid);
    expect(status).toEqual({
      delegated:false,researched:false,directed:false,revisioned:false,
    });
    const sql=String(queryRows.mock.calls[0]?.[0]);
    expect(sql).toContain("public.research_tasks");
    expect(sql).toContain("t.status = 'done'");
    expect(sql).toContain("jsonb_typeof(r.content->'plan')");
  });
  it("only marks persisted research done and rejects running/HOLD progress as completed",async()=>{
    queryRows.mockResolvedValue([{
      delegated:'t',researched:'f',directed:'f',revisioned:'t',
    }]);
    await expect(getWorkStageStatus(wid)).resolves.toEqual({
      delegated:true,researched:false,directed:false,revisioned:true,
    });
  });
  it("renders all four stages true only with explicit true evidence",async()=>{
    queryRows.mockResolvedValue([{
      delegated:true,researched:true,directed:true,revisioned:true,
    }]);
    await expect(getWorkStageStatus(wid)).resolves.toEqual({
      delegated:true,researched:true,directed:true,revisioned:true,
    });
  });
  it("WATCH publication listing excludes pointers whose revision was revoked or no longer published", async () => {
    queryRows.mockResolvedValue([]);
    await listPublished();
    expect(queryRows).toHaveBeenCalledTimes(1);
    const statement=String(queryRows.mock.calls[0][0]);
    expect(statement).toContain("join publication.work_revisions r on r.revision_id = p.revision_id");
    expect(statement).toContain("where r.status = 'published'");
  });
});
