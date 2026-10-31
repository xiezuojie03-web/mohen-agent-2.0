// apps/web/lib/governance-gate.ts
//
// Legacy governance run compatibility. It must never confer professional G qualification.
import { queryValue, run } from "@mohen/data-access";

const ARCH = "mohen.six-stage.v1";

/** 创建治理 run（承载非生产动作的 gate 记录），返回 run_id。 */
export async function createGovernanceRun(intent: string): Promise<string> {
  const runId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into control.production_runs
     (run_id, research_intent, scope, execution_mode, status, started_at, finished_at, metadata, architecture_generation)
     values (:'run_id'::uuid, :'intent', '{}'::jsonb, 'attended', 'PASS', now(), now(), '{}'::jsonb, :'arch')`,
    { run_id: runId, intent, arch: ARCH }
  );
  return runId!;
}

/** Legacy callers fail closed; only the independent signing transaction can issue G. */
export async function writeGovernanceGate(
  runId: string,
  objectType: string,
  objectId: string,
  consumer: string,
  details: Record<string, unknown>
): Promise<void> {
  // Work approval and Operator identity never confer professional Gate authority.
  throw new Error("INDEPENDENT_GATE_REQUIRED");
}
