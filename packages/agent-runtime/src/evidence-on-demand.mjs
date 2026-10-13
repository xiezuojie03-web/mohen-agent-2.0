export function createEvidenceOnDemandService(lineageRepository) {
  const required = ["getEvidencePointer","getFinding","getWorldObject","getEvidence","getSource"];
  for (const fn of required) {
    if (typeof lineageRepository?.[fn] !== "function") throw new Error(`LINEAGE_REPOSITORY_REQUIRED:${fn}`);
  }

  return {
    async traceFromPointer(pointerId) {
      const pointer = await lineageRepository.getEvidencePointer(pointerId);
      if (!pointer) throw new Error("EVIDENCE_POINTER_NOT_FOUND");

      const chain = { pointer, findings: [], world_objects: [], evidence: [], sources: [] };

      for (const findingId of pointer.finding_ids || []) {
        const finding = await lineageRepository.getFinding(findingId);
        if (!finding) continue;
        chain.findings.push(finding);

        for (const ref of finding.world_refs || []) {
          const obj = await lineageRepository.getWorldObject(ref);
          if (!obj) continue;
          chain.world_objects.push(obj);

          for (const evidenceId of obj.evidence_ids || []) {
            const evidence = await lineageRepository.getEvidence(evidenceId);
            if (!evidence) continue;
            chain.evidence.push(evidence);
            const source = await lineageRepository.getSource(evidence.source_id);
            if (source) chain.sources.push(source);
          }
        }
      }

      return dedupeChain(chain);
    }
  };
}

function dedupeBy(items, key) {
  const seen = new Set();
  return items.filter(x => {
    const v = x?.[key];
    if (!v || seen.has(v)) return false;
    seen.add(v); return true;
  });
}

function dedupeChain(chain) {
  return {
    pointer: chain.pointer,
    findings: dedupeBy(chain.findings, "finding_id"),
    world_objects: dedupeBy(chain.world_objects, "object_ref"),
    evidence: dedupeBy(chain.evidence, "evidence_id"),
    sources: dedupeBy(chain.sources, "source_id"),
  };
}
