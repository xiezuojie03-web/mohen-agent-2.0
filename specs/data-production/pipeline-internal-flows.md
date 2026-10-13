# MoHen Data Production｜Pipeline Internal Flows

**Status: TARGET CONTRACT · Phase C**  
**Execution implementation is completed later; this file defines allowed flow, not current runner availability.**

## 1. Official lifecycle

```text
D01 / L0 / G0
↓
D02 / L1 / G1
↓
D03 / L2 / G2
↓
D04 / L3 / G3
↓
D05 / L4 / G4
↓
L5 Runtime
```

There is no second official Discovery/Directed lifecycle.

`broad / directed / mixed` may be used as search/research strategies inside a stage.

## 2. Stage responsibility

| Stage | Writes | Exit |
|---|---|---|
| D01 Source Intake | L0 | G0 |
| D02 Material Understanding | L1 | G1 |
| D03 World Construction | L2 | G2 |
| D04 Humanistic Discovery | L3 | G3 |
| D05 Read Model Publication | L4 | G4 |

A registered Job may only own one primary Stage/Data Layer/Gate triple.

## 3. Reusable capability calls

OCR, map reading, visual reading, name resolution helpers, spatial parsers, source-dependency detection and lineage utilities may be reused across stages.

Reusable capability rules:
- no independent Stage PASS;
- no cross-layer final writes;
- caller Stage owns persistence and Gate responsibility.

## 4. Feedback loop

```text
L4 → L5 → L6 Participation → L7 Living Culture → D01
```

L6/L7 never bypass D01 and never write historical Truth directly.
