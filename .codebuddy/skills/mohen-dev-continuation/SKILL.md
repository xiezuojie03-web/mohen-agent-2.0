---
name: mohen-dev-continuation
description: Continue MoHen engineering or maintenance safely from GitHub main and MHKA using the canonical cross-tool workflow. Use for authorized repo coding, debugging, testing or handoff, not product Agent data production.
---
# CodeBuddy project loader | canonical v0.2.1

Before planning, editing or running tools, **read the entire canonical Skill** at the repository-root path `.agents/skills/mohen-dev-continuation/SKILL.md`. The file at that path exclusively owns the workflow and failure/permission contract.

If the canonical file cannot be read or is incompatible with this loader, stop with `DEFERRED_ENV` and report the missing path/version. Do **not** improvise a second process from this adapter. For all steps also follow the current root `AGENTS.md`, MHKA and applicable professional contracts. This file exists only for CodeBuddy's project Skill discovery.

After reading the canonical file, read its `references/task-tool-environment-map.json` for actual allowlisted verification profiles and `references/HOST_ACCEPTANCE.md` for CodeBuddy acceptance. These files are **shared**, not a second CodeBuddy policy. `/skills` discovery alone is not evidence of successful execution; invoke `node scripts/dev-skills/continuation.mjs doctor --host codebuddy --json` only in an authorized local checkout.
