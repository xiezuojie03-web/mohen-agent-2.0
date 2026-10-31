// Work publication is not professional knowledge qualification. Reflow must go
// through the existing D05 candidate path and independently authorized G5.
// The old direct read_model write + self-signed G5 path is deliberately closed.
export async function reflowWorkToAssets(workId: string, revisionId: string): Promise<{ reflowed: number; seedKey: string; reason?: string }> {
  return { reflowed: 0, seedKey: `work-${workId}-${revisionId.slice(0, 8)}`, reason: "independent_gate_required" };
}
