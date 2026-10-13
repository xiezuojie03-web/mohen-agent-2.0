import fs from 'node:fs';
const input = process.argv[2];
const output = process.argv[3];
const title = process.argv[4] || 'AFTER';
const raw = fs.readFileSync(input, 'utf8');
const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
let out = `# DB Table Row Counts ${title} (mohen_dev @ PostgreSQL 18.6)\n\n`;
out += '| schema.table | rows |\n';
out += '|---|---|\n';
for (const l of lines) {
  const [t, n] = l.split('|');
  out += `| ${t} | ${n} |\n`;
}
fs.writeFileSync(output, out);
console.log('wrote', output, 'rows:', lines.length);
