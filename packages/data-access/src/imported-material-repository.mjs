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
