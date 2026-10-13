import { STAGE_ORDER } from "./contracts.mjs";
import { jobForStage } from "./registry.mjs";
import { loadExecutor } from "./load-executor.mjs";
import { finishRun } from "./run-state.mjs";

export async function runProduction({ run, registry, context = {}, from_stage = "D01", to_stage = "D05" }) {
  const start = STAGE_ORDER.indexOf(from_stage);
  const end = STAGE_ORDER.indexOf(to_stage);
  if (start < 0 || end < 0 || start > end) throw new Error("STAGE_RANGE_INVALID");

  let state = run;
  let input = start === 0
    ? { research_intent: run.research_intent, scope: run.scope }
    : context.resume_input;

  if (start > 0 && input == null) throw new Error(`RESUME_INPUT_REQUIRED:${from_stage}`);

  for (const stage of STAGE_ORDER.slice(start, end + 1)) {
    state.current_stage = stage;
    const job = jobForStage(registry, stage);
    const execute = await loadExecutor(stage);
    const result = await execute({ run: state, job, input, context });
    state.stage_results.push(result);

    if (result.disposition === "HOLD") return finishRun(state, "HOLD");
    if (result.disposition === "REJECT") return finishRun(state, "REJECT");

    const outputKey = Object.keys(result.outputs)[0];
    input = result.outputs[outputKey];
  }
  return finishRun(state, "PASS");
}
