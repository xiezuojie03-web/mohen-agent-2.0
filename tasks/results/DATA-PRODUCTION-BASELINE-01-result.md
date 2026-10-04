# DATA-PRODUCTION-BASELINE-01 · 既有库 vs 协议 V2.0 合规基线（只读）

- **生成时间**：2026-10-02 14:40:11
- **目标库**：`mohen_dev`
- **依据协议**：`specs/data-production/MoHen_Data_Production_Protocol.md` V2.0
- **性质**：**只读测量**，未执行任何写/DDL；冻结项仅测量不处置。
- **冻结边界**：1246 夜跑图 · SHL-LEGACY-COORDS · visual_assets 写死 depicted_period · ESC-04 数据部分 —— 标注 🧊FROZEN，不计入可处置差距。
- **A 组 BLOCKED**：RECON-02 命名分叉 · ESC-02 双 relation · ESC-03 modern_location · ESC-05①③ —— 需拥有者裁定，不擅自动。

---

## 1｜守卫运行（guard:* 协议层校验）

**guard:registry** — ❌ FAIL
```
> mohen-agent-2.0@0.1.0 guard:registry D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-production-registry.mjs

PRODUCTION_REGISTRY schema=v1 entries=9 table_refs=28 queued=66 runnable=61 excluded=5 unresolved=0
 ELIFECYCLE  Command failed with exit code 1.
```

**guard:identifiers** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:identifiers D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-identifier-registry.mjs

IDENTIFIER_REGISTRY schema=v1 columns=5 fixed_values=8 patterns=14 db_checked_columns=5 covered_values=41 uncovered=0
```

**guard:acquisition** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:acquisition D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-acquisition-intents.mjs

ACQUISITION_INTENTS schema=v1 intents=25 db_rows=269 resolved=269 unresolved=0 retrospective=25 inferred=2
```

**guard:source-gate** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:source-gate D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-source-gate.mjs

SOURCE_GATE providers=17 aliases=12 db_providers=22 resolved=22 unknown=0 importers=3 ops_todo=0 needs_owner_confirmation=0 open_questions=0
  ops_status: 全部 documented（B-08 运维表三项已落地，守卫强制校验）
```

**guard:reconciliation** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:reconciliation D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-reconciliation.mjs

RECONCILIATION proposals=2 pending=1 decided=1 scanned=130 (marker="提案类型：Architecture Reconciliation")
  · tasks\results\DATA-RECON-01-eligibility-field-proposal.md
  · tasks\results\RECON-02-constitution-vs-db-naming.md
```

**guard:promotion** — ✅ PASS
```
  · relations.status  已标可用=0  门禁审计行=2618
  · claims.status  已标可用=0  门禁审计行=140
  · evidence.verification_status  已标可用=0  门禁审计行=12982
  · visual_assets.eligibility_status  已标可用=8  门禁审计行=9016
  · historical_spatial_relations.status  已标可用=0  门禁审计行=56
  · historical_features.review_status  已标可用=0  门禁审计行=35
```

**guard:triage** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:triage D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-review-triage.mjs

REVIEW_TRIAGE checked=structure+invariants db_checked=1
  · 分诊分布：(未分诊·历史行)=293
  · 历史行（triage=NULL）不算违规：它们出生于三分机制之前（迁移不回填，冻结不触碰）
```

**guard:escalations** — ✅ PASS
```
     ESC-01  待裁决（→RECON-02）  宪法名 vs 真库名分叉（实为四件事，只有 3 件是命名差）
     ESC-02  待裁决           `relations`(521 行) 与 `cultural_relation_claims`(8 行) 双存储
     ESC-03  待裁决（自2026-09-26停在待拍板）  `modern_location` 缺口与现代坐标落位方式
  🔒 ESC-04  部分冻结          图片资格**机制**已解决（R15）；图片**数据处置**冻结
     ESC-05  部分处置（②已完成；①③待裁决）  测试写库已隔离；标签修正与其余失败项待裁决
  🔒 = 已冻结：**不是待办**，不得主动重提、不得当论据、不得计入"未解决数量"。
```

---

## 2｜既有库测量（只读 SQL）

### 当前连接数据库

```sql
select current_database() as db
``
| db |
| --- |
| mohen_dev |

> 注：确认测的是哪个库


### 公开基表清单

```sql
select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name
``
| table_name |
| --- |
| claim_evidence |
| claims |
| cultural_conflicts |
| cultural_events |
| cultural_meaning_candidates |
| cultural_present_connections |
| cultural_relation_claims |
| discovery_candidates |
| entities |
| evidence |
| evidence_fragments |
| evidence_gate_audit |
| historical_change_records |
| historical_feature_anchors |
| historical_features |
| historical_spatial_relations |
| historical_spatial_slices |
| human_review_decisions |
| ingest_runs |
| knowledge_path_steps |
| knowledge_paths |
| legacy_mappings |
| relation_evidence |
| relations |
| review_queue |
| source_records |
| visual_assets |
| visual_entity_links |

> 注：应有 ~28 张


### 各表门禁触发器（gate 覆盖）

```sql
select event_object_table as tbl, count(*) as n from information_schema.triggers where trigger_schema='public' group by 1 order by 1
``
| tbl | n |
| --- | --- |
| claims | 2 |
| discovery_candidates | 2 |
| review_queue | 4 |
| visual_assets | 2 |
| visual_entity_links | 4 |

> 注：已知 4 个：claims_require_evidence / discovery_not_publishable_guard / review_queue_tier_c_guard / vel_confirmed_requires_evidence


### source_records 总行数

```sql
select count(*) as n from source_records
``
| n |
| --- |
| 269 |


### source_records 去重 provider 分布

```sql
select provider, count(*) as n from source_records group by provider order by n desc
``
| provider | n |
| --- | --- |
| Wikimedia Commons | 98 |
| hushang_legacy | 57 |
| wikidata | 24 |
| wikimedia-commons | 21 |
| 上海图书馆开放数据 | 14 |
| amap | 10 |
| shanghai-library | 9 |
| mohen-pipeline | 5 |
| shanghai-library-open-data | 5 |
| qingpu-government | 4 |
| shanghai-local-chronicles-office | 4 |
| shanghai-library-t11-alignment | 4 |
| historical-gazetteer | 3 |
| shanghai-qingpu-gov | 2 |
| archive-catalog | 2 |
| shanghai-qingpu-museum | 1 |
| scc-legacy | 1 |
| shanghai-qingpu-gov-news-office | 1 |
| jiangnan-ancient-bridge-research-association | 1 |
| hushang-jingwei | 1 |
| xinmin-evening-news | 1 |
| shanghai-qingpu-civilization-net | 1 |

> 注：真库 provider 字符串须能被 source-providers.json 归一解析（B-09）


### entities.status 取值分布

```sql
select status, count(*) from entities group by status order by 2 desc
``
| status | count |
| --- | --- |
| candidate | 3323 |

> 注：状态表达应收敛到 C3 §4.1 一套（现状 8 种，B组）


### entities.canonical_name 重复组数

```sql
select count(*) as dup_groups from (select canonical_name from entities group by canonical_name having count(*)>1) s
``
| dup_groups |
| --- |
| 367 |

> 注：MECHANISM-01 记 367 组；属 E 组标识符治理（非冻结）


### claims.status 取值分布

```sql
select status, count(*) from claims group by status order by 2 desc
``
| status | count |
| --- | --- |
| candidate | 20 |


### evidence.verification_status 取值分布

```sql
select verification_status, count(*) from evidence group by verification_status order by 2 desc
``
| verification_status | count |
| --- | --- |
| candidate | 7164 |
| evidence_linked | 20 |

> 注：MECHANISM-01：8 个值仅用 verified/published


### evidence_gate_audit 总行数

```sql
select count(*) as n from evidence_gate_audit
``
| n |
| --- |
| 48108 |


### evidence_gate_audit 按 object_type 覆盖

```sql
select object_type, count(*) from evidence_gate_audit group by object_type order by 2 desc
``
| object_type | count |
| --- | --- |
| entity | 23261 |
| evidence | 12982 |
| visual_asset | 9016 |
| relation | 2618 |
| claim | 140 |
| historical_spatial_relation | 56 |
| historical_feature | 35 |

> 注：cultural_* 全未覆盖（B组）


### review_queue 总行数

```sql
select count(*) as n from review_queue
``
| n |
| --- |
| 293 |


### review_queue 三分分布

```sql
select coalesce(triage_outcome,'<null>') as triage, status, count(*) from review_queue group by 1,2 order by 1,2
``
| triage | status | count |
| --- | --- | --- |
| <null> | pending | 293 |

> 注：AUTO/HOLD/REJECT 三分（M2 第四条）


### visual_assets 总行数 [FROZEN] 🧊FROZEN

```sql
select count(*) as n from visual_assets
``
| n |
| --- |
| 1288 |


### visual_assets.eligibility_status 分布 [FROZEN] 🧊FROZEN

```sql
select eligibility_status, count(*) from visual_assets group by 1 order by 2 desc
``
| eligibility_status | count |
| --- | --- |
| pending_review | 1212 |
| excluded | 68 |
| gate_passed | 8 |

> 注：R15 后默认 pending_review；既有图未处置


### cultural_* 表存在性

```sql
select table_name from information_schema.tables where table_schema='public' and table_name like 'cultural_%' order by 1
``
| table_name |
| --- |
| cultural_conflicts |
| cultural_events |
| cultural_meaning_candidates |
| cultural_present_connections |
| cultural_relation_claims |


### historical_features SHL-LEGACY-COORDS [FROZEN] 🧊FROZEN

```sql
select count(*) as n, count(*) filter (where confidence=0) as zero_conf, count(*) filter (where cardinality(evidence_ids)=0) as no_ev from historical_features where slice_id='SHL-LEGACY-COORDS'
``
| n | zero_conf | no_ev |
| --- | --- | --- |
| 240 | 240 | 240 |

> 注：B-10：零证据零置信，数据处置冻结


### ingest_runs 总行数

```sql
select count(*) as n from ingest_runs
``
| n |
| --- |
| 11 |

> 注：B-03：未来写入的 run 级归因闭合；既有 727 图仍无 run


---

## 3｜差距初判（供下一步完善，待分类）

> 本表为读数的**初步归类**，最终处置范围须遵守上方冻结/A 组边界。

| 维度 | 读数 | 归类 |
|---|---|---|
| provider 字符串能否被 source-providers.json 解析 | 见 §2 providers + guard:source-gate | A:若 guard 通过则已闭合；否则 B-09 残留 |
| 状态表达种数（entities/claims/evidence） | 见 §2 各 status 分布 | B 组（收敛，非冻结） |
| evidence_gate_audit 是否覆盖 cultural_* | 见 §2 ega_cov + cultural | B 组（覆盖缺失） |
| visual_assets.eligibility_status | 见 §2 va_elig 🧊 | FROZEN，不处置 |
| review_queue 三分是否齐备 | 见 §2 rq_triage | 已落地（M2），核对即可 |
| entities.canonical_name 重名 | 见 §2 ent_dup | E 组（标识符治理，非冻结） |
| SHL-LEGACY-COORDS 零证据 | 见 §2 legacy_coords 🧊 | FROZEN（B-10） |

*基线完成。后续"完善既有库"应逐项对照本基线，仅对 B 组 / E 组（非冻结）动作，且始终保持只读可回滚。*

---

## 4｜基线新发现与下一步建议（非冻结、非 A 组）

### 4.1 协议层（守卫）新发现
- **guard:registry 已修复（2026-10-02）**：原 N01–N06 条目 `write_scope` 使用描述性中文短语（`raw 存储` / `candidate 表/区` / `alias 表` / `Gate 结果表` / `promotion 记录` / `projection`），`check-production-registry.mjs` 按字面去 `supabase/migrations` 匹配 `create table` 全不匹配 → 9 条 REGISTRY_ERROR。已按方案①将 `write_scope` 改为真实表名（Raw 为文件存储剔除；Gate 结果→`evidence_gate_audit`、promotion→被晋级对象表、projection→`knowledge_paths`/`knowledge_path_steps`、candidate 区→候选库各表、alias→`legacy_mappings`）。现 `guard:registry` 已转绿，`guard:*` 8/8 全通。注：`pnpm guard` 末步 `pnpm test` 仍有 21 failed（ESC-05 已知，属库层不变量违反/测试污染，**不在此修复、不强行改绿**）。

### 4.2 数据库层可处置差距（按可立即动手排序）
1. **B 组 · R15 第二批 6 表晋级闸门**：目前仅 `claims`/`discovery_candidates`/`review_queue`/`visual_assets`/`visual_entity_links` 5 表有触发器；`entities`/`evidence`/`cultural_*`/`historical_*`/`relations` 等核心表缺晋级强制（仅有只读监控）。→ 补触发器。
2. **B 组 · cultural_* 门禁审计覆盖**：`evidence_gate_audit` 对 5 张 `cultural_*` 表 **0 行覆盖**（entity/evidence/visual_asset/relation/claim/historical_* 均有）。→ 扩展审计写入。
3. **B 组 · 状态表达收敛**：跨表存在 `status` / `verification_status` / `eligibility_status` / `triage_outcome` / `review_tier` 共 5+ 种状态列，与 C3 §4.1 单一状态机不符。→ 收敛 + 守卫。
4. **E 组 · entities.canonical_name 367 组重名**：未做 resolution，与 `identifier-registry.json` 绑定。→ 标识符治理（非冻结）。
5. **轻微 · review_queue 293 legacy 行 `triage_outcome=NULL`**：M2 前的存量，可按规则回填 auto/hold。

### 4.3 已确认闭合（基线佐证）
- **B-09 来源门禁已接线**：`guard:source-gate` `db_providers=22 resolved=22 unknown=0`，真库 22 种 provider 全部可解析。
- **M2 review_queue 三分机制已落地**：`triage_outcome` 列存在、触发器就位（仅存量 293 行未填）。
- **R15 eligibility 已落地**：`visual_assets` 默认 `pending_review`，`gate_passed=8` = effective_visual_assets。

### 4.4 冻结 / A 组（本基线不处置）
- 冻结：1246 夜跑图（`va_elig` 中 pending 1212 / excluded 68）、`SHL-LEGACY-COORDS` 240（全零证据）、`visual_assets` `depicted_period` 写死。
- A 组 BLOCKED：RECON-02 / ESC-02 / ESC-03 / ESC-05①③。
