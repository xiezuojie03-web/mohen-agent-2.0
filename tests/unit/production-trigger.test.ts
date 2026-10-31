import { expect, it, vi } from "vitest";
const effects = vi.hoisted(() => ({ prepare: vi.fn(), run: vi.fn(), queryRows: vi.fn(), queryValue: vi.fn(), spawn: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => ({ run: effects.run, queryRows: effects.queryRows, queryValue: effects.queryValue }));
vi.mock("../../apps/web/lib/mohen-agent/prepare-topic", () => ({ prepareFreeTopic: effects.prepare }));
vi.mock("node:child_process", () => ({ spawn: effects.spawn }));
import { triggerProduction } from "../../apps/web/lib/studio-production";
import { requestProduction } from "../../apps/web/lib/studio-research";

it("a disabled registry does not prepare, register, spawn, announce or reserve production", async () => {
  effects.prepare.mockResolvedValue({ jsonFile: "/not-loaded.json" });
  effects.queryRows.mockResolvedValue([{ prompt: "fixture intent" }]);
  const result = await triggerProduction("fixture-task", "fixture intent");
  expect(result).toMatchObject({ started: false, reason: "production_registry_not_active" });
  expect(await requestProduction("fixture-task")).toMatchObject({ ok: false, reason: "production_registry_not_active" });
  expect(effects.prepare).not.toHaveBeenCalled();
  expect(effects.spawn).not.toHaveBeenCalled();
  expect(effects.run).not.toHaveBeenCalled();
});
