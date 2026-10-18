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

/**
 * 双读消费者（G5 独立裁决的 consumer 维度）。
 * 视觉舞台与墨痕 Agent 各自审核、分别验权；允许一方撤权而另一方保留独立已批准的消费分面。
 */
export const CONSUMERS = Object.freeze(["visual_stage", "agent"]);

export function assertConsumer(c) {
  if (c == null) return true; // 未声明：仅限内部审计全量，消费端必须显式声明 consumer
  if (!CONSUMERS.includes(c)) throw new Error(`UNKNOWN_CONSUMER:${c}`);
  return true;
}

export function createReadModelRepository(db) {
  if (!db || typeof db.query !== "function") throw new Error("DB_QUERY_INTERFACE_REQUIRED");

  return {
    /**
     * 只返回该 consumer 名下 G5 PASS 且 current_valid=true 的六类 L5 修订。
     * opts.consumer 未声明时返回全量 G5 PASS（仅内部审计，不用于消费者读取）。
     */
    async listRuntimeEligible(kind, opts = {}) {
      const table = TABLE[kind];
      if (!table) throw new Error(`UNKNOWN_READ_MODEL_KIND:${kind}`);
      assertConsumer(opts.consumer);
      const consumerClause = opts.consumer ? " and g.consumer = $2" : "";
      const params = opts.consumer ? [kind, opts.consumer] : [kind];
      const { rows } = await db.query(
        `select t.* from ${table} t
         join control.gate_audits g
           on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
          and g.object_type=$1 and g.object_id=t.${ID[kind]}${consumerClause}`, params
      );
      return rows;
    },

    async getRuntimeEligible(kind, id, opts = {}) {
      const table = TABLE[kind];
      if (!table) throw new Error(`UNKNOWN_READ_MODEL_KIND:${kind}`);
      assertConsumer(opts.consumer);
      const consumerClause = opts.consumer ? " and g.consumer = $3" : "";
      const params = opts.consumer ? [kind, id, opts.consumer] : [kind, id];
      const { rows } = await db.query(
        `select t.* from ${table} t
         join control.gate_audits g
           on g.gate_code='G5' and g.result='PASS' and g.current_valid=true
          and g.object_type=$1 and g.object_id=t.${ID[kind]}${consumerClause}
         where t.${ID[kind]}=$2 limit 1`, params
      );
      return rows[0] ?? null;
    }
  };
}
