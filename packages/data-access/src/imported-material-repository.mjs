import { createAppTransaction } from './app-transaction.mjs';

/** Private imports: one checked-out client, fixed low-privilege role, verified
 * signed identity and RLS for every operation. No caller-supplied owner SQL.
 */
export function createImportedMaterialRepository(pool) {
  const transaction = createAppTransaction(pool, 'MATERIAL_IDENTITY_REQUIRED');
  return {
    list(sessionToken) {
      return transaction(sessionToken, async client => {
        const { rows } = await client.query(`select material_id::text as material_id,title,source_url,license,rights_declared,
          left(text_content,240) as excerpt,created_at::text as created_at
          from public.imported_materials order by created_at desc,material_id desc limit 50`);
        return rows;
      });
    },
    get(materialId, sessionToken) {
      if (typeof materialId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(materialId)) {
        return Promise.reject(new Error('MATERIAL_ID_INVALID'));
      }
      return transaction(sessionToken, async client => {
        const { rows } = await client.query(`select material_id::text as material_id,title,text_content as text,
          source_url,license,rights_declared,created_at::text as created_at
          from public.imported_materials where material_id=$1 limit 1`, [materialId]);
        return rows[0] ?? null;
      });
    },
    create({title,text,sourceUrl,license,rightsDeclared},sessionToken) {
      if (rightsDeclared !== true) return Promise.reject(new Error('RIGHTS_DECLARATION_REQUIRED'));
      return transaction(sessionToken, async (client, owner) => {
        const { rows } = await client.query(`insert into public.imported_materials
          (owner_user_id,title,text_content,source_url,license,rights_declared)
          values($1,$2,$3,$4,$5,true) returning material_id::text as material_id,owner_user_id::text as owner_user_id`,
          [owner,title,text,sourceUrl,license]);
        if (rows.length !== 1 || !rows[0].material_id) throw new Error('MATERIAL_NOT_PERSISTED');
        return rows[0];
      });
    },
  };
}
