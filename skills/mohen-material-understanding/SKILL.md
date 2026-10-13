# mohen-material-understanding

**Status:** TARGET · Phase D execution-bound  
**Kind:** stage-owner  
**Stage:** D02  
**Data Layer:** L1  
**Exit Gate:** G1  
**Allowed Calling Stages:** D02

## Purpose
Read heterogeneous carriers at content level and produce replayable L1 Material Evidence.

## Trigger
A G0 PASS source enters D02.

## Inputs
- Qualified Source
- carrier type T01–T14
- raw content or media region
- carrier-specific adapter

## Procedure
1. Select carrier-specific reading method.
2. Read actual content rather than title-only metadata.
3. Create literal reading and research proposition with source voice and uncertainty.
4. Run G1 Evidence Quality Gate.
5. Persist qualified evidence units and hand PASS evidence to D03.

## Outputs
- Material Evidence Unit
- HOLD evidence precursor
- REJECT unreadable/unsupported unit

## Visual Reading Boundary（承接 2026-10-05 视觉采集教训）
- 视觉载体读取必须建立在**已识别的实体身份**之上：只有当图像由权威身份（如 Wikidata `P18`、已确认 Commons 分类/页面）明确指认时，才可将图读作该实体的视觉证据；不得把同名命中的资产当作该实体（Commons 同名异地实测：日本石川县金泽市 vs 上海青浦金泽）。
- 只从**已确认资产**做 literal reading；以 `DateTimeOriginal` 判古今，现代照片不得读作历史状态证据。
- 许可未知的资产不进入 literal reading，先按 `mohen-visual-asset` 规则 HOLD。

## Write Scope
- L1 evidence/assessment/source-dependency
- G1 audit records

## Gate / Responsibility
- This Skill may not bypass `G1`. 
- Stage PASS/HOLD/REJECT belongs to `D02`.
- Reusable capabilities called by this Skill never own final persistence.

## Human Review Contribution
Show original excerpt/region, literal reading, proposition, source voice and uncertainty so the owner can judge whether material was truly understood.

## Failure / Stop
- only title/catalog is available
- OCR/visual content cannot support literal reading
- AI generated content would be used as evidence

## Canonical Entry
`pipelines/data-production/executors/d02-material-understanding.mjs`

The executor is the stage-owned entry. Reusable capabilities are injected through adapters and cannot replace this owner.

## Tests
- Contract schema validation.
- Stage/Data Layer/Gate alignment.
- No cross-layer final write.
- Downstream PASS output satisfies next-stage Entry.
