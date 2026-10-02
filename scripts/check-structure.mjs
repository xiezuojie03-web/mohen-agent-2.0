import fs from "node:fs";
// [2026-10-02 修复] 原 required 列表已过期：`CONTEXT.md` 早已移入 governance/archive/（该断言长期为红，
// 却无人跑守卫），`tasks/CURRENT_TASK.md` 已声明为历史 Trace。改为断言"当前真正的根目录入口 + 领域契约"。
// C0–C4 的路径不在此重复（避免又造一个路径源）——它们由 check-structure-map.mjs 从 `AGENTS.md` §1 解析校验。
const required = [
  "AGENTS.md",            // 纯入口路由
  "CURRENT.md",           // 当前状态（Live SOT）
  "OWNERSHIP_MAP.md",     // 结构 SOT（目录职责 + 归档规则）
  "specs/FOUNDATION.md",
  "specs/DATA_CONTRACT.md",
  "specs/AGENT_CONTRACT.md",
  "specs/EXPERIENCE_CONTRACT.md",
  "specs/SOURCE_REGISTRY.md",
  "decisions/ADR-001-greenfield-local-first.md",
  "supabase/migrations/202609210001_foundation.sql",
];
let failed = false;
for (const f of required) {
  if (!fs.existsSync(f)) { console.error(`MISSING ${f}`); failed = true; }
}
// 结构不变量：skill 数量不得低于初始脚手架冻结的 8；每个 skills/<name>/ 必须带 SKILL.md。
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
if (fs.existsSync("data/raw/seed.master.json")) { console.error("Legacy seed must not become Raw truth"); failed = true; }
console.log(`STRUCTURE required=${required.length} skills=${skillCount} (floor ${SKILL_FLOOR}) dirs=${skillDirs.length}`);
process.exit(failed ? 1 : 0);
