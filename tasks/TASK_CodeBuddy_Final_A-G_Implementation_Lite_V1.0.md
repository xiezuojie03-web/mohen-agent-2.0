# TASK｜MoHen A–G 最终轻量实施

**版本：V1.0 · 2026-10-07**  
**执行者：CodeBuddy**  
**实施原则：新体系直接落地，旧数据冻结保留，不做复杂迁移**

---

# 0｜任务目标

以：

```text
MoHen_Data_Production_Final_A-G_20261007.zip
```

作为唯一 Target Package，将 A–G 最终数据生产体系落实到真实：

```text
mohen-agent-2.0 Repo
+
本地 PostgreSQL mohen_dev
```

本任务采用：

> **新体系直接建立，旧数据不迁移。**

旧 `public` 数据和旧生命周期不再作为新体系输入真源。

---

# 1｜核心实施策略

不做：

```text
37 张旧表逐表 backfill
旧 G0–G6 → 新 G0–G4 状态迁移
旧 review / research workspace 数据转换
复杂数据回滚工程
旧数据重新清洗
旧数据批量 re-gating
```

改为：

```text
旧 public 数据
→ 原地冻结
→ 不删除
→ 不修改
→ 不再作为新体系 SOT

新体系
→ 创建 source / evidence / world / meaning / read_model / control
→ 从空状态开始
→ 后续数据重新生产
```

---

# 2｜安全策略：最小化

因为本任务不删除、不覆盖旧数据库数据，所以无需做完整数据库备份工程。

实施前只做：

```text
1. pg_dump --schema-only
2. TABLE_ROW_COUNTS_BEFORE.md
3. 记录 PostgreSQL version / database name
```

输出：

```text
implementation_artifacts/preflight/
├── DB_SCHEMA_BEFORE.sql
├── DB_TABLE_COUNTS_BEFORE.md
└── DB_ENVIRONMENT.md
```

不得导出：

```text
完整数据 dump
旧数据内容
.env
密码
DATABASE_URL
```

## STOP

如果实施过程中出现任何需要：

```text
DROP old public table
ALTER destructive
DELETE old data
TRUNCATE
```

立即 STOP。

本任务没有授权破坏旧数据。

---

# 3｜Repo 处理

先记录：

```text
branch
commit_hash
git status --short
```

当前 Repo dirty 时：

- 不 reset；
- 不 clean；
- 不覆盖用户未提交修改；
- 只对与 Target 冲突的文件做显式 merge。

无需完整冷备 Repo。

但必须保留：

```text
git diff > implementation_artifacts/preflight/GIT_DIFF_BEFORE.patch
```

---

# 4｜落实最终目录树

目标：

```text
mohen-agent-2.0/
├── AGENTS.md
├── CURRENT.md
├── OWNERSHIP_MAP.md
├── DATA_PRODUCTION_MAP.md
├── governance/
├── specs/
├── skills/
├── pipelines/
├── scripts/
├── packages/
├── supabase/
├── tests/
├── verification/
└── tasks/
```

不得按：

```text
D01/
D02/
D03/
...
```

建立 Repo 主目录。

---

# 5｜落实 Authority / Contract / Registry

优先安装：

```text
CURRENT.md
AGENTS.md
OWNERSHIP_MAP.md

governance/C0–C4

specs/DATA_CONTRACT.md

specs/data-production/
├── MoHen_Data_Production_Protocol.md
├── production-registry.json
├── PHYSICAL_DATA_MODEL_V2.md
├── PERSISTENCE_BINDING_CONTRACT.md
├── L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md
├── naming-map.json
├── gates/
└── templates/
```

验证：

```text
D01/L0/G0
D02/L1/G1
D03/L2/G2
D04/L3/G3
D05/L4/G4
```

---

# 6｜落实 Skill / Executor

Stage Owner：

```text
mohen-source-intake
mohen-material-understanding
mohen-world-construction
mohen-humanistic-discovery
mohen-read-model-publication
```

唯一正式执行入口：

```text
pipelines/data-production/run.mjs
```

五个 executor：

```text
d01-source-intake.mjs
d02-material-understanding.mjs
d03-world-construction.mjs
d04-humanistic-discovery.mjs
d05-read-model-publication.mjs
```

禁止恢复：

```text
research-pipeline lifecycle
bridge-to-directed
Discovery / Directed dual lifecycle
N01–N06
unattended-runner lifecycle owner
```

---

# 7｜package.json / Guard 清理

检查并清理旧 active scripts，例如：

```text
guard:research
guard:promotion
guard:triage
```

它们不得把旧 Research Workspace / old promotion lifecycle 当成新体系必备结构。

最终 active guards 至少：

```text
guard:registry:v3
guard:no-legacy-production-entry
guard:stage-handoff
guard:physical-model
guard:runtime-boundary
guard:e2e-completeness
guard:cross-layer-write
```

---

# 8｜数据库：只建立新体系

只应用：

```text
supabase/migrations/202610070100_data_production_v2_baseline.sql
```

目标创建：

```text
source
evidence
world
meaning
read_model
control
```

本任务 **不执行**：

```text
202610070200_legacy_v1_to_v2_backfill.sql
```

也不执行旧数据迁移。

旧 `public` schema：

```text
保持原样
不删
不改
不作为新 SOT
```

---

# 9｜新体系初始状态

完成 baseline 后必须验证：

```text
source.*        = empty or only new-test rows
evidence.*      = empty or only new-test rows
world.*         = empty or only new-test rows
meaning.*       = empty or only new-test rows
read_model.*    = empty or only new-test rows
control.gate_audits = empty
```

测试产生的数据必须：

```text
transaction rollback
或
测试后清理
```

最终正式新体系从干净状态开始。

---

# 10｜Persistence Binding

落实：

```text
packages/data-access/
pipelines/data-production/adapters/
```

新生产代码必须：

```text
D01 → source.*
D02 → evidence.*
D03 → world.*
D04 → meaning.*
D05 → read_model.*
```

正式生产代码不得继续以旧 `public.*` 表作为新 Truth Store。

旧 `public.*` 可以保留只读参考，但不得作为正式 Production Entry。

---

# 11｜Gate

使用：

```text
specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md
```

新体系从第一条新 Source 开始执行：

```text
G0
G1
G2
G3
G4
```

无需重新 Gate 旧数据库记录。

---

# 12｜Stage Reports

确认 D01–D05 均可生成：

```text
Machine Gate Report
Human Review Stage Report
```

模板：

```text
specs/data-production/templates/
```

本次不用为旧数据生成历史报告。

只需要证明：

```text
报告生成链可运行
```

可使用最小 fixture / synthetic test data。

---

# 13｜Phase F Runtime

落实并验证：

```text
packages/agent-runtime/
packages/experience-engine/
```

默认：

```text
Agent/UI → G4 PASS L4 only
```

禁止默认直读：

```text
L0–L3
```

---

# 14｜Evidence on Demand

验证：

```text
L4
→ L3
→ L2
→ L1
→ L0
```

必须只读。

允许使用 fixture / controlled new test data。

---

# 15｜L6 → L7 → D01

验证：

```text
Participation
→ cultural signal + consent/provenance
→ Living Culture Candidate
→ D01 Source Lead
```

普通 telemetry：

```text
不得成为文化资料
```

---

# 16｜最终验证

至少运行：

```text
pnpm test:data-production
pnpm test:phase-f
pnpm test:phase-g

pnpm guard:registry:v3
pnpm guard:no-legacy-production-entry
pnpm guard:stage-handoff
pnpm guard:physical-model
pnpm guard:runtime-boundary
pnpm guard:e2e-completeness
pnpm guard:cross-layer-write

pnpm build
git diff --check
```

如果最终 `pnpm guard` 已清理为新体系：

```text
pnpm guard
```

也必须 PASS。

---

# 17｜旧体系处理

不要做大规模旧文件清理工程。

只要求：

```text
旧 lifecycle 不再是 active entry
旧 public DB 不再是新 SOT
```

旧代码：

- 若不会干扰新入口，可以先放 `legacy/` 或 `archive/`；
- 若迁移风险较高，可暂时原位保留，但必须从 Registry / package scripts / AGENTS / CURRENT 中退出 active 状态。

目标是：

> **先让新体系成为唯一正式入口，不追求一次把所有旧垃圾清干净。**

---

# 18｜不得执行

```text
不做 legacy backfill
不做旧数据清洗
不做旧数据重判
不删除旧 public tables
不删除旧数据库数据
不做全库数据 backup
不做 Production deploy
不 push
不 merge main
不改 hushang-jingwei
```

---

# 19｜最终输出

生成：

```text
MoHen_Final_Implementation_Result_Lite_20261007/
├── IMPLEMENTATION_REPORT.md
├── CHANGE_MANIFEST.md
├── VALIDATION_REPORT.md
├── GIT_STATUS_BEFORE.txt
├── GIT_STATUS_AFTER.txt
├── DB_SCHEMA_BEFORE.sql
├── DB_TABLE_COUNTS_BEFORE.md
├── DB_TABLE_COUNTS_AFTER.md
└── logs/
```

压缩：

```text
MoHen_Final_Implementation_Result_Lite_20261007.zip
```

---

# 20｜IMPLEMENTATION_REPORT 必须回答

```text
1. Target Package SHA256
2. Repo branch / commit
3. Dirty-tree conflicts
4. 新 Authority / Contract 是否归位
5. Production Entry 是否唯一
6. 新 V2 schemas 是否建立
7. old public schema 是否保持未修改
8. legacy backfill = NOT RUN
9. new Gate audit 初始状态
10. Agent L4-only proof
11. Evidence on Demand proof
12. L6→L7→D01 proof
13. tests / guards / build
14. old lifecycle 是否退出 active
15. unresolved risks
16. final git status
17. Production deploy = NO
```

---

# 21｜成功标准

全部满足才可以：

```text
FINAL_IMPLEMENTATION_STATUS = PASS
```

成功标准：

```text
Final A–G files installed
One official Production Entry
V2 semantic schemas created
Old public data untouched
No legacy backfill
New system starts clean

D01–D05 contracts PASS
G0–G4 contracts PASS
Runtime L4-only PASS
Evidence on Demand PASS
L6→L7→D01 PASS

No active legacy lifecycle
All tests PASS
All guards PASS
Build PASS
git diff --check PASS

No Production deploy
No hushang-jingwei changes
```

---

# 22｜最后动作

完成后：

```text
不 push
不 merge
不 deploy
```

输出：

```text
FINAL_IMPLEMENTATION_STATUS
zip_path
unresolved_risks
```

然后 STOP。

把结果 ZIP 交回 ChatGPT 做最终审查。
