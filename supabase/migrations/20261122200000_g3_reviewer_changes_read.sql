begin;

-- G3 machine review reconstructs the D03 world-claim output from the persisted
-- claim_revision + its change + evidence link. The machine signer login already
-- has SELECT + a read RLS policy on claim_revisions/claim_evidence_links, but
-- world.changes only had mohen_gate_authority's policy, so the machine reader
-- saw zero rows and stage-binding derivation failed. Grant read-only SELECT and
-- an explicit permissive read RLS policy for the machine reviewer role only;
-- no write or Gate decision rights are changed.
grant select on world.changes to mohen_gate_signer_m5_machine;
drop policy if exists m5_machine_reviewer_read on world.changes;
create policy m5_machine_reviewer_read on world.changes
  for select to mohen_gate_signer_m5_machine using (true);

commit;
