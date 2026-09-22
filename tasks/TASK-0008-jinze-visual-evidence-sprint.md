# TASK-0008 — Jinze Visual Evidence Sprint

**Status:** READY  
**Scope:** Jinze only  
**Depends on:** TASK-0007 PASS + architect HR decisions below  
**Stop after completion:** YES  
**Do not start:** UI / Agent Runtime / Canvas / route construction / other towns / AI image generation

---

## 0. Architect Acceptance and Frozen Decisions

TASK-0007 is accepted as **PASS**.

Freeze the following spatial Human Review decisions:

- **SHR-01 = A** — accept `普济桥-颐浩禅寺` only as `approximate_object_area` for 颐浩寺遗址. It is NOT an exact object point and NOT historical-position proof.
- **SHR-02 = C** — keep dual town-anchor semantics:
  - `heritage_experience_anchor = 金泽古镇`
  - `administrative_anchor = 金泽镇人民政府`
  They must never be silently substituted for each other.
- **SHR-03 = A** — accept 如意桥 AMap bridge POI as `official_or_provider_object_point`, while preserving the original ambiguity/audit note and supporting nearby 金泽 address evidence. Do not upgrade to verified.
- **SHR-04 = A** — accept AMap `天皇阁桥` as current provider object point; canonical historical/source-name remains `天王阁桥` where S1 uses that form. Preserve a machine-readable name-variant relation; do not overwrite either form.
- **SHR-05 = A** — accept `金泽放生桥` current POI and explicitly exclude the 朱家角 `放生桥` homonym from Jinze mapping. Preserve the cross-town ambiguity as regression evidence.
- **SHR-06 = A** — keep `HISTORICAL_MAP_READY = PARTIAL`. For the Jinze Vertical Slice, “Jinze-relevant historical map” requires the map to depict Jinze itself or provide defensible Jinze spatial anchors. Macro regional context alone is not enough to make this gate YES.

These are spatial editorial decisions. Do not confuse them with TASK-0005 HR-1…HR-6 or Data Factory review tiers.

Persist these decisions audibly using the existing human-review mechanism if it can represent a separate spatial-review namespace without collision. If not, use the smallest schema-safe extension; do not create a parallel review subsystem.

---

## 1. Goal

Remove the next major Vertical Slice blocker:

**effective heritage visual assets = 0**

Build a small, source-traceable visual evidence set for the Jinze sample.

Target chain:

`Source → Raw Asset/Metadata → Source Record → Visual Asset → Visual-to-Entity Link → Evidence → Eligibility`

The task is about **real historical/heritage visual evidence**, not decorative imagery.

No AI-generated images.

---

## 2. Priority visual targets

P0 — must investigate first:

1. 万安桥
2. 普济桥
3. 迎祥桥
4. 林老桥
5. 颐浩寺 / 颐浩禅寺 / 遗址

P1 — only after every P0 has an explicit result state:

6. 如意桥
7. 天王阁桥 / 天皇阁桥
8. 金泽放生桥
9. 金泽镇 historical townscape / waterways

Do not expand beyond this list.

---

## 3. What counts as an effective visual asset

A visual asset is effective for this sprint only when all are explicit:

- real source/provenance;
- retrievable asset or stable source record;
- license/rights status known enough for intended prototype use, or explicitly `rights_pending`;
- depicted object/place/scene identified;
- depicted period or creation date semantics recorded where knowable;
- visual-to-entity linkage status explicit;
- not excluded by HR-5;
- not a train/general-town image falsely presented as a heritage object;
- Evidence linkage exists for the visual identification claim.

Allowed linkage statuses:

- `confirmed`
- `suspected`
- `similar`
- `unconfirmed`

Only `confirmed` counts toward the primary `effective_visual_assets` gate.

`Suspected/similar` may be retained for research but not used as proof.

---

## 4. Source policy

Search narrowly and in this order:

### S1
- Shanghai Library open data / image-bearing records
- local gazetteer / archive / library records already reachable through approved project methods

### S2
- Wikimedia Commons
- other public library/archive collections with explicit provenance and rights metadata if already supported by project tooling

Do not use S4 blogs/social posts as verified visual evidence.

A metadata record without an accessible image may become a Source Record / research lead, but does not count as an effective visual asset.

No broad crawl.

---

## 5. Visual semantics

Separate at least:

- `creation_date`
- `depicted_period`
- `asset_type`
- `depicted_entity`
- `source_provider`
- `source_uri`
- `rights/license`
- `visual_link_status`
- `link_evidence`
- `current_or_historical`
- `eligibility_tags`

Do not infer `depicted_period` merely from upload date.

Do not treat a modern photograph as evidence of a historical state.

A modern photograph of a surviving bridge may count as a **current heritage-object visual**, if entity linkage is confirmed.

Historical imagery and modern on-site imagery are both useful, but must remain semantically distinct.

---

## 6. Work Packages

### WP-A — Persist TASK-0007 spatial decisions

Persist SHR-01…SHR-06 first.

Recompute affected spatial result states only where the decision changes an object status.

Do not rewrite TASK-0007 historical reports.

Produce:
`data/exports/jinze-spatial-review-decision-log.md`

### WP-B — Existing visual inventory

Audit all existing Jinze visual assets again after HR-5 exclusion.

Classify:
- heritage object visual
- historical townscape
- modern heritage object
- general contemporary Jinze
- unrelated/mislabeled
- metadata-only
- rights unknown
- duplicate

Do not rehabilitate the excluded 20 unless new independent evidence proves the depicted heritage object. A label change alone is insufficient.

### WP-C — Targeted retrieval

Run targeted visual retrieval for P0 only first.

For every external response/asset:
- Raw Store append-only
- checksum
- Source Record
- metadata
- rights/license
- retrieval timestamp
- source URI without secrets
- no silent overwrite

P1 only after all P0 have a result state.

### WP-D — Visual-to-entity linking

For each candidate asset, create an explicit visual linkage decision.

`confirmed` requires evidence strong enough to identify the depicted object, e.g.:
- source caption/title explicitly names the object; or
- authoritative catalog metadata identifies it; or
- another deterministic identity rule documented and tested.

Visual similarity alone is not confirmation.

Do not use AI visual resemblance to promote an asset to `confirmed`.

### WP-E — Visual Evidence Gate

Answer:

`VISUAL_EVIDENCE_READY = YES / PARTIAL / NO`

YES requires:
- at least **5 confirmed effective visual assets**;
- covering at least **3 distinct P0/P1 heritage objects/scenes**;
- at least **2 assets must be historical or archival** if such assets are actually obtainable in approved sources; if none are found, do not fake this requirement — return PARTIAL and explain;
- rights/provenance sufficient for prototype display or explicitly constrained;
- zero HR-5-excluded assets counted.

Also report separately:
- confirmed modern heritage-object visuals
- confirmed historical/archival visuals
- suspected/similar/unconfirmed
- metadata-only leads

### WP-F — Visual sequence readiness

Do NOT design UI.

Evaluate whether current assets can support any of these future modes:

- `image_immersion`
- `past_present_comparison`
- `spatiotemporal_overlay`
- `scene_reconstruction` (data/layer reconstruction only; NO generative imagery)

For each: YES / PARTIAL / NO + exact reason.

This is readiness analysis only.

### WP-G — Human review

Create a human-review CSV only for cases where:
- caption/object identity conflicts;
- historical vs modern scene identity is uncertain;
- rights status affects prototype use;
- two assets may depict the same object but evidence is insufficient.

Do not send deterministic cases to the user.

---

## 7. Required invariants

1. No AI-generated images.
2. No visual similarity alone can produce `confirmed`.
3. Every confirmed visual-to-entity link has Evidence.
4. HR-5 excluded assets count = 0 toward effective gate.
5. Modern image never becomes historical-state evidence.
6. Creation date and depicted period are not conflated.
7. Metadata-only record does not count as effective visual.
8. Rights/license unknown is explicit.
9. No source/provider label mismatch is silently preserved.
10. No cross-town visual mislink.
11. Name variants 天王阁/天皇阁 remain explicit.
12. TASK-0007 spatial decisions are traceable.
13. No new route.
14. No Knowledge Weave epistemic upgrade.
15. No new published objects.
16. Raw Store append-only.
17. New Evidence gets G0–G6 snapshot audit immediately.
18. Audit orphan count does not increase.
19. Rerun idempotent.
20. Legacy zero-write.
21. No secret exposure.
22. Existing tests remain green.

---

## 8. Historical map status

Do not attempt to fix `HISTORICAL_MAP_READY = PARTIAL` in this task.

The 1754 map remains useful as macro `original_map_narrative`, but it does not satisfy the Jinze spatial-map gate because Jinze is absent.

Do not search a new historical-map corpus here.

A later dedicated map-source task may address this if still required after visual evidence is known.

---

## 9. Allowed changes

- `packages/domain/**`
- `packages/data-access/**`
- `pipelines/ingest/**` only for targeted visual retrieval
- `pipelines/visual/**`
- `tests/data/**`
- `skills/mohen-visual-asset/**`
- `skills/mohen-spatial-grounding/**` only to persist/clarify SHR decisions if needed
- migration `006` only if current schema cannot represent visual linkage/rights honestly
- `CONTEXT.md`
- `tasks/results/TASK-0008-result.md`
- generated `data/exports/**`

Do not edit migrations 001–005.

---

## 10. Forbidden

- UI / Canvas / Experience renderer
- Agent Runtime
- route construction
- route optimization
- other towns
- broad scraping
- vector DB / RAG
- PostGIS
- AI-generated historical imagery
- AI restoration presented as original
- AI resemblance used as identity proof
- changing TASK-0005 HR decisions
- changing SHR-01…SHR-06 after persistence
- fixing historical-map gate by lowering its definition
- modifying Legacy
- publishing anything

---

## 11. Required outputs

1. `data/exports/jinze-spatial-review-decision-log.md`
2. `data/exports/jinze-visual-inventory.md`
3. `data/exports/jinze-visual-evidence.md`
4. `data/exports/jinze-visual-linkage.md`
5. `data/exports/jinze-visual-readiness.md`
6. `data/exports/jinze-visual-human-review.csv` only if needed
7. `tasks/results/TASK-0008-result.md`

Result must include exact counts for:
- existing visuals audited
- new raw assets/responses
- new Source Records
- new Visual Assets
- new Evidence
- confirmed / suspected / similar / unconfirmed links
- effective visuals
- distinct depicted heritage objects
- historical/archival vs modern heritage visuals
- metadata-only leads
- rights known / pending
- HR-5 excluded assets counted toward gate (must be 0)
- G0–G6 changes
- audit orphan before/after
- published count

---

## 12. PASS criteria

TASK-0008 PASS if:

- SHR-01…SHR-06 are audibly persisted;
- existing visual assets are honestly reclassified;
- targeted P0/P1 visual retrieval is traceable;
- every confirmed visual link has Evidence;
- no HR-5 excluded asset is counted;
- visual historical/current semantics are clean;
- rights/provenance are explicit;
- `VISUAL_EVIDENCE_READY` is explicitly YES/PARTIAL/NO;
- NO/PARTIAL is allowed and does not fail the Task;
- visual mode readiness is evaluated without implementing UI;
- tests/guards/typecheck/build pass;
- rerun idempotent;
- audit orphan count does not increase;
- Legacy zero-write;
- no secret exposure;
- commit created and working tree clean.

---

## 13. Stop conditions

STOP if:

- required source credential is missing locally;
- source contract/endpoint cannot be determined without guessing;
- rights terms prohibit the intended retrieval/storage;
- identity requires visual guessing rather than metadata/evidence;
- retrieval would require broad crawling;
- schema needs major redesign;
- task drifts into UI/route/Agent/map-corpus work;
- any source would require bypassing access controls.

---

## 14. Execution order

`clean/guard`
→ read TASK-0007 outputs
→ persist SHR decisions
→ existing visual inventory
→ targeted P0 retrieval
→ optional P1 retrieval
→ visual-to-entity Evidence linkage
→ Visual Evidence Gate
→ visual-mode readiness
→ human review if needed
→ G0–G6 snapshot
→ tests
→ guards/typecheck/build
→ Legacy zero-write
→ diff check
→ commit
→ clean status
→ result
→ **STOP**

Do not start TASK-0009.
