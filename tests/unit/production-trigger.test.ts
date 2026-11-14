import { expect, it, vi } from "vitest";
const effects = vi.hoisted(() => ({ prepare: vi.fn(), run: vi.fn(), queryRows: vi.fn(), queryValue: vi.fn(), spawn: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => ({ run: effects.run, queryRows: effects.queryRows, queryValue: effects.queryValue }));
vi.mock("../../apps/web/lib/mohen-agent/prepare-topic", () => ({ prepareFreeTopic: effects.prepare }));
vi.mock("node:child_process", () => ({ spawn: effects.spawn }));
// The test owns its partial-activation fixture; it must not depend on the live Registry state.
vi.mock("../../pipelines/data-production/orchestrator/registry.mjs", () => ({
  loadRegistry: () => ({ status: "ACTIVE_AUTHORIZED", activation: { enabled: true },
    jobs: [{ execution_policy: { enabled: true } }, { execution_policy: { enabled: false } }] })
}));
import { triggerProduction } from "../../apps/web/lib/studio-production";
import { requestProduction } from "../../apps/web/lib/studio-research";

it("a partially enabled registry does not prepare, register, spawn, announce or reserve production", async () => {
  // The M5 isolated activation (MAB 2.1) enables only the attended D00/D01
  // jobs. Unattended Studio full-chain production must stay blocked until
  // every job is enabled+unattended and the signed input binding exists.
  effects.prepare.mockResolvedValue({ jsonFile: "/not-loaded.json" });
  effects.queryRows.mockImplementation(async (sql: string) => sql.includes("studio.projects")
    ? [{project_id:"b0a11000-0000-4000-8000-000000000001"}]
    : [{prompt:"fixture intent", status:"done", checkpoint:{budgetSpent:0, reserved:0, ceiling:8, studio:{project_id:"b0a11000-0000-4000-8000-000000000001"}}}]);
  const result = await triggerProduction("fixture-task", "fixture intent", "b0a11000-0000-4000-8000-000000000001");
  expect(result).toMatchObject({ started: false, reason: "production_job_disabled" });
  expect(await requestProduction("fixture-task", "b0a11000-0000-4000-8000-0000000000a2")).toMatchObject({ ok: false, reason: "production_job_disabled" });
  expect(effects.prepare).not.toHaveBeenCalled();
  expect(effects.spawn).not.toHaveBeenCalled();
  expect(effects.run).not.toHaveBeenCalled();
});
