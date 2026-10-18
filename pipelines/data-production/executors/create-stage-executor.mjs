import { assertHandoff, STAGE_CONTRACTS } from "../orchestrator/contracts.mjs";
import { requireStageAdapter } from "../adapters/adapter-contract.mjs";

export function createStageExecutor(stage) {
  const contract = STAGE_CONTRACTS[stage];
  if (!contract) throw new Error(`UNKNOWN_STAGE:${stage}`);

  return async function execute({ run, job, input, context = {} }) {
    if (job.stage !== stage) throw new Error(`EXECUTOR_JOB_STAGE_MISMATCH:${stage}`);
    const adapter = requireStageAdapter(context.adapters, stage);
    const raw = await adapter({ run, job, input, context });
    const disposition = String(raw?.disposition || "").toUpperCase();

    const result = {
      run_id: run.run_id,
      stage,
      data_layer: contract.layer,
      gate: contract.gate,
      disposition,
      outputs: {},
      gate_evidence: raw?.gate_evidence || {},
      content_stats: raw?.content_stats || {},
      review_records: raw?.review_records || [],
    };

    if (disposition === "PASS") result.outputs[contract.output] = raw.output;
    if (disposition === "HOLD") result.hold = raw.hold;
    if (disposition === "REJECT") result.reject = raw.reject;
    // 控制职责输出（如 D05 P08 的失效分析/暂停/重审请求）不属于 L5 内容，透传不回写 Gate。
    if (raw?.control_outputs) result.control_outputs = raw.control_outputs;

    assertHandoff(stage, result);
    return result;
  };
}
