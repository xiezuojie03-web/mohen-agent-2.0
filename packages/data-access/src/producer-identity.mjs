/** Inspect the actual connection, not the name declared in configuration. */
export async function assertProducerIdentity(queryRows) {
  const rows = await queryRows(`select current_user::text as role, r.rolsuper as is_superuser,
    r.rolbypassrls as bypass_rls, pg_has_role(current_user,'mohen_gate_signer','MEMBER') as can_sign
    from pg_roles r where r.rolname=current_user`);
  const identity = rows[0];
  const isFalse = value => value === false || value === "f" || value === "false";
  if (!identity || identity.role !== "mohen_producer" || !isFalse(identity.is_superuser) ||
      !isFalse(identity.bypass_rls) || !isFalse(identity.can_sign)) {
    throw new Error("PRODUCER_DATABASE_IDENTITY_UNSAFE");
  }
}
