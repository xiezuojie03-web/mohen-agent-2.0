import fs from "node:fs";
const p = process.env.TEMP + "/mohen-unit.log";
const buf = fs.readFileSync(p);
let t = buf.toString("utf8");
if (!t.includes("Test Files")) t = buf.toString("utf16le");
t = t.replace(/\u001b\[\d+m/g, "");
const lines = t.split(/\r?\n/);
const interesting = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/FAIL|✕|× |failed|❯.*test/.test(l) && l.trim()) interesting.push(l.trim().slice(0, 180));
}
console.log(interesting.slice(0, 60).join("\n"));
