# mohen-carrier-reading

> 状态：DESIGN_TARGET_NOT_APPLIED。2026-10-15；源工程handoff/local-b-20260930@8966d1bf62d7c2ea199d6568cc1b16bba664bd26。仅为资料中的目标文件；未改真实工程、未运行生产。新链默认禁用，真实G5/MIG-01 HOLD，56正式延期关系DESIGN_HOLD。物理事实未核部分TO_VERIFY_IN_M0。

Kind: stage-owner
Stage: D01
Data layer: L1
Independent exit gate: G1
Canonical target entry: `pipelines/data-production/executors/d01-carrier-reading.mjs`
Implementation status: IMPLEMENT_BY_CODEBUDDY_AFTER_M0，未实现不称正式能力。

## Trigger and inputs
Typed immutable upstream refs and their current qualifications, required method/version, carrier/material profile, purpose, consumer and dependency snapshot.

## Procedure
1. Validate request scope, source rights, generation and all actual upstream requirements.
2. Read the relevant full method section; select by carrier/material/use rather than broadcast all methods.
3. Generate a typed candidate artifact with original locators, method version, provenance, limitations and dependencies.
4. Persist candidate only within D01/L1 responsibility. Capability adapters do not own a second lifecycle.
5. Request independent G1; this Skill must not write its own PASS or overwrite audit.
6. Handoff explicit selected artifact refs only after current matching permission; otherwise HOLD/REJECT with remediation Owner.

## Canonical professional sources
- `specs/data-production/standards/d01/主规_P1_D01统一生命周期与质量画像治理.md`
- `specs/data-production/standards/d01/规范_P1_C01-C08载体与复合材料专业读取.md`
- `specs/data-production/standards/d01/契约_P1_D01至D02可信交接.md`
- `specs/data-production/standards/d01/契约_P1_新G1质量门与新旧迁移.md`
- `specs/data-production/standards/d01/契约_P1_新L1持久化与L2字段所有权.md`

## Outputs and boundaries
L1 immutable artifact refs plus limitations; machine execution/Human Review summaries; independent qualification is a separate result. No downstream fact/interpretation substitution or write outside own layer.

## Failure and recovery
Unknown purpose or DRAFT profile, missing locator/version, expired or revoked upstream -> block the affected input and return responsible stage/method; no semantic retry lottery. Bounded infrastructure retry only on identical snapshot. Resume requires revalidation, not old run PASS.

## Verification
Use `verification/arch-mig-prep-01/acceptance/scenario-contracts.csv`; validate method/source binding, sole write Owner, independent Gate, stale snapshot rejection and unaffected facet preservation. Tests must be engineering evidence, not this document's assertion.
