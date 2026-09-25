# MOHEN EXPERIENCE & UI BASELINE V1.0

**Document ID:** MOHEN-EXP-UI-BASELINE-001  
**Status:** CANONICAL IMPLEMENTATION BASELINE  
**Authority:** Human-facing Experience / UI / Surface / Renderer  
**Project:** MoHen Agent 2.0  
**Version:** V1.0  
**Date:** 2026-09-25  
**Owner:** Architect  
**Recommended canonical path:** `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`

---

## 0. Purpose / Why this document exists

This document is the **single current implementation authority for MoHen's human-facing experience**.

It exists because a technically correct Agent / Cultural World / Evidence / Runtime can still produce the wrong product if internal architecture, evidence states, debug metadata, cards, or explanatory text become the user's primary experience.

The failure mode to prevent is:

> **The system increasingly behaves like MoHen underneath, while the surface increasingly looks like a debugger, evidence browser, dashboard, card website, or chat product.**

This Baseline compiles prior design work into rules that can be **read, implemented, audited, and rejected** by Architect, WorkBuddy, or any future executor. It is not a mood board and not optional inspiration.

### 0.1 Highest product direction

> **墨痕帮助人从历史文化中发现与当下生活的连接。**

MoHen does not exist to make a digital replica of the historical world. It builds and activates a living cultural relationship model so that people can rediscover how the past remains connected to present places, life, aesthetics, travel, identity, and curiosity.

Time, geography, relations, comparison, maps, evidence, images, stories and routes are **methods and media**, not the final purpose.

### 0.2 Human-facing definition

> **墨痕 UI 不是让用户操作网站的界面，而是让用户进入、观看、追问和继续行动的人文探索空间。**

The user should not primarily experience pages, features, database records, Agent internals, or evidence taxonomies. The user should experience a world being reorganized around a meaningful question.

### 0.3 Core manifestation principle

> **不要让用户看见 Agent 在思考，而要让用户看见世界正在被重新组织。**

Agent intelligence becomes visible through meaningful changes to place, time, relationships, imagery, evidence, narrative, and next actions.

---

# 1. Authority Model

## 1.1 What this Baseline governs

Any task that changes or introduces any of the following is governed by this document:

- Human-facing Experience
- UI / UX
- Experience Canvas
- Surface / Renderer
- Map presentation
- Historical map presentation
- Timeline presentation
- Discovery presentation
- Narrative presentation
- Evidence presentation
- Visual assets / image comparison
- MoHen Presence / dialogue
- Route / real-world action presentation
- Transitions / animation that affect meaning
- Responsive human-facing composition

## 1.2 Authority hierarchy

When implementing human-facing experience, read authority in this order:

1. **L1 Architecture Roadmap** — product constitution and architecture principles.
2. **Current Phase Execution Plan** — current milestone, gates and allowed scope.
3. **This Baseline** — canonical human-facing implementation contract.
4. **Relevant stable contracts / ADR / specs** — Evidence, ExperienceState, CompositionState, Surface Eligibility, etc.
5. **Canonical Experience / Visual References** — Jinze Five-Beat and EXP-DESIGN-02 Round 2.
6. **Task Book** — narrow authorized work.
7. **Source Archive** — historical design rationale and traceability only.

A Task Book may narrow scope, but **may not silently weaken this Baseline**. If a Task conflicts with this Baseline, STOP and request Architect reconciliation.

## 1.3 Source archive is not current authority

Historical source files are preserved for traceability, but WorkBuddy must not choose among them as competing specifications. Stable rules have been compiled into this Baseline.

Canonical repository structure at V1.0:

```text
specs/
├─ MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md
└─ experience-ui/
   ├─ README.md
   ├─ source/
   │  ├─ 墨痕_Agent_2.0_Agent_Experience_UI_交互设计_V1.0.md
   │  ├─ 墨痕_Agent_2.0_UI_设计规格_V1.0.docx
   │  ├─ 墨痕_Agent_2.0_WorkBuddy_UI改造任务包_V1.0.docx
   │  └─ 墨痕_Agent_2.0_可视化原型_V1.0.pptx
   ├─ canonical/
   │  ├─ 金泽历史关系探索体验板.png
   │  └─ EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png
   └─ evidence/
      └─ M5-HUMAN-01_PreBaseline_Failure/
         ├─ current-runtime-recording.mp4
         └─ README.md
```

No executor may rename/restructure this directory without an Architect-authorized governance task.

---

# 2. Non-negotiable Product Experience Doctrine

## 2.1 Agent-native Experience, not Agent-native UI generation

MoHen is not a fixed website with an Agent attached, and it is not an LLM that generates arbitrary UI.

Canonical chain:

```text
Question / Goal
  → Agent Judgment
  → Cultural World + Evidence + Spatial/Temporal Reasoning
  → ExperienceState / WorldEvidenceState
  → ExperienceAction
  → CompositionState
  → Controlled Surface / Renderer
  → Human Experience
  → Observe / Follow-up / Replan
```

**Dynamic = experience composition.**  
**Not dynamic = arbitrary component generation.**

The Agent chooses semantic goals/state changes. Composition chooses primary/secondary/context. Registered renderers/surfaces display them.

## 2.2 Persistent Experience Space

The default mental model is a persistent experience space, not a sequence of unrelated pages.

Long-lived containers may include:

- Experience Canvas
- current place / focus
- temporal context
- MoHen Presence
- Experience Trail / current exploration state
- user input / follow-up entry
- Evidence Drawer on demand

Dynamic content may include:

- map viewport and layers
- historical map
- markers / spatial anchors
- relation lines
- timeline focus
- images / historical material
- discoveries
- evidence
- story beats
- routes
- next actions

> **Do not make every experience type a new page.**

## 2.3 Patch before Replace

Follow-up and Replan should preserve:

- Spatial Continuity — “I am still here.”
- Temporal Continuity — “I am still on this historical line.”
- Narrative Continuity — “What I just discovered still matters.”

Default: **Patch the existing experience.**  
Replace only when the user's goal genuinely changes.

## 2.4 Space before text

Where a spatial, temporal, relational, visual or documentary change can carry meaning, **show it before explaining it**.

Text supports the experience. Text must not routinely substitute for an experience that should have been visual/spatial/temporal.

## 2.5 Evidence on demand

Evidence is a trust layer inside the experience, not a separate database website and not the default first screen.

The user must be able to answer:

> “这条判断来自哪里？”

without being forced to understand the project's internal evidence schema.

---

# 3. Canonical Experience Grammar

The following five principles are mandatory unless an Architect-authorized exception is recorded.

## G1 — One Moment, One Focus

At any moment, one visual/cognitive subject is primary. Other material is secondary, contextual, hidden, or on demand.

A screen with five equally loud cards, panels, badges and technical states is a failure even if every item is correct.

## G2 — Show → Question → Reveal

Default rhythm:

```text
Show something worth noticing
→ create / surface a question
→ reveal a relation, change, evidence, or new perspective
→ let the next question arise
```

Do not default to:

```text
Explain system state
→ explain history
→ list evidence
→ ask user to continue
```

## G3 — Space Before Text

Use map, spatial relation, temporal transition, image, historical material, or visual comparison as the first carrier of meaning when appropriate.

## G4 — Evidence on Demand

Critical claims must be traceable. Evidence should become visible when the user needs to verify, compare, or understand uncertainty—not as constant epistemic chrome.

## G5 — Agent Changes the World

Agent intelligence must be perceived through world transformation:

- place understood → canvas focuses
- time understood → temporal state changes
- relation discovered → spatial/relational structure appears
- evidence found → source becomes available
- uncertainty found → comparison / limitation appears honestly
- follow-up understood → existing world patches
- action becomes meaningful → route / observation emerges

If the Agent performs complex reasoning but the experience only adds prose, the human-facing implementation is incomplete.

---

# 4. Canonical Jinze Five-Beat Experience Contract

**Canonical Experience Grammar Reference:** `specs/experience-ui/canonical/金泽历史关系探索体验板.png`

This reference is not a pixel-perfect template. It freezes the **cognitive rhythm, visual hierarchy, question progression and experience transformation**.

## Beat 01 — 进入现场 / Hook · 今天的金泽

**Human intent:** establish present-day reality and curiosity.

**Primary:** today's Jinze spatial/visual scene.

**Required experience:** three relevant present-day objects/places can be perceived in relation; one strong question emerges naturally.

**Canonical question pattern:** “为什么会这么近？”

**MoHen role:** point out one concrete thing; do not lecture.

**Evidence role:** minimal / hidden unless requested.

**Forbidden degradation:**

- coordinate system / CRS / scene IDs as primary content
- architecture/debug status before the place itself
- long historical explanation before curiosity exists
- generic dashboard/cards replacing the place

## Beat 02 — 时空转换 / Time · Space Shift

**Human intent:** feel that the same place is entering another time context.

**Primary:** visible time/space transformation.

**Required experience:** present-day coordinate authority visually recedes when historical geometry is not supported; the user understands that historical space is not simply today's coordinates with an old date.

**MoHen role:** short transition guidance.

**Forbidden degradation:**

- timeline as a database filter
- full-screen technical explanation of geometry uncertainty
- changing only a label/year while the world remains visually unchanged

## Beat 03 — 关系发现 / Relationship Discovery

**Human intent:** discover a meaningful cultural/spatial relationship.

**Primary:** bridge / water / temple relationship as a legible composition.

**Required experience:** relationship is visible before it is exhaustively explained. Evidence strength may be accessible, but internal taxonomy is not the visual hero.

**MoHen role:** direct attention to the relation and invite the next step.

**Forbidden degradation:**

- relation presented only as prose
- all objects represented as equal cards
- inferred historical geometry shown as verified GIS
- relation graph jargon replacing human meaning

## Beat 04 — 证据与变化 / Evidence & Change

**Human intent:** understand that historical materials may conflict and that history is reconstructed through evidence.

**Primary:** meaningful comparison of evidence / change.

**Required experience:** conflicting evidence can be compared; unresolved conflict remains unresolved; user can inspect original material on demand.

**MoHen role:** explain the nature of the disagreement in ordinary language.

**Forbidden degradation:**

- evidence database browser
- raw epistemic enums as main labels
- pretending uncertainty is resolved
- hiding disagreement to simplify the story
- overwhelming the screen with every available source

## Beat 05 — 回到今天 · 再出发 / Return & Next Question

**Human intent:** the present place gains new meaning; curiosity continues.

**Primary:** today's real place / image / observation.

**Required experience:** return to the present is perceptible, not merely textual; the previous historical relation changes how the current scene is seen; a next question/action arises naturally.

**MoHen role:** reconnect past and present, then propose one meaningful next direction.

**Forbidden degradation:**

- ending with a summary card
- ending with “more details” navigation
- generic recommendation list
- returning to present without changed perception

---

# 5. Canonical Visual Composition Contract

**Canonical Visual Composition Reference:** `specs/experience-ui/canonical/EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png`

The implementation does **not** need to reproduce exact pixels, typography, or component dimensions. It **must preserve the following composition logic**.

## 5.1 Visual priority order

Default priority:

```text
1. Experience Canvas / place / historical material / meaningful visual change
2. Humanistic object or relation currently being explored
3. MoHen's short guidance / question
4. Temporal / relational context
5. Evidence entry and uncertainty cue
6. Technical metadata (normally hidden from default user layer)
```

Technical metadata must never outrank the place, image, relationship, or question.

## 5.2 One primary surface

CompositionState must maintain one primary focus. Secondary surfaces support it. Context surfaces remain quiet. Ineligible surfaces are not rendered merely because data exists.

## 5.3 Low default text density

Default visual rhythm:

> **Strong visual → MoHen points to one detail → map/time correspondence → evidence → text expands last.**

Long text may exist in deep reading modes, but it is not the default rhythm of the canonical experience.

## 5.4 Real / historical / reconstructed material must look different

The UI must visually distinguish:

- historical original material
- historical photograph / image
- present-day observation
- annotation / interpretation
- reconstruction / hypothetical visualization

Reconstruction must never be visually equivalent to primary historical evidence.

## 5.5 Prototype explanation layer vs product layer

Design/prototype artifacts may contain architect notes, labels, legends and explanation outside the user-facing canvas.

Final product rule:

> **样板阶段允许“双层表达”，正式产品必须“单层体验”。**

Do not copy architect explanation panels into the user product.

---

# 6. Persistent Experience Space Contract

## 6.1 Desktop first acceptance frame

1440×900 remains a useful first visual acceptance frame, not a fixed runtime viewport.

Indicative composition from prior design:

- Experience Canvas: dominant, approximately 64–70% when a split layout is appropriate
- MoHen Presence: secondary, approximately 30–36%, collapsible / adaptive
- Top navigation: light; must not create traditional portal-site dominance
- Experience Trail: on demand
- Evidence Drawer: drawer / overlay / contextual reveal, not permanent competing column

Percentages are **composition guidance**, not hard pixel requirements.

## 6.2 Responsive behavior

- Desktop: canvas remains dominant.
- Tablet: Presence may become a pull-up / collapsible panel.
- Mobile: canvas-first + bottom sheet; do not mechanically compress desktop dual columns.
- At any moment, mobile keeps one primary visual focus.

## 6.3 No fixed website navigation dependency

The user should not need to understand “Map / Town / Story / Node / Agent” as a site taxonomy before exploration can begin.

Pages/routes may exist technically, but exploration logic belongs to Agent + ExperienceState.

---

# 7. MoHen Presence Contract

MoHen is **Presence, not Avatar** and **Agent, not chatbox**.

## 7.1 Three presence states

### Ambient

- light presence
- minimal interruption
- observes / keeps context
- no constant speech bubbles

### Guide

- appears when a worthwhile relation/change/evidence cue is found
- points to one concrete detail
- uses short, directional language

### Dialogue

- expands when the user asks, corrects, clarifies, compares or needs deeper explanation
- may explain evidence and judgment
- must not collapse the whole experience back into a chat transcript

## 7.2 Language character

MoHen should feel:

- curious
- restrained
- reliable
- specific
- humanistic
- willing to say “we do not yet know”

Avoid:

- generic praise
- verbose lectures by default
- anthropomorphic animation that competes with the content
- fake certainty
- technical system vocabulary in ordinary guidance

## 7.3 Agent proposal, not menu

Next actions should arise from:

```text
Goal + ExperienceState + explored content + unresolved question + discovery + available capability
```

They should feel like meaningful continuation, not a fixed navigation menu.

---

# 8. Map & Historical Space Contract

## 8.1 Map = Experience Canvas

The map may express:

- place
- historical place
- people/events anchored to space
- relations
- change
- uncertainty
- routes
- discovery

The map is not merely a navigation utility.

## 8.2 Historical geometry is not automatically known

Hard rule:

> **Historical Space ≠ Historical Geometry. Geometry itself is a Claim.**

Never use current coordinates as historical coordinates merely for visual completeness.

## 8.3 Five historical-map modes

The renderer must support the conceptual distinction between:

1. **Global Registration** — whole historical map can be reasonably registered.
2. **Local Registration** — only a bounded local area can be reliably aligned.
3. **Anchor Points** — original map and current map connected through evidence-backed anchors.
4. **Spatial Reconstruction** — historical water/street/bridge/building structure reconstructed from evidence; explicitly labelled reconstruction.
5. **Original-map Narrative** — original map remains unforced when it is symbolic/non-survey; narrative/anchors explain it.

Do not force every historical map into global GIS registration.

## 8.4 Uncertainty is a capability

Uncertainty should alter presentation honestly without turning the screen into a technical report.

Examples:

- fade / remove unsupported coordinate authority
- show approximate / bounded region
- use anchor correspondence rather than false linework
- show “未能精确定位” in ordinary language
- make original evidence inspectable

---

# 9. Timeline Contract

Timeline = **Narrative Lens**, not merely a slider/filter.

It may carry:

- period switching
- change events
- evidence validity / known temporal bounds
- historical transitions

Rules:

- Agent may choose when a time shift matters.
- Crossing a meaningful change should patch relevant layers, not reset the whole experience.
- A time change must create a perceptible change in the world when the experience depends on it.
- Do not put undated claims on the timeline as dated facts.
- Compatibility data sources may remain if they do not corrupt the human experience; technical purity alone does not justify migration.

---

# 10. Visual Asset & Image Contract

## 10.1 Visual roles

### V1 Historical Original
Maps, gazetteer illustrations, archives, paintings, documents. Show material qualities when useful: paper, seals, inscriptions, marginalia, crop/detail.

### V2 Historical Image
Old photographs, postcards, historical photography. Separate capture date from depicted period where necessary.

### V3 Present-day Scene
Contemporary observation. Prefer comparable viewpoints when meaningful.

### V4 Interpretive Annotation
Outlines, hotspots, bridge/river/street/building cues. Must distinguish identification, manual annotation and inference.

### V5 Reconstruction
Human/data-driven reconstruction or other interpretive visualization. Must be explicitly marked as reconstruction and must not masquerade as historical evidence.

## 10.2 No fabricated evidence

Missing visual asset does not justify fabricating historical evidence.

> **Missing Asset ≠ Experience Failure. Fabricated Asset = Failure.**

For internal prototype only, clearly marked prototype placeholders are allowed when authorized.

## 10.3 AI historical image rule

Do not use AI-generated historical imagery as product evidence. If future reconstruction visualization is used, it must be clearly separated from historical sources and governed by reconstruction/evidence rules.

---

# 11. Discovery Contract

Discovery is not a search-result list and not a cultural-value ranking.

A good Discovery should answer:

- Why is this worth continuing?
- What object/place/time/person/material is the visual hook?
- What relation/change becomes visible?
- What is the next meaningful action?
- What evidence is available if the user asks?

Prefer discovery to appear **in map/time/image/relationship space**. Cards may explain; cards must not become the only expression of intelligence.

Avoid showing internal Discovery Policy scores to users.

---

# 12. Narrative Contract

Story is not a detached article page.

Narrative should be capable of patching the experience through beats such as:

- hook
- fact
- change
- person
- document
- interpretation
- modern trace
- question

When a narrative beat changes, at least one meaningful visual/spatial/temporal/evidence state should normally change with it when relevant.

Do not dump a long article and call it an experience.

---

# 13. Evidence Humanization Contract

Evidence architecture remains strict internally. Human presentation must translate it.

## 13.1 Internal terms that are normally not default user UI

Examples:

- Evidence Gate
- E1 / E2 / E3 / E4
- epistemic_status enums
- SUPPORTED_CANDIDATE
- RESEARCH_LEAD
- EvidenceFragmentGate
- SurfaceType
- spatialAuthority enum
- Beat IDs / scene IDs
- renderer names
- projection object names
- GCJ-02 / WGS-84 unless the user specifically needs coordinate information

These may appear in developer/debug/inspector contexts, not as the primary ordinary experience.

## 13.2 Human language translation

Prefer ordinary expressions such as:

- “这条记载有直接史料支持。”
- “两份资料在这里并不一致。”
- “目前只能确认大致位置，不能精确落点。”
- “这是根据现有资料做的空间重建，不是原始地图。”
- “这条联系值得继续查，但目前还不能当作事实。”

## 13.3 Evidence Drawer

A critical claim should be able to open its source/provenance/context. The Drawer may expose more detail progressively, but default presentation should not resemble a database administration panel.

## 13.4 Conflict

Conflicts remain visible and unresolved when evidence is unresolved. Do not hide conflict for narrative smoothness.

---

# 14. Route & Present-day Action Contract

Route is not a detached tourism feature.

Canonical transformation:

```text
Discovery / Story
→ reliable present-day spatial anchors
→ observation sequence
→ route / action
```

Rules:

- uncertain historical locations must not become precise navigation points
- route nodes should be connected to what the user has already understood
- observation tasks should help the user re-see the present
- action may include walking, looking, comparing, reading, revisiting, asking, or exploring—not only navigation

---

# 15. Present-day Connection / Everyday Life Contract

The experience is not complete merely because historical knowledge is delivered.

M5 and later Human Experience Gates must test:

## P1 — 重新看见

After the experience, does the user see a current place, bridge, river, road, building, object, food, habit, landscape or everyday scene differently?

## P2 — 与我有关

Does the user feel why this past matters to today's self/life/place—not merely remember a fact?

## P3 — 继续行动

Does the experience naturally create desire to observe, walk, compare, ask, travel, read, revisit or continue exploring?

Core question:

> **这段过去有没有让用户重新看见今天？**

A technically correct experience that fails this question has not passed the core Human Experience Gate.

---

# 16. Anti-Pattern / Failure Library

The following are explicit rejection patterns.

## AP-01 Debugger UI

Internal runtime states, enums, IDs, coordinate systems, architecture terminology or test concepts dominate the human-facing screen.

**Reject even if technically accurate.**

## AP-02 Architecture-on-screen

The UI explains how MoHen works instead of letting the user experience what MoHen discovered.

## AP-03 Evidence Database Browser

Evidence fragments, statuses, provenance fields and source records become the main experience rather than an on-demand trust layer.

## AP-04 Card-stack Website

DiscoveryCard + StoryCard + EvidenceCard + PersonCard + RouteCard + NextStepCard are stacked as the primary UI.

Cards may support. They must not replace map/time/image/relationship as outputs.

## AP-05 Text-first History

Long explanatory copy appears before visual curiosity, spatial relation or temporal transformation.

## AP-06 Chat-first Agent

MoHen mainly exists as a chat window. Removing the input box makes the Agent disappear.

## AP-07 Technical Metadata Dominance

CRS, confidence codes, evidence classes, scene IDs, state labels or implementation vocabulary outrank humanistic content.

## AP-08 Five Beats as Five Panels

All five canonical beats technically exist, but feel like unrelated screens/cards rather than one unfolding exploration.

## AP-09 Fake Historical Precision

Current coordinates, forced registration, invented routes or unsupported historical geometry are shown as historical fact.

## AP-10 Visual Evidence Mixing

Original material, current photography, annotation and reconstruction are visually indistinguishable.

## AP-11 Full Reset on Follow-up

A follow-up destroys the current place/time/story context instead of patching it.

## AP-12 Menu-driven “Agent”

Next steps are fixed feature navigation disguised as Agent proposals.

## AP-13 Pretty but Empty

The interface looks polished but the visual change does not correspond to a real evidence-backed relation, change or meaningful question.

## AP-14 Correct but Uninteresting

The screen is factually/technically correct, but the user has no reason to look, ask, or continue. This is a Human Experience failure signal, not an acceptable “MVP UI”.

---

# 17. Pre-Baseline Failure Evidence — M5-HUMAN-01

The pre-Baseline Jinze runtime observed during M5 Human Round A is retained as a **negative canonical evidence sample**.

Observed failure signal:

- Runtime / Evidence / Five-Beat integration technically existed.
- Human-facing visual hierarchy foregrounded system/evidence/technical state.
- The present-day place and cultural question lost primary visual authority.
- The experience felt closer to a system-state / evidence-structure display than an immersive humanistic exploration.
- User interest dropped immediately before the planned structured Human Test.

Governance meaning:

> **Engineering PASS does not imply Human Experience PASS.**

The failure sample must remain available so future implementations can be compared against it and avoid repeating the same regression.

---

# 18. WorkBuddy / Executor Implementation Protocol

These rules apply to any executor performing UI/Experience work.

## 18.1 Mandatory Context Gate

Before modifying human-facing experience, executor must report:

1. Current Task Book and allowed scope.
2. Confirmation that this Baseline was read.
3. Relevant canonical reference(s) read.
4. Existing related routes/components/state/renderers/surfaces found.
5. Reuse candidates and suspected duplicates.
6. Exact files proposed to change.
7. Which Baseline clauses the change must preserve.

**If the executor cannot prove it read this Baseline, construction must not start.**

## 18.2 Search/reuse first

Before creating a file/component:

- search existing implementation with same responsibility
- reuse or extend when compatible
- do not create `v2`, `new`, `final`, `fix2` parallel implementations to avoid understanding existing code

## 18.3 One narrow UX task at a time

A UI task must not silently expand into architecture redesign, schema redesign, GIS expansion, new data cluster, or unrelated refactor.

## 18.4 Agent cannot directly manipulate arbitrary UI

LLM/Agent outputs semantic actions/state patches. Renderer executes controlled UI behavior.

No direct arbitrary DOM/React generation as runtime product behavior.

## 18.5 Data honesty

Real, example, placeholder, reconstructed and uncertain material must be distinguishable. No evidence → no historical fact presentation.

## 18.6 No executor design authority

WorkBuddy may implement and report gaps. It may not redefine:

- canonical experience grammar
- visual hierarchy
- evidence policy
- Agent presence model
- canonical five-beat structure
- UI Baseline

If implementation requires changing one of these, STOP and request Architect reconciliation.

---

# 19. Task Book Requirements for Any UI / Experience Work

Every future UI/Experience Task Book must contain a section named:

## `Experience/UI Authority & Required Reads`

Minimum:

```text
MUST READ
1. specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md

WHEN RELEVANT
2. specs/experience-ui/canonical/金泽历史关系探索体验板.png
3. specs/experience-ui/canonical/EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png

TRACE / RATIONALE ONLY
4. specs/experience-ui/source/...
```

The Task must also state:

- target human moment / Beat
- primary visual focus
- intended question / discovery
- state/action involved
- surfaces/renderers involved
- evidence behavior
- expected visual transformation
- what must remain quiet/hidden
- anti-patterns specifically at risk
- screenshot/recording acceptance evidence
- Human Experience impact if applicable

---

# 20. Visual Acceptance Gate

Automated tests, typecheck and runtime correctness are necessary but **insufficient** for human-facing UI acceptance.

Every material UI/Experience construction task must pass all applicable gates:

## VAG-1 Contract Gate

No violation of this Baseline, Evidence/Geometry/Meaning firewall, ExperienceState/Action contract, or Surface Eligibility.

## VAG-2 Canonical Drift Gate

Compare implementation against the relevant canonical reference. Differences are allowed; **experience degradation is not**.

Must explicitly answer:

- Is the same human question still created?
- Is the same primary focus still obvious?
- Is the reveal sequence preserved?
- Is the visual hierarchy preserved or improved?
- Did technical/internal information become more prominent?
- Did the experience become more card-like, page-like or chat-like?

## VAG-3 Screenshot / Recording Gate

Provide real runtime screenshots and, for multi-step experience, a recording. Static component screenshots alone are insufficient when the task concerns transitions or continuity.

## VAG-4 Architect Visual Review

WorkBuddy cannot self-certify visual PASS for a material canonical experience change. Architect reviews the actual visual evidence.

## VAG-5 Human Gate when required

For milestone-level experience acceptance, a real Human Tester must experience the product without being primed with internal architecture terms.

---

# 21. Human Experience Validation Protocol

## 21.1 Blind first

Before structured questions, Human Tester should experience the product naturally without being told:

- Five-Beat implementation details
- internal Evidence taxonomy
- expected P1/P2/P3 answers
- known implementation gaps
- what the team hopes they will notice

## 21.2 Human response outranks implementation intent

If implementation intends “relationship discovery” but the tester experiences “a dashboard of evidence”, the Human Experience evidence is the latter.

## 21.3 Do not score away a failure

No aggregate usability score may convert a clear core-experience failure into PASS.

## 21.4 Core Human questions

At minimum determine:

- What did the user feel they just experienced?
- What was the main thing they noticed?
- Did MoHen feel like it was guiding exploration, or like a website/chat/database?
- Did time/space/relation visibly change?
- Was evidence trustworthy without breaking immersion?
- Did uncertainty feel honest and understandable?
- Did the past change how the user saw the present?
- What did they naturally want to do next?

---

# 22. Engineering / Visual / Human Acceptance Separation

Never collapse these into one PASS.

```text
Runtime Acceptance
  = system chain works

Visual Experience Acceptance
  = implementation preserves canonical human-facing grammar/composition

Human Experience Acceptance
  = a person actually perceives meaning, continuity, curiosity and present-day connection
```

Possible legitimate state:

```text
Runtime PASS
Visual FAIL
Human FAIL
```

This is not contradictory. It is exactly why this Baseline exists.

---

# 23. Stable ExperienceAction Mapping

The current frozen ExperienceAction set is owned by its architecture/spec authority. UI work must consume, not casually expand it.

Canonical V0.1 actions include:

- `FOCUS_PLACE`
- `SET_TIME`
- `SHOW_HISTORICAL_LAYER`
- `SELECT_DISCOVERY`
- `OPEN_EVIDENCE`
- `SET_VISUAL_MODE`
- `SET_COMPOSITION`
- `PATCH_NARRATIVE`
- `PROPOSE_ROUTE`
- `REPLAN`

Rules:

- Do not invent a new action because a component wants one.
- `RETURN_TO_PRESENT` is an experience composition/state outcome, not an ad-hoc new action.
- UI may degrade gracefully when data/assets are missing; it may not fabricate them.

---

# 24. Surface / Renderer Rules

## 24.1 Surface is controlled expression, not data dump

A Surface exists to express a human experience purpose. The presence of data does not require a visible Surface.

## 24.2 Eligibility before rendering

If a Surface is not eligible under evidence/geometry/uncertainty rules, it must not be forced into the composition.

## 24.3 Primary / Secondary / Context / Hidden

Every material composition should be explainable through these roles. Avoid equal-weight dashboards.

## 24.4 UnknownGap is acceptable

If historical photo, before/after, geometry or another desired surface lacks sufficient evidence/assets, honest absence or degradation is preferable to fabrication.

---

# 25. Design Asset Governance

## 25.1 Source assets to preserve

The following prior assets should be archived under `specs/experience-ui/source/`:

- `墨痕_Agent_2.0_Agent_Experience_UI_交互设计_V1.0.md`
- `墨痕_Agent_2.0_UI_设计规格_V1.0.docx`
- `墨痕_Agent_2.0_WorkBuddy_UI改造任务包_V1.0.docx`
- `墨痕_Agent_2.0_可视化原型_V1.0.pptx`

They preserve rationale and historical design intent. They do not supersede this Baseline.

## 25.2 Canonical references to preserve

- `specs/experience-ui/canonical/金泽历史关系探索体验板.png`
- `specs/experience-ui/canonical/EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png`

These are canonical references for experience grammar and visual composition respectively.

## 25.3 Figma

Figma is a design workbench and source of canonical visual inspection when needed. Do not treat generated Figma code as architecture authority.

Default implementation flow:

```text
Canonical Figma frame / exported reference
→ inspect composition / layer intent / dimensions when needed
→ map to existing controlled surfaces/components
→ implement through ExperienceState / CompositionState
→ runtime screenshot/recording comparison
```

Do not import static generated React/CSS merely because Figma can export it.

---

# 26. Historical Rules That Remain Valid vs Phase-specific Rules

Prior WorkBuddy transformation packages contain both stable rules and old phase sequencing.

### Stable and retained

- inventory before coding
- search/reuse before new files
- one UX task at a time
- structured Agent actions/state patches
- no LLM direct DOM manipulation
- data/evidence honesty
- screenshots/recordings required
- no automatic next task before acceptance
- Patch continuity
- historical-map uncertainty honesty
- visual asset type distinction

### Historical / not automatically authoritative now

Examples such as:

- “first phase does not rebuild database”
- a specific old task order UX-00 → UX-17
- ZhuJiaJiao as the active vertical slice
- old action names superseded by later frozen contracts

These remain historical context only unless re-authorized by a current Task Book/Phase Plan.

---

# 27. Canonical Drift Audit Template

Before reconstructing a drifted experience, produce this matrix:

| Dimension | Canonical intent | Current runtime | Drift | Severity | Fix now? |
|---|---|---|---|---|---|
| Primary focus |  |  |  |  |  |
| First 5 seconds |  |  |  |  |  |
| Show→Question→Reveal |  |  |  |  |  |
| Spatial continuity |  |  |  |  |  |
| Temporal transformation |  |  |  |  |  |
| Relationship visibility |  |  |  |  |  |
| Evidence reveal |  |  |  |  |  |
| MoHen Presence |  |  |  |  |  |
| Text density |  |  |  |  |  |
| Technical metadata leakage |  |  |  |  |  |
| Return to present |  |  |  |  |  |
| Present-day connection |  |  |  |  |  |

Severity categories:

- **BLOCKING EXPERIENCE DRIFT** — canonical experience cannot be validly Human-tested.
- **MATERIAL DRIFT** — experience works but important grammar/composition is degraded.
- **MINOR DRIFT** — polish/readability issue without changing core cognition.
- **NO DRIFT**.

Do not jump directly from drift observation to coding. Architect decides the minimal reconstruction task.

---

# 28. Definition of Done for Human-facing UI Work

“Looks like the prototype” is not enough. “Tests pass” is not enough.

A material experience task is done only when applicable conditions are satisfied:

1. State is reproducible and contract-valid.
2. Agent actions are controlled and verifiable.
3. Evidence remains traceable.
4. Historical space/geometry is not falsified.
5. Visual asset categories are not mixed.
6. Follow-up preserves context unless true goal replacement occurs.
7. One primary focus remains clear.
8. Internal architecture does not leak into default user experience.
9. Canonical grammar is preserved or explicitly improved.
10. Runtime screenshot/recording evidence exists.
11. Architect Visual Review is complete.
12. Human Experience Gate is run when milestone scope requires it.

---

# 29. Executor Response Contract for UI Tasks

At task completion, Result must include at least:

1. Task ID / status.
2. Baseline version read.
3. Canonical reference(s) used.
4. Changed files.
5. ExperienceState / Action / Composition impact.
6. Before/after runtime screenshots or recording paths.
7. Canonical Drift assessment.
8. Anti-pattern check AP-01…AP-14.
9. Evidence/Geometry/Meaning firewall status.
10. Automated test/typecheck status.
11. Visual Gate recommendation.
12. Human Gate status: NOT RUN / READY / evidence collected.
13. Architecture Reconciliation: NONE or explicit issue.
14. Plan Reconciliation: NONE or explicit issue.
15. STOP.

Executor must not write “Human PASS” unless the governing Human validation process explicitly grants that authority. Default: final Human Gate belongs to Architect review using actual Human Tester evidence.

---

# 30. Baseline Change Governance

This file is intended to remain stable across many Tasks.

Change only when one of these occurs:

- real Human Experience evidence invalidates a rule
- a new canonical experience requires a generalized rule
- architecture changes make an existing rule obsolete
- repeated implementation ambiguity proves the Baseline is underspecified

Do **not** change it merely to make a current implementation pass.

Any change must state:

- reason
- evidence
- affected clauses
- compatibility impact
- whether canonical references change
- whether L1/L2 reconciliation is required

Use versioning deliberately. Do not create `final`, `new`, `fix2`, etc.

---

# 31. Fast Preflight — Must answer before UI construction

Before starting any human-facing UI task, executor must be able to answer **YES** to all applicable questions:

- Do I know the user's human question in this moment?
- Do I know the one primary visual focus?
- Do I know what changes in the world when the Agent acts?
- Do I know what remains persistent?
- Do I know whether this is Patch or Replace?
- Do I know what evidence is available and when it should appear?
- Do I know what uncertainty must remain visible?
- Do I know which canonical reference applies?
- Have I checked for Debugger UI / Card-stack / Text-first / Chat-first regression?
- Can I explain the experience without using internal architecture vocabulary?
- Can I show runtime visual evidence for acceptance?

If not, **STOP BEFORE CODING**.

---

# 32. Final Standard

A successful MoHen experience should allow a user to feel something like:

```text
I started from a real place / question.
→ something in the place became worth noticing.
→ time or space shifted for a reason.
→ I discovered a relationship I had not seen before.
→ I could inspect why MoHen believes it.
→ uncertainty remained honest.
→ I asked another question and the same world continued to unfold.
→ when I returned to today, the place meant something different.
→ I wanted to look, walk, compare, read, ask, or continue.
```

The user should **not** need to understand:

```text
Planner / MCP / Tool Registry / ExperienceState internals /
Evidence Gate enums / Surface eligibility / Renderer names /
projection tables / coordinate-system implementation details
```

The final test remains:

> **如果去掉聊天框、调试器和架构解释，墨痕还存在吗？**

And the deeper Human Experience test is:

> **这段过去有没有让用户重新看见今天？**

If both answers are yes, the UI is serving MoHen rather than exposing its machinery.

---

## Appendix A — Source Lineage

This Baseline consolidates and reconciles stable human-facing principles from:

1. `墨痕_Agent_2.0_Agent_Experience_UI_交互设计_V1.0.md`
2. `墨痕_Agent_2.0_UI_设计规格_V1.0.docx`
3. `墨痕_Agent_2.0_WorkBuddy_UI改造任务包_V1.0.docx`
4. `墨痕_Agent_2.0_可视化原型_V1.0.pptx`
5. `specs/experience-ui/canonical/金泽历史关系探索体验板.png` — TASK-0014 Jinze 3-minute / Five-Beat canonical experience design
6. `specs/experience-ui/canonical/EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png` — EXP-DESIGN-02 Round 2 canonical visual composition
7. `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4` — M5-HUMAN-01 pre-Baseline runtime failure signal
8. Current frozen Agent-native Experience Architecture, Cultural World / Evidence / Composition governance and Present-day Connection Gate

Where an older source conflicts with a later frozen architecture contract, the later frozen contract governs. Historical source files remain preserved for rationale; this Baseline is the current human-facing implementation authority.

## Appendix B — Baseline Status at V1.0

- Canonical experience: **Jinze Five-Beat**
- Canonical visual composition: **EXP-DESIGN-02 Round 2**
- Current negative evidence sample: **`specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4`**
- Figma: **design workbench / inspect-on-demand, not code authority**
- Human-facing UI construction: **must pass this Baseline before Human Gate**
- UI freedom: **allowed inside the contract; not allowed to redefine the contract**
