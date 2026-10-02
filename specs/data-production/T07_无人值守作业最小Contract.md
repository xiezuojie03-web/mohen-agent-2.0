# T07 · 无人值守作业（Unattended Job）最小 Contract 与安全施工基线

> 依据：数据生产协议 V1.1 **§12 生产注册表 最小 Contract**、§10 第一阶段批次、§7 失败/重试/回滚、§13 冻结规则；并受 T06（Gap→字段→批次映射）与 T03（真源/门禁）约束。
> 定位：**这是 Contract，不是待跑的任务。** 所有 job 默认 **DRY_RUN**，未显式开启写入前不碰 Truth Store。
> 每个 job 必须声明 §12 的 12 个字段，开发总工程师才把它加入无人值守调度。

---

## 0. 一句话安全原则

> **默认不写、默认不晋级、默认不猜。** 机器只做确定性转换；歧义、因果、冲突、历史空间重建一律 HOLD；任何写入必须可重复、可停止、可追溯、可回滚（协议 §13）。

---

## 1. 安全施工总基线（跨 job，所有 job 继承）

### 1.1 写入开关（三道闸，缺一不可）

| 闸门 | 默认 | 说明 |
|---|---|---|
| `MOHEN_WRITE_ENABLED` | **false** | false = DRY_RUN：只产出 plan / 候选 / 待审清单，**不写任何层** |
| `MOHEN_ENV` | 必须 ∈ {`dev`,`staging`} | `prod` 或未知 → 立即 stop，不启动 |
| `write_scope` 白名单 | 逐表声明 | 只写 Contract 声明的表；越权写 → stop |

### 1.2 凭证与环境（凭据绝不落库/落码/落日志）

- **来源凭证（S1/S2）** 与 **PG DSN** 分离管理，均走环境变量或密钥管理。
- 凭证**不写入** Truth Store、**不进代码**、**不进 执行报告**、**不进普通日志**（日志只记 provider 名与 source_id 哈希）。
- **最小权限角色**：只读 Source 的抓取角色 / 只写 Raw+Candidate 的采集角色 / 经 Gate 才能写 Runtime World 的 promote 角色，三者分离。
- 当前状态：**S1/S2 凭证未配置** → 全部 job 只能 DRY_RUN；凭证到位前不安排实跑。

### 1.3 分层写入权限（协议 §6）

| 层 | 无人值守可写？ | 约束 |
|---|---|---|
| **Raw / L0**（`source_records`、原始快照） | 可，append-only | **禁止覆盖来源原件或原始 API 响应**；禁止删除 |
| **L1 Evidence** | 可（受控 skill） | 必须有 locator/page/quote；AI 生成文字**不得**当 Evidence |
| **Candidate Reservoir**（Entity/Relation/Visual/Meaning Candidate） | 可 | 仅写候选，与 Verified World 分离 |
| **Runtime World / L2–L3 事实层** | **仅经 Gate 的受控 promote** | 未声明 `auto_promote_policy` = **不晋级** |
| **Projection / Agent Read Model** | 可重建 | **单向**，不拥有反向修改 Truth Store 的权限 |
| **DDL / Schema / 写权限 / 基础设施** | **禁止** | No architecture mutation（协议 §7/§13） |

### 1.4 失败、重试与停止（协议 §7）

- **Fail isolated**：单条/单源失败隔离后继续其他 source，不拖垮整批。
- **Idempotent**：依赖 checksum / natural key / idempotency key；重复运行不制造重复事实。
- **Bounded retry**：仅网络/限流等**技术性瞬时**错误可有限重试；**语义歧义不得靠重试碰运气**。
- **No destructive cleanup**：无人值守禁止不可逆批量删除、覆盖 Raw、无审计的大规模 merge。
- **Stop conditions**：schema drift、写权限异常、连续高错误率、来源结构突变 → 停止该 pipeline，不扩大影响。
- **Rollback pointer**：每批保留 `run_id`、变更集合/事务边界或等价回滚依据。

### 1.5 审计字段（每次写入必记）

`run_id` · 规则版本 · `source_id` / `evidence_ids` · Gate 结果（G0–G6 + reason code）· 操作者 job id · 回滚定位。

### 1.6 门禁（协议 §4）

**G0** 来源完整 → **G1** 对象身份 → **G2** 时间语义 → **G3** 空间诚实 → **G4** 证据支持 → **G5** 冲突 → **G6** 发布资格。
任一硬 Gate 失败**不得发布**；冲突保留双方 Evidence，**不自动选边**（G5）。

---

## 2. N01 · Source Refresh

| 字段 | 声明 |
|---|---|
| `id / version` | `night.source-refresh` / `1.0.0` |
| `purpose` | 增量抓取已知 S1（上图/方志·寺观卷·津梁卷·寺志）/ S2（Wikimedia/IA）来源，补 T06 缺口 1/3/6 |
| `inputs` | provider ∈ {S1,S2}；scope = T03 §3 缺口 1/3/6 的目标来源清单；增量游标 `retrieved_at` |
| `outputs` | L0 Raw（append-only）+ `source_records`（L1 元数据） |
| `write_scope` | `source_records`、Raw 存储；**不写** `evidence` 及更上层 |
| `gates` | G0（provider/URI/时间/许可/checksum 完整）；S4 provider 直接 REJECT |
| `auto_promote_policy` | 仅 Source Record 元数据（checksum/version/license）自动入库；**不自动晋级任何 Claim** |
| `hold_reasons` | `MISSING_LICENSE` · `MISSING_CHECKSUM` · `PROVIDER_NOT_ALLOWED` · `RIGHTS_UNCLEAR` |
| `stop_conditions` | 来源结构突变、连续抓取失败 > 阈值、写权限异常、非 dev/staging 环境 |
| `retry_policy` | 仅网络/限流，最多 3 次，指数退避 |
| `tests` | 完整性（必填字段齐全）· 幂等（同 checksum 不重复建源）· 引用（source_id 可解析） |
| `rollback` | 按 `run_id` 标记该批 `source_records` 为 `quarantined`，不物理删除 Raw |
| `summary` | 扫描/成功/失败/去重数；新增 source_id 列表；Top HOLD reason |

## 3. N02 · Evidence Fragment

| 字段 | 声明 |
|---|---|
| `id / version` | `night.evidence-fragment` / `1.0.0` |
| `purpose` | 为 1879《青浦县志》图说 p36、县志寺观/津梁卷、寺志生成可定位 Fragment（page/locator/quote/region） |
| `inputs` | 已入库 `source_records`；目标 = T06 缺口 2/3/6 |
| `outputs` | L1 `evidence`（fragment + locator + quote + source link） |
| `write_scope` | `evidence` 表（L1） |
| `gates` | G0（来源完整）· **G4（必须有可定位 locator）** |
| `auto_promote_policy` | fragment + locator + quote 齐备且来源 S1/S2 → 可入库 L1；**不生成 Claim** |
| `hold_reasons` | `LOCATOR_INCOMPLETE` · `QUOTE_UNVERIFIABLE` · `SOURCE_NOT_RETRIEVED` |
| `stop_conditions` | locator 缺失率超阈值、来源不可读、写权限异常 |
| `retry_policy` | 仅技术瞬时失败；**歧义不重试** |
| `tests` | 引用（每条 evidence → source_id 必存在）· 完整性（quote 非空）· 幂等 |
| `rollback` | `run_id` 标记该批 evidence `quarantined` |
| `summary` | 新增 Fragment/Evidence 数、缺 locator 数、来源覆盖数 |

## 4. N03 · Candidate Extraction

| 字段 | 声明 |
|---|---|
| `id / version` | `night.candidate-extraction` / `1.0.0` |
| `purpose` | 从已建 Evidence 抽 Entity / Time / Place / Relation **Candidate**，供 M1/M2/M3/M5 缺口使用 |
| `inputs` | L1 `evidence`；抽取规则版本 |
| `outputs` | **Candidate Reservoir**（仅候选） |
| `write_scope` | candidate 表/区；**不写 Runtime World** |
| `gates` | G4（候选须能指回 evidence_id） |
| `auto_promote_policy` | **不自动晋级**（候选即终点） |
| `hold_reasons` | `AMBIGUOUS_ENTITY` · `NO_EVIDENCE_BACKING` · `TEMPORAL_UNCERTAIN` |
| `stop_conditions` | 抽取规则异常、写权限异常、schema drift |
| `retry_policy` | 仅技术瞬时 |
| `tests` | 引用（candidate → evidence_id）· 幂等（natural key）· 完整性 |
| `rollback` | `run_id` 批量标记 candidate `discarded`（保留日志） |
| `summary` | Entity/Relation/Time/Place Candidate 计数 + Top HOLD reason |

## 5. N04 · Deterministic Resolution

| 字段 | 声明 |
|---|---|
| `id / version` | `night.deterministic-resolution` / `1.0.0` |
| `purpose` | 有稳定 ID/URI/强规则的实体对齐与精确去重（吕颐浩 Wikidata ID、双桥 strong ID） |
| `inputs` | Candidate；权威 ID 源（Wikidata 等） |
| `outputs` | canonical candidate + alias + confidence + basis |
| `write_scope` | candidate 区 + alias 表 |
| `gates` | **G1**（精确 ID / 强一致才可继续；同名、别名冲突 → HOLD） |
| `auto_promote_policy` | 仅**精确 ID 强一致**的对齐可自动落 canonical；歧义一律 HOLD |
| `hold_reasons` | `HOMONYM_CONFLICT` · `ALIAS_UNRESOLVED` · `RELATION_UNPROVEN`（如 HR-1 吕颐浩 `relation_to_jinze=unproven`） |
| `stop_conditions` | 权威 ID 源不可用、写权限异常 |
| `retry_policy` | 仅技术瞬时 |
| `tests` | 幂等（同 ID 不重复合并）· 引用 · 完整性（basis 必填） |
| `rollback` | `run_id` 记录合并对，支持解绑还原 |
| `summary` | 对齐成功/去重/歧义 HOLD 数 |

## 6. N05 · Relation Candidate Weave

| 字段 | 声明 |
|---|---|
| `id / version` | `night.relation-weave` / `1.0.0` |
| `purpose` | 围绕金泽当前关系簇（E1 桥—水—桥）+ M1/M3/M5 候选生成 relation path + evidence binding |
| `inputs` | Candidate + `evidence`；关系簇定义 |
| `outputs` | Relation Candidate + `evidence_ids` + relation path（**候选层**） |
| `write_scope` | candidate 区 / `cultural_relation_claims`（**仅 candidate 状态**） |
| `gates` | G4（须绑定 evidence）· **G5**（冲突保留双方，不自动选边） |
| `auto_promote_policy` | **E1 桥—水—桥类确定性空间关系**（多证据、无冲突、口径可比）可晋级；**其余一律 HOLD** |
| `hold_reasons` | `HISTORICAL_CAUSALITY` · `FUNCTION_RELATION_UNSOURCED`（寺—桥历史功能）· `CROSS_SOURCE_CONFLICT` · `LOW_CONFIDENCE` |
| `stop_conditions` | 关系簇定义变更、Gate 大面积失败、写权限异常 |
| `retry_policy` | 仅技术瞬时；**因果/冲突不重试** |
| `tests` | 引用（relation → evidence_ids）· 幂等 · Gate（G4/G5 断言） |
| `rollback` | `run_id` 标记该批 claim `candidate`/`quarantined` |
| `summary` | 新增 relation candidate 数、晋级数（按类型）、HOLD Top 5 |

## 7. N06 · Gate & Projection

| 字段 | 声明 |
|---|---|
| `id / version` | `night.gate-projection` / `1.0.0` |
| `purpose` | 执行 G0–G6 → AUTO-PROMOTE / HOLD / REJECT → 刷新 Agent Read Model |
| `inputs` | 本批全部产物 |
| `outputs` | Gate 结果 + promotion 记录 + **Projection（只读重建）** |
| `write_scope` | Gate 结果表 + promotion 记录 + projection；**Projection 不得反写 Truth Store** |
| `gates` | **G0–G6 全量** |
| `auto_promote_policy` | 仅"确定性 + 无冲突 + 满足 Contract"进允许层；**未声明者一律不晋级** |
| `hold_reasons` | `GATE_FAIL_G0..G6` · `CONTRACT_UNMET` |
| `stop_conditions` | 任一硬 Gate 系统性失败、schema drift、写权限异常 |
| `retry_policy` | 仅技术瞬时 |
| `tests` | schema / integrity / referential / gate 全量 PASS；Projection 与 Truth Store 一致性 |
| `rollback` | `run_id` + 事务边界；promotion 可整批撤销回 candidate |
| `summary` | Promoted（按类型）/ Held（Top5 reason）/ Rejected / Conflicts / Projection 是否刷新 / Tests PASS-FAIL / Escalation（0–3 条） |

---

## 8. 明确排除（第一阶段绝不无人值守）

Historical Geometry 重建 · 历史地图配准 · 同景老照片判定 · 历史因果自动裁决 · 跨源冲突裁决 · Meaning/PresentConnection 自动发布 · L6/L7 正式入库（协议 §10）。
**结构性迁移（`cultural_judgments` 表、`entities.type/relation_to_jinze`、`Claim` 的 `motif/beat` 标签）不是无人值守 job**——属 Construction 任务，须 up/down 迁移 + dry-run + 测试 + 人审，不进 生产注册表。

---

## 9. 执行报告与结论判定（协议 §8）

每轮仅一份极短 执行报告，结论仅三种：
**PASS**（无需操作） / **PASS WITH HOLD**（正常，有候选待以后处理） / **STOPPED**（管线异常，需开发总工程师修复）。
**有 HOLD 不是失败**；普通 HOLD 可积累，不要求每日人工清空。首轮金泽批次预期 **PASS WITH HOLD**。

---

## 10. 晋升为正式 Skill 的路径（协议 §11）

`Candidate` → `Task Pattern`（真实任务重复出现）→ `Draft Skill`（边界稳定、有 Contract/Gate/停止条件/测试、小范围夜跑）→ `Mature Skill`（跨批次稳定，进 生产注册表 默认调度）。
**不能因为"AI 能做"就创建 Skill。**

---

*本文件为 T06 的 Contract 落地层；最高依据仍为 C4 V2.1、V0.9.1、五母题主稿 V0.1 与数据生产协议 V1.1。冲突处以最高依据为准并回写本文件。*
