# TASK-0012 --- Jinze 3-Minute Evidence-Grounded Experience Script

**Status:** READY\
**Stage:** Experience Phase --- first vertical experience specification\
**Depends on:** TASK-0011 PASS; `HISTORICAL_SPATIAL_SLICE_READY=YES`\
**Execution:** one sequential WorkBuddy task\
**STOP:** after result, tests/guards, commit, clean worktree. Do **not**
start TASK-0013.

------------------------------------------------------------------------

## 0. Stage transition

TASK-0001---0011 established a trustworthy minimum historical world.

TASK-0012 begins the next stage:

`Evidence → Discovery → Experience`

This task does **not** build the final UI, Agent Runtime, route system,
video engine, or historical GIS reconstruction.

It creates the first machine-readable, evidence-grounded **3-minute
MoHen Experience Script** and proves that MoHen can guide a user through
a historical question even when precise historical geometry is
unavailable.

------------------------------------------------------------------------

## 1. Experience question

Use this as the primary experience question:

> **为什么在不到一公里的金泽水乡空间里，两座宋桥、一处宋代寺院遗址会如此靠近？**

This is a **question / discovery prompt**, not a pre-proven conclusion.

The script must not conclude that bridge + temple + waterway formed a
historically integrated functional system unless Evidence supports that
exact assertion.

Known boundary: - bridge ↔ waterway relations: evidenced; - temple ↔
bridge historical association: not evidenced as historical fact; -
current spatial proximity does not prove historical functional
association.

------------------------------------------------------------------------

## 2. Experience thesis

The experience should lead the user from:

`today's precise map` → `historical time` →
`loss of geometric certainty` → `relational historical space` →
`evidence-backed discoveries` → `explicit unknowns` →
`return to today's landscape` →
`a next question / real-world observation`

The key experience principle is:

> **When evidence precision changes, spatial representation must change
> with it.**

Do not keep modern coordinates on screen as if they were historical
coordinates after the experience moves into a historical period.

------------------------------------------------------------------------

## 3. Mandatory epistemic spatial modes

Define and use these semantic modes in the script:

1.  `GEOGRAPHIC_EXACT`
    -   current grounded point/area;
    -   explicit CRS/source;
    -   may use modern map position.
2.  `GEOGRAPHIC_APPROXIMATE`
    -   approximate current area;
    -   never rendered as an exact historical point.
3.  `RELATIONAL_HISTORICAL`
    -   historical relation/topology is supported;
    -   exact historical geometry unavailable;
    -   represent relationships, not fabricated coordinates.
4.  `HISTORICAL_MAP_SOURCE`
    -   a historical map/source can be shown as evidence;
    -   only confirmed map identity/content may be stated;
    -   HR-MAP-01 unresolved labels remain unresolved.
5.  `RECONSTRUCTED_HISTORICAL`
    -   reserved for future evidence-grounded GIS reconstruction;
    -   **must not be used as an active scene mode in TASK-0012**
        because historical geometry is absent.
6.  `SPATIAL_UNKNOWN`
    -   no defensible spatial representation;
    -   do not draw a pseudo-location.

Each scene must state its `spatial_mode`.

------------------------------------------------------------------------

## 4. Human-review decisions frozen for this task

Apply these architecture decisions:

### T11-C1 --- 普济桥方位

`ACCEPT_CONFLICT`.

Active wording may say it crosses 金泽塘.\
Do not assert 北市 / 南市 / 中部 as resolved historical fact. Preserve
conflict in Evidence detail.

### T11-C2 --- 万安桥跨水道

`ACCEPT_CONFLICT + SUSPECTED_CROSS_TOWN_MISALIGNMENT`.

Primary public wording may use official Qingpu evidence for 金泽塘 /
市河 with provenance.\
SHL `秀州塘` must remain visible as conflicting data when evidence
detail is opened. Do not delete or silently normalize it.

### T11-C3 --- 1992 opening

`ACCEPT_RETIREMENT`.

Allowed: "1992 年在颐浩寺中心原址重建寺院" with source limitation.\
Not allowed as fact: "1992 年开放为宗教活动场所".

### T11-C4 --- 《松江府志》 quotation

`ACCEPT_LIMITED`.

If used, wording must explicitly say it is **quoted by later
official/local materials as from《松江府志》; original page has not yet
been obtained**.

### T11-C5 --- 金泽塘 temporal semantics

Principle accepted; current machine semantics need correction later.

For this task represent: - `temporal_assertion = none` -
`temporal_evidence_status = not_applicable`

Do not interpret `attested_time_evidence_backed=true` as proof of a
historical date for 金泽塘.

No broad schema migration for this in TASK-0012.

------------------------------------------------------------------------

## 5. Duration and scene budget

Target experience duration: **180 seconds ± 30 seconds**.

Use **6--8 scenes** only.

Every scene must include:

-   `scene_id`
-   `duration_sec`
-   `experience_goal`
-   `primary_focus`
-   `spatial_mode`
-   `time_state`
-   `map_state`
-   `visual_assets`
-   `narrative`
-   `evidence_refs`
-   `epistemic_status`
-   `uncertainty`
-   `transition_in`
-   `transition_out`
-   `allowed_user_actions`
-   `composition_intent`

The total duration must be mechanically validated.

------------------------------------------------------------------------

## 6. Required experience arc

The exact prose is not frozen, but the semantic arc is:

### Scene A --- Today / Hook

Start from current Jinze.

Show grounded current objects without historical inference.

Hook the user with the question of why these surviving places are so
close.

### Scene B --- Move back in time

Move the timeline toward the Song/Yuan historical context.

As time moves backward, **remove/de-emphasize exact modern
positioning**.

The experience must visibly transition from `GEOGRAPHIC_EXACT` to
`RELATIONAL_HISTORICAL`.

### Scene C --- Two bridges and water

Use evidenced bridge ↔ waterway relations.

Do not draw a historical river line.

Represent "both bridges are evidenced as crossing the named
waterway/context" as relation/topology.

### Scene D --- Temple enters

Introduce 颐浩寺 / site with its evidenced temporal/change chain.

Do not imply a proven temple↔bridge functional relation.

The unresolved association itself may become a question.

### Scene E --- Evidence / uncertainty reveal

Show at least one example where MoHen explicitly distinguishes: - what
is known; - what is conflicting; - what remains unknown.

At least one T11 conflict must be surfaced naturally, not as a database
dump.

### Scene F --- Change through time

Use evidenced changes such as destruction/rebuilding/survival.

Do not fabricate missing visual reconstruction.

### Scene G --- Return to today

Return to grounded current geography/current images.

Invite the user to observe surviving spatial traces without claiming
that present form equals historical form.

### Scene H --- Next question / action

End with one meaningful follow-up that can later drive Replan.

Examples of semantic direction: -
"要继续追这条水道在历史地图上的位置吗？" -
"要看看颐浩寺和普济桥之间是否真的存在历史联系吗？" -
"如果现在去金泽，哪些地方最值得现场观察？"

These are prompts, not implementation requirements for route/runtime.

------------------------------------------------------------------------

## 7. Experience State and Composition State

Create a minimum machine-readable specification for each scene.

### ExperienceState minimum

``` text
experience_id
scene_id
goal
time_state
spatial_state
focus_entities
active_relations
active_changes
active_evidence
active_visual_assets
uncertainties
user_question
next_possible_actions
```

### CompositionState minimum

``` text
primarySurface
secondarySurface
contextSurface
narrativeDensity
visualIntensity
transitionIntent
```

Allowed semantic surfaces: - `modern_map` - `relational_space` -
`timeline` - `evidence_panel` - `current_photo` - `historical_source` -
`text_focus`

Do not invent final React components.

One scene must have exactly one `primarySurface`.

------------------------------------------------------------------------

## 8. Visual policy

Use only existing evidence-backed assets.

Allowed: - current CC-licensed heritage photos already registered; -
historical map/source imagery as documentary evidence within its known
limits; - text excerpts; - timeline; - relational diagrams generated
from structured data.

Not allowed: - AI-generated historical scenes; - fake old-photo
treatment presented as evidence; - AI-completed river/street geometry; -
invented historical building reconstruction; - presenting 1879 p36 as a
direct Jinze map; - presenting unresolved p36 labels as readable facts.

Historical visual evidence remains `0` unless the underlying data
actually changes through a separately evidenced discovery. Do not make
the gate green for this task.

------------------------------------------------------------------------

## 9. Narrative policy

Narration must be generated from structured facts and evidence status.

Every factual sentence in the canonical script must map to one or more
Evidence IDs or to a clearly marked non-factual interaction instruction.

Create sentence-level traceability.

Allowed narrative levels:

-   `FACT_EVIDENCED`
-   `FACT_LIMITED`
-   `CONFLICT`
-   `QUESTION`
-   `INTERPRETATION_CANDIDATE`
-   `UNKNOWN`
-   `INTERACTION`

Hard rule:

`QUESTION` and `INTERPRETATION_CANDIDATE` must never be silently
rewritten into `FACT_EVIDENCED`.

------------------------------------------------------------------------

## 10. Discovery

Create exactly **one Primary Discovery** for the experience.

It must satisfy the existing Discovery Policy: - relevance; - human
meaning; - evidence strength; - transformation; - session novelty; -
visual/spatial potential.

The Primary Discovery must **not** be:
"桥、寺、水共同构成完整历史功能系统" unless directly evidenced.

A valid direction is that the surviving objects become more
understandable when viewed as **relationships around water rather than
isolated monuments**, while clearly marking where historical functional
association is still unproven.

Also create: - max 2 secondary discoveries; - evidence basis; -
unresolved counterpoint; - why it matters to the user.

------------------------------------------------------------------------

## 11. Follow-up + Replan simulation

This task does not build Agent Runtime, but must specify one simulated
follow-up branch.

Canonical follow-up:

> **"那颐浩寺和普济桥以前真的有关系吗？"**

Expected behavior: - do not restart the experience; - patch the existing
ExperienceState; - foreground E2 / missing historical evidence; - show
what is known vs not known; - propose the next research/exploration
direction; - do not invent an answer.

Output a machine-readable `experience_patch` showing: - preserved
state; - changed focus; - newly foregrounded evidence/uncertainty; -
next actions.

This is the first formal test of **Patch then Replace**.

------------------------------------------------------------------------

## 12. Future multi-renderer compatibility

Do not build video.

However, structure the script so the same experience can later
support: - Interactive Renderer; - Video Renderer; - Citywalk Renderer.

Add renderer-neutral fields: - `spoken_narration` - `on_screen_text` -
`camera_or_view_intent` - `hold_reason` - `transition_intent`

These are semantic instructions, not pixel/layout/video implementation.

Principle:

> `Experience First, Multi-Renderer Later.`

------------------------------------------------------------------------

## 13. Data use

Use PostgreSQL / existing deterministic exports as truth.

Required source inputs include: - current
`jinze-historical-spatial-slice` - current feature inventory - current
relation inventory - current change inventory - TASK-0011 evidence
closure matrix - SHL Knowledge Alignment results - current visual asset
registry - HR/SHR/HR-MAP decisions

Do not copy unsupported prose from Legacy into narration.

Do not use web research to expand the story.

TASK-0012 is an experience-composition task over the **already approved
world state**.

------------------------------------------------------------------------

## 14. Implementation boundary

Prefer a deterministic script builder + validator.

Allowed: - `packages/domain` experience types if minimal/reusable; -
`pipelines/experience/`; - validators; - exports; - tests; - one
reusable Skill only if genuinely justified; - `CONTEXT.md`; - task
result.

Do not build: - production Agent Runtime; - LLM orchestration
framework; - frontend renderer; - final map animation; - video engine; -
TTS; - route engine; - GIS reconstruction; - PostGIS expansion; - new
broad data model; - new research crawler.

Prefer **no DB migration**. This task may remain a deterministic build
artifact/specification.

------------------------------------------------------------------------

## 15. Required outputs

1.  `data/exports/jinze-3min-experience-script.json`
2.  `data/exports/jinze-3min-experience-script.md`
3.  `data/exports/jinze-3min-experience-evidence-trace.csv`
4.  `data/exports/jinze-3min-experience-state-sequence.json`
5.  `data/exports/jinze-3min-experience-followup-patch.json`
6.  `data/exports/jinze-3min-experience-readiness.md`
7.  `tasks/results/TASK-0012-result.md`

Optional only if genuinely useful: -
`data/exports/jinze-3min-experience-storyboard.svg`

The SVG must be generated from the same script data, not manually
maintained as a second truth source.

------------------------------------------------------------------------

## 16. Experience readiness gates

Evaluate separately:

### `EXPERIENCE_SCRIPT_READY`

YES only if: - 6--8 scenes; - 150--210 sec total; - every factual
narration unit traceable; - one Primary Discovery; - spatial-mode
transitions valid; - no historical geometry fabrication; -
uncertainty/conflict appears in the experience; - follow-up patch
valid; - current/historical semantics not conflated.

### `RELATIONAL_HISTORICAL_SPACE_EXPERIENCE_READY`

YES only if the experience successfully uses relational historical space
without pretending it is exact geography.

### `MULTI_RENDERER_SCRIPT_SUBSTRATE_READY`

YES/PARTIAL/NO based on whether the script is sufficiently
renderer-neutral for later interactive/video/citywalk rendering.

Do **not** modify: - `HISTORICAL_MAP_READY` -
`PAST_PRESENT_COMPARISON_SUBSTRATE` - `SPATIOTEMPORAL_OVERLAY_SUBSTRATE`

unless source data itself has legitimately changed, which is outside
this task.

------------------------------------------------------------------------

## 17. Hard invariants

1.  Legacy zero-write.
2.  Raw Store append-only.
3.  published remains 0.
4.  orphan audit does not increase.
5.  no modern coordinate presented as historical coordinate.
6.  no invented historical geometry.
7.  no AI historical image generation.
8.  no AI visual reconstruction.
9.  no OCR-only fact.
10. no unsupported temple↔bridge historical relation.
11. T11-C1/C2 conflict preserved.
12. T11-C3 retired wording stays retired.
13. T11-C4 remains limited/attributed.
14. T11-C5 uses `temporal_assertion=none` in this Experience.
15. HR-MAP-01 remains PARTIAL_CONFIRM.
16. 1879 p36 is not promoted to direct Jinze historical map.
17. no route implementation.
18. no production UI.
19. no Agent Runtime implementation.
20. no video/TTS implementation.
21. no new historical research campaign.
22. no new town/object scope.
23. deterministic output/idempotent rerun.
24. no secrets.
25. tests assert semantics, not stale absolute totals.
26. worktree clean after commit.

------------------------------------------------------------------------

## 18. Required tests

At minimum validate:

-   scene count;
-   total duration;
-   one primary surface per scene;
-   valid spatial modes;
-   no `RECONSTRUCTED_HISTORICAL` active scene;
-   every factual narration unit has evidence refs;
-   questions/candidates cannot have `FACT_EVIDENCED`;
-   no modern anchor used as historical position;
-   conflicts T11-C1/C2 remain present;
-   T11-C3 forbidden wording absent from factual narration;
-   T11-C4 attribution/limit present if quote used;
-   金泽塘 temporal assertion = none;
-   temple↔bridge historical relation not upgraded beyond current
    evidence class;
-   exactly one Primary Discovery;
-   follow-up is Patch, not full reset;
-   outputs deterministic;
-   Legacy zero-write;
-   published 0;
-   orphan ≤ current baseline.

------------------------------------------------------------------------

## 19. Result report exact accounting

Report:

-   scenes;
-   total seconds;
-   factual narration units;
-   evidence-traced units;
-   questions;
-   limited facts;
-   conflicts surfaced;
-   unknowns surfaced;
-   spatial-mode transitions;
-   exact/approximate/relational/unknown scene counts;
-   Primary/Secondary Discovery count;
-   follow-up patch preserved/changed fields;
-   visual assets used by type;
-   historical visual assets used;
-   historical geometry created (must be 0);
-   DB migrations (prefer 0);
-   DB writes;
-   published before/after;
-   orphan before/after;
-   Legacy hash/mtime before/after;
-   idempotent rerun hashes;
-   tests/guards/typecheck/build;
-   commits;
-   worktree status.

------------------------------------------------------------------------

## 20. PASS condition

TASK-0012 PASS does **not** mean "the experience is visually finished."

PASS means MoHen has, for the first time, a trustworthy executable
experience specification that:

-   begins in precise present geography;
-   enters historical time without faking historical coordinates;
-   can replace missing geometry with relational historical space;
-   tells a coherent 3-minute story from approved Evidence;
-   exposes uncertainty as part of the experience;
-   produces one meaningful Discovery;
-   supports a follow-up through state patching;
-   is structured for later interactive/video/citywalk renderers.

The central test is:

> **Can MoHen create a compelling historical experience without
> pretending to know more spatially than the evidence supports?**

After result + validation + commit + clean worktree:

**STOP. Do not start TASK-0013.**
