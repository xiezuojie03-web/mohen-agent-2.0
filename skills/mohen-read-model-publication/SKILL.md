# mohen-read-model-publication

**Status:** TARGET · Phase D execution-bound  
**Kind:** stage-owner  
**Stage:** D05  
**Data Layer:** L4  
**Exit Gate:** G4  
**Allowed Calling Stages:** D05

## Purpose
Assemble trusted L4 read models and determine runtime eligibility without rewriting L0–L3 truth.

## Trigger
G2/G3 PASS objects are ready for Agent/UI consumption.

## Inputs
- G2 PASS L2 objects
- G3 PASS L3 findings
- evidence pointers
- expression rules

## Procedure
1. Assemble world projection, agent context, story seed and map/time projection.
2. Attach evidence pointers and expression rules.
3. Verify full L4→L0 lineage and unresolved conflict expression.
4. Run G4 Runtime Eligibility Gate.
5. Publish/recompute L4 read model for L5 consumption.

## Outputs
- Runtime Eligible L4 projection
- HOLD read model
- REJECT projection

## Write Scope
- L4 derived read-model objects
- G4 audit records

## Gate / Responsibility
- This Skill may not bypass `G4`. 
- Stage PASS/HOLD/REJECT belongs to `D05`.
- Reusable capabilities called by this Skill never own final persistence.

## Human Review Contribution
Show story seeds, map/timeline projections, Evidence on Demand coverage and source-trace summary.

## Failure / Stop
- lineage cannot be replayed
- required G2/G3 PASS is absent
- projection would reverse-write truth

## Canonical Entry
`pipelines/data-production/executors/d05-read-model-publication.mjs`

The executor is the stage-owned entry. Reusable capabilities are injected through adapters and cannot replace this owner.

## Tests
- Contract schema validation.
- Stage/Data Layer/Gate alignment.
- No cross-layer final write.
- Downstream PASS output satisfies next-stage Entry.
