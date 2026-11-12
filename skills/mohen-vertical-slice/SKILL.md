# mohen-vertical-slice

**Status:** TARGET · Phase C
**Kind:** cross-cutting/reusable capability
**Allowed Calling Stages:** D00, D01, D02, D03, D04, D05

## Purpose
Validation orchestration capability for end-to-end slices. It may observe multiple stages but owns no cross-layer final writes.

## Contract
- No independent D00–D05 Stage PASS unless explicitly designated as a Stage Owner (this Skill is not).
- No final writes across multiple L layers.
- Caller Stage owns candidate persistence and qualified handoff; independent Gate owns final qualification and audit.
- Reuse existing implementation where possible; duplicate canonical entries are not allowed.
- Exact executable entry is frozen during implementation phase.

## Inputs / Outputs
Defined per caller contract. Outputs must be typed capability results, not final cross-stage records.

## Failure / Stop
Stop when requested action would require this capability to own another Stage's persistence or Gate decision.

## Canonical Entry
`PENDING_PHASE_D`

## 新代际绑定与停止

纵向切片验证，不拥有跨层最终写权。唯一专业规则来自`specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` §3/§7，输出候选由调用Stage/资产合同持久化；不得自签资格、越权外传、伪造工具回执或把原型当正式事实。方法绑定/版权/预算缺失时HOLD并保留受限候选。当前为设计镜像，未激活运行。
