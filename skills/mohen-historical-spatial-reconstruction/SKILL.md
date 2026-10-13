# mohen-historical-spatial-reconstruction

**Status:** TARGET · Phase C
**Kind:** cross-cutting/reusable capability
**Allowed Calling Stages:** D03

## Purpose
Reusable D03 domain capability for evidence-bounded HistoricalSpaceClaim and reconstruction. Geometry itself is a Claim.

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
