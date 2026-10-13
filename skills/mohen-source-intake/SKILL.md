# mohen-source-intake

**Status:** TARGET · Phase D execution-bound  
**Kind:** stage-owner  
**Stage:** D01  
**Data Layer:** L0  
**Exit Gate:** G0  
**Allowed Calling Stages:** D01

## Purpose
Turn a research intent into qualified L0 Cultural Sources with preserved Raw, provenance, rights and locator.

## Trigger
A new Source Discovery request, a directed source gap, or an L7 cultural trace entering formal production.

## Inputs
- research_intent
- scope
- source-class strategy
- query matrix
- provider registry

## Procedure
1. Discover source leads using broad/directed/mixed strategy.
2. Acquire source or catalog record without hiding availability limits.
3. Preserve raw/version and register provenance/rights/locator.
4. Run G0 Source Gate.
5. Persist PASS/HOLD/REJECT in L0 and hand qualified sources to D02.

## Outputs
- Qualified Source
- HOLD source with missing requirement
- REJECT source with trace

## External Identity Provider Boundary（承接 2026-10-05 采集教训）
- **Wikidata（S3，仅现代空间）**：身份锚点（Q-id）只能作候选线索，不得单独支撑断言（开放编辑库，须回到其引用的原始出处）；身份判定须地域双校验（`P131` ∈ 上海 16 市辖区，或 `P625` 落上海外接矩形 lat 30.66–31.88 / lng 120.85–122.02），同名项判不出归属（实测：苏州普济桥、德清普济桥）一律拒收、不自选边。
- **Wikimedia Commons（S2）**：仅作图像**取回**，不作**发现**；图像须由上游权威身份（如 `P18`）指认，不得仅凭同名检索认定归属。详见 `mohen-visual-asset` 的 Visual Source Boundary。
- 权威出处：`specs/data-production/source-providers.json`、`specs/data-production/acquisition-intents.json`。

## Write Scope
- L0 source/version/raw metadata
- G0 audit records

## Gate / Responsibility
- This Skill may not bypass `G0`. 
- Stage PASS/HOLD/REJECT belongs to `D01`.
- Reusable capabilities called by this Skill never own final persistence.

## Human Review Contribution
Provide source coverage, source independence, content availability and real source rows; hide technical fetch noise.

## Failure / Stop
- source identity cannot be established
- raw/provenance cannot be preserved
- rights boundary is unknown and blocks use

## Canonical Entry
`pipelines/data-production/executors/d01-source-intake.mjs`

The executor is the stage-owned entry. Reusable capabilities are injected through adapters and cannot replace this owner.

## Tests
- Contract schema validation.
- Stage/Data Layer/Gate alignment.
- No cross-layer final write.
- Downstream PASS output satisfies next-stage Entry.
