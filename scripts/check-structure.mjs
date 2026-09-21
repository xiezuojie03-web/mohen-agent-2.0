import fs from "node:fs";
const required = [
 "CONTEXT.md","specs/FOUNDATION.md","specs/DATA_CONTRACT.md","specs/AGENT_CONTRACT.md",
 "specs/EXPERIENCE_CONTRACT.md","specs/SOURCE_REGISTRY.md","specs/OWNERSHIP_MAP.md",
 "decisions/ADR-001-greenfield-local-first.md","tasks/CURRENT_TASK.md",
 "supabase/migrations/202609210001_foundation.sql"
];
let failed=false;
for (const f of required) {
  if (!fs.existsSync(f)) { console.error(`MISSING ${f}`); failed=true; }
}
const skillCount = fs.readdirSync("skills").filter(x => fs.existsSync(`skills/${x}/SKILL.md`)).length;
if (skillCount !== 8) { console.error(`SKILL_COUNT ${skillCount}, expected 8`); failed=true; }
if (fs.existsSync("data/raw/seed.master.json")) { console.error("Legacy seed must not become Raw truth"); failed=true; }
console.log(`STRUCTURE skills=${skillCount} required=${required.length}`);
process.exit(failed?1:0);
