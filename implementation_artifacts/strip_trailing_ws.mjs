import fs from 'node:fs';
const files = [
  'AGENTS.md',
  'CURRENT.md',
  'skills/mohen-acceptance/SKILL.md',
  'skills/mohen-experience-prototype/SKILL.md',
  'skills/mohen-historical-spatial-reconstruction/SKILL.md',
  'skills/mohen-historical-spatial-source/SKILL.md',
  'skills/mohen-project-guard/SKILL.md',
  'skills/mohen-vertical-slice/SKILL.md',
  'skills/mohen-visual-asset/SKILL.md',
  'specs/AGENT_CONTRACT.md',
  'specs/DATA_CONTRACT.md',
  'specs/EXPERIENCE_CONTRACT.md',
  'specs/data-production/MoHen_Data_Production_Protocol.md',
];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('skip(missing):', f); continue; }
  const text = fs.readFileSync(f, 'utf8');
  const out = text.split(/\r?\n/).map(l => l.replace(/[ \t]+$/, '')).join('\n');
  fs.writeFileSync(f, out);
  console.log('stripped:', f);
}
