/**
 * MAB HP12: professional knowledge qualification is NOT work-publication
 * Reviewer approval. An exact L5 artifact, its current G5, scope, purpose,
 * consumer and rights must be resolved for every public-facing facet.
 *
 * The current WorkRevision content has only narrative provenanceRefs; it has
 * no authoritative typed mapping to an independently signed G5 projection.
 * Do not reinterpret arbitrary strings, published pointers, legacy PASS or
 * approval records as a professional knowledge qualification.
 *
 * Until the formal KAD/MHKA mapping and independent per-consumer verifier are
 * implemented and proved, the new-publication gate MUST fail closed.
 * This is intentional; existing legal drafts and review records are retained.
 */
export type WorkPublicationG5Result =
  | { ok: true }
  | { ok: false; reason: "independent_g5_required" };

export async function requireIndependentWorkPublicationG5(
  _workId: string,
  _revisionId: string,
  _content: Record<string, unknown>,
): Promise<WorkPublicationG5Result> {
  return { ok: false, reason: "independent_g5_required" };
}

/**
 * Public consumers require their OWN current qualification; an approval for
 * work publication, producer, visual_stage or agent never transfers to watch.
 * No lawful WorkRevision -> per-facet L5 current G5 mapping exists yet, so
 * do not disclose any public content while this exact verification is absent.
 */
export async function requireCurrentWorkConsumerQualification(
  _workId: string,
  _revisionId: string,
  _consumer: "watch" | "visual_stage" | "agent" | "evidence_on_demand",
  _content: Record<string, unknown>,
): Promise<WorkPublicationG5Result> {
  return { ok: false, reason: "independent_g5_required" };
}
