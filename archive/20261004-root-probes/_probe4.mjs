import { run, queryValue } from './packages/data-access/src/index.mjs';
import crypto from 'node:crypto';
const eid = crypto.randomUUID();
const sid = await queryValue("select source_id from source_records limit 1", {});
await run(`insert into evidence (evidence_id, source_id, evidence_type, locator, extraction_method, verification_status, confidence)
  values (:'eid'::uuid, :'sid'::uuid, 'record', 'smoke', 'unattended-smoke', 'candidate', 0.5)`, { eid, sid });
console.log('evidence insert OK -> deleting');
await run(`delete from evidence where evidence_id = :'eid'::uuid`, { eid });
const enid = crypto.randomUUID();
await run(`insert into entities (entity_id, entity_type, canonical_name, aliases, confidence, status, legacy_id)
  values (:'eid'::uuid, 'unknown', 'SMOKE_TEST_ENTITY', '{}'::text[], 0.5, 'candidate', 'smoke')`, { eid: enid });
console.log('entity insert OK -> deleting');
await run(`delete from entities where entity_id = :'eid'::uuid`, { eid: enid });
console.log('SMOKE OK');
