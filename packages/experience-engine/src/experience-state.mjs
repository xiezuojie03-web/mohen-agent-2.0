export const ACTIONS = new Set([
  "map.focus","map.showLayer","map.hideLayer","map.compare","map.showRelation",
  "time.set","time.compare","image.show","image.compare",
  "entity.focus","entity.open","story.reveal","story.next","evidence.open",
  "route.propose","route.start","experience.patch","experience.replace",
  "agent.ask","agent.propose"
]);

export function createExperienceState(seed = {}) {
  return {
    goal: seed.goal ?? null,
    intent: seed.intent ?? null,
    place: seed.place ?? null,
    period: seed.period ?? null,
    theme: seed.theme ?? null,
    depth: seed.depth ?? "standard",
    focus: seed.focus ?? null,
    viewport: seed.viewport ?? null,
    time: seed.time ?? {},
    visual: seed.visual ?? {},
    discovery: seed.discovery ?? {},
    narrative: seed.narrative ?? {},
    evidence: seed.evidence ?? {},
    route: seed.route ?? {},
    trail: seed.trail ?? { nodes: [], branch: null },
    nextActions: seed.nextActions ?? [],
    agentMessage: seed.agentMessage ?? null,
    uiPreferences: seed.uiPreferences ?? { visibility:"expanded", dock:"split", size:null, position:null },
  };
}

export function restoreSemanticSnapshot(current, snapshot) {
  const latestPreferences = current.uiPreferences;
  return { ...createExperienceState(snapshot), uiPreferences: latestPreferences };
}

export function assertExperienceAction(action) {
  if (!action || !ACTIONS.has(action.type)) throw new Error(`UNREGISTERED_EXPERIENCE_ACTION:${action?.type}`);
  return true;
}
