const TABLE = {
  world_projection: "read_model.world_projections",
  agent_context: "read_model.agent_contexts",
  story_seed: "read_model.story_seeds",
  discovery_path: "read_model.discovery_paths",
  map_timeline_projection: "read_model.map_timeline_projections",
  evidence_pointer: "read_model.evidence_pointers",
};

const ID = {
  world_projection: "projection_id",
  agent_context: "agent_context_id",
  story_seed: "story_seed_id",
  discovery_path: "discovery_path_id",
  map_timeline_projection: "map_timeline_projection_id",
  evidence_pointer: "evidence_pointer_id",
};

export function createReadModelRepository(db) {
  if (!db || typeof db.query !== "function") throw new Error("DB_QUERY_INTERFACE_REQUIRED");

  return {
    async listRuntimeEligible(kind) {
      const table = TABLE[kind];
      if (!table) throw new Error(`UNKNOWN_READ_MODEL_KIND:${kind}`);
      const { rows } = await db.query(
        `select t.* from ${table} t
         join control.g4_pass_read_models g
           on g.object_type=$1 and g.object_id=t.${ID[kind]}`, [kind]
      );
      return rows;
    },

    async getRuntimeEligible(kind, id) {
      const table = TABLE[kind];
      if (!table) throw new Error(`UNKNOWN_READ_MODEL_KIND:${kind}`);
      const { rows } = await db.query(
        `select t.* from ${table} t
         join control.g4_pass_read_models g
           on g.object_type=$1 and g.object_id=t.${ID[kind]}
         where t.${ID[kind]}=$2 limit 1`, [kind, id]
      );
      return rows[0] ?? null;
    }
  };
}
