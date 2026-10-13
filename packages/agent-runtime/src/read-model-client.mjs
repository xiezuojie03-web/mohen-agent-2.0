const ALLOWED_L4 = new Set([
  "world_projection",
  "agent_context",
  "story_seed",
  "discovery_path",
  "map_timeline_projection",
  "evidence_pointer",
]);

export function assertL4Resource(kind) {
  if (!ALLOWED_L4.has(kind)) throw new Error(`AGENT_DIRECT_LOWER_LAYER_READ_FORBIDDEN:${kind}`);
  return true;
}

export function createReadModelClient(repository) {
  if (!repository || typeof repository.listRuntimeEligible !== "function") {
    throw new Error("READ_MODEL_REPOSITORY_REQUIRED");
  }
  return {
    async list(kind, query = {}) {
      assertL4Resource(kind);
      return repository.listRuntimeEligible(kind, query);
    },
    async get(kind, id) {
      assertL4Resource(kind);
      return repository.getRuntimeEligible(kind, id);
    },
  };
}
