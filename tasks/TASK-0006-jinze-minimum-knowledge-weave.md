# TASK-0006 — Jinze Minimum Knowledge Weave

**Status:** READY  
**Scope:** Jinze only  
**Depends on:** TASK-0005 PASS  
**Stop after completion:** YES  
**Do not start:** UI / Agent Runtime / Canvas / route building / other towns

---

## 0. Architect Decision

TASK-0005 is accepted as **PASS**.

Its `READY_FOR_KNOWLEDGE_WEAVE = NO` result is preserved as the historical output of TASK-0005 and MUST NOT be edited.

However, V3.0 architecture now clarifies a gate-boundary issue:

- **Visual assets** and a **walkable route** are prerequisites for the later **Vertical Slice Experience**, not prerequisites for constructing the first Knowledge Weave.
- **Replan opportunity** is an Agent Runtime concept, not a prerequisite for Knowledge Weave.
- `Evidence-backed Discovery seed` must not be equated with “any Evidence or research backlog item”.

Therefore TASK-0006 may begin a **minimum evidence-constrained Knowledge Weave** while the visual, route, map and primary-source blockers remain unresolved.

This is not a lowering of Evidence Gate. It is a correction of stage ownership.

---

## 1. Goal

Build the first small, auditable Jinze humanistic knowledge subgraph from existing verified/candidate Evidence.

The task must prove:

`Evidence → Claim → Entity/Relation/Change → Knowledge Path → Discovery Candidate`

without inventing facts, upgrading legend/research items, or creating user-facing experience.

The output is a **knowledge substrate**, not a story page.

---

## 2. Read First

Before modifying code/data, read:

1. `CONTEXT.md`
2. `specs/FOUNDATION.md`
3. `specs/DATA_CONTRACT.md`
4. `skills/mohen-evidence-gate/**`
5. `skills/mohen-knowledge-weave/**`
6. `tasks/TASK-0005-human-review-s1-evidence.md`
7. `tasks/results/TASK-0005-result.md`
8. generated `jinze-human-review-decision-log.md`
9. generated `jinze-s1-evidence-report.md`
10. generated `jinze-vertical-slice-readiness.md`

Do not redesign Foundation.

---

## 3. Scope: only the minimum Jinze graph

Prefer the strongest currently supported chain:

`白苎里 / 金泽地名变化`
→ `金泽`
→ `桥乡 / bridge-list evidence`
→ `迎祥桥 / 普济桥 / 万安桥`
→ existing evidence-backed relations where valid.

The following may exist in the graph only with their exact epistemic status:

- 吕颐浩 ↔ 颐浩寺: **candidate / according-to-local-gazetteer**, not verified fact.
- 赵孟頫 ↔ 颐浩寺: **legend/tradition**, never verified.
- 四十二虹桥 ↔ 今存七桥: **research / unresolved**, no batch `part_of`.
- 赵孟頫 birth-year conflict: **research/conflict**, no silent correction.

Do not make these weak items the factual backbone of the graph.

---

## 4. Knowledge model requirements

Reuse current schema where possible. Add migration `004` only if the current schema cannot represent the minimum model cleanly.

Minimum concepts required:

### 4.1 Claim
Every knowledge assertion used by the weave must resolve to one or more Evidence records.

Required semantics:
- claim text / normalized proposition
- subject reference
- predicate / change type
- object/value reference where applicable
- epistemic status
- confidence semantics already allowed by project rules
- evidence linkage
- human-review linkage when applicable

Do not convert `confidence=0` into a guessed score.

### 4.2 Knowledge Path
A path is a machine-readable ordered chain of claims/relations.

It must record:
- path id
- ordered nodes/edges
- purpose/question
- evidence coverage
- unresolved breaks
- status

A path with an unresolved break must say so; it must not be presented as a continuous verified causal chain.

### 4.3 Discovery Candidate
A Discovery Candidate is NOT “a piece of evidence”.

It must contain at least:
- explicit objects
- explicit relationship/change
- supporting Evidence refs
- relevance to a defined question
- epistemic status
- why it may be humanistically meaningful
- unresolved/contradictory evidence
- `publishable=false` by default

No scoring/ranking system is required in this task.

---

## 5. Required Work Packages

### WP-A — Current knowledge inventory

From the current DB, produce a machine-readable inventory for the Jinze minimum graph:

- usable entities
- usable semantic relations
- S1 claims/evidence
- human-review constraints
- unresolved edges

Do not import new external sources in WP-A.

### WP-B — Claim normalization

Create only the claims required for the minimum graph.

At minimum evaluate:

1. `白苎里 → 金泽` historical name/change claim.
2. S1 bridge-list claim involving 迎祥桥 / 普济桥 / 万安桥.
3. town/bridge identity or location claims actually supported by Evidence.
4. existing six semantic relation candidates: retain, reject, or mark unresolved according to their Evidence.
5. HR-controlled claims exactly as frozen.

Every created claim must have Evidence linkage.

### WP-C — Minimum knowledge paths

Produce at least **2** machine-readable paths if Evidence supports them.

Target examples, not mandatory conclusions:

- Path A: historical place-name change.
- Path B: Jinze bridge-town evidence chain.

A path may be short. Do not pad it with weak relations.

Causal predicates such as “because”, “led to”, “therefore”, “formed due to” are forbidden unless explicit Evidence supports causality and applicable human review allows it.

### WP-D — Discovery Candidates

Generate **2–4** Discovery Candidates from the paths.

Each must pass:
- objects explicit
- relationship/change explicit
- Evidence refs present
- current Jinze question relevance explicit
- duplicate check
- epistemic status explicit

Allowed statuses: `candidate`, `legend`, `research`, or existing project equivalents.

Do not mark any new Discovery `published`.

### WP-E — Stage-gate separation

Create:

`data/exports/jinze-stage-gates.md`

It must separate:

1. **KNOWLEDGE_WEAVE_MINIMUM**
2. **VERTICAL_SLICE_EXPERIENCE**
3. **GENERALIZATION**

For each, list only prerequisites owned by that stage.

The following must be placed under **VERTICAL_SLICE_EXPERIENCE**, not Knowledge Weave:
- ≥5 effective visual assets
- usable historical map
- walkable route with 3–6 observation targets
- Agent Replan runtime behavior

The Knowledge Weave gate should focus on:
- evidence-backed claims
- semantic relations/changes
- traceable knowledge paths
- unresolved-state honesty
- no forbidden epistemic upgrades

Do not edit TASK-0005 readiness report. This new file supersedes only its stage interpretation going forward.

### WP-F — Tests and acceptance

Add tests proving all invariants below.

---

## 6. Required invariants

1. No Knowledge Claim without Evidence.
2. No semantic edge generated only from lexical co-occurrence.
3. Legend remains legend.
4. Research remains unresolved unless new Evidence + review explicitly changes it.
5. HR-3 still blocks batch `part_of`.
6. HR-5 visual exclusion unchanged.
7. HR-6 conflict unchanged.
8. No causal edge without explicit causal Evidence.
9. Discovery Candidate is not equivalent to raw Evidence/backlog row.
10. No new object-level coordinate guessed.
11. No `published` status created by this task.
12. Rerun idempotent.
13. Legacy zero-write.
14. No secret exposure.
15. Existing TASK-0003/0004/0005 tests remain green.

---

## 7. Audit-history check

TASK-0005 reports that Gate audit uses `delete + insert` for idempotent current-state audit rows.

Before changing it, inspect the schema and code and answer in the result:

- Is `evidence_gate_audit` a **current-state snapshot** or a true **append-only historical audit ledger**?
- Can prior gate state/history be reconstructed from DB alone?
- Does current naming/documentation falsely imply historical auditability?

If it is snapshot-only, DO NOT silently redesign it inside this task unless Knowledge Weave correctness requires it.

Instead create a precise finding in:

`data/exports/audit-ledger-gap.md`

with:
- current behavior
- risk
- minimum future correction
- whether it blocks Knowledge Weave now

This is analysis + guardrail, not permission for architecture expansion.

---

## 8. Allowed changes

- `packages/domain/**`
- `packages/data-access/**`
- `pipelines/weave/**`
- `tests/data/**`
- `skills/mohen-knowledge-weave/**` only if operational clarification is necessary
- a new migration `004` only when required
- `CONTEXT.md`
- `tasks/results/TASK-0006-result.md`
- generated `data/exports/**`

Keep generated exports gitignored per current policy.

---

## 9. Forbidden

- UI
- Agent Runtime
- Canvas
- ExperienceState implementation
- route construction
- image collection
- historical-map collection
- other towns
- broad external search/crawl
- vector DB / embeddings / RAG
- PostGIS
- AI-generated historical imagery
- changing HR-1…HR-6 decisions
- weakening G0–G6
- modifying migrations 001/002/003
- modifying Legacy
- publishing claims/discoveries
- fabricating missing Evidence
- converting legend/research into fact for narrative convenience

---

## 10. Required outputs

1. `data/exports/jinze-knowledge-inventory.md`
2. `data/exports/jinze-knowledge-paths.md`
3. `data/exports/jinze-discovery-candidates.md`
4. `data/exports/jinze-stage-gates.md`
5. `data/exports/audit-ledger-gap.md`
6. `tasks/results/TASK-0006-result.md`

The result must include exact DB counts for:
- claims used by weave
- evidence-linked claims
- semantic relations used
- knowledge paths
- discovery candidates by epistemic status
- published count (must be 0)

---

## 11. PASS criteria

TASK-0006 PASS only if:

- minimum graph is traceable Evidence → Claim → Path → Discovery Candidate;
- every used claim has Evidence;
- at least 2 valid knowledge paths exist, OR report proves honestly that Evidence supports fewer and does not fabricate them;
- 2–4 Discovery Candidates exist, OR report proves fewer are supportable;
- HR constraints remain intact;
- no causal invention;
- stage gates are separated correctly;
- audit-ledger behavior is explicitly diagnosed;
- all new + existing data tests pass;
- guards/typecheck/build pass;
- rerun is idempotent;
- Legacy zero-write;
- no secret exposure;
- commit created and working tree clean.

A low number of paths/discoveries is not failure if it reflects the Evidence honestly.

---

## 12. Stop conditions

STOP and report if:

- implementation would require weakening Evidence Gate;
- a required claim needs invented text/coordinates/relations;
- existing schema cannot support claim/path provenance without a nontrivial redesign;
- migration would require destructive change;
- Human Review decision conflicts with proposed knowledge edge;
- Legacy modification is required;
- scope starts expanding into visuals/routes/UI/other towns.

---

## 13. Execution order

`guard/clean check`
→ read contracts/results
→ inventory current Jinze knowledge
→ normalize minimum claims
→ build minimum paths
→ build Discovery Candidates
→ stage-gate separation
→ audit-ledger diagnosis
→ tests
→ guards/typecheck/build
→ Legacy zero-write proof
→ diff check
→ commit
→ clean status
→ write final result
→ **STOP**

Do not start TASK-0007.
