import {afterEach, expect, it, vi} from "vitest";

const {projectRead, formalRead, retrieve, run} = vi.hoisted(() => ({
  projectRead: vi.fn(), formalRead: vi.fn(), retrieve: vi.fn(), run: vi.fn(),
}));

vi.mock("@mohen/data-access", () => ({run}));
vi.mock("../../apps/web/lib/studio-research-read", () => ({readStudioResearchProject: projectRead}));
vi.mock("../../apps/web/lib/mohen-agent/retrieve-formal", () => ({retrieveQualifiedFormalProject: formalRead}));
vi.mock("../../apps/web/lib/mohen-agent/retrieve", () => ({retrieveMaterials: retrieve}));

import {runResearch} from "../../apps/web/lib/mohen-agent/research";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("rechecks formal reading without calling or settling the model a second time", async () => {
  vi.stubEnv("MOHEN_LLM_BASE_URL", "https://provider.example");
  vi.stubEnv("MOHEN_LLM_API_KEY", "synthetic");
  vi.stubEnv("MOHEN_G5_CONTEXTS", JSON.stringify({
    agent: {purpose: {namespace: "mohen.research", code: "agent_read", version: "1"},
      scope: {requested_action: "read"}},
  }));
  const provider = vi.fn(async () => Response.json({
    choices: [{message: {content: '{"intent":"unknown","objects":[]}'}}],
  }));
  vi.stubGlobal("fetch", provider);
  projectRead.mockResolvedValue({snapshot: {}});
  formalRead.mockRejectedValue(new Error("synthetic formal read failure"));
  retrieve.mockResolvedValue({materials: [], degraded: false});
  const context = {projectId: "14b380df-e7cc-477e-a020-bd2786d34af0", sessionToken: "synthetic"};
  const ledger = {taskId: "14b380df-e7cc-477e-a020-bd2786d34af1", budget: {ceiling: 8, spent: 0, reserved: 0}};

  const first = await runResearch("研究朱家角", "generic", ledger, context).catch(error => error);
  expect(first).toMatchObject({settledUnderstanding: {llmResponded: true}});
  await expect(runResearch("研究朱家角", "generic", ledger,
    {...context, settledUnderstanding: first.settledUnderstanding}))
    .rejects.toMatchObject({settledUnderstanding: first.settledUnderstanding});

  expect(formalRead).toHaveBeenCalledTimes(2);
  expect(provider).toHaveBeenCalledOnce();
  expect(ledger.budget).toEqual({ceiling: 8, spent: 1, reserved: 0});
  expect(run.mock.calls.filter(([, receipt]) => receipt.tool === "llm-understand" &&
    receipt.status === "settled")).toHaveLength(1);
});
