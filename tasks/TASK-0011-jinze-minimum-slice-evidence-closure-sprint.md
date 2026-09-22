# TASK-0011 --- Jinze Minimum Slice Evidence Closure Sprint

**Status:** READY\
**Depends on:** TASK-0010 PASS +
`HISTORICAL_SPATIAL_SLICE_READY=PARTIAL`\
**Scope:** close evidence gaps inside the existing Jinze minimum slice
only\
**Stop rule:** complete, commit, clean worktree, then STOP. Do not start
TASK-0012.

## 0. Architect acceptance of TASK-0010

TASK-0010 is accepted PASS.

Frozen current gates: - `HISTORICAL_SPATIAL_SLICE_READY = PARTIAL` -
`EXPERIENCE_SCRIPT_SUBSTRATE_READY = PARTIAL` -
`PAST_PRESENT_COMPARISON_SUBSTRATE = PARTIAL` -
`SPATIOTEMPORAL_OVERLAY_SUBSTRATE = NO` -
`HISTORICAL_MAP_READY = PARTIAL`

TASK-0010 correctly kept current coordinates separate from historical
position and created no historical line geometry.

The only failing main-slice readiness criterion is:
`c6_every_assertion_traceable`.

## 1. Goal

Close, downgrade, or explicitly retire the **five Legacy-only historical
assertions** that currently prevent c6 from passing.

This is an **Evidence Closure Sprint**, not a new data-acquisition
campaign.

For each assertion, the final state must be exactly one of:

1.  `EVIDENCED` --- independent source obtained and Evidence row
    created;
2.  `CANDIDATE_WITH_EVIDENCE_LIMIT` --- partial/indirect evidence
    exists; wording and epistemic state constrained;
3.  `UNSUPPORTED_RETIRED_FROM_ASSERTION_SET` --- no adequate evidence
    found; keep the Legacy text/provenance as a research lead, but it
    must not remain an active historical assertion;
4.  `CONFLICT` --- reliable sources disagree; preserve both and block
    silent resolution.

**Important:** retiring an unsupported assertion is not "deleting
evidence to make the gate green." The original Legacy text must remain
preserved and traceable as a lead. The active historical slice must
simply stop treating unsupported text as an assertion.

## 2. P0 assertions --- exhaustive targeted search

### A1 --- 普济桥横跨金泽塘

Legacy-only statement: `位于金泽镇北市，横跨金泽塘`

Need independent evidence for the bridge-waterway identity/relationship.

### A2 --- 万安桥亭桥形制

Legacy-only statement: `旧志载其形制为亭桥（桥上建亭）`

Need a traceable gazetteer/heritage/bridge-survey source.

### A3 --- 颐浩寺 1938 毁于兵燹

Need independent dated source.

### A4 --- 颐浩寺 1992 原址修复/复建开放

Need independent dated source and wording precise enough to
distinguish: - 原址 - 修复 - 重建/复建 - 开放 Do not collapse these into
one claim.

### A5 --- 颐浩寺"元代鼎盛"及引文

Legacy contains a secondary quotation: `虽杭之灵隐、苏之承天莫匹其伟`
Need the original/traceable source chain. If only quotation-of-quotation
remains, keep as attributed tradition/secondary report, not verified
fact.

## 3. Source order --- mandatory

Search in this order and record every query/result state.

### S1-A Shanghai Library structured resources first

Use the already working Shanghai Library Open Data platform and its
structured datasets/APIs, including where applicable: - place-name
knowledge - person-name knowledge - 上海年华 knowledge graph -
heritage/cultural records - gazetteer/book records - image-bearing
records - entity/relation endpoints available to the project

Do not treat "zero from one endpoint" as "Shanghai Library has no data."
Search the relevant structured resource families separately.

### S1-B acquired primary/local materials

Search already acquired 1597/1669 metadata leads, 1788/1879/1934
scans/indexes, `金泽小志`, Qingpu/Jinze gazetteer leads, and existing S1
records.

Prefer exact page/volume/record locators.

### S1-C official heritage/local-history sources

Targeted government, museum, archive, heritage conservation, bridge
survey/repair, town gazetteer material.

### S2

Public libraries/archives, Wikimedia metadata, scholarly catalogues or
reliable digitized books when S1 is insufficient.

### Legacy

Legacy is a clue/index only. It cannot independently close a gap.

No broad S4 crawl.

## 4. Query discipline

For each P0 assertion: - start with exact names and name variants; -
search both simplified/traditional forms when relevant; - search
object + predicate terms, not only whole quoted phrases; - avoid the
TASK-0008 mistake where quoted multiword CirrusSearch queries caused
false zeroes; - record endpoint/dataset/query/returned count/inspected
count/outcome; - if an API gives structured relations, preserve the
original relation semantics rather than rewriting them into stronger
predicates.

Examples of search dimensions: - 普济桥 / 普濟橋 + 金泽塘 / 金澤塘 /
北市 / 水道 - 万安桥 / 萬安橋 + 亭桥 / 亭橋 / 桥亭 / 橋亭 / 形制 -
颐浩寺 / 頤浩寺 / 颐浩禅寺 / 頤浩禪寺 + 1938 / 民国二十七年 / 兵燹 / 毁
/ 毀 - same + 1992 / 修复 / 修復 / 重建 / 复建 / 復建 / 开放 - same + 元
/ 元代 / 灵隐 / 靈隱 / 承天 / 莫匹其伟 / 莫匹其偉

These are query candidates, not facts.

## 5. P1 opportunistic gaps --- no dedicated campaign

Only if the same retrieved sources directly provide them, capture
evidence for: - U5 颐浩寺---普济桥 historical association; - U6 p36
labels; - U7 金泽塘 historical name/continuity; - U8 颐浩寺 historical
position.

Do **not** launch a separate historical-map campaign, image campaign, or
waterway reconstruction campaign for P1.

U4 普济桥 dating conflict remains a conflict unless an authoritative
source directly resolves it.

## 6. Evidence semantics

Every accepted source must produce:
`Source Record → Evidence → assertion/claim/relation/change linkage`.

Evidence must retain: - source provider - source title - source
URI/record ID - author/editor if available - publication/record date if
available - volume/page/record locator - exact supporting excerpt or
structured relation payload - retrieval date - rights/access metadata
where applicable - extraction method - verification status.

Do not infer historical dates from upload dates.

Do not infer "原址" from a modern POI.

Do not infer "亭桥" from current appearance or image resemblance.

## 7. Assertion-set correction rule

This Task explicitly corrects a semantic flaw exposed by TASK-0010:

**Legacy-only text may remain preserved, but unsupported text must not
remain in the active historical assertion set indefinitely.**

For each A1--A5: - preserve original Legacy statement in
provenance/research lead; - if evidence is absent after the defined
search, mark it `UNSUPPORTED_RETIRED_FROM_ASSERTION_SET`; - remove it
only from the active assertion/readiness calculation, not from
Raw/Legacy/audit history; - add an explicit retirement reason and
search-log reference; - downstream Experience must not present it as
fact.

`c6_every_assertion_traceable` may become PASS through either: -
obtaining Evidence, or - correctly removing unsupported leads from the
**active assertion set** while preserving them as leads.

It may NOT become PASS by deleting source history, hiding unresolved
records, or weakening c6.

## 8. Human-review proposals P-01...P-07

Do not automatically create seven new human decisions.

Architect dispositions:

-   P-01 (U1 1938/1992): **RESEARCH FIRST** in this Task.
-   P-02 (U2 亭桥): **RESEARCH FIRST**.
-   P-03 (U3 普济桥/金泽塘): **RESEARCH FIRST**.
-   P-04 (U5 寺桥历史关联): **OPPORTUNISTIC ONLY**; current E2 must
    remain present-day/provider geometry semantics unless historical
    evidence appears.
-   P-05 (U6 p36 labels): **DEFER**; HR-MAP-01 remains authoritative.
-   P-06 (U7 金泽塘 geometry/continuity): **DEFER dedicated
    reconstruction**; opportunistic textual evidence allowed, no
    geometry.
-   P-07 (U8 寺址 historical position): **OPPORTUNISTIC ONLY**; no
    current-area→historical-position promotion.

Only generate a new human-review CSV if a genuine source conflict or
interpretive ambiguity remains after research.

## 9. Shanghai Library knowledge alignment --- narrow pilot

Because the project must not forget Shanghai Library's structured
humanistic resources, run a **narrow alignment pilot** for the existing
slice entities only:

-   万安桥
-   普济桥
-   颐浩寺/颐浩寺遗址/颐浩禅寺
-   吕颐浩
-   金泽塘
-   金泽 / 金泽镇

Record whether Shanghai Library exposes: - canonical entity - alternate
names - person↔place relation - place↔event relation - place↔work/book
relation - place↔image relation - temporal attributes -
source/provenance identifiers.

This pilot is discovery/alignment only. Do not expand Knowledge Weave or
import unrelated graph neighborhoods.

Output a reusable endpoint/dataset matrix so future tasks know where
these resource families live.

## 10. Database changes

Prefer no new migration.

Use existing Source/Evidence/Claim/Relation/Change/HistoricalFeature
structures.

A migration is allowed only if the active-assertion vs
preserved-research-lead distinction cannot be represented honestly with
current schema. If needed: - smallest schema-safe change; - do not edit
001--007; - explain why; - add invariant tests.

No new knowledge-graph subsystem.

## 11. Readiness recomputation

After evidence closure, recompute:

-   `c6_every_assertion_traceable`
-   `HISTORICAL_SPATIAL_SLICE_READY`
-   `EXPERIENCE_SCRIPT_SUBSTRATE_READY`
-   `PAST_PRESENT_COMPARISON_SUBSTRATE`
-   `SPATIOTEMPORAL_OVERLAY_SUBSTRATE`

Rules: - Historical visuals still 0 unless genuinely discovered as a
side effect; do not change visual gate by metadata speculation. -
Historical geometry remains absent unless an already-retrieved source
provides defensible spatial evidence; no invented geometry. -
`HISTORICAL_SPATIAL_SLICE_READY=YES` is allowed only if all eight
existing criteria truly pass. - Experience Script substrate may remain
PARTIAL; do not force it to YES.

## 12. Hard invariants

1.  Legacy zero-write.
2.  Raw Store append-only.
3.  published remains 0.
4.  audit relation orphan after ≤ 63.
5.  no current coordinate as historical coordinate.
6.  no AI-generated imagery.
7.  no AI-completed map/river/street geometry.
8.  no OCR-only historical fact.
9.  no unsupported Legacy text as verified fact.
10. no deletion of Legacy/source history to satisfy c6.
11. no broad Jinze expansion.
12. no other towns.
13. no route.
14. no UI.
15. no Agent Runtime.
16. no Experience Renderer.
17. no P1/P2 historical-map campaign.
18. no mass Knowledge Weave expansion.
19. no secret in repo/log/export.
20. all new Evidence gets G0--G6 snapshot immediately.
21. orphan audit does not increase.
22. deterministic transforms idempotent.
23. tests assert semantic invariants, not stale absolute totals.
24. no existing HR/SHR/HR-MAP decision overwrite.
25. name variants remain explicit.
26. source zero-result must be recorded, not silently omitted.

## 13. Required outputs

1.  `data/exports/jinze-evidence-closure-search-log.csv`
2.  `data/exports/jinze-evidence-closure-matrix.csv`
3.  `data/exports/jinze-shl-knowledge-alignment.md`
4.  `data/exports/jinze-shl-endpoint-dataset-matrix.csv`
5.  updated deterministic historical slice exports
6.  `data/exports/jinze-evidence-closure-readiness.md`
7.  `data/exports/jinze-evidence-closure-human-review.csv` only if
    needed
8.  `tasks/results/TASK-0011-result.md`

For A1--A5 the matrix must show: - original Legacy assertion - final
state - source(s) searched - evidence IDs if any - active assertion
yes/no - downstream allowed wording - unresolved reason if any.

## 14. Exact result counts

Report: - A1--A5: EVIDENCED / LIMITED / RETIRED / CONFLICT counts -
source families searched - queries executed - records
returned/inspected - new Source Records - new Evidence - new Claims -
relation/change updates - active Legacy-only assertions before/after -
SHL aligned entities and relation types found - P1 opportunistic
evidence found - G0--G6 rows added - c6 before/after - all five
readiness gates before/after - published before/after - audit orphan
before/after - raw files added - idempotent rerun created/reused -
tests/guards/typecheck/build - Legacy mtime/hash before/after -
commits - worktree status.

## 15. PASS condition

TASK PASS is about **honest closure**, not about proving all five
statements.

PASS if: - all A1--A5 have explicit final states; - every active
historical assertion is Evidence-traceable; - unsupported Legacy leads
are preserved but not presented as facts; - SHL structured-resource
pilot is completed for the slice; - no scope expansion or epistemic
downgrade occurred; - repository invariants/tests are green.

Therefore PASS may legitimately end with: - some assertions `RETIRED`, -
historical map still PARTIAL, - historical visuals still 0, - Experience
Script substrate still PARTIAL.

After completion and clean commit: **STOP. Do not start TASK-0012.**
