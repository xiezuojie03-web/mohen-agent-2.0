const MAP = {
  D01: () => import("../executors/d01-source-intake.mjs"),
  D02: () => import("../executors/d02-material-understanding.mjs"),
  D03: () => import("../executors/d03-world-construction.mjs"),
  D04: () => import("../executors/d04-humanistic-discovery.mjs"),
  D05: () => import("../executors/d05-read-model-publication.mjs"),
};
export async function loadExecutor(stage) {
  const load = MAP[stage];
  if (!load) throw new Error(`EXECUTOR_NOT_FOUND:${stage}`);
  return (await load()).default;
}
