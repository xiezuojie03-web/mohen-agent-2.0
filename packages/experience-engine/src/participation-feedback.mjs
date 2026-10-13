const CULTURAL_SIGNAL_EVENTS = new Set([
  "field_observation",
  "correction",
  "oral_history_lead",
  "place_memory",
  "living_practice_observation",
  "media_contribution",
]);

export function toParticipationEvent(input) {
  if (!input?.event_type) throw new Error("PARTICIPATION_EVENT_TYPE_REQUIRED");
  return {
    participation_id: input.participation_id,
    session_id: input.session_id ?? null,
    event_type: input.event_type,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    experience_ref: input.experience_ref ?? null,
    place_context: input.place_context ?? null,
    time_context: input.time_context ?? null,
    payload: input.payload ?? {},
    user_assertion: input.user_assertion ?? null,
    field_observation: input.field_observation ?? null,
    privacy_class: input.privacy_class ?? "interaction",
  };
}

export function participationToLivingTrace(event, { consent = false } = {}) {
  if (!CULTURAL_SIGNAL_EVENTS.has(event.event_type)) return null;
  if (!consent) throw new Error("LIVING_TRACE_CONSENT_REQUIRED");
  return {
    living_trace_id: event.participation_id,
    source_participation_ids: [event.participation_id],
    trace_type: event.event_type,
    observed_at: event.occurred_at,
    place_context: event.place_context,
    claim_as_observed: event.field_observation ?? event.user_assertion ?? event.payload?.observation ?? null,
    media_refs: event.payload?.media_refs ?? [],
    observer_context: event.payload?.observer_context ?? null,
    consent: true,
    uncertainty: event.payload?.uncertainty ?? {},
    status: "candidate",
  };
}

export function livingTraceToD01SourceLead(trace) {
  if (!trace || trace.status !== "candidate" || trace.consent !== true) {
    throw new Error("INVALID_L7_SOURCE_LEAD");
  }
  return {
    research_intent: "Assess a living-culture observation as a new cultural source lead",
    source_lead: {
      source_class: "living_culture_observation",
      provenance: {
        participation_ids: trace.source_participation_ids,
        observed_at: trace.observed_at,
        observer_context: trace.observer_context,
        consent: trace.consent,
      },
      place_scope: trace.place_context,
      observed_claim: trace.claim_as_observed,
      media_refs: trace.media_refs,
      uncertainty: trace.uncertainty,
    }
  };
}
