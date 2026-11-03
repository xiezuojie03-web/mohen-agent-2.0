// MAB M2 — D01 cannot manufacture a source identity from a real quote.
// Under the same short-lived Owner transaction we invoke a narrow SECURITY
// DEFINER boolean helper in the pending M2 migration. It checks actual
// identity and exact immutable original/source IDs without granting app_runtime
// USAGE/SELECT over entire source tables. A denied/missing helper fails closed.
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
    return transaction(token,async(client)=>{
      const r=await client.query(
        "select studio.private_source_binding_matches($1,$2,$3,$4) as bound",
        [originalId,sourceVersionId,rawItemId,rawSha256]
      );
      return r.rows.length===1&&r.rows[0].bound===1;
    });
  };
}
