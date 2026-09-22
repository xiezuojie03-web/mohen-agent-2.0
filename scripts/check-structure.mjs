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
// §12-26 同类修正（TASK-0010）：原实现断言 `skillCount !== 8` —— 那是**过期的绝对总数**。
// TASK-0009 合法新增第 9 个 skill（mohen-historical-spatial-source）后，该断言自那时起恒为红，
// 且它的红与本任务无关（可用 `git show HEAD:scripts/check-structure.mjs` 复核）。
// 改为断言真正的不变量：
//   (a) skill 数量不得低于初始脚手架冻结的 8（防止误删）；
//   (b) 每个 skills/<name>/ 目录都必须带 SKILL.md（这才是「结构完整」的本意）。
const SKILL_FLOOR = 8;
const skillDirs = fs
  .readdirSync("skills", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const skillCount = skillDirs.filter((x) => fs.existsSync(`skills/${x}/SKILL.md`)).length;
if (skillCount < SKILL_FLOOR) {
  console.error(`SKILL_COUNT ${skillCount}, below floor ${SKILL_FLOOR}`);
  failed = true;
}
for (const d of skillDirs) {
  if (!fs.existsSync(`skills/${d}/SKILL.md`)) {
    console.error(`SKILL_DIR_WITHOUT_SKILL_MD skills/${d}`);
    failed = true;
  }
}
if (fs.existsSync("data/raw/seed.master.json")) { console.error("Legacy seed must not become Raw truth"); failed=true; }
console.log(`STRUCTURE skills=${skillCount} (floor ${SKILL_FLOOR}) dirs=${skillDirs.length} required=${required.length}`);
process.exit(failed?1:0);
