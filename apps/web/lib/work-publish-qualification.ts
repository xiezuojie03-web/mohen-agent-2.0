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
