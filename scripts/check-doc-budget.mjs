import fs from "node:fs";
const limits = {
  "specs/FOUNDATION.md": 150,
  "specs/DATA_CONTRACT.md": 250,
  "specs/AGENT_CONTRACT.md": 200,
  "specs/EXPERIENCE_CONTRACT.md": 200,
  "specs/OWNERSHIP_MAP.md": 120,
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
