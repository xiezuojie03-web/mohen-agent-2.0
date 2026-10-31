import { STAGE_ORDER, STAGE_CONTRACTS } from "./contracts.mjs";
import { jobForStage, assertStageExecutionAuthorized } from "./registry.mjs";
import { loadExecutor } from "./load-executor.mjs";
import { finishRun } from "./run-state.mjs";

export async function runProduction({ run, registry, context = {}, from_stage = "D00", to_stage = "D05" }) {
  const start = STAGE_ORDER.indexOf(from_stage);
  const end = STAGE_ORDER.indexOf(to_stage);
  if (start < 0 || end < 0 || start > end) throw new Error("STAGE_RANGE_INVALID");

  let state = run;
  let input = start === 0
    ? { research_intent: run.research_intent, scope: run.scope }
    : context.resume_input;

  if (start > 0 && input == null) throw new Error(`RESUME_INPUT_REQUIRED:${from_stage}`);

  for (const stage of STAGE_ORDER.slice(start, end + 1)) {
    const job = jobForStage(registry, stage);
    await assertStageExecutionAuthorized({ registry, job, run: state, input, context });
    // CLI adapter modules may execute top-level code: evaluate only after authorization.
    if (!context.adapters && typeof context.loadAdapters === "function") {
      context = { ...context, adapters: await context.loadAdapters() };
    }
    state.current_stage = stage;
    const execute = await loadExecutor(stage);
    const result = await execute({ run: state, job, input, context });
    state.stage_results.push(result);

    // 可选阶段进度回调（如 run.mjs 回写 control.production_runs.current_stage），不改变编排语义。
    if (typeof context.onStage === "function") await context.onStage(stage, result);

    if (result.disposition !== "PASS") return finishRun(state, result.disposition);

    // F02 fix: hand off the stage's declared contract output explicitly, never the first key.
    input = result.outputs[STAGE_CONTRACTS[stage].output];
  }
  return finishRun(state, "PASS");
}
