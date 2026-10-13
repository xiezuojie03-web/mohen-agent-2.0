#!/usr/bin/env node
import { STAGE_ORDER, STAGE_CONTRACTS } from "../../pipelines/data-production/orchestrator/contracts.mjs";
for (let i=1;i<STAGE_ORDER.length;i++) {
  const prev=STAGE_CONTRACTS[STAGE_ORDER[i-1]];
  const cur=STAGE_CONTRACTS[STAGE_ORDER[i]];
  if (!prev.output || !cur.input) throw new Error("HANDOFF_CONTRACT_MISSING");
}
console.log(`STAGE_HANDOFF_OK stages=${STAGE_ORDER.length}`);
