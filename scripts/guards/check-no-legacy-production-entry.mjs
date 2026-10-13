#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(process.argv[2]||process.cwd());
const registry=JSON.parse(fs.readFileSync(path.join(root,"specs/data-production/production-registry.json"),"utf8"));
const bad=[];
for (const j of registry.jobs) {
  const s=JSON.stringify(j);
  if (/pipelines\/(research|legacy)\//.test(s)) bad.push(j.job_id);
  if (/bridge-to-directed|unattended-runner|research-pipeline/.test(s)) bad.push(j.job_id);
}
if (bad.length) throw new Error(`LEGACY_ENTRY_ACTIVE:${[...new Set(bad)].join(",")}`);
console.log("NO_LEGACY_PRODUCTION_ENTRY_OK");
