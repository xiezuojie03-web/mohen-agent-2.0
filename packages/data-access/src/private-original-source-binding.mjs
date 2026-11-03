// MAB M2 — D01 cannot manufacture a source identity from a real quote.
// This SELECT is performed using the very same short-lived Owner/DB RLS
// transaction as other private asset reads. Missing grants/rows fail closed;
// do not grant broad source SELECT to repair permission errors.
import { createAppTransaction } from './app-transaction.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;

export function createPrivateOriginalSourceVerifier(pool) {
  const transaction=createAppTransaction(pool,'STUDIO_IDENTITY_REQUIRED');
  return async function verifyOriginalSource({originalId,sourceVersionId,rawItemId,rawSha256},token) {
    if (![originalId,sourceVersionId,rawItemId].every(x=>typeof x==='string'&&UUID.test(x)) ||
        typeof rawSha256!=='string'||!HASH.test(rawSha256)) {
      throw new Error('PRIVATE_SOURCE_IDENTITY_INVALID');
    }
    return transaction(token,async(client,actor)=>{
      const r=await client.query(`
select 1 as bound
from studio.private_originals o
join studio.projects p on p.project_id=o.project_id
  and p.owner_user_id=o.owner_user_id and p.lifecycle_status='ACTIVE'
join studio.asset_revisions a on a.revision_id=o.asset_revision_id
  and a.asset_id=o.asset_id and a.content_hash=o.sha256
  and a.payload_storage_ref=o.storage_bucket||'/'||o.storage_key
join source.raw_items raw on raw.raw_item_id=$2
  and raw.storage_ref=o.storage_bucket||'/'||o.storage_key
  and raw.checksum_sha256=o.sha256
  and raw.byte_size=o.byte_size
join source.source_versions ver on ver.source_version_id=$3
  and raw.source_version_id=ver.source_version_id
  and ver.checksum_sha256=o.sha256
where o.original_id=$1 and o.owner_user_id=$4
  and o.state='STORED_VERIFIED' and o.sha256=$5
limit 1
`,[originalId,rawItemId,sourceVersionId,actor,rawSha256]);
      return r.rows.length===1&&r.rows[0].bound===1;
    });
  };
}
