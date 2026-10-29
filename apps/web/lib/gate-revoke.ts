// apps/web/lib/gate-revoke.ts — E1-7 P08 精准失效的运行时接线（CR-10）
//
// 撤权：立即把受影响对象的 G5 当前有效资格置为失效（读路径 join current_valid=true 即刻排除，
// 不等待新的 G5 PASS），并记录 invalidation_event 审计。不自行追加 REVOKED gate 裁决
// （那是独立 Gate 的职责），不复活旧修订，不清空无关分面。

import { queryValue, run } from "@mohen/data-access";

export interface RevokeInput {
  objectType: string;
  objectId: string;
  reason?: string;
}

export interface RevokeResult {
  ok: boolean;
  reason?: string;
  invalidatedGates: number;
  invalidationEventId?: string;
}

export async function revokeGate(input: RevokeInput): Promise<RevokeResult> {
  const { objectType, objectId, reason = "" } = input;
  if (!objectType || !objectId) return { ok: false, reason: "object_required", invalidatedGates: 0 };

  // 1. 立即阻断：该对象的 G5 当前有效资格置为失效（读路径即刻排除，先阻断再重审）。
  await run(
    `update control.gate_audits
     set current_valid = false
     where object_type = :'otype' and object_id = :'oid' and gate_code = 'G5' and current_valid = true`,
    { otype: objectType, oid: objectId }
  );

  // 2. 记录 invalidation_event（P08 审计；affected 分面由 computePreciseInvalidation 在完整 P08 时补）。
  const changed = { type: objectType, id: objectId };
  const eventId = await queryValue("select gen_random_uuid()::text");
  await run(
    `insert into control.invalidation_events
       (invalidation_event_id, change_event_ref, changed_dependency_ref, reason, disposition, producer_method_id, unknown_dependency)
     values (:'id', '{}'::jsonb, :'changed'::jsonb, :'reason', 'BLOCKED', 'P08', false)`,
    { id: eventId!, changed: JSON.stringify(changed), reason: reason || "rights_revoked" }
  );

  const invalidated = Number(
    (await queryValue(
      "select count(*) from control.gate_audits where object_type = :'otype' and object_id = :'oid' and gate_code = 'G5' and current_valid = false",
      { otype: objectType, oid: objectId }
    )) ?? 0
  );

  return { ok: true, invalidatedGates: invalidated, invalidationEventId: eventId ?? undefined };
}
