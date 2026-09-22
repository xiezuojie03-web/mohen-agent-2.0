# TASK-0007 — Jinze Spatial Grounding Sprint

**Status:** READY  
**Scope:** Jinze only  
**Depends on:** TASK-0006 PASS  
**Stop after completion:** YES  
**Do not start:** UI / Agent Runtime / Canvas / route experience / visual collection / other towns

---

## 0. Architect Decision

TASK-0006 is accepted as **PASS**.

The minimum Knowledge Weave is now established. Do not expand the graph for its own sake.

The next blocker to remove is **spatial grounding**:

- historical-map usability is still PARTIAL;
- object-level coordinates are still unresolved;
- a walkable route cannot yet be truthfully constructed.

This task solves only the evidence layer beneath those problems.

It does **not** build the route itself and does **not** enter Vertical Slice UI.

---

## 1. Goal

Create a trustworthy Jinze spatial evidence package that answers:

1. Which existing historical maps are actually usable for the Jinze sample?
2. Which core Jinze objects have defensible object-level coordinates?
3. Which coordinates are exact / approximate / unresolved?
4. Can 3–6 spatially grounded observation targets exist later without guessed points?
5. What spatial facts remain impossible to assert?

Target chain:

`Source → Raw → Evidence → Spatial Anchor → Historical Map Assessment → Spatial Readiness`

No invented coordinates. No forced georeferencing.

---

## 2. Read First

Read:

1. `CONTEXT.md`
2. `specs/FOUNDATION.md`
3. `specs/DATA_CONTRACT.md`
4. `skills/mohen-evidence-gate/**`
5. `skills/mohen-data-ingest/**`
6. `tasks/results/TASK-0006-result.md`
7. `data/exports/jinze-stage-gates.md`
8. `data/exports/jinze-knowledge-paths.md`
9. current historical-map / external-map records
10. current Jinze coordinate Evidence and backlog

Do not redesign Foundation or Knowledge Weave.

---

## 3. Priority objects

Only investigate objects useful to the current Jinze mainline.

P0:
- 万安桥
- 普济桥
- 迎祥桥
- 颐浩寺遗址
- 金泽镇 / current town anchor

P1 only if cheap and evidence-backed:
- 如意桥
- 天王阁桥 / Legacy 天皇阁桥
- 金泽放生桥
- 林老桥

Do not expand beyond this list.

---

## 4. Source policy

Allowed source levels for this task:

### S1
- Shanghai Library open data already configured
- government / official heritage / gazetteer records already accessible through approved project methods

### S2
- Wikidata / Wikimedia only where appropriate for identity/provenance, not as a substitute for missing official object coordinates unless the coordinate is genuinely object-level and provenance is explicit

### S3
- AMap for **current spatial location / POI grounding only**

AMap is not historical evidence.

Use the existing local AMap key only through environment variables. Never print, log, persist in source_uri, screenshot, or commit it.

If the expected AMap env variable is absent, STOP and ask the user to configure it locally. Do not ask them to paste the key into chat.

No S4 clue source may become verified spatial Evidence.

---

## 5. Coordinate semantics

Every object coordinate must carry a precision/status classification.

Minimum allowed values or project-equivalent semantics:

- `verified_object_point`
- `official_or_provider_object_point`
- `approximate_object_area`
- `town_level_only`
- `unresolved`

Also record:
- source/evidence ref
- provider
- retrieval date/run
- coordinate system if known
- transformed coordinate if transformation is required
- transformation method
- original coordinate preserved
- precision scope
- current-vs-historical semantics

Never overwrite the raw/original coordinate.

A current POI coordinate proves only a **current mapped location**, not that the historical object occupied exactly that point in every period.

---

## 6. Historical map policy

Inspect all existing Jinze-relevant map assets/records before any new retrieval.

For each candidate map classify:

- geographic scope
- depicted period/date
- source/provenance
- file/access availability
- Jinze visible? YES/NO/UNCERTAIN
- usable resolution? YES/NO
- known coordinate reference? if any
- georeferencing suitability:
  - `global_registration`
  - `local_registration`
  - `anchor_points_only`
  - `historical_spatial_reconstruction`
  - `original_map_narrative`
  - `not_usable`
- confidence
- reason

**Do not georeference merely to obtain a YES.**

If no existing map is suitable for global/local registration, that is a valid PASS result. Prefer `anchor_points_only` or `original_map_narrative` when historically honest.

No AI-generated map.

---

## 7. Work Packages

### WP-A — Existing spatial inventory

Produce exact inventory of:

- Jinze coordinate Evidence
- current entity lat/lng fields
- historical/external maps relevant to Jinze
- current provenance and precision gaps
- contradictions between Legacy coordinates and provider results

No external calls yet.

### WP-B — Targeted current-coordinate grounding

For P0 objects, query only approved current spatial sources.

Use AMap only for current POI/location grounding.

For every query:
- save raw response append-only
- register Source Record
- create Evidence
- preserve zero/multiple/ambiguous hits
- do not auto-select among ambiguous candidates without deterministic evidence

If a name search returns multiple plausible objects, mark for human review instead of choosing the nearest result.

P1 may run only after all P0 have a result state and only if it does not broaden scope.

### WP-C — Historical map usability audit

Audit existing Jinze-relevant map records/assets.

Do not download a large new map corpus.

A maximum of **2 targeted retrieval attempts** is allowed only when an existing DB record has a resolvable source/file reference but the local asset is missing.

Do not conduct broad web search/crawl.

### WP-D — Spatial Evidence Gate

For each P0 object produce final status:

- usable current object point
- approximate
- ambiguous
- unresolved

Then answer:

`SPATIAL_TARGET_SET_READY = YES / PARTIAL / NO`

YES requires at least 3 distinct P0/P1 observation objects with defensible object-level current coordinates.

This means only “enough spatially grounded targets exist for a later route task”.

It does **not** authorize route construction.

### WP-E — Historical Map Gate

Answer:

`HISTORICAL_MAP_READY = YES / PARTIAL / NO`

YES only if at least one map has:
- valid provenance,
- accessible asset,
- Jinze-relevant content,
- sufficient resolution,
- a declared honest usage mode.

A map can be YES under `anchor_points_only` or `original_map_narrative`; global georeferencing is not mandatory.

### WP-F — Human Review Pack

Generate a review pack only for genuinely ambiguous spatial judgments, for example:
- multiple POIs with same bridge name
- current POI vs historical site ambiguity
- conflicting coordinates
- uncertain map anchors

Do not ask the user to review deterministic cases.

### WP-G — Tests and result

Add focused tests for all invariants below.

---

## 8. Required invariants

1. No guessed coordinates.
2. Town-level anchor never becomes object-level point.
3. AMap current POI never becomes historical-position Evidence.
4. Original provider coordinates preserved.
5. Any coordinate transformation is explicit and reproducible.
6. Ambiguous POI search is not auto-resolved.
7. Every accepted spatial anchor has Evidence.
8. Historical map provenance is explicit.
9. Historical map usage mode is explicit.
10. No forced global georeferencing.
11. HR-1…HR-6 unchanged.
12. Knowledge Weave claims/paths/discoveries unchanged except references needed for non-semantic spatial linkage; no epistemic upgrade.
13. No new `published`.
14. Raw external responses append-only.
15. No secret exposure.
16. Rerun idempotent.
17. Legacy zero-write.
18. Existing tests remain green.

---

## 9. Audit-ledger governance

The TASK-0006 diagnosis is accepted:

`evidence_gate_audit = current-state snapshot, NOT historical ledger`.

Do not implement `evidence_gate_ledger` in this task.

However:
- new spatial Evidence must receive the current G0–G6 snapshot rows immediately;
- do not create new orphan audit rows;
- result report must state orphan relation count before/after;
- count must not increase because of this task.

---

## 10. Allowed changes

- `packages/domain/**`
- `packages/data-access/**`
- `pipelines/ingest/**` only for targeted spatial retrieval
- `pipelines/spatial/**`
- `tests/data/**`
- `skills/mohen-data-ingest/**` only if needed
- `skills/mohen-evidence-gate/**` only if needed
- migration `005` only if current schema cannot represent spatial provenance/precision honestly
- `CONTEXT.md`
- `tasks/results/TASK-0007-result.md`
- generated `data/exports/**`

If a necessary file falls outside this list, STOP or explicitly report before changing it. Do not repeat TASK-0006's allowed-file deviation unless unavoidable.

---

## 11. Forbidden

- UI / Canvas
- Agent Runtime
- route generation or navigation
- route optimization
- visual-asset collection
- Knowledge Weave expansion
- Discovery generation
- other towns
- broad scraping/search
- PostGIS unless existing plain schema makes honest storage impossible; if so STOP instead of installing it
- AI coordinate inference
- AI image generation
- modifying HR decisions
- modifying migrations 001–004
- modifying Legacy
- publishing anything
- changing TASK-0005/0006 historical reports

---

## 12. Required outputs

1. `data/exports/jinze-spatial-inventory.md`
2. `data/exports/jinze-object-coordinate-evidence.md`
3. `data/exports/jinze-historical-map-audit.md`
4. `data/exports/jinze-spatial-readiness.md`
5. `data/exports/jinze-spatial-human-review.csv` only if ambiguity exists
6. `tasks/results/TASK-0007-result.md`

Result must give exact counts for:
- P0/P1 objects queried
- verified/provider object points
- approximate
- ambiguous
- unresolved
- new Source Records
- new Evidence
- raw snapshots
- historical maps audited
- maps by usage mode
- G3 before/after
- audit orphan rows before/after
- published count

---

## 13. PASS criteria

TASK-0007 PASS if:

- every accepted coordinate is source-backed and correctly scoped;
- no town-level/current/historical semantics are conflated;
- all existing Jinze-relevant maps are honestly classified;
- `SPATIAL_TARGET_SET_READY` and `HISTORICAL_MAP_READY` are explicitly determined;
- NO/PARTIAL is allowed and does not fail the task;
- ambiguity is surfaced for human review rather than guessed;
- no route is built;
- no Knowledge Weave epistemic state is upgraded;
- new Evidence receives G0–G6 snapshot audit immediately;
- audit orphan count does not increase;
- tests/guards/typecheck/build pass;
- rerun is idempotent;
- Legacy zero-write;
- no secret exposure;
- commit created and working tree clean.

---

## 14. Stop conditions

STOP if:

- AMap credential is required but unavailable locally;
- provider terms/response do not permit safe use;
- object identity cannot be disambiguated without human judgment;
- coordinate-system conversion cannot be determined reliably;
- map asset retrieval would require broad crawling;
- implementation requires PostGIS or major schema redesign;
- historical/current location would need to be conflated to achieve readiness;
- scope begins drifting into route/UI/visual/Agent work.

---

## 15. Execution order

`clean/guard check`
→ read contracts/results
→ WP-A inventory
→ verify local credential presence without printing value
→ WP-B targeted P0 grounding
→ optional P1
→ WP-C map audit
→ WP-D spatial gate
→ WP-E map gate
→ WP-F human review only if needed
→ G0–G6 snapshot audit
→ tests
→ guards/typecheck/build
→ Legacy zero-write proof
→ diff check
→ commit
→ clean status
→ final result
→ **STOP**

Do not start TASK-0008.
