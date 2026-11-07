// MAB-ENG-01 M2: one server-side composition root for verified original
// readback and the existing RLS/byte-attested bridge. Never a new producer
// or a shortcut around execution authorization / independent Gate review.
import {
  createPrivateOriginalRepository,
  createPrivateOriginalWorkflow,
  createEvidenceBridgeRepository,
  createPrivateOriginalSourceVerifier,
  createPrivateTextReadingRepository,
  createPrivateScannedPageReadingRepository,
  createPrivateSourceRegistrationRepository,
  createPrivateCandidateRepository,
} from '../../../packages/data-access/src/index.mjs';
import { createPrivateEvidenceStageWorker } from './private-evidence-stage.mjs';

export function createBoundPrivateEvidenceStageWorker({
  pool, storage, verificationKey, keyVersion='mab-original-bridge-v1',
} = {}) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error('PRIVATE_STAGE_DATABASE_REQUIRED');
  }
  if (!storage || typeof storage.readVerified !== 'function') {
    throw new Error('PRIVATE_STAGE_VERIFIED_STORAGE_REQUIRED');
  }
  if (typeof verificationKey !== 'string' || verificationKey.length < 32) {
    throw new Error('PRIVATE_STAGE_BRIDGE_VERIFIER_REQUIRED');
  }
  // The repository enforces project/Owner RLS via transaction-local identity.
  // The same readback is used for D00 registration lookup, D01 reads and
  // D02-D05 candidate persistence.
  const repository = createPrivateOriginalRepository(pool);
  const original = createPrivateOriginalWorkflow({ repository, storage });
  const readOriginal = (originalId, token) => original.download(originalId, token);
  const bridge = createEvidenceBridgeRepository(pool, {
    readOriginal, verificationKey, keyVersion,
  });
  const verifySourceBinding=createPrivateOriginalSourceVerifier(pool);
  const readings=createPrivateTextReadingRepository(pool,{verificationKey,keyVersion});
  const pageReadings=createPrivateScannedPageReadingRepository(pool,{verificationKey,keyVersion});
  const registrations=createPrivateSourceRegistrationRepository(pool);
  const candidates=createPrivateCandidateRepository(pool,{verificationKey,keyVersion});
  return createPrivateEvidenceStageWorker({ readOriginal, bridge, verifySourceBinding,
    persistReading:readings.save, readRegistration:registrations.lookup,
    persistPageReading:pageReadings.save,
    persistMaterialObservation:candidates.saveMaterialObservation,
    persistWorldClaim:candidates.saveWorldClaim,
    persistHumanisticFinding:candidates.saveHumanisticFinding,
    persistWorldProjection:candidates.saveWorldProjection });
}
