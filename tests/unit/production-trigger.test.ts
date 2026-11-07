import { expect, it, vi } from "vitest";
const effects = vi.hoisted(() => ({ prepare: vi.fn(), run: vi.fn(), queryRows: vi.fn(), queryValue: vi.fn(), spawn: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => ({ run: effects.run, queryRows: effects.queryRows, queryValue: effects.queryValue }));
vi.mock("../../apps/web/lib/mohen-agent/prepare-topic", () => ({ prepareFreeTopic: effects.prepare }));
vi.mock("node:child_process", () => ({ spawn: effects.spawn }));
import { triggerProduction } from "../../apps/web/lib/studio-production";
import { requestProduction } from "../../apps/web/lib/studio-research";

it("a partially enabled registry does not prepare, register, spawn, announce or reserve production", async () => {
  // The M5 isolated activation (MAB 2.1) enables only the attended D00/D01
  // jobs. Unattended Studio full-chain production must stay blocked until
  // every job is enabled+unattended and the signed input binding exists.
  effects.prepare.mockResolvedValue({ jsonFile: "/not-loaded.json" });
  effects.queryRows.mockResolvedValue([{ prompt: "fixture intent", status: "done", checkpoint: {budgetSpent: 0, reserved: 0, ceiling: 8} }]);
  const result = await triggerProduction("fixture-task", "fixture intent");
  expect(result).toMatchObject({ started: false, reason: "production_job_disabled" });
  expect(await requestProduction("fixture-task")).toMatchObject({ ok: false, reason: "production_job_disabled" });
  expect(effects.prepare).not.toHaveBeenCalled();
  expect(effects.spawn).not.toHaveBeenCalled();
  expect(effects.run).not.toHaveBeenCalled();
});
