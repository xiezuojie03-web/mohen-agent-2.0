# MoHen G0–G4 Machine Gate Contract V2.0

**Status:** TARGET · Phase E R1  
**Authority:** `MoHen_Data_Production_Protocol` + `DATA_CONTRACT`  
**Purpose:** 把 Gate 从“原则摘要”升级为可执行机器合同。

> Gate 回答的是：**这批对象能不能合法进入下一阶段？**
>
> Human Review 回答的是：**这些内容值不值得继续？**
>
> 两者不得合并。

---

# 0｜统一 Gate Contract

每个 Gate 必须声明：

```text
Entry Object
Required Checks
Machine Evidence
PASS Rule
HOLD Rule
REJECT Rule
Reason Codes
Audit Output
Downstream Promise
Negative Examples
```

统一结果只有：

```text
PASS
HOLD
REJECT
```

`PASS` 必须是全部 mandatory checks 成立；不得用“总体分数高”替代硬条件。

`HOLD` 表示对象有价值且可补；必须返回：

```text
reason_code
missing_requirement
next_action
recheck_condition
```

`REJECT` 表示当前对象不应进入下一阶段；必须保留 lineage 与 reason。

---

# G0｜Source Gate

**Stage / Layer:** D01 / L0  
**Entry:** Source Lead / acquired source  
**PASS Output:** Qualified Source → D02 legal entry

## Mandatory checks

| Check | PASS 条件 |
|---|---|
| `source_identity` | title/provider/source_type/carrier_type 至少可确定 |
| `provenance` | 能说明“从哪里取得、谁提供/发布” |
| `version_raw` | 有 source_version；可获得内容时必须有 raw/version checksum |
| `locator` | 有稳定 URI/catalog no./馆藏号/卷页等至少一种 |
| `content_availability` | 明确 full/image/OCR/structured/catalog-only/unavailable |
| `rights_boundary` | rights/use boundary 已记录，未知必须显式 unknown |
| `source_independence` | 能区分 original / quotation / repost / mirror / derived |
| `scope_fit` | 与 Research Intent / Scope 有可解释关系 |

## HOLD examples

- 只有题名和目录信息，但可能高价值，需要进一步取得正文；
- 来源可信，但当前 locator 不完整；
- 版权/访问边界待确认。

## REJECT examples

- 来源身份无法确定；
- 只剩不可追溯截图/转述；
- 明确与 Scope 无关；
- AI 生成内容被伪装成来源材料。

## Reason codes

```text
G0_IDENTITY_MISSING
G0_PROVENANCE_MISSING
G0_LOCATOR_MISSING
G0_CONTENT_UNAVAILABLE
G0_RIGHTS_UNKNOWN
G0_DERIVED_SOURCE_UNDISCLOSED
G0_SCOPE_MISMATCH
G0_AI_GENERATED_SOURCE
```

## Downstream promise

> D02 拿到 G0 PASS Source 时，可以相信：**这是一份身份明确、来源可追溯、内容可定位、使用边界已声明的真实文化材料。**

---

# G1｜Evidence Quality Gate

**Stage / Layer:** D02 / L1  
**Entry:** Material Evidence candidate  
**PASS Output:** Qualified Evidence Unit → D03 legal entry

## Mandatory checks

| Check | PASS 条件 |
|---|---|
| `source_link` | 必须指向 G0 PASS source |
| `locator_replayable` | 人可重新定位到原文/原图/区域 |
| `carrier_reading` | 使用与载体匹配的读取方法 |
| `literal_reading_fidelity` | literal_reading 不超出材料可见/可读内容 |
| `source_voice` | 区分原作者/编者/转引者/AI解释 |
| `proposition_fidelity` | research_proposition 与材料内容相符 |
| `time_scope` | 时间适用范围明确或显式 unknown |
| `space_scope` | 空间适用范围明确或显式 unknown |
| `uncertainty` | OCR、残缺、推断、不确定性显式记录 |
| `no_ai_evidence` | AI生成文字不能作为 Source Evidence |

## HOLD examples

- OCR 可读但关键字句模糊；
- 图片已识别对象，但区域定位不够精确；
- source voice 暂时不能区分转引还是原载。

## REJECT examples

- 只有标题/NER/关键词，没有实际阅读；
- 找不到原文 locator；
- literal_reading 加入材料中不存在的解释；
- AI 摘要被作为原始证据。

## Reason codes

```text
G1_SOURCE_NOT_G0_PASS
G1_LOCATOR_NOT_REPLAYABLE
G1_LITERAL_READING_MISSING
G1_LITERAL_READING_OVERREACH
G1_SOURCE_VOICE_MISSING
G1_TIME_SCOPE_UNKNOWN_UNDECLARED
G1_SPACE_SCOPE_UNKNOWN_UNDECLARED
G1_UNCERTAINTY_UNDECLARED
G1_AI_GENERATED_EVIDENCE
G1_CARRIER_READING_INADEQUATE
```

## Downstream promise

> D03 拿到 G1 PASS Evidence 时，可以相信：**它是对真实材料的可回放、忠实、带适用范围与不确定性的最小证据单元。**

---

# G2｜World Integrity Gate

**Stage / Layer:** D03 / L2  
**Entry:** Candidate Entity / Event / RelationClaim / Change / HistoricalSpaceClaim / VisualObject  
**PASS Output:** Adjudicated Cultural World Object → D04 legal entry

## Mandatory checks

| Check | PASS 条件 |
|---|---|
| `identity` | Mention 已完成 identity adjudication；同名异物不得偷合并 |
| `time` | 时间表达、区间、相对年代没有逻辑冲突 |
| `space` | 地点/历史位置/现代位置不偷换；Geometry is a Claim |
| `claim_evidence` | 需要证据的事实对象有显式 Evidence link |
| `source_dependency` | 不能把同源转引当多源独立支持 |
| `relation_semantics` | co-occurrence / substring / belongsTo 不直接等于文化关系 |
| `conflict` | 冲突被结构化保存，不被“选一个答案”抹掉 |
| `epistemic_state` | candidate/adjudicated/rejected 状态与依据一致 |
| `fact_interpretation_boundary` | 解释性内容不得写回 L2 Fact |
| `visual_spatial_honesty` | 图像同景/历史位置只能按证据强度表达 |

## HOLD examples

- 人物同名但缺唯一身份依据；
- 两个年代冲突且暂时无法裁决；
- 地图定位只有大致范围；
- RelationClaim 有价值但只有单一弱来源。

## REJECT examples

- 纯共现生成 relation；
- 现代坐标直接当历史位置；
- 无 Evidence 的事实被标 adjudicated；
- Meaning/价值判断写进 factual claim。

## Reason codes

```text
G2_IDENTITY_UNRESOLVED
G2_TIME_CONFLICT
G2_SPATIAL_OVERCLAIM
G2_EVIDENCE_MISSING
G2_SOURCE_DEPENDENCY
G2_RELATION_NOT_ESTABLISHED
G2_CONFLICT_SUPPRESSED
G2_EPISTEMIC_MISMATCH
G2_FACT_INTERPRETATION_MIXED
G2_VISUAL_CORRESPONDENCE_OVERCLAIM
```

## Downstream promise

> D04 拿到 G2 PASS World Object 时，可以相信：**它是身份、时间、空间、证据、冲突状态都已经过事实层裁决的文化世界对象。**

---

# G3｜Interpretation Gate

**Stage / Layer:** D04 / L3  
**Entry:** Humanistic Finding / Comparison / Change Interpretation / Present Connection  
**PASS Output:** Qualified Humanistic Finding → D05 legal entry

## Mandatory checks

| Check | PASS 条件 |
|---|---|
| `g2_basis` | supporting facts 全部来自 G2 PASS |
| `fact_interpretation_firewall` | Finding 明确是解释，不伪装成史实 |
| `human_question` | 回答一个真实的人文问题，不是关键词组合 |
| `understanding_delta` | 明确说明“理解发生了什么变化” |
| `causality_discipline` | 时间接近/空间接近/共现不直接推成因果 |
| `counter_view` | 重要解释至少检查替代解释/反证 |
| `source_independence` | 不用多个同源转引制造“多证据” |
| `specificity` | Finding 具体到人物/地方/制度/行动/变化 |
| `present_connection_basis` | 当下连接有依据，不是现代感想硬贴 |
| `uncertainty` | 推断边界与缺证据显式表达 |
| `mohen_value` | 对“理解地方/历史/当下生活”产生实际增量 |

## HOLD examples

- 发现很有趣，但只有单来源；
- comparison 成立，但 counter-view 尚未检查；
- present connection 方向合理但今日状态证据不足。

## REJECT examples

- “A与B同年代，所以A影响B”；
- embedding 相似就说二者有历史关系；
- 只有泛泛“体现文化底蕴”；
- 没有 understanding_delta 的漂亮总结。

## Reason codes

```text
G3_G2_BASIS_MISSING
G3_FACT_INTERPRETATION_MIXED
G3_HUMAN_QUESTION_WEAK
G3_UNDERSTANDING_DELTA_MISSING
G3_CAUSALITY_OVERCLAIM
G3_COUNTER_VIEW_MISSING
G3_SOURCE_DEPENDENCY
G3_TOO_GENERIC
G3_PRESENT_BASIS_WEAK
G3_UNCERTAINTY_HIDDEN
G3_LOW_HUMANISTIC_VALUE
```

## Downstream promise

> D05 拿到 G3 PASS Finding 时，可以相信：**它不是“像故事”的文本，而是建立在已裁决事实之上、经反例与边界检查、确实带来理解增量的人文发现。**

---

# G4｜Runtime Eligibility Gate

**Stage / Layer:** D05 / L4  
**Entry:** Read Model object  
**PASS Output:** Runtime Eligible Read Model → L5 legal consumption

## Mandatory checks

| Check | PASS 条件 |
|---|---|
| `lineage_complete` | L4→L3→L2→L1→L0 可逆 |
| `g2_g3_pass` | 所引用 L2/L3 对象均满足相应 Gate |
| `read_only_projection` | L4 是 derived/recomputable，不成为 Truth source |
| `evidence_on_demand` | UI/Agent 能从表达回到 Evidence/Source |
| `conflict_expression` | unresolved conflict/uncertainty 未被隐藏 |
| `expression_rule` | 断言、推断、传说、疑问的表达规则明确 |
| `projection_consistency` | map/time/story/context 之间引用对象一致 |
| `runtime_scope` | 使用场景、可见性、权限/rights 符合要求 |
| `no_reverse_write` | Runtime 不允许反向改 L2/L3 truth |

## HOLD examples

- story seed 很好，但 Evidence on Demand 链断；
- 地图投影可用，但冲突表达规则缺失；
- 某一 finding 尚未 G3 PASS。

## REJECT examples

- L4 含无法追溯来源的“漂亮故事”；
- projection 反向改写事实；
- unresolved conflict 被直接抹成唯一答案。

## Reason codes

```text
G4_LINEAGE_INCOMPLETE
G4_UPSTREAM_GATE_MISSING
G4_NOT_RECOMPUTABLE
G4_EVIDENCE_ON_DEMAND_BROKEN
G4_CONFLICT_HIDDEN
G4_EXPRESSION_RULE_MISSING
G4_PROJECTION_INCONSISTENT
G4_RUNTIME_SCOPE_INVALID
G4_REVERSE_WRITE_RISK
```

## Downstream promise

> L5 / Agent / UI 拿到 G4 PASS Read Model 时，可以相信：**它可直接用于体验，同时仍能逐层回到解释、事实、证据与原件。**

---

# 6｜统一 Machine Audit 输出

每次 Gate 判定写入：

```json
{
  "run_id": "...",
  "stage": "D03",
  "gate_code": "G2",
  "object_type": "relation_claim",
  "object_id": "...",
  "result": "HOLD",
  "reason_codes": ["G2_SOURCE_DEPENDENCY"],
  "checks": {
    "identity": "PASS",
    "time": "PASS",
    "space": "PASS",
    "claim_evidence": "PASS",
    "source_dependency": "FAIL"
  },
  "missing_requirement": "independent source",
  "next_action": "search independent source",
  "recheck_condition": "new independent evidence linked",
  "guard_versions": {},
  "checked_at": "..."
}
```

总原则：

> **Gate 是“逐项硬条件 + 可审计失败原因”，不是一句话，也不是总分。**
