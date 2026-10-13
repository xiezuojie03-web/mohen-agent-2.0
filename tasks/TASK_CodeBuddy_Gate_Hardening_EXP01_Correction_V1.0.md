# TASK｜MoHen Gate Enforcement Hardening + EXP-01 Research Correction

**版本：V1.0 · 2026-10-08**  
**执行者：CodeBuddy**  
**任务性质：生产链执行机制加固 + EXP-01 纠偏验证**  
**优先级：高于 EXP-02 / 新选题**  

---

# 0｜为什么这次必须合并执行

EXP-01 暴露出一个系统级问题：

```text
Gate 在报告层判定 PASS / HOLD / REJECT
但下游 Executor 仍可能读取 HOLD 对象
```

已发现示例：

```text
G1 HOLD Evidence
→ 被 D03 使用
→ 形成 G2 PASS
→ 继续进入 G3 / G4
```

这违反核心规则：

```text
Dn Gate PASS Output = Dn+1 Legal Entry
```

因此本任务不得只修 EXP-01 报告。

必须先修：

```text
Gate Enforcement
```

再用 EXP-01 做回归验证。

---

# 1｜任务分两部分

## PART A｜Gate Enforcement Hardening

目标：

> 让 PASS-only 不再是文档原则，而成为 Executor / Orchestrator / Data Access 的硬约束。

## PART B｜EXP-01 Research Correction

目标：

> 在新硬约束下，使用已有 EXP-01 数据重新审 D02→D05，把 5 条 Finding 压成 2–3 条真正站得住的结论。

---

# 2｜Authority

冲突时按：

```text
CURRENT.md
AGENTS.md
OWNERSHIP_MAP.md
governance/C0–C4
specs/data-production/MoHen_Data_Production_Protocol.md
specs/DATA_CONTRACT.md
specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md
specs/data-production/production-registry.json
specs/data-production/PERSISTENCE_BINDING_CONTRACT.md
```

不得修改 Authority 来迁就现有实现。

---

# 3｜PART A · Gate Enforcement Hardening

## A1｜检查真实 Stage Input Path

逐阶段追踪：

```text
D02 → D03
D03 → D04
D04 → D05
D05 → Runtime
```

明确当前实际读取的是：

```text
base table?
repository?
PASS view?
in-memory payload?
gate audit?
```

输出：

```text
tasks/results/GATE_ENFORCEMENT_AUDIT.md
```

至少回答：

```text
D03 legal input selector =
D04 legal input selector =
D05 legal input selector =
Runtime legal input selector =
```

---

## A2｜强制 Legal Entry

最终必须实现：

```text
D03
只能读取 G1 PASS Evidence

D04
只能读取 G2 PASS World Object

D05
只能读取 G3 PASS Finding
+ 明确允许的 G2 PASS factual objects

Runtime
只能读取 G4 PASS Read Model
```

如果已有 PASS View：

```text
control.g1_pass_evidence
control.g2_pass_world_objects
control.g3_pass_findings
control.g4_pass_read_models
```

优先使用这些正式 View / Repository selector。

不要重复发明第二套 Gate 状态。

---

## A3｜禁止 Executor 自行绕 Gate

禁止：

```text
读取全表
→ Executor 自己判断 status
→ 继续生产
```

更禁止：

```text
HOLD 仅在 report 标注
但 payload 仍传给下游
```

必须在 Stage handoff 时过滤。

---

## A4｜Lineage Hard Check

新增或加强 lineage validator：

### G2 PASS 必须满足

```text
every supporting evidence
→ G1 PASS
```

### G3 PASS 必须满足

```text
every factual support
→ G2 PASS
```

### G4 PASS 必须满足

```text
every finding
→ G3 PASS

every factual projection dependency
→ G2 PASS
```

任何不满足：

```text
PASS forbidden
→ HOLD / REJECT
```

---

# 4｜PART A · Regression Tests

必须新增永久测试，不得只验证 EXP-01。

至少添加以下 fixture：

## T1｜G1 HOLD cannot enter D03

```text
create:
E_PASS
E_HOLD

run D03

assert:
E_PASS may support G2
E_HOLD never appears in any G2 PASS lineage
```

## T2｜G2 HOLD cannot enter D04

```text
W_PASS
W_HOLD

run D04

assert:
W_HOLD cannot support G3 PASS
```

## T3｜G3 HOLD cannot enter D05

```text
F_PASS
F_HOLD

run D05

assert:
F_HOLD cannot enter G4
```

## T4｜Conflicted dependency cannot masquerade as adjudicated

例如：

```text
Waterway identity = conflicted
RelationClaim exact target = adjudicated
```

必须：

```text
fail / downgrade
```

## T5｜Runtime only G4 PASS

```text
L4 HOLD
L4 PASS

Agent default read
→ only L4 PASS
```

---

# 5｜Guard 加固

现有：

```text
guard:stage-handoff
guard:cross-layer-write
guard:runtime-boundary
```

检查是否真的覆盖 Gate eligibility。

如不足，可：

```text
extend existing guard
```

或新增：

```text
guard:gate-enforcement
```

但不得创建另一套 lifecycle。

Guard 至少检查：

```text
no HOLD dependency in downstream PASS lineage
no REJECT dependency in downstream PASS lineage
candidate/conflicted state cannot silently become adjudicated
```

---

# 6｜是否允许改 DB

默认：

```text
NO DB schema change
```

优先用现有：

```text
PASS views
gate_audits
repository selector
orchestrator filtering
```

只有在现有物理模型无法表达 PASS-only selector 时，才允许提出：

```text
HOLD
```

并 STOP 报告，不得自行新增 migration。

---

# 7｜PART A 验证

至少运行：

```text
pnpm test:data-production
pnpm test:phase-f
pnpm test:phase-g

pnpm guard:stage-handoff
pnpm guard:cross-layer-write
pnpm guard:runtime-boundary
pnpm guard:no-legacy-production-entry

pnpm build
git diff --check
```

若新增：

```text
guard:gate-enforcement
```

也必须 PASS。

---

# 8｜PART A 成功门

只有当以下全部成立才允许进入 PART B：

```text
G1 HOLD cannot enter D03
G2 HOLD cannot enter D04
G3 HOLD cannot enter D05
Runtime cannot read non-G4 PASS
lineage validator blocks illegal dependency
regression tests PASS
```

否则：

```text
TASK_STATUS = HOLD
```

STOP，不做 EXP-01 Correction。

---

# 9｜PART B · EXP-01 Research Correction

PART A PASS 后才执行。

## 不重新做 D01

D01 保持现状。

不得：

```text
重新大规模搜索
扩到11镇
重新抓上海图书馆全库
新增外部来源
```

允许读取已有原始材料和 EXP-01 文件。

---

# 10｜D02 Audit

生成：

```text
tasks/experiments/EXP-01/correction/EXP01_CORRECTION_D02_AUDIT.md
```

逐条列：

```text
evidence_id
current_gate_status
used_by_D03
legal_for_D03
correction
```

重点检查：

```text
E-LT-03
```

如果仍是 G1 HOLD：

```text
必须从所有 G2 PASS lineage 中移除
```

不得为了保留 Finding 强行升 PASS。

---

# 11｜D03 Re-audit

生成：

```text
EXP01_CORRECTION_D03_AUDIT.md
```

重点：

```text
金泽塘 / 秀州塘
普济桥
万安桥
普济桥南市 / 北市
吕颐浩
练塘市河 / 顺德桥
```

规则：

```text
dependency = candidate/conflicted
→ precise relation cannot be adjudicated
```

必要时把：

```text
adjudicated
→ candidate / conflicted / HOLD
```

---

# 12｜D04 Finding Rejudgment

当前 F1–F5 全部重判：

```text
PASS
HOLD
DROP
```

最终只保留：

```text
2–3 G3 PASS Findings
```

不得保留缺证机制。

重点压制：

```text
高密度一一对应
驱动
沪上最高
商业强度
桥跨河连接力
原真生活
表演性旅游
宗教型
商业旅游型
红色文化型
```

---

# 13｜推荐可保留方向

不是强制结论。

## A｜关系差异

可表述为：

> 三镇都可见水路与桥梁构成空间骨架，并存在若干桥与宗教/街市节点直接关联的案例；但关联方式和证据强度不同。

不得：

```text
桥桥有庙 = fact
金泽高密度一一对应
```

---

## B｜比较本身产生理解

可表述为：

> 横向比较显示，三镇不能被一个统一“桥寺市机制”解释；差异本身比统一类型更值得研究。

不得：

```text
水路宽度 × 桥连接力 × 寺市复合度
= 商业强度因果模型
```

---

## C｜当代功能变化

可表述为：

> 部分历史桥、寺、街道今天继续承担通行、宗教、纪念或旅游功能，但三镇再利用方式不同。

不得：

```text
朱家角 = 表演性旅游
练塘 = 原真生活
```

除非已有足够调查资料。

---

# 14｜Corrected Findings

生成：

```text
EXP01_CORRECTED_FINDINGS.md
```

每条必须有：

```text
finding_id
human_question
corrected_finding
understanding_delta
supporting_G2_PASS_objects
supporting_G1_PASS_evidence
counter_view
missing_evidence
uncertainty
present_connection
claim_strength
```

claim_strength：

```text
descriptive
relational
interpretive
```

非必要不得 causal。

---

# 15｜重建 D04 / D05

生成：

```text
D04_HUMAN_REVIEW_CORRECTED.md
D05_HUMAN_REVIEW_CORRECTED.md
```

D05 只能消费 corrected G3 PASS。

目标：

```text
1 world projection
1 timeline/change projection
2–3 story seeds
2 Evidence on Demand paths
1 agent context
```

数量可以减少。

原则：

```text
更少
更稳
更可回溯
```

---

# 16｜Corrected Experience Proof

生成：

```text
EXP01_EXPERIENCE_PROOF_CORRECTED.md
```

删除所有 L3 没有支持的戏剧化扩写。

例如：

```text
“四面八方的香客”
“桥桥有庙的活标本”
“原真的一面”
```

如无证据，不得出现。

---

# 17｜Corrected Final Report

生成：

```text
EXP01_FINAL_REPORT_CORRECTED.md
```

必须修正 Gate count：

分别写：

```text
checked
PASS
HOLD
REJECT
```

不得把 checked 当 PASS。

---

# 18｜必须输出 Before / After Lineage

在：

```text
CORRECTION_SUMMARY.md
```

明确列：

```text
ILLEGAL_LINEAGE_BEFORE
```

例如：

```text
E-LT-03 (G1 HOLD)
→ G2 PASS
→ F1 G3 PASS
→ L4
```

以及：

```text
LEGAL_LINEAGE_AFTER
```

证明：

```text
所有 G2 PASS only from G1 PASS
所有 G3 PASS only from G2 PASS
所有 G4 only from G3/G2 PASS
```

---

# 19｜11古镇战略结论

允许保持：

```text
REDUCE_TO_THEMATIC_CLUSTERS
+
KEEP_11_AS_PLACE_INDEX
```

但理由改为：

> 跨地点比较天然产生问题、差异和反例，理解增量高于单镇目录式介绍。

不得依赖未证实 F2 因果机制。

---

# 20｜最终输出

```text
tasks/results/
└── GATE_ENFORCEMENT_AUDIT.md

tests/
└── permanent gate-enforcement regression tests

tasks/experiments/EXP-01/correction/
├── EXP01_CORRECTION_D02_AUDIT.md
├── EXP01_CORRECTION_D03_AUDIT.md
├── EXP01_CORRECTED_FINDINGS.md
├── D04_HUMAN_REVIEW_CORRECTED.md
├── D05_HUMAN_REVIEW_CORRECTED.md
├── EXP01_EXPERIENCE_PROOF_CORRECTED.md
├── EXP01_FINAL_REPORT_CORRECTED.md
└── CORRECTION_SUMMARY.md
```

---

# 21｜不得做

```text
不得修改 DB Schema
不得做 legacy backfill
不得重新做 D01
不得大规模扩搜
不得扩11镇
不得修改 A–G Authority 来适配 bug
不得降低 Gate
不得 Production deploy
不得 push / merge main
不得改 hushang-jingwei
```

---

# 22｜最终成功标准

必须同时满足：

```text
SYSTEM_GATE_ENFORCEMENT = PASS

G1 HOLD cannot enter D03
G2 HOLD cannot enter D04
G3 HOLD cannot enter D05
non-G4 PASS cannot enter default Runtime

permanent regression tests added and PASS

EXP01 corrected findings = 2–3
all corrected G3 PASS only depend on G2 PASS
all corrected G2 PASS only depend on G1 PASS
all corrected G4 only depend on legal PASS lineage

no unsupported causal mechanism
no unsupported type labels
Gate counts consistent
```

才允许：

```text
FINAL_STATUS = PASS
```

---

# 23｜最后动作

完成后只输出：

```text
FINAL_STATUS = PASS / HOLD / FAIL

system_gate_enforcement = PASS / FAIL
regression_tests_added = YES / NO
illegal_lineage_fixed = YES / NO

original_findings = 5
corrected_pass_findings = X
corrected_g4_objects = X

strategy_recommendation = ...

gate_audit_path = ...
correction_result_path = ...
unresolved_risks = ...
```

然后 STOP。

把以下文件交回 ChatGPT：

```text
GATE_ENFORCEMENT_AUDIT.md
CORRECTION_SUMMARY.md
EXP01_CORRECTED_FINDINGS.md
D04_HUMAN_REVIEW_CORRECTED.md
D05_HUMAN_REVIEW_CORRECTED.md
EXP01_FINAL_REPORT_CORRECTED.md
```

供最终系统与研究质量审查。
