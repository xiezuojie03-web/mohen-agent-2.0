// Agent 侧 L5 只读消费入口（双读 consumer 分面）。
//
// 六类 L5 资源：world_projection / agent_context / story_seed / discovery_path /
// map_timeline_projection / evidence_pointer。消费端只读经 G5 PASS 且 current_valid=true
// 的修订；不允许直读下层物理表（source/evidence/world/meaning）。
//
// 双读约束（P07 / G5 V3.0 合同 §4）：
//   视觉舞台（visual_stage）与墨痕 Agent（agent）各自独立验权；本客户端默认 consumer=agent，
//   由调用方显式覆盖 visual_stage 或经 createReadModelRepository 分面读取。

const ALLOWED_L5 = new Set([
  "world_projection",
  "agent_context",
  "story_seed",
  "discovery_path",
  "map_timeline_projection",
  "evidence_pointer",
]);

export function assertL5Resource(kind) {
  if (!ALLOWED_L5.has(kind)) throw new Error(`AGENT_DIRECT_LOWER_LAYER_READ_FORBIDDEN:${kind}`);
  return true;
}

// 旧代际命名兼容（语义不变：Agent 只允许六类 L5 资源，禁止下层物理表直读）。
export const assertL4Resource = assertL5Resource;

export function createReadModelClient(repository, { consumer = "agent" } = {}) {
  if (!repository || typeof repository.listRuntimeEligible !== "function") {
    throw new Error("READ_MODEL_REPOSITORY_REQUIRED");
  }
  return {
    async list(kind, query = {}) {
      assertL5Resource(kind);
      return repository.listRuntimeEligible(kind, { ...query, consumer: query.consumer ?? consumer });
    },
    async get(kind, id, query = {}) {
      assertL5Resource(kind);
      return repository.getRuntimeEligible(kind, id, { ...query, consumer: query.consumer ?? consumer });
    },
  };
}
