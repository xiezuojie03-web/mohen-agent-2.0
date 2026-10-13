# MoHen Physical Data Model V2.0

**Status:** TARGET · Phase E

PostgreSQL physical namespaces:

```text
source      L0 Cultural Sources
evidence    L1 Material Evidence
world       L2 Cultural World
meaning     L3 Meaning / Discovery / Present
read_model  L4 Trusted Read Model
control     cross-cutting production/gate/owner-review control
```

D01–D05 and G0–G4 are lifecycle contracts, not database schema names.

Canonical tables:
- `source.sources`, `source.source_versions`, `source.raw_items`
- `evidence.material_evidence`
- `world.entities`, `world.events`, `world.relation_claims`, `world.changes`, `world.historical_space_claims`, `world.visual_objects`, `world.claim_evidence_links`, `world.conflicts`
- `meaning.findings`, `meaning.present_connections`, `meaning.open_questions`
- `read_model.world_projections`, `read_model.agent_contexts`, `read_model.story_seeds`, `read_model.discovery_paths`, `read_model.map_timeline_projections`, `read_model.evidence_pointers`
- `control.production_runs`, `control.gate_audits`, `control.owner_reviews`

Invariants:
1. Raw is append-only.
2. Evidence requires source lineage and replayable locator.
3. Fact and interpretation are physically separated.
4. Claim–Evidence is explicit.
5. Geometry is a claim payload, never silent truth.
6. L4 is derived/recomputable.
7. Legal downstream consumption uses G0–G4 PASS views.
8. Owner Review does not mutate Gate results.
9. No Research Workspace physical schema.
10. No Discovery/Directed lifecycle schema.
