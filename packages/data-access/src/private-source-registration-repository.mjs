// MAB M2/M5 step 2 — D00 private source intake lookup.
// Reads the exact L0 registration bound to one immutable private original via a
// narrow SECURITY DEFINER helper. No direct source-table grants, no Gate writes.
import { createAppTransaction } from './app-transaction.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;

function validRegistration(registration, originalId) {
  return !!registration && typeof registration === 'object' &&
    registration.schema === 'mohen.private-source-registration.v1' &&
    registration.original_id === originalId &&
    UUID.test(registration.project_id ?? '') &&
    UUID.test(registration.source_id ?? '') &&
    UUID.test(registration.source_version_id ?? '') &&
    UUID.test(registration.raw_item_id ?? '') &&
    UUID.test(registration.asset_revision_id ?? '') &&
    HASH.test(registration.sha256 ?? '') &&
    HASH.test(registration.artifact_revision ?? '') &&
    Number.isSafeInteger(registration.byte_size) && registration.byte_size > 0 &&
    typeof registration.content_type === 'string' && registration.content_type &&
    typeof registration.storage_ref === 'string' && registration.storage_ref &&
    !!registration.rights && typeof registration.rights === 'object';
}

export function createPrivateSourceRegistrationRepository(pool) {
  const transaction = createAppTransaction(pool, 'STUDIO_IDENTITY_REQUIRED');
  return {
    async lookup(originalId, token) {
      if (typeof originalId !== 'string' || !UUID.test(originalId)) {
        throw new Error('ORIGINAL_ID_INVALID');
      }
      return transaction(token, async (client) => {
        const { rows } = await client.query(
          'select studio.private_source_registration($1) as registration', [originalId]);
        const registration = rows.length === 1 ? rows[0].registration : null;
        if (!validRegistration(registration, originalId)) {
          throw new Error('PRIVATE_SOURCE_REGISTRATION_INVALID');
        }
        return registration;
      });
    },
  };
}
