// MAB M2/M5 step 2 — D00 private source intake lookup.
// Reads the exact L0 registration bound to one immutable private original via a
// narrow SECURITY DEFINER helper. No direct source-table grants, no Gate writes.
import { createAppTransaction } from './app-transaction.mjs';
import { RIGHTS_ACTIONS, normalizeRightsSnapshot } from './rights-actions.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * `rights_by_action` is the effective per-action dictionary: the immutable
 * source-version snapshot (`rights_snapshot`) widened ONLY by an explicit,
 * recorded owner decision for that single action. The projection lives in
 * `source.effective_rights_by_action` (see migration 20261122170000); this check
 * enforces the same rule on the client side so a downgraded or unevidenced
 * widening can never be consumed as rights.
 */
function validEffectiveRights(effective, snapshot, evidence) {
  for (const action of RIGHTS_ACTIONS) {
    const pinned = snapshot.actions[action];
    const widened = effective.actions[action];
    if (pinned === 'allowed') {
      if (widened !== 'allowed') return false;
      continue;
    }
    if (widened !== pinned) {
      // The only legal difference is a widening of a non-denied action backed by
      // a complete owner decision record.
      if (widened !== 'allowed') return false;
      if (pinned === 'denied' || pinned === 'restricted') return false;
      const decision = isObject(evidence) ? evidence[`${action}_decision`] : null;
      if (!isObject(decision)) return false;
      if (decision.decision !== 'allowed') return false;
      if (!nonEmpty(decision.decided_at) || !nonEmpty(decision.decided_by)) return false;
    }
  }
  return true;
}

export function validRegistration(registration, originalId) {
  if (!registration || typeof registration !== 'object' ||
      registration.schema !== 'mohen.private-source-registration.v1' ||
      registration.original_id !== originalId ||
      !UUID.test(registration.project_id ?? '') ||
      !UUID.test(registration.source_id ?? '') ||
      !UUID.test(registration.source_version_id ?? '') ||
      !UUID.test(registration.raw_item_id ?? '') ||
      !UUID.test(registration.asset_revision_id ?? '') ||
      !HASH.test(registration.sha256 ?? '') ||
      !HASH.test(registration.artifact_revision ?? '') ||
      !HASH.test(registration.source_version_artifact_revision ?? '') ||
      !Number.isSafeInteger(registration.byte_size) || registration.byte_size <= 0 ||
      typeof registration.content_type !== 'string' || !registration.content_type ||
      typeof registration.storage_ref !== 'string' || !registration.storage_ref ||
      !isObject(registration.rights) ||
      !isObject(registration.rights_by_action) ||
      !isObject(registration.rights_snapshot) ||
      !isObject(registration.rights_evidence) ||
      !isObject(registration.original_locator) ||
      typeof registration.provenance_status !== 'string' ||
      typeof registration.content_availability !== 'string') return false;

  const actionRights = normalizeRightsSnapshot(registration.rights_by_action);
  const versionRights = normalizeRightsSnapshot(registration.rights_snapshot);
  return actionRights.issues.length === 0 && versionRights.issues.length === 0 &&
    validEffectiveRights(actionRights, versionRights, registration.rights_evidence);
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
