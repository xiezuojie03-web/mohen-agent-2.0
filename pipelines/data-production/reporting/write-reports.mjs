import fs from "node:fs";
import path from "node:path";
import { buildMachineReport } from "./machine-report.mjs";
import { buildHumanReviewReport } from "./human-review-report.mjs";

export function writeReports({ run, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const machine = buildMachineReport(run);
  const human = buildHumanReviewReport(run);
  const mp = path.join(outDir, `${run.run_id}.machine.json`);
  const hp = path.join(outDir, `${run.run_id}.human-review.json`);
  fs.writeFileSync(mp, JSON.stringify(machine, null, 2));
  fs.writeFileSync(hp, JSON.stringify(human, null, 2));
  return { machine_report: mp, human_review_report: hp };
}
