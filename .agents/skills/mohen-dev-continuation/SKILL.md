---
name: mohen-dev-continuation
description: Continue engineering or maintenance of MoHen from the latest GitHub main using MHKA, the existing MAB plan, real CI evidence, bounded implementation and safe handoff. Use when the owner asks to resume work, diagnose failures or change MoHen code; do not use as a product research/production Skill.
---
# MoHen developer continuation | canonical v0.2.1

This is a **developer-tool workflow** for authorized `CTX-ENG` tasks. It does not enter the product `skills/` Registry, operate the product Agent, or sign a professional Gate. Apply project `AGENTS.md` and the six MHKA documents first; if this Skill conflicts with them, follow those authorities and record the conflict.

## Enter and choose the task
1. Record the actual remote `main` SHA, current worktree/branch, permissions, available execution environment and corresponding CI/job results. Never presume a previous conversation's SHA or success remains current. Re-fetch after another tool writes to main.
2. Read `AGENTS.md`, relevant MHKA chapters and professional contracts, `tasks/implementation/MAB/PLAN.md`, `progress.md`, `target-diff.csv`, `CURRENT.md`, and the latest handoff notes. Read only the contract slices relevant to this task; do not start an unbounded architecture audit.
3. Select the next *eligible* existing task in MAB dependency order, reusing existing source/tests and previously verified evidence. Current BUILD priority is M5 ST-02 after ST-01, subject to actual main/CI inspection; unrelated pre-existing errors may require a bounded prerequisite fix. Do not reopen completed work without new evidence.
4. Identify whether the goal is BUILD (implement approved MAB work) or MAINTAIN (later authorized fault fix, compatibility, security, dependency or version change). Both use the same source-of-truth, test and handoff discipline; MAINTAIN must not invent product requirements.

## Execute one bounded work group
5. State change scope, expected failure/positive/negative tests, permissions and rollback before editing. Implement the minimum change consistent with MHKA and live code. Never create parallel D00–D05 Runner, Gate, permanent Truth store or unauthorised public consumer.
6. Verify with available real tools: inspect diff, run relevant typecheck/unit/guard/build and permission/version/withdrawal negative tests, and inspect exact CI SHA/job outcome. An unavailable CLI, DB, browser, credentials or provider is `NOT_RUN/DEFERRED_ENV`, not PASS.
7. Commit and push only when permitted; verify the new remote SHA and CI. Record actual modifications, tests, known failure logs, HOLD and next eligible task in *existing* MAB `progress.md` plus affected plan/target-diff/CURRENT/handoff where genuinely needed. Do not multiply status-only records or copy all older history.
8. Continue to the next eligible operation within the same authorized work group when evidence and permissions permit. **Checkpoint after at most 3 coherent implementation operations per bounded batch**, or sooner on a real safety, environment, budget or approval blocker. When the Owner authorizes all remaining work, continue subsequent batches in the same session until every eligible task is complete or concretely blocked; a checkpoint is not an overall stop. Never silently create an unattended background process. On repeated identical failure without new evidence, stop after 2 attempts and write a precise blocker/recovery action.

## Stop and hand off safely
- **Stop for Owner authorization** before changing product direction, incurring extra paid model usage, exposing restricted source data, modifying production DB/Storage or secrets, activating independent professional Gate/Reviewer, or formally publishing/deploying a production feature beyond the present authorization.
- Keep distinct `CODE_PRESENT`, `VERIFIED_ISOLATED`, `VERIFIED_LIVE`, `HOLD` and `DEFERRED_ENV`. A passing static guard/CI does not certify product Gate, Owner experience, private data rights, or M8 production activation.
- If tools cannot perform a step (web-only GitHub access, Codex cloud constraints, CodeBuddy local limitations), persist a concrete tested handoff with file path, command, environment/permission prerequisite, expected negative tests, and return criteria. Do not assume one host can invoke another host's Skill.
- End with: **baseline SHA → task → changes/commit → tests with exact outcomes → blockers → next MAB operation**. Do not output or store credentials.

## Task → tool → environment → verification (DS-02)

The single authoritative, machine-readable execution map is `references/task-tool-environment-map.json` in this same Skill directory. Read the map when selecting a tool or verification path; its `hostLabels` are **claims/entry hints**, never proof that Codex or CodeBuddy loaded a Skill. See `references/HOST_ACCEPTANCE.md` for **separate** host acceptance.

A shared, versioned and non-destructive Node.js executable exists in the repository at `scripts/dev-skills/continuation.mjs`:
- `node scripts/dev-skills/continuation.mjs doctor --host codex --json` (use `codebuddy` only in CodeBuddy, `unknown` elsewhere): observe git/Node/pnpm availability and checkout SHA, without reading secrets.
- `node scripts/dev-skills/continuation.mjs verify --profile static --dry-run --json`: display exact allowlisted guard commands, perform **no** checks.
- `node scripts/dev-skills/continuation.mjs verify --profile static --json`: execute both existing MHKA and developer Skill static guards and record their real status.
- `node scripts/dev-skills/continuation.mjs verify --profile typecheck --json`: if dependencies and authority permit, run `pnpm -r typecheck`; an existing M5 TS error is **FAIL**, not acceptable as a Skill failure-free result.
- `node scripts/dev-skills/continuation.mjs verify --profile unit --json`: if dependencies permit, run existing DB-free `pnpm test:unit`.
- There is **no** `production`, `database`, `deploy`, arbitrary shell, paid model, publication or permission-escalation profile. Such steps require the original MAB/MHKA contracts and owner-authorized host tools; do not extend this launcher to bypass them.

Run in a real checkout with Node.js and Git. The CLI operates against the repository root; `--host` only labels an observation, and output always marks `hostSkillLoaded:false`, because a standalone CLI cannot prove its AI host loaded the Skill. Treat `PASS` as the particular command's test evidence at the recorded SHA, not a complete M5/production qualification. The CLI cannot operate in a web-only ChatGPT/GitHub connector session; use connector reads and GitHub Actions results as separate evidence instead.

For Codex and CodeBuddy, perform **H-01—H-05** independently; use the same map and checks, compare differences in tools and permissions, and preserve distinct `HOST_NOT_RUN`, `DEFERRED_ENV`, `STATIC_VERIFIED` and `HOST_VERIFIED` outcomes. Continue to follow the bounded-work-group and stop rules above.

## DS-03 offline experience drafts (schema v1)

Within MAB §6B.4, use `node scripts/dev-skills/experience.mjs --input <redacted-receipts.json>`
to validate explicit engineering receipts and print inert candidate suggestions. See
`references/EXPERIENCE.md` for the strict input and evaluation contract. This is
exact-signature grouping of supplied evidence, not automatic host-telemetry capture
or semantic discovery. It cannot execute proposed checks, activate Skills, or modify
this canonical file/product Registry. Analysis failure does not block authorized M5.

## Remaining-work triage (v0.2.1)

Inventory every original MAB task, reuse exact verified evidence, then distinguish READY,
DATA_BLOCKED, GATE_BLOCKED and OWNER_BLOCKED. Record code completeness separately from
live qualification. Propagate external blockers to dependent work, continue independent
READY tasks, and do not call a source/schema absence a universal environment blocker.
After two failures with unchanged evidence/environment revision, stop that operation,
record its cause and move to another eligible task. Retry only after a concrete changed
precondition; a new prompt or checkpoint alone is not new evidence.

`node scripts/dev-skills/experience.mjs --worklist <redacted-worklist.json>` validates an
explicit dependency graph and prints a topological proposed order, inherited blockers
and STOP_REPEATED_FAILURE. It does not probe environments, execute tasks or grant rights.
Its READY is an input-backed scheduling suggestion, never proof of data/permission readiness.
See references/EXPERIENCE.md. Continue the original receipt analyzer and independent
positive/negative evaluation; candidate suggestions do not automatically activate this Skill.
