# MOHEN · DATA CONTRACT V2.0

**版本：V2.0 · 2026-10-06**
**定位：Machine-facing domain contract；受 C2 V1.2、C3 V1.3、MoHen Data Production Protocol V4.0 统领。**
**原则：本文件不重新定义宪法，只把 D/L/G 同轴架构翻译成机器可执行的数据合同。**

---

# 0｜Authority 与非目标

Authority：

```text
C0 / C1
  ↓
C2 V1.2 · Humanistic Data OS
C3 V1.3 · Database Architecture
C4 · Experience/UI
  ↓
MoHen_Data_Production_Protocol_V4.0
  ↓
DATA_CONTRACT_V2.0
  ↓
Registry / Config / Skill / Executor / Guard / Schema
```

本 Contract 不允许：
- 自建平行层级；
- 自建第二套状态机；
- 自建第二套 Gate 编号；
- 把无人值守定义为特殊生产链；
- 用金泽/Legacy 个例定义通用字段。

---

# 1｜三链同轴 Machine Contract

| Stage | Data Layer | Exit Gate | Machine Promise |
|---|---|---|---|
| D01 Source Intake | L0 Cultural Sources | G0 Source Gate | PASS Source 可被 D02可靠读取 |
| D02 Material Understanding & Evidence | L1 Material Evidence | G1 Evidence Quality Gate | PASS Evidence 是可定位、可理解、可评价的材料证据 |
| D03 Cultural World Structuring | L2 Cultural World | G2 World Integrity Gate | PASS World Object 已完成身份/时间/空间/证据完整性核验 |
| D04 Humanistic Discovery | L3 Meaning / Discovery / Present | G3 Interpretation Gate | PASS Finding 有事实基础、解释边界和明确理解增量 |
| D05 Trusted Read Model Publication | L4 Trusted Read Model | G4 Runtime Eligibility Gate | PASS Projection 可安全供 Agent/UI消费并回溯 L3→L0 |

**不变量：**

```text
Dn+1.entry = Dn.gate == PASS 的输出
```

HOLD 保留在当前 L；REJECT 不下传但保留 lineage 和 reason。

---

# 2｜L0 · Cultural Sources / D01

## 2.1 Source Record 最小合同

概念字段：

```text
source_id
provider
title
source_type
carrier_type
creator
publisher_or_institution
source_uri_or_catalog_no
source_date
retrieved_at
rights
provenance_status
content_availability
checksum
raw_ref
original_locator
scope
```

其中：

- `content_availability` 至少区分 `full_content / image_scan / ocr / structured_content / catalog_only / unavailable`；
- `carrier_type` 使用 Protocol V4 Appendix A 的 T01–T14；
- Raw 必须 append-only；
- `catalog_only` 允许停留 L0，但默认不得形成 D02 PASS。

## 2.2 G0 PASS 最小条件

- 来源身份可解释；
- 原始版本/快照可追溯；
- rights / usage boundary 已记录；
- locator 或获取路径明确；
- 不把内部派生数据冒充一手来源。

---

# 3｜L1 · Material Evidence / D02

旧 Contract 中“L2 Evidence”更正为 **L1 Material Evidence**。

## 3.1 Material Evidence Unit

```text
evidence_id
source_id
source_version_id
locator
media_region
modality
raw_excerpt_or_region
literal_reading
normalized_text
research_proposition
source_voice
evidence_type
temporal_applicability
spatial_applicability
uncertainty
extraction_method
assessment_status
```

### 关键边界

```text
interpreted material unit ≠ automatically sufficient evidence
evidence fragment ≠ claim_evidence_link
OCR text ≠ understood content
image title ≠ visual reading
AI generated text/image ≠ historical evidence
```

Evidence Fragment 可以先独立存在；到 L2 才建立其支持/反对哪个 Claim 的关系。

## 3.2 G1 PASS

必须至少满足：

- locator 可回放；
- literal reading 与原材料一致；
- source_voice 明确；
- uncertainty 未被隐藏；
- 载体专用阅读规则已满足；
- evidence 不超出材料实际可说范围。

---

# 4｜L2 · Cultural World / D03

## 4.1 核心对象

- Entity
- Event
- Change
- RelationClaim
- HistoricalSpaceClaim
- ExternalCulturalNode
- VisualAsset / VisualCorrespondence

## 4.2 Candidate 与 Adjudicated

L2 允许候选，但必须显式成熟度：

```text
candidate
adjudicated
rejected
archived
```

不得因为写入 L2 就自动成为 Runtime Truth。

## 4.3 Claim–Evidence

```text
claim_evidence_link
  claim_id
  evidence_id
  support_type
  note_or_weight
```

`support_type` 至少允许：

```text
supports
contradicts
contextualizes
```

## 4.4 G2 PASS

检查：
- identity；
- temporal semantics；
- spatial honesty；
- evidence sufficiency；
- source dependency；
- conflict；
- epistemic status。

---

# 5｜L3 · Meaning / Discovery / Present / D04

## 5.1 Humanistic Finding 最小合同

```text
finding_id
finding_type
based_on_world_objects[]
human_question
interpretive_statement
understanding_delta
supporting_facts[]
counter_view_or_alternative[]
missing_evidence[]
present_connection
uncertainty
expression_rule
discovery_method
ranking_components
disposition
```

## 5.2 关联方法

A01–A12 是发现方法，不是 Truth Gate。

任何 Signal / Candidate 必须能够回答：

```text
为什么认为可能有关？
有哪些 supporting signals？
有哪些 counter signals？
如果继续研究，缺什么？
```

## 5.3 G3 PASS

至少：
- 事实与解释分离；
- co-occurrence 未冒充 relation；
- 相关性未冒充因果；
- counter-view 未被隐去；
- `understanding_delta` 真实存在；
- Present Connection 有事实基础。

---

# 6｜L4 · Trusted Read Model / D05

## 6.1 派生对象

```text
world_projection
agent_context_view
story_seed
runtime_discovery_path
map_timeline_projection
evidence_pointer
expression_rule
```

L4 是派生/可重算/只读，不是真相单一真源。

## 6.2 G4 PASS

必须：
- lineage 完整；
- 所引用 L2 对象 G2 合格；
- 所引用 L3 对象 G3 合格；
- unresolved conflict 按 expression_rule 暴露；
- Evidence on Demand 可返回 L1/L0；
- L4 不反写 L0–L3。

---

# 7｜L5–L7

- L5 Experience Runtime：用户当前体验状态，不存历史真相。
- L6 Participation：观察、行走、记录、贡献、策展、分享；Contribution ≠ Truth。
- L7 Living Culture：活态实践、记忆、新文化痕迹；满足 Source Discovery Contract 后重新进入 D01。

---

# 8｜统一 Lineage Contract

任何 Runtime Eligible 对象必须可以回放：

```text
L4 projection
→ L3 finding/meaning
→ L2 world object/claim
→ L1 evidence
→ L0 source/version/raw
```

建议机器合同至少提供：

```text
source_id
source_version_id
evidence_id
world_object_id_or_claim_id
finding_id
projection_id
run_id
stage
gate_result
```

并允许一对多、多对多。

---

# 9｜Disposition

统一机器 disposition：

```text
PASS
HOLD
REJECT
```

阶段内部可有工作状态，但不得创造第二套生命周期词汇与 Gate 混淆。

HOLD 必须记录：

```text
reason_code
missing_requirement
next_action
recheck_condition
```

REJECT 必须保留：

```text
lineage
reason_code
gate_result
```

---

# 10｜Human Review 与机器审核分离

## 10.1 Internal Adjudication

机器/专业审核可保存：

- guard result；
- gate audit；
- constraint；
- review queue；
- reviewer decision；
- technical rationale。

## 10.2 Owner Human Review View

项目拥有者不默认读取技术审计。

每个 D 阶段只交付：

1. 叙事相关可视化统计；
2. 数据库真实内容表；
3. 关键缺口/反例；
4. `ACCEPT / DEEPEN / DROP` 内容判断。

Owner Review 不写 G0–G4 结果，不代替 Evidence Gate。

---

# 11｜概念名与物理名

继续保留 `naming-map.json` 作为唯一机器映射，不要求概念名与物理表同名。

Phase C 只冻结新概念归属，不在本阶段改表名。

---

# 12｜Legacy / Research 旧对象逻辑迁移

| 旧逻辑对象 | 新归属 |
|---|---|
| research_source_inventory | D01 / L0 |
| research_observation | D02 / L1 |
| research_mention | D03 / L2 candidate |
| research_source_dependency | D02/L1 provenance（必要时为 D03 提供独立性信息） |
| research_signal | D04 / L3 |
| research_association_candidate | D04 / L3 |
| research_task / selection | D04 workflow/disposition |
| old runtime discovery_candidate | D05 / L4 |
| N01–N06 | 不再是顶层编号；能力拆入 D01–D05 implementation jobs |

物理 merge/rename/drop 在 Phase E 决定。

---

# 13｜机器可读 SOT

- Architecture/Protocol：Markdown
- Registry/Config：JSON（或后续冻结的机器格式）
- Schema/Migration：SQL
- Human Review structured data：JSON
- Human Review reading view：Markdown / generated HTML

DOCX/PDF 只能是派生阅读版本。
