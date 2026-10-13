# Phase E｜Persistence Binding Contract V1.0

Stage executor owns persistence. Reusable capability does not own a second lifecycle.

| Stage | Writable semantic schema | Allowed control writes |
|---|---|---|
| D01 | `source.*` | `control.production_runs`, `control.gate_audits(G0)` |
| D02 | `evidence.*` | `control.gate_audits(G1)` |
| D03 | `world.*` | `control.gate_audits(G2)` |
| D04 | `meaning.*` | `control.gate_audits(G3)` |
| D05 | `read_model.*` | `control.gate_audits(G4)` |

Forbidden:
- D03 writing `meaning.*`;
- D04 rewriting `world.*`;
- D05 rewriting `world.*` or `meaning.*`;
- any stage writing `control.legacy_*`;
- runtime reading `control.legacy_*`;
- V1 public tables serving as new production SOT after cutover.
