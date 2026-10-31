import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { parseCsv, validateTraceability } from "../../scripts/guards/check-k3-traceability.mjs";

const root = process.cwd();
const apiText = readFileSync(path.join(root, "specs/requirements/api-route-contracts.csv"), "utf8");
const actionText = readFileSync(path.join(root, "specs/requirements/u07-action-contracts.csv"), "utf8");
it("reads all requirements without interpreting target handlers as implemented", () => {
  expect(validateTraceability({ apiText, actionText, projectRoot: root })).toEqual({ apis: 85, actions: 152, modules: 62, screens: 5 });
});
it("handles quoted commas, escaped quotes, BOM and multiline fields", () => {
  expect(parseCsv('\uFEFFid,text\r\na,"one,\n""two"""\r\n')).toEqual([{ id: "a", text: 'one,\n"two"' }]);
  expect(() => parseCsv('id,text\na,"unterminated')).toThrow(/CSV/);
});
it("rejects duplicate API identity", () => {
  expect(() => validateTraceability({ apiText: apiText.replace("API-002", "API-001"), actionText, projectRoot: root })).toThrow(/DUPLICATE_API/);
});
it("rejects missing action and source paths escaping the checkout", () => {
  expect(() => validateTraceability({ apiText, actionText: actionText.replace("FA-001-01", ""), projectRoot: root })).toThrow(/ACTION_ID/);
  expect(() => validateTraceability({ apiText, actionText: actionText.replaceAll("apps/web/app/page.tsx", "../outside.tsx"), projectRoot: root })).toThrow(/UNSAFE_PATH/);
});
it("rejects a declared implementation backed only by a target handler name", () => {
  const changed = actionText.replace("C3_SOME_SOURCE_OR_EXPLICIT_GAP_CONFIRMED; COMPLETE_U07_EFFECT_NOT_VERIFIED", "IMPLEMENTED");
  expect(() => validateTraceability({ apiText, actionText: changed, projectRoot: root })).toThrow(/HANDLER_CLAIM_UNPROVEN/);
});
