begin;

-- G3 machine review reconstructs the D03 world-claim output from the persisted
-- claim_revision + its change + evidence link. The machine signer login already
-- has SELECT on claim_revisions/claim_evidence_links but not on world.changes,
-- so stage-binding derivation failed with "permission denied for table changes".
-- Grant read-only SELECT on world.changes only; no write or Gate decision rights.
grant select on world.changes to mohen_gate_signer_m5_machine;

commit;
