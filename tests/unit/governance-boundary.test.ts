import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ queryRows: vi.fn(), queryValue: vi.fn(), run: vi.fn() }));
vi.mock("../../packages/data-access/src/index.mjs", () => db);
import { promoteAsset } from "../../apps/web/lib/admin-assets";
import { writeGovernanceGate } from "../../apps/web/lib/governance-gate";
import { reflowWorkToAssets } from "../../apps/web/lib/asset-reflow";

beforeEach(() => {
  db.queryRows.mockReset().mockResolvedValue([{ asset_id: "asset", title: "candidate", status: "candidate" }]);
  db.queryValue.mockReset().mockResolvedValue("fixture-id");
  db.run.mockReset();
});
it("an operator cannot promote a candidate by signing its own G5", async () => {
  expect(await promoteAsset("asset", "operator")).toMatchObject({ ok: false, reason: "independent_gate_required" });
  expect(db.run).not.toHaveBeenCalled();
});
it("the legacy governance writer cannot forge an independent professional decision", async () => {
  await expect(writeGovernanceGate("run", "asset", "asset", "admin", {})).rejects.toThrow(/INDEPENDENT_GATE_REQUIRED/);
  expect(db.run).not.toHaveBeenCalled();
});
it("work publication is not an automatic G5 grant for a new knowledge asset", async () => {
  await expect(reflowWorkToAssets("work", "revision")).resolves.toMatchObject({ reflowed: 0, reason: "independent_gate_required" });
  expect(db.run).not.toHaveBeenCalled();
});
