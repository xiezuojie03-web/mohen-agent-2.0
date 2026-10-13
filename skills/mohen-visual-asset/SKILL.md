# mohen-visual-asset

**Status:** TARGET · Phase C
**Kind:** cross-cutting/reusable capability
**Allowed Calling Stages:** D01, D02, D03

## Purpose
Reusable visual source/reading/linking capability. It can support D01 source acquisition, D02 visual reading and D03 visual-world links, but never owns cross-layer persistence.

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

## Visual Source Boundary（承接 2026-10-05 采集教训，非旧 lifecycle）

本 Capability 复用被覆盖但仍有长期价值的视觉采集经验；**仅作 D01/D02/D03 能力规则，不恢复任何旧 entry**（如 unattended.* / images-* / bridge-to-directed）。

- **Commons 只能作「取回」，不能作「发现」**：不得用 Commons 全文/标题检索去*找*某实体的图像——纯文本相似度无法区分同名异地。实测 `search=金泽` 返回的 Top3 全是**日本石川县金泽市**（城堡公园 / 人口分布图），与上海青浦金泽无关。
- **不得仅凭同名认定归属**：视觉资产只有在实体的权威身份（Wikidata `P18` 图像声明、已确认的 Commons 分类/页面）*明确指认*该文件时，才链接到该实体。**同名搜索命中 ≠ 属于该实体**。
- **许可逐文件记录**：CC0 / CC BY / CC BY-SA / PD 等逐条记录；许可未知者一律 `HOLD`，不晋级。
- **链接为候选**：图-实体链接一律 `suspected` 并必带 `link_evidence_id`；不得自动晋级为 confirmed。
- **古今判定**：以 `DateTimeOriginal` 判古今；现代照片永不得冒充历史状态证据。
- 权威出处：`specs/data-production/source-providers.json`（`wikimedia_commons` / `wikidata`）与 `specs/data-production/acquisition-intents.json`。

## Canonical Entry
`Reusable Capability · invoked by D01/D02/D03 stage executors through adapters; no independent lifecycle entry`
