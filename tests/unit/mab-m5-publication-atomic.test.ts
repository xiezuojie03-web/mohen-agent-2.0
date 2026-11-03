import {beforeEach, describe, expect, it, vi} from "vitest";

const {queryRows, queryValue, run, reflowWorkToAssets, requireIndependentWorkPublicationG5, requireCurrentWorkConsumerQualification} = vi.hoisted(() => ({
  queryRows: vi.fn(),
  queryValue: vi.fn(),
  run: vi.fn(),
  reflowWorkToAssets: vi.fn(),
  requireIndependentWorkPublicationG5: vi.fn(),
  requireCurrentWorkConsumerQualification: vi.fn(),
}));
vi.mock("@mohen/data-access", () => ({queryRows,queryValue,run}));
vi.mock("../../apps/web/lib/asset-reflow", () => ({reflowWorkToAssets}));
vi.mock("../../apps/web/lib/work-publish-qualification", () => ({requireIndependentWorkPublicationG5, requireCurrentWorkConsumerQualification}));

import {publishWork,listPublished,listPendingReview,listWatchEligible,getWorkStageStatus} from "../../apps/web/lib/publication";

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
  requireIndependentWorkPublicationG5.mockResolvedValue({ok:true});
}

describe("MAB M5 publish revision/pointer atomic transition", () => {
  beforeEach(() => {
    queryRows.mockReset(); queryValue.mockReset(); run.mockReset();
    reflowWorkToAssets.mockReset();
    requireIndependentWorkPublicationG5.mockReset();
    requireCurrentWorkConsumerQualification.mockReset();
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
    expect(stmt).toContain("latest_decision.decision = 'approved'");
    expect(stmt).toContain("latest_decision.revision_id = :'rid'");
    expect(queryValue).not.toHaveBeenCalled(); // no second latest revision read
    expect(queryRows.mock.calls.filter(([sql]:[string])=>sql.includes("from publication.work_revisions where work_id"))).toHaveLength(1);
    expect(reflowWorkToAssets).toHaveBeenCalledWith(wid,rid);
  });
  it("does not promote or change the public pointer when professional G5 is missing", async () => {
    passReview();
    requireIndependentWorkPublicationG5.mockResolvedValue({
      ok:false,reason:"independent_g5_required",
    });
    await expect(publishWork(wid,"scheduler")).resolves.toEqual({
      ok:false,reason:"independent_g5_required",
    });
    expect(queryRows.mock.calls.some(([sql]:[string])=>sql.includes("with promoted as"))).toBe(false);
    expect(reflowWorkToAssets).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
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
  it("refuses publication if latest reviewer revocation races the atomic write", async () => {
    passReview();
    const original=queryRows.getMockImplementation()!;
    queryRows.mockImplementation(async (...args:unknown[]) => {
      if(String(args[0]).includes("with promoted as")) return [];
      return original(...args);
    });
    const result=await publishWork(wid,"scheduler");
    expect(result).toEqual({ok:false,reason:"revision_not_submittable"});
    expect(reflowWorkToAssets).not.toHaveBeenCalled();
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
  it("pending review query hides approved and rejected exact revisions but not a newer work revision",async()=>{
    queryRows.mockResolvedValue([]);
    await listPendingReview();
    const sql=String(queryRows.mock.calls[0]?.[0]);
    expect(sql).toContain("d.revision_id = r.revision_id");
    expect(sql).toContain("d.decision in ('approved','rejected')");
    expect(sql).toContain("r.status = 'submitted'");
  });
  it("WATCH never reuses the internal Admin published list as authorization",async()=>{
    const second="123e4567-e89b-42d3-a456-426614174099";
    queryRows.mockResolvedValue([
      {work_id:wid,revision_id:rid,content:JSON.stringify({beats:[]})},
      {work_id:second,revision_id:rid,content:JSON.stringify({beats:[]})},
    ]);
    requireCurrentWorkConsumerQualification.mockImplementation(async (workId:string)=>({
      ok:workId===wid,reason:workId===wid?undefined:"independent_g5_required",
    }));
    const eligible=await listWatchEligible();
    expect(eligible).toHaveLength(1);
    expect(eligible[0].work_id).toBe(wid);
    expect(requireCurrentWorkConsumerQualification).toHaveBeenCalledTimes(2);
    expect(requireCurrentWorkConsumerQualification.mock.calls[0][2]).toBe("watch");
    expect(queryRows).toHaveBeenCalledTimes(1);
  });
  it("WATCH fails closed on an unavailable or invalid professional Gate verifier",async()=>{
    queryRows.mockResolvedValue([{work_id:wid,revision_id:rid,content:"{}"}]);
    requireCurrentWorkConsumerQualification.mockRejectedValue(new Error("GATE_OFFLINE"));
    await expect(listWatchEligible()).resolves.toEqual([]);
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
