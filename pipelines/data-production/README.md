# MoHen Data Production Execution

This is the only target production execution entry.

```text
run.mjs
  → orchestrator
  → D01 executor → G0
  → D02 executor → G1
  → D03 executor → G2
  → D04 executor → G3
  → D05 executor → G4
  → machine report + human review report
```

Rules:
- no Discovery/Directed lifecycle switch;
- no N01–N06 top-level chain;
- no `bridge-to-directed`;
- stage executor owns one D/L/G only;
- adapters may be reusable but cannot own stage PASS or cross-layer final writes;
- persistence is wired after Phase E physical schema is frozen;
- no hidden fallback to `pipelines/research` or `pipelines/legacy`.
