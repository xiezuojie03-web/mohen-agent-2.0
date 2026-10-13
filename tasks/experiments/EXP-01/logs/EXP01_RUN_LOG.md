# EXP-01 Run Log（机器侧摘要，非内容审阅）

```text
run_id:        EXP-01
executor:      CodeBuddy
date:          2026-10-07
protocol:      MoHen_Data_Production_Protocol V4.0
gates:         G0-G4 Machine Gate Contract V2.0

D01/G0  run_id=EXP-01-D01-G0  PASS  (15 checked / 13 pass / 2 hold[legacy-only])
D02/G1  run_id=EXP-01-D02-G1  PASS  (18 checked / 16 pass / 2 hold)
D03/G2  run_id=EXP-01-D03-G2  PASS  (34 checked / 32 pass / 2 hold)
D04/G3  run_id=EXP-01-D04-G3  PASS  (6 checked  / 5 pass  / 1 hold->drop)
D05/G4  run_id=EXP-01-D05-G4  PASS  (9 checked  / 9 pass  / 0 hold)

counts:
  G0_source_count        = 15
  G1_evidence_count      = 16
  G2_world_object_count  = 32
  G3_finding_count       = 5
  G4_runtime_object_count= 9

source_classes_used:
  A. Legacy Lead (hushang_legacy/scc_legacy) - LEAD ONLY, 0 Evidence晋级
  B. shanghai_library (S1) - 6 records reused from TASK-0011 acquisition
  C. qingpu_government / shanghai_qingpu_museum / shanghai_local_chronicles_office /
     qingpu_government(文明网) / historical_gazetteer(识典古籍章练小志) - S1/S2

constraints_honored:
  - 未大规模抓取上海图书馆（无 API key，仅复用已登记 S1）
  - 未扩到 11 镇（仅金泽/朱家角/练塘）
  - 未将 Legacy 转 Evidence/Fact
  - 未降低任何 Gate
  - 未修改架构 / DB schema / hushang-jingwei
  - 未 Production deploy / push main

11_TOWN_RECOMMENDATION = REDUCE_TO_THEMATIC_CLUSTERS
EXP01_STATUS            = PASS
```

> 本文件为 run 摘要，供审计；项目拥有者内容审阅见各 D0X_HUMAN_REVIEW.md。
