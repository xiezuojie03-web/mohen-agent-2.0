# TASK-0010 --- Jinze Historical Spatial Grounding & Reconstruction --- Minimum Slice

**Status:** READY\
**Scope:** Jinze minimum slice only\
**Depends on:** TASK-0009 PASS + HR-MAP-01 `PARTIAL_CONFIRM`\
**Execution model:** one WorkBuddy task, sequential\
**Stop rule:** complete this Task and STOP. Do not start TASK-0011.

## 0. Architect frozen decisions

### 0.1 Stage transition

TASK-0001--0009 established the trustworthy substrate. TASK-0010 starts
the first minimum **historical world construction**.

This is not another broad acquisition task and not a UI task.

### 0.2 HR-MAP-01

For 1879 光绪《青浦县志》二里半方图 p36:

-   source/page identity: `CONFIRMED`
-   二里半方图: `CONFIRMED`
-   grid sheet: `第三排四號 = CONFIRMED_BY_HUMAN_VISUAL_REVIEW`
-   map content readability: `PARTIAL`
-   金泽/金澤 printed label: `UNRESOLVED`
-   蔡浜 printed label: `UNRESOLVED`
-   枪开河/槍開河 printed label: `UNRESOLVED`
-   historical spatial structure present: `CONFIRMED`
-   usable as Historical Spatial Source: `YES`
-   direct Jinze historical map: `NOT YET`
-   `BREAKTHROUGH_CANDIDATE`: NO
-   `HISTORICAL_MAP_READY`: remains `PARTIAL`

Do not overwrite TASK-0009 historical reports. Persist this as a new
human-review decision/audit artifact.

### 0.3 No more ordinary OCR loop

Do not rerun generic OCR merely to force the three unresolved labels.
OCR may assist navigation only. No OCR output may by itself create a
verified historical feature.

### 0.4 Frozen existing substrate

Keep unchanged unless this Task produces new evidence through the
allowed workflow: - Knowledge Weave Minimum = YES - current spatial
targets = YES - current heritage visuals = 8 - historical visual
evidence = 0 - published = 0 - audit relation orphan baseline = 63 -
Legacy read-only - SHR and HR decisions remain frozen.

## 1. Goal

Build the first evidence-backed **Historical Spatial Reconstruction
Minimum Slice** around:

> **万安桥 --- 普济桥 --- 颐浩寺/颐浩寺遗址 --- connecting waterway
> context**

The purpose is to prove that MoHen can represent a place as a temporal
spatial world rather than as isolated POIs.

Required chain:

`Historical Source` → `Historical Feature Candidate` →
`Temporal Semantics` → `Spatial Grounding` → `Evidence` → `Confidence` →
`Relation/Change` → `Historical Spatial Slice`

The Task must answer, without inventing geometry:

1.  What historical objects in this slice are securely attested?
2.  What can be grounded to a current object point?
3.  What is historical position vs current position vs approximate area?
4.  What relationships between bridge / temple / waterway are evidenced,
    candidate, or unresolved?
5.  What changed between the historical record and today?
6.  Is the resulting substrate sufficient for a later Experience Script?

## 2. Strict slice boundary

### P0 core objects

1.  万安桥
2.  普济桥
3.  颐浩寺 / 颐浩寺遗址 / 颐浩禅寺
4.  the minimum waterway feature(s) directly needed to connect/explain
    the above

### P1 only when necessary for disambiguation/context

-   金泽镇 / 金泽古镇 anchor
-   吕颐浩
-   one immediately adjacent named bridge/water feature if required by
    evidence

Do not expand to all Jinze bridges, all temples, all waterways, or all
map labels.

## 3. Work Package A --- persist HR-MAP-01

Use the existing human-review mechanism or the smallest compatible
namespace.

Required decision ID: `HR-MAP-01`

Persist: - reviewed source/page/candidate ID - decision =
`PARTIAL_CONFIRM` - confirmed grid identity = 第三排四號 - unresolved
labels = 金泽/蔡浜/枪开河 - map-gate unchanged - reviewer type =
human/architect - decision timestamp - evidence/artifact references.

Do not collide with HR1--HR6 or SHR-01--06.

Output: `data/exports/jinze-map-human-review-decision-log.md`

## 4. Work Package B --- historical feature inventory

Create an explicit inventory for only the slice.

For each candidate feature record: - canonical label - historical
label(s) - modern label(s) - feature type - valid time / attested time -
current existence state - historical existence state - historical
source(s) - current spatial source(s) - geometry type:
`point / line / area / unknown` - spatial status: -
`verified_object_point` - `official_or_provider_object_point` -
`approximate_object_area` - `historical_anchor_candidate` -
`historical_relative_position_only` - `unresolved` - CRS for every
coordinate-bearing record - confidence - Evidence IDs - review status.

Hard rule: **a current AMap point is not a historical coordinate.**

## 5. Work Package C --- source-to-feature grounding

Use existing acquired material first: - 1879 p36 and relevant
adjacent/related 1879 pages - existing 1879 water-system map
candidates - TASK-0005/0006 S1 evidence - existing Legacy candidate text
only where provenance is retained - existing current AMap provider
points - existing evidence for 万安桥 / 普济桥 / 颐浩寺 - existing
map/source registry.

A narrowly targeted source lookup is allowed only when a specific slice
assertion cannot be classified without it. No new broad P1/P2
acquisition campaign.

For every historical map mark/label used: - retain original page; -
retain crop coordinates or derived crop reference; - record printed
label exactly when readable; - distinguish `human_read`,
`catalog_index`, `textual_source`, `provider_point`; - never convert
visual proximity into exact coordinates.

## 6. Work Package D --- temporal semantics

For each core object, distinguish at minimum:

-   `attested_historical_existence`
-   `current_survival_or_site`
-   `historical_position_status`
-   `current_position_status`
-   `name_continuity_status`
-   `change_status`

Allowed change statuses: - `survives` - `rebuilt` - `relocated` -
`site_only` - `name_changed` - `function_changed` -
`surrounding_context_changed` - `unknown`

Only assign a status if Evidence supports it. Otherwise `unknown`.

Do not turn construction date into proof that the current fabric is
unchanged.

## 7. Work Package E --- relation classification

Review only relations needed for the slice.

Relation classes:

### E1 evidenced

Direct documentary/source support exists.

### E2 spatially grounded candidate

Supported by current spatial geometry plus source-compatible identity,
but not yet a historical fact.

### E3 historical-relative candidate

Historical source shows relative/topological relation but not reliable
coordinates.

### E4 unresolved

Plausible but evidence insufficient.

Examples of possible predicates are not instructions to assert them: -
`spans_waterway` - `near` - `same_water_system` -
`temple_bridge_association` - `named_after` - `former_site_of` -
`survives_as` - `rebuilt_as`

Do not invent causal predicates.

Existing semantic relations may be reused only with their existing
Evidence/disposition.

## 8. Work Package F --- Historical Spatial Slice

Create one machine-readable slice object/artifact representing the
minimum historical world.

Suggested semantic structure:

-   `slice_id`
-   `focus_question`
-   `time_context`
-   `features[]`
-   `relations[]`
-   `changes[]`
-   `historical_sources[]`
-   `current_sources[]`
-   `uncertainties[]`
-   `evidence_summary`
-   `spatial_extent_current`
-   `historical_geometry_status`
-   `experience_hooks[]`

`experience_hooks` are only semantic opportunities, for example: - show
surviving bridge - reveal former temple/site relation - compare current
water context with historical evidence - open source page.

No UI composition, prose story generation, route, or Agent Runtime
implementation.

## 9. Work Package G --- reconstruction readiness gate

Evaluate:

`HISTORICAL_SPATIAL_SLICE_READY = YES / PARTIAL / NO`

YES requires all: 1. ≥3 core historical features with Evidence; 2. ≥2
core features grounded to current object point/area without pretending
those are historical coordinates; 3. ≥1 waterway/spatial-context feature
with defensible identity or explicit relative-only status; 4. ≥2
evidence-backed or explicitly classified historical-relative relations;
5. ≥1 meaningful time/change distinction; 6. every historical assertion
traceable to Evidence; 7. uncertainty represented explicitly; 8. no
fabricated historical geometry.

Also evaluate separately:

-   `EXPERIENCE_SCRIPT_SUBSTRATE_READY = YES/PARTIAL/NO`
-   `PAST_PRESENT_COMPARISON_SUBSTRATE = YES/PARTIAL/NO`
-   `SPATIOTEMPORAL_OVERLAY_SUBSTRATE = YES/PARTIAL/NO`

Do not equate these gates.

## 10. Database/schema rule

First inspect whether current schema can represent: -
HistoricalFeature - temporal validity/attestation - current vs
historical spatial status - evidence linkage - uncertainty/confidence -
change relation.

Prefer existing schema + minimal extension.

One new migration is allowed only if representation would otherwise be
lossy or duplicate JSON blobs become a second source of truth.

If migration is needed: - do not edit migrations 001--006; - no PostGIS
requirement in this Task; - no geometry invention; - explain why in
result; - add tests.

PostgreSQL remains source of truth. Export JSON/CSV is a build/audit
artifact, not truth store.

## 11. Evidence Gate

Every new Evidence / Claim / Relation / HistoricalFeature state must
obey current Evidence Gate semantics.

For new Evidence: - create G0--G6 snapshot immediately.

For human-reviewed map semantics: - keep human decision separate from
raw source; - do not mutate the source to make it "confirmed".

No published objects.

## 12. Hard invariants

1.  Legacy zero-write.
2.  Raw historical sources append-only.
3.  published before/after = 0.
4.  audit relation orphan after ≤ 63.
5.  no current coordinate represented as historical coordinate.
6.  no WGS84/GCJ-02 mixing without explicit CRS/transformation
    semantics.
7.  no ordinary OCR result promoted directly to fact.
8.  no AI image generation.
9.  no AI map completion.
10. no inferred historical river line written as verified geometry.
11. no inferred historical street line written as verified geometry.
12. no "map nearby" = "same object".
13. no name normalization that hides source variants.
14. 天王阁/天皇阁 rule remains explicit if encountered.
15. no HR/SRH decision overwrite.
16. no Knowledge Weave broad expansion.
17. no P1/P2 broad acquisition.
18. no UI.
19. no route.
20. no Agent Runtime.
21. no Experience Renderer.
22. no arbitrary new framework.
23. no secret in repo/log/report.
24. new deterministic transforms idempotent.
25. rerun must not duplicate Evidence/features/relations.
26. tests must assert invariants, not stale absolute database totals.

## 13. Allowed changes

Allowed: - `pipelines/historical-spatial/**` - `packages/domain/**` -
`packages/data-access/**` only if needed - `tests/data/**` -
`skills/mohen-spatial-grounding/**` -
`skills/mohen-historical-spatial-source/**` only for clarified
handoff/boundary - one new
`skills/mohen-historical-spatial-reconstruction/**` only if the process
is genuinely reusable - one new migration if §10 requires it -
`data/exports/**` - `tasks/results/TASK-0010-result.md` - `CONTEXT.md`.

Not allowed: - Legacy - migrations 001--006 edits -
UI/route/runtime/renderer - unrelated cleanup/refactor - broad source
acquisition.

## 14. Skill boundary

Do not merge existing Skills.

Freeze responsibilities:

-   `mohen-historical-spatial-source` = **Find & Acquire** historical
    spatial sources and provenance.
-   `mohen-spatial-grounding` = **Interpret & Ground** source objects
    against spatial reality with CRS/confidence discipline.
-   optional `mohen-historical-spatial-reconstruction` = **Assemble**
    evidence-backed temporal/spatial features and relations into a slice
    without inventing geometry.

If the third Skill would merely duplicate pipeline documentation, do not
create it.

## 15. Required outputs

1.  `data/exports/jinze-map-human-review-decision-log.md`
2.  `data/exports/jinze-historical-feature-inventory.csv`
3.  `data/exports/jinze-historical-spatial-relations.csv`
4.  `data/exports/jinze-historical-change-inventory.csv`
5.  `data/exports/jinze-historical-spatial-slice.json`
6.  `data/exports/jinze-historical-spatial-slice-readiness.md`
7.  `data/exports/jinze-historical-spatial-human-review.csv` only if
    genuine unresolved decisions require human adjudication
8.  `tasks/results/TASK-0010-result.md`

## 16. Result exact counts

Report: - core features total - evidenced historical features - current
grounded points - approximate areas - historical anchor candidates -
historical-relative-only features - unresolved features - relations
E1/E2/E3/E4 - changes evidenced/candidate/unknown - new Source Records -
new Evidence - new Claims - new Relations - new HistoricalFeature
records - G0--G6 rows - human review decisions - published
before/after - audit orphan before/after - raw files before/after -
Legacy hash/mtime before/after - idempotent rerun created/reused
counts - tests/guards/typecheck/build - commit(s) - worktree status.

## 17. Acceptance

PASS does not require a precise historical map geometry.

PASS requires: - HR-MAP-01 persisted correctly; - the minimum
bridge--temple--water context is represented as a coherent historical
spatial slice; - current and historical spatial semantics are never
conflated; - relations and changes have explicit epistemic class; -
Evidence is traceable; - uncertainty remains visible; - no invented
geometry; - readiness gates are honestly calculated; -
repository/tests/invariants clean.

If the slice cannot meet READY because a waterway or temple relation
lacks evidence, return PARTIAL and identify the exact missing evidence.
Do not broaden the task to make the gate green.

After commit and clean worktree: **STOP. Do not start TASK-0011.**
