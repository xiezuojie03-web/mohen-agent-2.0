/** Private imports: one checked-out client, fixed low-privilege role, verified
 * signed identity and RLS for every operation. No caller-supplied owner SQL.
 */
export function createImportedMaterialRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('TRANSACTIONAL_APP_POOL_REQUIRED');
  async function transaction(sessionToken, operation) {
    if (typeof sessionToken !== 'string' || !sessionToken) throw new Error('MATERIAL_IDENTITY_REQUIRED');
    const client = await pool.connect();
    let begun = false;
    let discard = false;
    try {
      await client.query('begin'); begun = true;
      // SET LOCAL is scoped to this transaction, including transaction poolers.
      // Fail closed if the migration or role membership has not been provisioned.
      await client.query('set local role mohen_app_runtime');
      await client.query("select set_config('mohen.session_token',$1,true)", [sessionToken]);
      const { rows } = await client.query('select control.current_app_user_id()::text as user_id');
      if (rows.length !== 1 || !rows[0].user_id) throw new Error('MATERIAL_IDENTITY_REQUIRED');
      const result = await operation(client, rows[0].user_id);
      await client.query('commit'); begun = false;
      return result;
    } catch (error) {
      if (begun) { try { await client.query('rollback'); } catch { discard = true; } }
      throw error;
    } finally { client.release(discard); }
  }
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
