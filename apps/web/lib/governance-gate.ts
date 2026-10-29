// apps/web/lib/governance-gate.ts
//
// 治理级 gate 写入：承载"资产晋级 / 作品回流"等非生产动作的资格记录。
// gate_audits.run_id 是 NOT NULL FK → control.production_runs，故先建一个「治理 run」
// （execution_mode=attended，非生产）作为 gate 记录的宿主，再写 append-only + current_valid 的 G5。
// 遵守 R15：任何对象标「可用/已发布」都必须有对应门禁记录，不得无记录晋级。
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

/** 写 G5 治理 gate（append-only + current_valid；先失效同键旧决策，再插新决策）。 */
export async function writeGovernanceGate(
  runId: string,
  objectType: string,
  objectId: string,
  consumer: string,
  details: Record<string, unknown>
): Promise<void> {
  await run(
    `update control.gate_audits set current_valid = false
     where gate_code = 'G5' and object_type = :'otype' and object_id = :'oid'::uuid
       and consumer is not distinct from :'consumer' and current_valid = true`,
    { otype: objectType, oid: objectId, consumer }
  );
  await run(
    `insert into control.gate_audits
     (run_id, stage, gate_code, object_type, object_id, result, reason_codes, guard_versions, details,
      checked_at, architecture_generation, current_valid, consumer)
     values (:'run_id'::uuid, 'D05', 'G5', :'otype', :'oid'::uuid, 'PASS', '{}'::text[], '{}'::jsonb,
             :'details'::jsonb, now(), :'arch', true, :'consumer')`,
    { run_id: runId, otype: objectType, oid: objectId, details: JSON.stringify(details), arch: ARCH, consumer }
  );
}
