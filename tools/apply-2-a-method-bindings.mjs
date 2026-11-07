// Step 2 batch A: apply the M5-isolated method bindings to the method contract.
// Bound = a real executable adapter action with unit + isolated-PG evidence.
// Everything else becomes an explicit HOLD (never a permanent TO_VERIFY_IN_M0).
import fs from "node:fs";

const PATH = "specs/data-production/method-binding-contract.json";
const ADAPTER = "pipelines/data-production/adapters/private-evidence-adapters.mjs";
const BOUND = {
  C01: `${ADAPTER}#D01:draftTextReading`,
  C02: `${ADAPTER}#D01:readScannedPage`,
};
const HOLD_REASON =
  "M5 isolated scope: no executable binding for the 松江府田赋 vertical slice yet; " +
  "bind with positive/negative tests before any run selects this method";

const contract = JSON.parse(fs.readFileSync(PATH, "utf8"));
let boundCount = 0, holdCount = 0;
for (const method of contract.methods) {
  if (BOUND[method.method_id]) {
    method.implementation_binding = BOUND[method.method_id];
    delete method.hold_reason;
    boundCount++;
  } else {
    method.implementation_binding = "HOLD";
    method.hold_reason = HOLD_REASON;
    holdCount++;
  }
}
contract.status = "M5_ISOLATED_PARTIAL_BINDING";
contract.m5_isolated_binding = {
  scope: "MAB M5 isolated vertical slice (松江府田赋, NAJ 松江府志7)",
  bound_methods: Object.keys(BOUND),
  bound_evidence: [
    "tests/data-production/private-scanned-page-worker.test.mjs",
    "tests/data-production/private-evidence-adapters.test.mjs",
    "tools/verify-2-a-scanned-page.mjs (isolated PG positive/negative/idempotency)",
  ],
  note: "D00 is governed by source standards (stage_d00), not a C/H/W/A/P method binding; its executable is the private-evidence D00 adapter action verifySourceIntake.",
};
contract.validation =
  "IDs unique; references exist; method version equals source hash; bound methods point to executable adapter actions verified by unit and isolated-PG tests; HOLD methods must be bound with positive/negative tests before enable";
fs.writeFileSync(PATH, JSON.stringify(contract, null, 2) + "\n", "utf8");
console.log(`METHOD_BINDINGS_APPLIED bound=${boundCount} hold=${holdCount} total=${contract.methods.length}`);
