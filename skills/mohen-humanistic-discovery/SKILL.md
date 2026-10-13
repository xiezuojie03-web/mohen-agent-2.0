# mohen-humanistic-discovery

**Status:** TARGET · Phase D execution-bound  
**Kind:** stage-owner  
**Stage:** D04  
**Data Layer:** L3  
**Exit Gate:** G3  
**Allowed Calling Stages:** D04

## Purpose
Discover meaningful relations, change, comparison, mechanisms and present connections on top of adjudicated L2 facts.

## Trigger
G2 PASS cultural world objects are available and a humanistic question or discovery request exists.

## Inputs
- Adjudicated L2 world objects
- human question/research intent
- A01–A12 discovery methods
- ranking config

## Procedure
1. Generate explainable signals and association candidates.
2. Test change chains, comparison, mechanisms and alternative explanations.
3. Create humanistic findings with understanding_delta and present_connection.
4. Use AVS/ranking only for prioritization, never truth probability.
5. Run G3 Interpretation Gate and persist PASS/HOLD/REJECT.

## Outputs
- Qualified Humanistic Finding
- open question / HOLD
- dropped low-value candidate

## Write Scope
- L3 findings/meaning/present/comparison/open questions
- G3 audit records

## Gate / Responsibility
- This Skill may not bypass `G3`. 
- Stage PASS/HOLD/REJECT belongs to `D04`.
- Reusable capabilities called by this Skill never own final persistence.

## Human Review Contribution
Expose the human question, finding, understanding delta, supporting facts, counter-view, missing evidence and present connection.

## Failure / Stop
- co-occurrence is the only basis
- causal language exceeds evidence
- no meaningful understanding delta exists

## Canonical Entry
`pipelines/data-production/executors/d04-humanistic-discovery.mjs`

The executor is the stage-owned entry. Reusable capabilities are injected through adapters and cannot replace this owner.

## Tests
- Contract schema validation.
- Stage/Data Layer/Gate alignment.
- No cross-layer final write.
- Downstream PASS output satisfies next-stage Entry.
