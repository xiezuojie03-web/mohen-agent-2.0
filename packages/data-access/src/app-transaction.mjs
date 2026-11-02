/** Internal transaction boundary shared by private application repositories. */
export function createAppTransaction(pool, identityError) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('TRANSACTIONAL_APP_POOL_REQUIRED');
  return async function transaction(sessionToken, operation) {
    if (typeof sessionToken !== 'string' || !sessionToken) throw new Error(identityError);
    const client = await pool.connect();
    let begun = false;
    let discard = false;
    try {
      await client.query('begin'); begun = true;
      await client.query('set local role mohen_app_runtime');
      await client.query("select set_config('mohen.session_token',$1,true)", [sessionToken]);
      const { rows } = await client.query('select control.current_app_user_id()::text as user_id');
      if (rows.length !== 1 || !rows[0].user_id) throw new Error(identityError);
      const result = await operation(client, rows[0].user_id);
      await client.query('commit'); begun = false;
      return result;
    } catch (error) {
      if (begun) { try { await client.query('rollback'); } catch { discard = true; } }
      throw error;
    } finally { client.release(discard); }
  };
}
