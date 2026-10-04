import fs from "node:fs";
const limits = {
  "specs/FOUNDATION.md": 150,
  "specs/DATA_CONTRACT.md": 250,
  "specs/AGENT_CONTRACT.md": 200,
  "specs/EXPERIENCE_CONTRACT.md": 200,
  "OWNERSHIP_MAP.md": 170,
  // 2026-10-02 项目拥有者指定：CURRENT.md 只记"当前工作状态"，任务进展移到任务结果文件。
  // §9 由 106 行降至 23 行（详情迁往 tasks/results/DATA-PRODUCTION-MECHANISM-01-result.md §8）。
  // 2026-10-04 预算 300 → 180：状态入口须保持可扫描，散文一律进结果文件（见 CURRENT §13）。
  "CURRENT.md": 180,
};
let failed = false;
for (const [file, max] of Object.entries(limits)) {
  const n = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
  if (n > max) { console.error(`DOC_BUDGET_FAIL ${file}: ${n} > ${max}`); failed = true; }
  else console.log(`DOC_BUDGET_OK ${file}: ${n}/${max}`);
}
for (const dir of fs.readdirSync("skills")) {
  const file = `skills/${dir}/SKILL.md`;
  if (!fs.existsSync(file)) continue;
  const n = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
  if (n > 150) { console.error(`SKILL_BUDGET_FAIL ${file}: ${n} > 150`); failed = true; }
}
process.exit(failed ? 1 : 0);
