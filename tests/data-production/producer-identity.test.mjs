import test from "node:test";
import assert from "node:assert/strict";
import { assertProducerIdentity } from "../../packages/data-access/src/producer-identity.mjs";

for (const identity of [
  { role: "postgres", is_superuser: true, bypass_rls: true, can_sign: true },
  { role: "mohen_producer", is_superuser: false, bypass_rls: true, can_sign: false },
  { role: "mohen_producer", is_superuser: false, bypass_rls: false, can_sign: true },
]) test(`rejects unsafe Producer identity ${JSON.stringify(identity)}`, async () => {
  await assert.rejects(assertProducerIdentity(async () => [identity]), /PRODUCER_DATABASE_IDENTITY_UNSAFE/);
});
test("accepts only the dedicated low-privilege producer identity", async () => {
  await assertProducerIdentity(async () => [{ role: "mohen_producer", is_superuser: "f", bypass_rls: "f", can_sign: "f" }]);
});
test("unknown role inspection cannot be accepted as safe", async () => {
  await assert.rejects(assertProducerIdentity(async () => []), /PRODUCER_DATABASE_IDENTITY_UNSAFE/);
  await assert.rejects(assertProducerIdentity(async () => [{ role: "mohen_producer" }]), /PRODUCER_DATABASE_IDENTITY_UNSAFE/);
});
