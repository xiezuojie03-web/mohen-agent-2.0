import {consumerContext} from '../kad1-policy.mjs';
import type {Ledger} from '../studio/tool-ledger';

/** A persisted research request is not proof of provider execution or knowledge. */
export class ResearchPrerequisiteHold extends Error {
  constructor(public readonly missingRequirements: string[], public readonly partialResult?: {
    decision: unknown; degraded: boolean; researchLeads: unknown[];
  }) {
    super('RESEARCH_PREREQUISITES_HOLD');
    this.name = 'ResearchPrerequisiteHold';
  }
}

export function requireResearchPrerequisites(ledger?: Ledger) {
  const missing: string[] = [];
  // Match the actual llmUnderstand configuration, not the unrelated optional
  // entity-extraction fallback key. Presence is readiness, never spend authority.
  if (!process.env.MOHEN_LLM_BASE_URL?.trim() || !process.env.MOHEN_LLM_API_KEY?.trim())
    missing.push('REAL_PROVIDER_UNAVAILABLE');
  // Source acquisition credentials belong to a verified D00 need, not to
  // every Studio research/read request. No source fetch is authorized here.
  const context = consumerContext('agent');
  if (!context || context.scope.requested_action !== 'read')
    missing.push('AGENT_QUALIFICATION_CONTEXT_REQUIRED');
  if (!ledger) missing.push('PERSISTENT_TOOL_LEDGER_REQUIRED');
  if (missing.length) throw new ResearchPrerequisiteHold(missing);
  return {consumer: 'agent' as const, ...context!};
}
