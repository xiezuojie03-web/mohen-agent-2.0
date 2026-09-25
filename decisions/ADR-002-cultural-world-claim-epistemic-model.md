# ADR-002 · Cultural World Claim-level Epistemic Model

> 状态：ACCEPTED（Architect Review 2026-09-25，随 CULTURAL-WORLD-02 签发）
> 关联：V4.8 Architecture Roadmap §3（Cultural Relation Contract V0.2）、`specs/FOUNDATION.md` §6、CULTURAL-WORLD-02 Taskbook §3/§4、`specs/OWNERSHIP_MAP.md` §「禁止平行真源」
> 本仓库内既存三套认识论状态词汇，V4.8 引入第四套（Claim-level 六值）。本 ADR 明确四套各自的职责与映射边界，**禁止把它们视为四个平行真源**。

---

## 1. 背景与裁决来源

CULTURAL-WORLD-02 Schema Fit Audit（STEP 1）发现：仓库内已存在三套认识论词汇，V4.8 §3 要求第四套六值。若直接新增第六值枚举而不裁定它与既有三套的映射关系，即违反 `OWNERSHIP_MAP.md`「禁止平行真源」。

Architect 裁决（AD-01）既定：「建立独立 Cultural World Claim-level epistemic layer，采用 V4.8 六值；**不修改**现有 `verification_status`、`E1–E4`、`discovery_candidates.epistemic_status` 的既有语义。ADR-002 必须明确四套状态各自职责和映射边界。」

## 2. 四套状态：职责划分

| # | 状态词汇 | 承载位置 | 语义职责 | 取值 |
|---|---|---|---|---|
| 1 | `verification_status` | `evidence` / `entities` / `relations` / `claims` 的 `status` 列（enum） | **采集验证状态**：这条数据从原始抽取到人工核验走到哪一步 | raw, extracted, candidate, evidence_linked, verified, rejected, pending, published |
| 2 | `historical_relation_class` | `historical_spatial_relations.epistemic_class`（enum） | **空间关系分类**：Historical Spatial Relation 层关系的证据强度档（既有职责，不动） | E1, E2, E3, E4 |
| 3 | `epistemic_status` | `discovery_candidates.epistemic_status`（text + CHECK） | **探索候选状态**：尚未进入事实层的主张与开放线索 | candidate, legend, research, unresolved |
| 4 | **`epistemic_status`（六值）** | 新建 `cultural_relation_claims` / `cultural_events` / `cultural_meaning_candidates` / `cultural_present_connections` | **Cultural World Claim 层认识论等级**：该 Claim 在文化世界模型里可被宣告的等级（V4.8 §3） | SUPPORTED, SUPPORTED_CANDIDATE, CONFLICTED, RESEARCH_LEAD, UNSUPPORTED, OPEN_QUESTION |

## 3. 映射边界（强制）

1. **`verification_status` 是其他三套的前置闸门**（AD-04 落定）：Claim 进入 SUPPORTED / SUPPORTED_CANDIDATE 前，其支撑 Evidence 必须至少达到 `evidence_linked`，且满足：Evidence scope covers Claim + 未决冲突不使表达失效 + 01C 人工裁决允许。禁止直接提升到 `verified` / `published`。
2. **六值 `SUPPORTED` ≠ `verification_status='verified'`**：两套正交。库内既有 `verified` 是另一语义（采集侧已核验），六值 `SUPPORTED` 是 Claim 层宣告等级（证据已 `evidence_linked` 且 01C 裁决允许）。不得把任意一套的 `verified` 值直接映射到六值的 `SUPPORTED`。
3. **`E1–E4` 与六值正交**：`hsr` 承载 Historical Spatial Relation（空间关系，既有职责不变）；新建 `cultural_relation_claims` 承载 V4.8 Claim（六值）。`hsr.existing_relation_id` 可指向 `cultural_relation_claims` 或 `relations`，但两层职责不重叠——`hsr` 不表达六值，`cultural_relation_claims` 不表达 E1–E4。
4. **`discovery_candidates` 继续管探索候选**：MeaningCandidate / PresentConnection 用六值表达其可宣告等级，**不进** `discovery_candidates`（其 `epistemic_status` CHECK 装不下六值，且有 `publishable` 触发器禁止）。
5. **表达式与状态绑定（V4.8 §5）**：六值直接决定该 Claim 在运行时允许的措辞（见 `cultural_relation_claims.expression_rule`），不依赖其他三套。

## 4. 禁止事项

- 不得为迁就六值而修改 `verification_status` / `historical_relation_class` / `discovery_candidates.epistemic_status` 的既有枚举或语义。
- 不得把四套视为「互相校验/互相覆盖」的平行真源；它们在不同层、不同维度各自成立。
- 不得在单一对象上要求两套状态「保持一致」——正交即允许不一致（例：Evidence 已 `evidence_linked`，但其支撑的 Claim 仍可因 01C 裁决停留在 `SUPPORTED_CANDIDATE`）。

## 5. 本簇落地（CULTURAL-WORLD-02）

- 六值仅出现于 `cultural_relation_claims` / `cultural_events` / `cultural_meaning_candidates` / `cultural_present_connections` 的 `epistemic_status` 列（CHECK 约束）。
- AD-04 提升：本簇经 01C 裁决且 scope 可精确支持的 Evidence 由 `candidate` 提升至 `evidence_linked`；提升依据逐条记录在 `CULTURAL-WORLD-02-result.md` 与 seed 脚本日志，不进 `evidence_gate_audit`（其 `gate_code` 仅 G0–G6）。
- HR-4 关系（颐浩寺 former_site_of / named_after 吕颐浩）的六值恒为 `SUPPORTED_CANDIDATE`，不得升级。
