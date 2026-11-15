import { STAGE_ORDER, STAGE_CONTRACTS } from "./contracts.mjs";
import { jobForStage, assertStageExecutionAuthorized } from "./registry.mjs";
import { loadExecutor } from "./load-executor.mjs";
import { finishRun } from "./run-state.mjs";
import { requireIndependentStageQualification } from "./independent-stage-qualification.mjs";
import { isTypedPrivateStageRequest } from "./adapter-binding.mjs";

/**
 * D00 输入的唯一定义。授权器签发的 input_digest 与 Runner 实际执行的输入必须
 * 逐字节同源，所以 D00 的输入形状只在这里拼一次：研究意图 + 精确作用域 +
 * （可选）消费者方法计划 +（可选）分段材料。调用方没给就不追加对应键，
 * digest 与旧口径完全一致。
 */
export function buildSourceIntakeInput({ research_intent, scope, consumer_method_plan, sections } = {}) {
  return {
    research_intent,
    scope,
    ...(consumer_method_plan === undefined ? {} : { consumer_method_plan }),
    // 分段材料（catalog/coverage/verifications/priorities/acquisition）平铺在
    // D00 输入顶层，正是 worker 读取它们的位置；不给就一个键都不多。
    ...(sections ?? {}),
  };
}

export async function runProduction({ run, registry, context = {}, from_stage = "D00", to_stage = "D05" }) {
  const start = STAGE_ORDER.indexOf(from_stage);
  const end = STAGE_ORDER.indexOf(to_stage);
  if (start < 0 || end < 0 || start > end) throw new Error("STAGE_RANGE_INVALID");

  let state = run;
  let input = start === 0
    ? buildSourceIntakeInput(run)
    : context.resume_input;

  if (start > 0 && input == null) throw new Error(`RESUME_INPUT_REQUIRED:${from_stage}`);

  for (const stage of STAGE_ORDER.slice(start, end + 1)) {
    const job = jobForStage(registry, stage);
    // The one-use authorization handoff binds the active stage. Establish it
    // before the trusted verifier consumes its nonce; a resumed run may still
    // carry the previous stage's current_stage value.
    const previousStage = state.current_stage;
    state.current_stage = stage;
    try {
      await assertStageExecutionAuthorized({ registry, job, run: state, input, context });
    } catch (error) {
      state.current_stage = previousStage;
      throw error;
    }
    // CLI adapter modules may execute top-level code: evaluate only after authorization.
    if (!context.adapters && typeof context.loadAdapters === "function") {
      context = { ...context, adapters: await context.loadAdapters() };
    }
    const execute = await loadExecutor(stage);
    // Give the adapter the exact Registry already authorized by this Runner;
    // caller-supplied context.registry must never decide the security identity.
    const result = await execute({ run: state, job, input, context: { ...context, registry } });
    // A Producer PASS is only a candidate. Do not hand off L(n) to D(n+1)
    // until an independent current-qualified G(n) receipt binds exact input/output.
    if (result.disposition === "PASS") {
      try {
        const verified = await requireIndependentStageQualification({ context, run: state, stage, job, input, result });
        result.independent_qualification = verified;
      } catch (error) {
        const reason = String(error?.message || "INDEPENDENT_STAGE_QUALIFICATION_UNAVAILABLE");
        result.disposition = "HOLD";
        result.outputs = {};
        result.hold = {
          reason_code: "INDEPENDENT_GATE_NOT_VERIFIED",
          missing_requirement: "Current independent Gate PASS for the exact stage, input and output",
          next_action: "Obtain a qualified Reviewer decision and verify current status using a separate authorization context",
          recheck_condition: "Matching current independent qualification and unchanged dependencies",
          verification_error: reason,
        };
      }
    }
    state.stage_results.push(result);

    // 可选阶段进度回调（如 run.mjs 回写 control.production_runs.current_stage），不改变编排语义。
    if (typeof context.onStage === "function") await context.onStage(stage, result);

    if (result.disposition !== "PASS") return finishRun(state, result.disposition);

    // F02: only the declared contract output may become the next input.
    // A qualified producer candidate is NOT automatically a valid request for
    // another private stage. Fail closed with a persisted, stage-specific HOLD
    // rather than attempting to sign/execute a mismatched next-stage payload.
    const nextInput = result.outputs[STAGE_CONTRACTS[stage].output];
    const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
    if(nextStage && STAGE_ORDER.indexOf(nextStage) <= end &&
       state.scope?.original_id !== undefined &&
       !isTypedPrivateStageRequest(nextStage,nextInput)){
      state.current_stage=nextStage;
      const nextContract=STAGE_CONTRACTS[nextStage];
      const blocked={
        run_id:state.run_id,stage:nextStage,data_layer:nextContract.layer,
        gate:nextContract.gate,disposition:"HOLD",outputs:{},gate_evidence:{},
        content_stats:{},review_records:[],
        hold:{reason_code:"PRIVATE_NEXT_STAGE_REQUEST_NOT_READY",
          missing_requirement:"An approved upstream candidate must be transformed into the next typed professional stage request",
          next_action:"Adapt the existing professional producer to produce an evidence-bound next-stage request",
          recheck_condition:"Exact signed next-stage request and current upstream Gate qualification"},
      };
      state.stage_results.push(blocked);
      if(typeof context.onStage==="function")await context.onStage(nextStage,blocked);
      return finishRun(state,"HOLD");
    }
    input=nextInput;
  }
  return finishRun(state, "PASS");
}
