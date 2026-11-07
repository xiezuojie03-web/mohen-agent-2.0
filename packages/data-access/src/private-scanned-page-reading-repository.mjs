// M2/M5 private L1 persistence for C02 scanned page images. One page equals one
// immutable private original. A byte attestation authorizes one candidate write,
// never a Gate decision or public consumption. Mirrors the text-reading contract.
import { createHash, createHmac } from 'node:crypto';
import { createAppTransaction } from './app-transaction.mjs';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const sha = x => createHash('sha256').update(x).digest('hex');
const uuid = x => { const h = sha(x); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; };
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function createPrivateScannedPageReadingRepository(pool, { verificationKey, keyVersion } = {}) {
  const verifierConfigured = typeof verificationKey === 'string' && verificationKey.length >= 32 &&
    typeof keyVersion === 'string' && !!keyVersion.trim() && keyVersion.length <= 128;
  const transaction = createAppTransaction(pool, 'STUDIO_IDENTITY_REQUIRED');
  return {
    async save({ runId, originalId, page: requested, record, bytes: originalBytes }, token) {
      if (!verifierConfigured) throw Error('BRIDGE_BYTE_VERIFIER_NOT_CONFIGURED');
      let page;
      try { page = JSON.parse(JSON.stringify(requested)); } catch { throw Error('PRIVATE_PAGE_READING_LOCATOR_INVALID'); }
      if (![runId, originalId, record?.project_id].every(x => typeof x === 'string' && UUID.test(x)) ||
        record?.original_id !== originalId || record?.state !== 'STORED_VERIFIED' ||
        !IMAGE_TYPES.has(record?.content_type ?? '') ||
        !Buffer.isBuffer(originalBytes) || !HASH.test(record?.sha256 ?? '')) throw Error('PRIVATE_PAGE_READING_ORIGINAL_UNVERIFIED');
      const bytes = Buffer.from(originalBytes);
      if (bytes.length !== record.byte_size || sha(bytes) !== record.sha256 ||
        page?.raw_sha256 !== record.sha256 || page?.page_sha256 !== record.sha256)
        throw Error('PRIVATE_PAGE_READING_ORIGINAL_UNVERIFIED');
      if (page?.kind !== 'scanned_page/v1' ||
        ![page.source_version_id, page.raw_item_id].every(x => typeof x === 'string' && UUID.test(x)) ||
        !Number.isSafeInteger(page.page_number) || page.page_number < 1 || page.page_number > 10000)
        throw Error('PRIVATE_PAGE_READING_LOCATOR_INVALID');
      const requestDigest = sha(canonical({ runId, originalId, page }));
      const readRunId = uuid('mab-private-scanned-run:' + requestDigest), readUnitId = uuid('mab-private-scanned-unit:' + requestDigest);
      return transaction(token, async (client, actor) => {
        const now = Date.now();
        const encoded = Buffer.from(JSON.stringify({ kind: 'MOHEN_PRIVATE_SCANNED_PAGE_READING_V1', kid: keyVersion,
          uid: actor, project_id: record.project_id, original_id: originalId, raw_sha256: record.sha256,
          run_id: runId, read_run_id: readRunId, read_unit_id: readUnitId, request_digest: requestDigest,
          page, iat: now, exp: now + 30000 })).toString('base64url');
        const attestation = encoded + '.' + createHmac('sha256', verificationKey).update(encoded).digest('hex');
        const { rows } = await client.query('select studio.persist_private_scanned_page_reading($1,$2,$3,$4,$5,$6::jsonb,$7) as reading',
          [originalId, readRunId, readUnitId, requestDigest, runId, JSON.stringify(page), attestation]);
        const reading = rows.length === 1 ? rows[0].reading : null;
        if (!reading || reading.read_run_id !== readRunId || reading.read_unit_id !== readUnitId ||
          reading.request_digest !== requestDigest || !HASH.test(reading.artifact_revision ?? ''))
          throw Error('PRIVATE_PAGE_READING_NOT_PERSISTED');
        return { ...reading, qualification: 'UNASSESSED' };
      });
    },
  };
}
