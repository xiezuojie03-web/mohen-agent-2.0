# mohen-historical-spatial-source

**Status:** TARGET · Phase C
**Kind:** cross-cutting/reusable capability
**Allowed Calling Stages:** D01, D02

## Purpose
Reusable capability for finding and reading historical spatial sources. D01 owns source acquisition; D02 owns material reading.

## Contract
- No independent D01–D05 Stage PASS unless explicitly designated as a Stage Owner (this Skill is not).
- No final writes across multiple L layers.
- Caller Stage owns persistence, Gate and downstream handoff.
- Reuse existing implementation where possible; duplicate canonical entries are not allowed.
- Exact executable entry is frozen during implementation phase.

## Inputs / Outputs
Defined per caller contract. Outputs must be typed capability results, not final cross-stage records.

## Failure / Stop
Stop when requested action would require this capability to own another Stage's persistence or Gate decision.

## Canonical Entry
`PENDING_PHASE_D`
