import crypto from "node:crypto";

export function createRunState({ research_intent, scope = {}, execution_mode = "attended", run_id } = {}) {
  if (!research_intent) throw new Error("RESEARCH_INTENT_REQUIRED");
  if (!["attended","unattended","batch","interactive"].includes(execution_mode)) {
    throw new Error(`EXECUTION_MODE_INVALID:${execution_mode}`);
  }
  return {
    run_id: run_id || crypto.randomUUID(),
    research_intent,
    scope,
    execution_mode,
    status: "RUNNING",
    current_stage: null,
    stage_results: [],
    started_at: new Date().toISOString(),
    finished_at: null,
  };
}

export function finishRun(state, status) {
  return { ...state, status, finished_at: new Date().toISOString() };
}
