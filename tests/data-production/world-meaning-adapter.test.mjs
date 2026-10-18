import test from "node:test";
import assert from "node:assert/strict";
import d03WorldConstruction from "../../pipelines/data-production/adapters/d03-world-construction.mjs";
import d04HumanisticDiscovery from "../../pipelines/data-production/adapters/d04-humanistic-discovery.mjs";

const W10 = ["W01","W02","W03","W04","W05","W06","W07","W08","W09","W10"];
const A12 = ["A01","A02","A03","A04","A05","A06","A07","A08","A09","A10","A11","A12"];

test("D03 no extract injection -> HOLD (honest, no fake PASS)", async () => {
  const r = await d03WorldConstruction({ run: {}, job: { methods: ["W01"] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "EXTRACTION_NOT_IMPLEMENTED");
});

test("D03 injected extract returns candidates -> PASS + gate_evidence", async () => {
  const r = await d03WorldConstruction({
    run: {}, job: { methods: ["W01", "W05"] }, input: {},
    context: { extractWorldClaim: async () => ({ candidates: [{ entity_id: "e1" }], stats: { n: 1 }, reviews: [] }) },
  });
  assert.equal(r.disposition, "PASS");
  assert.equal(r.gate_evidence.stage, "D03");
  assert.deepEqual(r.gate_evidence.methods, ["W01", "W05"]);
  assert.equal(r.output.length, 1);
});

test("D03 unknown method -> HOLD", async () => {
  const r = await d03WorldConstruction({ run: {}, job: { methods: ["W99"] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "UNKNOWN_METHOD");
});

test("D03 no method -> HOLD", async () => {
  const r = await d03WorldConstruction({ run: {}, job: { methods: [] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "NO_METHOD");
});

test("D04 injected extract returns candidates -> PASS", async () => {
  const r = await d04HumanisticDiscovery({
    run: {}, job: { methods: ["A01", "A12"] }, input: {},
    context: { extractHumanisticFinding: async () => ({ candidates: [{ finding_id: "f1" }], stats: {}, reviews: [] }) },
  });
  assert.equal(r.disposition, "PASS");
  assert.equal(r.gate_evidence.stage, "D04");
  assert.deepEqual(r.gate_evidence.methods, ["A01", "A12"]);
});

test("D04 unknown method -> HOLD", async () => {
  const r = await d04HumanisticDiscovery({ run: {}, job: { methods: ["A99"] }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "UNKNOWN_METHOD");
});

test("D04 no extract injection -> HOLD", async () => {
  const r = await d04HumanisticDiscovery({ run: {}, job: { methods: A12 }, input: {}, context: {} });
  assert.equal(r.disposition, "HOLD");
  assert.equal(r.hold.reason_code, "EXTRACTION_NOT_IMPLEMENTED");
});
