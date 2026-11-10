import fs from "node:fs";
// [2026-10-02 修复] 原 required 列表已过期：`CONTEXT.md` 早已移入 governance/archive/（该断言长期为红，
// 却无人跑守卫），`tasks/CURRENT_TASK.md` 已声明为历史 Trace。改为断言"当前真正的根目录入口 + 领域契约"。
// 现行六份 MHKA 的路径不在此重复（避免又造一套路径源）——它们由 check-structure-map.mjs 从 `AGENTS.md` §1 解析；归档 C0—C4 则由 check-authority-routing 的无现行旧件检查监督。
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
  // skills/archive/ 是退役 Skill 的归档容器（内部每个归档件仍自带 SKILL.md），
  // 本身不是一个 Skill，不适用「每个 skills/<dir> 必须带 SKILL.md」的活技能断言。
  if (d === "archive") continue;
  if (!fs.existsSync(`skills/${d}/SKILL.md`)) {
    console.error(`SKILL_DIR_WITHOUT_SKILL_MD skills/${d}`);
    failed = true;
  }
}
if (fs.existsSync("data/raw/seed.master.json")) { console.error("Legacy seed must not become Raw truth"); failed = true; }

// ---------- Skill 实体化三向绑定：注册表 ⇄ SKILL.md（C2 §2.1 / C0 §11 R26 · 2026-10-04） ----------
// 凡在生产注册表里挂了作业的技能，必须「已落地」= 有 SKILL.md，且其声明的 Entry 与注册表 implementation.entry 一致。
// 目的：防止 SKILL.md 文档与注册表漂移（文档说 A、注册表跑 B），也防止"作业在跑但技能没落地"。
const REG = "specs/data-production/production-registry.json";
if (fs.existsSync(REG)) {
  const reg = JSON.parse(fs.readFileSync(REG, "utf8"));
  const skillEntry = new Map(); // skill -> entry（注册表侧权威）
  for (const j of reg.jobs || []) {
    const s = j.implementation && j.implementation.skill;
    if (s) skillEntry.set(s, (j.implementation && j.implementation.entry) || "");
  }
  for (const [s, entry] of skillEntry) {
    const skillMd = `skills/${s}/SKILL.md`;
    if (!fs.existsSync(skillMd)) {
      console.error(`SKILL_NOT_LANDED ${s}: 生产注册表挂了作业，但缺 ${skillMd}（C2 §2.1 实体化判定）`);
      failed = true;
      continue;
    }
    const md = fs.readFileSync(skillMd, "utf8");
    const m = md.match(/\*\*Entry\*\*：`([^`]+)`/);
    if (!m) {
      console.error(`SKILL_MD_NO_ENTRY ${s}: ${skillMd} 未声明 **Entry**（无法与注册表核对）`);
      failed = true;
    } else if (entry && m[1] !== entry) {
      console.error(`SKILL_ENTRY_DRIFT ${s}: SKILL.md Entry=${m[1]}，注册表 entry=${entry} —— 文档与注册表漂移`);
      failed = true;
    }
  }
  console.log(`STRUCTURE_SKILL_BINDING skills_with_jobs=${skillEntry.size}`);
}
console.log(`STRUCTURE required=${required.length} skills=${skillCount} (floor ${SKILL_FLOOR}) dirs=${skillDirs.length}`);
process.exit(failed ? 1 : 0);
