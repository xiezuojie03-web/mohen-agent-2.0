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

test("cloud Producer accepts only a real, separate LOGIN with producer membership",async()=>{
 const good={role:"mohen_m5_producer_login",login_role:"mohen_m5_producer_login",
  can_login:true,producer_member:true,is_superuser:false,bypass_rls:false,can_create_role:false,
  can_sign:false,can_read_gate:false,gate_authority_member:false,app_member:false,all_read:false,all_write:false};
 await assertProducerIdentity(async()=>[good],{cloud:true});
 for(const changed of [
  {can_login:false},{login_role:"postgres"},{producer_member:false},{app_member:true},
  {can_read_gate:true},{gate_authority_member:true},{can_create_role:true},{all_write:true},
  {role:"mohen_producer",login_role:"mohen_producer"}
 ])await assert.rejects(assertProducerIdentity(async()=>[{...good,...changed}],{cloud:true}),/PRODUCER_DATABASE_IDENTITY_UNSAFE/);
});
