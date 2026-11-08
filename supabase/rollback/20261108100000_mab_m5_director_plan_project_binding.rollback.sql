-- Non-destructive rollback for QR-01.
-- Keep project_id and its FK: removing them would erase durable provenance.
-- Only the performance index is optional and may be removed safely.
drop index if exists public.director_plans_project_id_idx;
