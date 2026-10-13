# mohen-world-construction

**Status:** TARGET · Phase D execution-bound  
**Kind:** stage-owner  
**Stage:** D03  
**Data Layer:** L2  
**Exit Gate:** G2  
**Allowed Calling Stages:** D03

## Purpose
Construct and adjudicate L2 Cultural World objects from qualified evidence.

## Trigger
G1 PASS evidence is ready for entity/event/relation/change/historical-space construction.

## Inputs
- Qualified Evidence Units
- identity candidates
- time/space candidates
- existing L2 world objects

## Procedure
1. Resolve mentions and identities without inventing entities.
2. Build Entity/Event/Change/RelationClaim/HistoricalSpaceClaim candidates.
3. Bind claims to supporting/contradicting/context evidence.
4. Resolve source dependency and conflicts.
5. Run G2 World Integrity Gate and persist adjudicated world objects.

## Outputs
- Adjudicated Cultural World Object
- HOLD candidate/conflict
- REJECT world candidate

## Write Scope
- L2 cultural world objects and claim-evidence links
- G2 audit records

## Gate / Responsibility
- This Skill may not bypass `G2`. 
- Stage PASS/HOLD/REJECT belongs to `D03`.
- Reusable capabilities called by this Skill never own final persistence.

## Human Review Contribution
Show world-object structure, key evidence pointers, conflicts and epistemic status; hide resolver internals.

## Failure / Stop
- identity remains materially ambiguous
- time/space would be overstated
- claim lacks sufficient evidence

## Canonical Entry
`pipelines/data-production/executors/d03-world-construction.mjs`

The executor is the stage-owned entry. Reusable capabilities are injected through adapters and cannot replace this owner.

## Tests
- Contract schema validation.
- Stage/Data Layer/Gate alignment.
- No cross-layer final write.
- Downstream PASS output satisfies next-stage Entry.
