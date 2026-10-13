# mohen-experience-prototype

**Status:** TARGET · Phase C
**Kind:** experience
**Allowed Calling Stages:** L5 / C4 only

## Purpose
Experience-side capability governed by C4/L5. It consumes trusted read models and does not write L0–L4.

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
