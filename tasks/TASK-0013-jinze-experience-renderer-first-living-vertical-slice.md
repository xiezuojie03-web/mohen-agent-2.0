# TASK-0013 --- Jinze Experience Renderer --- First Living Vertical Slice

**Status:** SIGNED FOR EXECUTION\
**Stage:** Experience Renderer --- first living vertical slice\
**Precondition:** TASK-0012 + TASK-0012A = PASS / FROZEN\
**Execution:** one sequential WorkBuddy task\
**STOP:** after implementation, tests, build, result/readiness reports,
commit, tracked worktree clean. Do **not** start TASK-0014.

## 0. Stage transition

TASK-0012 proved the semantic experience chain:

`Modern Geography → Historical Time → Relational Historical Space → Evidence → Discovery → Uncertainty → Today → Follow-up → Patch`

TASK-0013 must make that chain visible and operable for the first time.

This is not a website redesign and not a final visual-polish task.

Core architecture to prove:

`Experience Script → ExperienceState → CompositionState → Renderer → User-visible Experience → User Action → State Patch`

The Renderer is a consumer of the frozen Experience specification. It is
not a second source of historical truth.

## 1. Single objective

Render the frozen Jinze 3-minute experience as a real, interactive MoHen
Experience.

Required source artifacts:

-   `data/exports/jinze-3min-experience-script.json`
-   `data/exports/jinze-3min-experience-state-sequence.json`
-   `data/exports/jinze-3min-experience-followup-patch.json`

The user must be able to run the complete 8-scene experience and see
composition, spatial semantics, evidence states, Discovery, and
follow-up Patch change on screen.

Do not expand the historical world in this task.

## 2. Source-of-truth rule

TASK-0012 artifacts are the Experience source of truth.

Do not rewrite the eight scenes inside React components; duplicate
canonical narrative text in page code; change Evidence to make UI
easier; change historical facts; change T11-C1...C5; change Primary
Discovery epistemic classification; invent historical geometry; or
invent historical imagery.

The implementation must allow the Experience Script to change later
without rewriting scene-specific React components.

Hard architecture test: no `JinzeScene01.tsx` ... `JinzeScene08.tsx`
style architecture.

## 3. Runtime route

Create one dedicated Experience route following repository routing
conventions. Preferred semantic route: `/experience/jinze-water-net`; an
equivalent repo-consistent route is acceptable.

Opening the route must enter the Experience directly. Do not put a
homepage, portal, town detail page, card directory, or traditional chat
landing page in front of it.

The first impression must be: MoHen is guiding the user into a
historical-spatial question.

## 4. Persistent Experience Shell

Build one persistent Experience Shell containing:

1.  Experience Canvas
2.  Narrative Layer
3.  Time Context
4.  Evidence / Uncertainty Layer
5.  Agent Action Layer

They are not five pages. They are surfaces inside one continuing
Experience Space. Scene transitions recompose this space instead of
navigating to unrelated pages.

## 5. CompositionState must control composition

At minimum consume and visibly apply:

-   `primarySurface`
-   `secondarySurface`
-   `contextSurface`
-   `narrativeDensity`
-   `visualIntensity`
-   `transitionIntent`

It is not sufficient to read these fields while always rendering the
same fixed layout. Different scene compositions must be visually
distinguishable.

The Renderer may use predefined layouts/templates. AI does not generate
arbitrary DOM/layout.

Architecture principle:

`semantic experienceMode / CompositionState → predefined composition → renderer`

not:

`LLM → arbitrary React/UI`

## 6. Minimum required surfaces

Implement these semantic surfaces:

### modern_map

Use current grounded coordinates only; use the existing map stack where
practical; clearly represent current geography; never imply that a
current point is historical.

### timeline

Reflect current `ExperienceState.time_state`; make temporal transition
perceptible; do not invent unsupported precise dates.

### relational_space

Render structured relations/topology. No historical longitude/latitude,
fake river geometry, fake street geometry, or hidden reuse of current
coordinates.

Valid semantic direction: `Bridge → spans → Waterway ← spans ← Bridge`,
with other supported entity/change/evidence relationships entering as
appropriate.

### evidence_panel

Present epistemic distinctions in user-facing language. At minimum
distinguish evidenced/known, limited/conditional, conflict, unknown, and
interpretation candidate where applicable. Do not expose raw developer
JSON as the main experience.

### current_photo

Only use TASK-0012 approved/whitelisted current visual assets; preserve
attribution/licensing where required; do not visually imply they are
historical photographs.

### text_focus

Use for Discovery, uncertainty, or follow-up moments where narrative
meaning is primary.

## 7. Historical spatial honesty --- critical invariant

Current-time scenes may use `GEOGRAPHIC_EXACT`.

Historical scenes using `RELATIONAL_HISTORICAL` must not display modern
coordinates as historical positions.

Most important transition:

`s01 → s02`

`modern map → time moves backward → modern coordinates fade/disappear → relational historical space`

The user should visually understand: evidence precision changed, so
MoHen changed the form of spatial representation.

Forbidden: modern POIs retained on an old-looking map as historical;
fake historical river lines; fake streets; fabricated historical object
placement; decorative pseudo-GIS implying unsupported precision.

## 8. Eight-scene runtime

Support the full eight-scene sequence. At minimum implement actual
relevant actions represented by the frozen script, including next scene,
previous scene where state permits, open evidence, focus place, set/view
time context, and canonical follow-up.

User-facing labels must be natural language, not internal enum names.
Example: `OPEN_EVIDENCE` → `查看证据`.

## 9. Transition behavior

`transitionIntent` must create perceptible but restrained state
transitions. Do not optimize for spectacle. Prioritize semantic clarity.

The most important visual transition is loss of exact modern geography
when entering historical relational space. Other transitions should help
the user perceive changes in primary focus, time, evidence state,
narrative density, visual intensity, and Discovery/follow-up state.
Avoid meaningless animation.

## 10. Evidence Reveal

Evidence is part of the Experience, not a developer appendix. Scene s05
must produce a meaningful Evidence Reveal.

T11-C1 and T11-C2 must remain visible as unresolved/conflicting evidence
according to frozen rulings. Do not silently select one side as the
answer.

The UI should help the user understand that historical knowledge has
sources, confidence, disagreement, and unresolved edges. Progressive
disclosure is allowed; every database field need not appear at once.

## 11. Primary Discovery epistemic rendering

TASK-0012A is frozen.

Scene s08 must preserve:

`FACT_EVIDENCED → INTERPRETATION_CANDIDATE → UNKNOWN`

The interpretation must not look epistemically identical to an evidenced
fact.

Do not undo the rule:

`Evidence(A) + Evidence(B) + Evidence(C) ≠ Evidence(A+B+C interpretation)`

unless the composite proposition itself later gains direct Evidence in a
separate approved task.

## 12. Canonical follow-up and Patch-not-Replace

Implement:

> 那颐浩寺和普济桥以前真的有关系吗？

Consume `jinze-3min-experience-followup-patch.json`.

Required behavior: no route reload; no replay from start; no
ExperienceState reset; preserve prior experience context/history; change
focus according to Patch; foreground relevant Evidence and uncertainty;
show missing evidence/next research or exploration direction; do not
invent an answer; do not upgrade E2 to E1.

This is the second most important acceptance point after the s01→s02
spatial transition.

## 13. Agent presence

Do not create a fixed chat window as the main UI.

MoHen's presence should be experienced through the opening question,
scene progression, map/composition changes, time changes, Evidence
Reveal, Discovery, uncertainty handling, follow-up, Patch, and proposed
next action.

A lightweight input/follow-up affordance is allowed.

Final architecture test: if the conventional chat window is removed,
does MoHen still exist? The answer must be YES.

## 14. Visual policy

Strictly inherit TASK-0012. Historical visual assets remain 0.

Allowed: confirmed current photos; current map; timeline; structured
relational diagram; approved documentary text/source snippets; evidence
UI; subtle semantic transitions.

Forbidden: AI-generated historical scenes; fake old photographs;
AI-completed waterways/buildings/historical streets; unsupported
historical map overlay; promoting 1879 p36 to a direct Jinze historical
map; presenting unresolved p36 labels as known facts.

Do not make `HISTORICAL_MAP_READY`, `PAST_PRESENT_COMPARISON_SUBSTRATE`,
or `SPATIOTEMPORAL_OVERLAY_SUBSTRATE` green in this task.

## 15. Technical direction

Prefer existing Next.js, React, TypeScript, and MapLibre where
appropriate. Do not add a large new UI/runtime framework without
demonstrated necessity.

Prefer reusable concepts such as `ExperienceRenderer`,
`SurfaceRenderer`, `CompositionRenderer`, `ExperienceController` (names
may follow repo conventions).

Keep data/state/composition semantics separate from presentational
components. Frontend components must not become the new knowledge store.

## 16. Implementation boundary

Implement only the minimum runtime necessary to render and navigate the
frozen Experience. Do not expand into production Agent Runtime.

Do not implement LLM dynamic planning, unrestricted natural-language
Q&A, persistent Memory, account system, multi-town runtime, general
route planner, video engine, TTS, GIS reconstruction, georeferencing,
PostGIS expansion, new historical research crawler, or new visual
acquisition pipeline.

The canonical follow-up is deterministic for this slice.

## 17. Required automated validation

At minimum test:

1.  all 8 scenes can render/navigate;
2.  canonical scene content comes from Experience Script/state
    artifacts;
3.  CompositionState affects renderer composition;
4.  `GEOGRAPHIC_EXACT` is limited to current-time scenes;
5.  `RELATIONAL_HISTORICAL` exposes no modern coordinates;
6.  no fabricated historical geometry exists;
7.  s05 exposes both required conflicts;
8.  s08 renders `INTERPRETATION_CANDIDATE` differently from
    `FACT_EVIDENCED`;
9.  canonical follow-up consumes Patch;
10. follow-up does not reset Experience;
11. prior state/history is preserved by Patch;
12. current photos obey approved whitelist;
13. historical visual assets remain 0;
14. no AI historical visual path is introduced;
15. route builds successfully;
16. Legacy zero-write;
17. DB zero-write;
18. frozen T11-C1...C5 semantics remain intact.

If Playwright is operational, add one minimum E2E:

`open experience → s01→s02 → assert modern exact coordinates disappear → s05 → open Evidence → assert both conflict states visible → s08 → assert interpretation visually distinguished from fact → canonical follow-up → assert previous history remains and Patch state is active`

If Playwright fails only because of an already documented environment
limitation, report exact failure and preserve non-E2E semantic/unit
coverage. Do not falsely mark it PASS.

## 18. Human visual acceptance

Automated tests are necessary but insufficient.

Produce enough evidence for human visual review of at least:

-   s01 current exact geography;
-   s02 first relational-historical state after coordinates disappear;
-   s05 Evidence Reveal;
-   s08 Fact → Interpretation → Unknown;
-   post-follow-up Patch state.

Preferred output: local runnable route; screenshots or a short
deterministic capture if existing tooling already supports it.

Do not introduce a video-production stack just to create the review
artifact.

The result must clearly identify how architect/user can inspect these
five states.

## 19. Required reports

Create/update task-local documentation consistent with repository
conventions.

At minimum produce TASK-0013 result report and TASK-0013 readiness
report.

Report exact values for rendered scene count, implemented surface types,
CompositionState fields consumed, scene/composition transitions,
Evidence states rendered, conflicts rendered, interpretation states
rendered, follow-up Patch preserved/changed behavior,
historical-coordinate leaks, fabricated historical geometry count,
historical visual asset count, current visual assets used, DB
migrations, DB writes, Legacy writes, published before/after if checked,
tests, E2E status, typecheck, build, commits, and tracked worktree
status.

Do not hide PARTIAL results behind an overall PASS.

## 20. Readiness gates

### `EXPERIENCE_RENDERER_READY`

YES only if the generic renderer consumes frozen
Experience/State/Composition artifacts and renders the complete
experience without scene-specific truth duplication.

### `FIRST_LIVING_VERTICAL_SLICE`

YES only if a user can run:

`today → time backward → spatial representation changes → bridge/water relations → temple enters → Evidence conflict → change through time → return today → Discovery → follow-up → Patch`

### `PATCH_NOT_REPLACE_UI`

YES only if the canonical follow-up visibly patches the existing
Experience without route reload/full reset/replay.

Do not change historical-data readiness gates merely because a Renderer
exists.

## 21. Hard invariants

1.  TASK-0012 / 0012A artifacts remain semantic source of truth.
2.  Legacy zero-write.
3.  Raw Store append-only.
4.  DB zero-write unless unavoidable; if a write/migration becomes
    necessary, STOP and report before doing it.
5.  no DB migration.
6.  published unchanged.
7.  orphan audit does not increase.
8.  historical geometry created = 0.
9.  historical visual assets used = 0.
10. no modern coordinate presented as historical coordinate.
11. no fake historical map.
12. no fake historical river/street geometry.
13. no AI historical visual generation.
14. T11-C1/C2 conflicts preserved.
15. T11-C3 retired assertion stays retired.
16. T11-C4 remains limited/attributed.
17. T11-C5 remains `none / not_applicable`.
18. TASK-0012A Primary Discovery remains `INTERPRETATION_CANDIDATE`.
19. no E2→E1 upgrade.
20. HR-MAP-01 remains PARTIAL_CONFIRM.
21. 1879 p36 is not promoted.
22. no production Agent Runtime.
23. no general free-form chat.
24. no GIS reconstruction.
25. no video/TTS engine.
26. no multi-town scope.
27. no new historical research campaign.
28. no secrets in source.
29. tests validate semantics rather than brittle absolute UI details.
30. tracked worktree clean after commit.

## 22. PASS condition

PASS does not mean visually finished.

PASS means the user can, for the first time, actually experience MoHen
operating in the historical world:

`Today → time moves backward → exact modern geography disappears → relational historical space appears → bridge/water relations become legible → temple enters without false association → Evidence conflicts become visible → change through time → return to today → MoHen proposes a Discovery as interpretation → user asks canonical follow-up → existing Experience is patched rather than restarted`

Central test:

> If the conventional chat window is removed, does MoHen still feel
> present because it is changing the world, surfacing evidence,
> proposing discoveries, and responding through state?

If YES and epistemic/spatial invariants remain intact, the first living
vertical slice is established.

## 23. STOP

After implementation, tests, E2E attempt/status, typecheck, build,
result report, readiness report, commit, and tracked worktree clean:

**STOP. Do not start TASK-0014.**
