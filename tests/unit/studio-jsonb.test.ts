import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ queryRows: vi.fn(), queryValue: vi.fn(), run: vi.fn() }));
const llm = vi.hoisted(() => ({ generateDirectorPlans: vi.fn(), generateBeats: vi.fn(), generateWorkPanels: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
vi.mock("../../apps/web/lib/studio-creation", () => llm);
import { selectDirectorPlan, getWorkPanels, commitWorkRevision, reviseBeat, reorderBeats } from "../../apps/web/lib/studio-director";
import { checkPublishEligibility } from "../../apps/web/lib/publication";

const revision = "4790013f-43ed-422e-b047-d3f8ddbf22c3";
const plan = { angle: "从记录理解变化", points: ["先观察材料"], cover: "原件", motif: "M5", directorDecisions: ["保留观察顺序"] };
const beat = { title: "第一章", narration: "已有材料中的陈述", visual: "原件画面", directorTimecodeMs: 0, provenanceRefs: ["record-1"] };
const otherBeat = { ...beat, title: "第二章", narration: "第二份记录", directorTimecodeMs: 8000, provenanceRefs: ["record-2"] };
const finding = { motifCodes: ["M5"], historicalQuestion: "怎样理解变化？", understandingDelta: "读清变化", supportScope: "现有记录", limitations: [] };
beforeEach(() => {
  vi.resetAllMocks();
  db.queryValue.mockResolvedValue(revision);
  db.queryRows.mockResolvedValue([{ revision_id: revision }]);
  llm.generateBeats.mockImplementation(async (p, facts) => [{ ...beat, title: p.angle, narration: facts[0] }]);
  llm.generateWorkPanels.mockImplementation(async (p, facts, beats) => ({
    storyStructure: beats.map((b: typeof beat) => ({ title: b.title, timecode: "00:00", visual: b.visual })),
    visualStyle: { style: p.angle, palette: "纸色", shot: "原件" },
    voiceover: { full: facts.join("\n"), note: "文字旁白" },
    soundtrack: { plan: "静音", note: "无媒体许可不生成音乐" },
  }));
});

for (const encoding of ["native", "psql"] as const) {
  const encode = (value: unknown) => encoding === "psql" ? JSON.stringify(value) : value;
  const row = () => ({ plan_a: encode(plan), plan_b: encode(plan), facts: encode(["有来源的陈述"]), finding: encode(finding), beats: encode([beat]), selected: "A" });

  it(`${encoding} JSON columns can be adopted into beats`, async () => {
    db.queryRows.mockResolvedValueOnce([row()]);
    expect(await selectDirectorPlan("plan", "A")).toEqual({ beats: [{ ...beat, title: "从记录理解变化", narration: "有来源的陈述" }] });
  });
  it(`${encoding} JSON columns restore full work panels`, async () => {
    db.queryRows.mockResolvedValueOnce([row()]);
    const result = await getWorkPanels("plan");
    expect(result?.storyStructure).toEqual([{ title: "第一章", timecode: "00:00", visual: "原件画面" }]);
    expect(result?.voiceover.full).toBe("有来源的陈述");
  });
  it(`${encoding} JSON columns preserve content and provenance when saved as a revision`, async () => {
    db.queryRows.mockResolvedValueOnce([row()])
      .mockResolvedValueOnce([{ revision_id: "previous-revision", revision_no: 1, content: {} }])
      .mockResolvedValueOnce([{ revision_id: revision }]);
    expect(await commitWorkRevision("work", "plan")).toMatchObject({ revisionId: revision, revisionNo: 2 });
    const insert = db.queryRows.mock.calls.find(([sql]) => String(sql).includes("insert into publication.work_revisions"));
    expect(insert).toBeDefined();
    expect(String(insert![0])).toContain("on conflict (work_id,revision_no) do nothing");
    const saved = JSON.parse(insert![1].content);
    expect(saved.beats).toEqual([beat]);
    expect(saved.historicalQuestion).toBe("怎样理解变化？");
  });
  it(`${encoding} JSON columns allow a local narration edit without losing other beats`, async () => {
    db.queryRows.mockResolvedValueOnce([{ revision_no: 1, title: "作品", description: "", content: encode({ beats: [beat, otherBeat] }) }]);
    expect(await reviseBeat("work", 1, [{ index: 0, patch: { narration: "修改后的表达" } }])).toMatchObject({ conflict: false, revisionNo: 2 });
    const saved = JSON.parse(db.queryRows.mock.calls.find(([sql]) => sql.includes("insert into publication.work_revisions"))![1].content);
    expect(saved.beats).toEqual([{ ...beat, narration: "修改后的表达" }, otherBeat]);
  });
  it(`${encoding} JSON columns can reorder beats without changing their references`, async () => {
    db.queryRows.mockResolvedValueOnce([{ revision_no: 1, title: "作品", description: "", content: encode({ beats: [beat, otherBeat] }) }]);
    expect(await reorderBeats("work", 1, [1, 0])).toMatchObject({ conflict: false, revisionNo: 2 });
    expect(JSON.parse(db.queryRows.mock.calls.find(([sql]) => sql.includes("insert into publication.work_revisions"))![1].content).beats).toEqual([otherBeat, beat]);
  });
  it(`${encoding} JSON columns retain provenance checks but require independent G5 before publication`, async () => {
    db.queryRows.mockResolvedValueOnce([{ revision_id: revision, content: encode({ beats: [beat], rights_acknowledged: true }) }])
      .mockResolvedValueOnce([{ decision: "approved", reviewer: "separate-reviewer", revision_id: revision }]);
    expect(await checkPublishEligibility("work")).toEqual({ ok: false, reason: "independent_g5_required" });
  });
}

it("corrupt persisted JSON cannot generate or save a director result", async () => {
  db.queryRows.mockResolvedValueOnce([{ selected: "A", plan_a: "{broken", facts: "[]", beats: "[]" }]);
  await expect(getWorkPanels("plan")).rejects.toThrow();
  expect(llm.generateWorkPanels).not.toHaveBeenCalled();
  expect(db.run).not.toHaveBeenCalled();
});
it("native JSONB still refuses publication without rights confirmation", async () => {
  db.queryRows.mockResolvedValueOnce([{ revision_id: revision, content: { beats: [beat] } }])
    .mockResolvedValueOnce([{ decision: "approved", reviewer: "separate-reviewer", revision_id: revision }]);
  expect(await checkPublishEligibility("work")).toMatchObject({ ok: false });
});
it("corrupt publication JSON fails closed before reviewer approval", async () => {
  db.queryRows.mockResolvedValueOnce([{ revision_id: revision, content: "{broken" }]);
  expect(await checkPublishEligibility("work")).toEqual({ ok: false, reason: "no_provenance_refs" });
  expect(db.queryRows).toHaveBeenCalledTimes(1);
});

for (const diff of [[], [null], [{index:0.5,patch:{narration:'x'}}], [{index:2,patch:{narration:'x'}}], [{index:0,patch:{provenanceRefs:['invented']}}], [{index:0,patch:{narration:3}}], [{index:0,patch:{directorTimecodeMs:-1}}], [{index:0,patch:{unknown:'x'}}], [{index:0,patch:{directorTimecodeMs:8000}}], [{index:0,patch:{narration:'a'}},{index:0,patch:{narration:'b'}}]]) {
  it(`rejects malformed local edits without inserting ${JSON.stringify(diff)}`, async()=>{
    db.queryRows.mockResolvedValueOnce([{revision_no:1,content:{beats:[beat,otherBeat]}}]);
    await expect(reviseBeat('work',1,diff as never)).rejects.toThrow('invalid_beat_diff');
    expect(db.queryRows.mock.calls.some(([sql])=>String(sql).includes('insert into'))).toBe(false);
  });
}
it('retains the complete H1 finding in an immutable saved revision',async()=>{
  db.queryRows.mockResolvedValueOnce([{plan_a:plan,selected:'A',finding,beats:[beat]}]).mockResolvedValueOnce([]).mockResolvedValueOnce([{revision_id:revision}]);
  await commitWorkRevision('work','plan',0);
  const saved=JSON.parse(db.queryRows.mock.calls.find(([sql])=>String(sql).includes('insert into publication.work_revisions'))![1].content);
  expect(saved.h1Finding).toEqual(finding);
});
