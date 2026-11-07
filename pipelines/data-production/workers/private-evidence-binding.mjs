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
import { createDataProductionRepository } from '../../../packages/data-access/src/data-production-repository.mjs';
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
  // The one existing producer-side candidate writer. It only inserts a
  // SUBMITTED candidate; no Gate decision, signer role or audit write exists
  // in the Producer process.
  const gateCandidates=createDataProductionRepository({query:(text,values)=>pool.query(text,values)});
  const submitGateCandidate=metadata=>gateCandidates.recordGate(metadata);
  // Read-only projection of an already signed, current, Producer-consumable
  // upstream audit. A missing or unsigned upstream yields null and the stage
  // candidate keeps an empty dependency_snapshot instead of a faked ancestor.
  async function readGateAudit({gateCode,objectType,objectId}={}) {
    const {rows}=await pool.query(
      `select a.gate_audit_id::text as gate_audit_id, a.qualification_digest, a.artifact_revision
       from control.qualification_current q
       join control.gate_audits a on a.gate_audit_id=q.gate_audit_id
       where q.gate_code=$1 and q.object_type=$2 and q.object_id=$3::uuid
         and a.result='PASS' and a.decision_origin='independent_gate' and a.consumer='producer'
         and control.current_qualification_is_valid(a.gate_audit_id)
       limit 1`,
      [gateCode,objectType,objectId]);
    const row=rows[0];
    if(!row||typeof row.gate_audit_id!=='string'||typeof row.qualification_digest!=='string'||
      typeof row.artifact_revision!=='string')return null;
    return {gate_audit_id:row.gate_audit_id,qualification_digest:row.qualification_digest,
      artifact_revision:row.artifact_revision};
  }
  return createPrivateEvidenceStageWorker({ readOriginal, bridge, verifySourceBinding,
    persistReading:readings.save, readRegistration:registrations.lookup,
    persistPageReading:pageReadings.save,
    persistMaterialObservation:candidates.saveMaterialObservation,
    persistWorldClaim:candidates.saveWorldClaim,
    persistHumanisticFinding:candidates.saveHumanisticFinding,
    persistWorldProjection:candidates.saveWorldProjection,
    submitGateCandidate, readGateAudit });
}
