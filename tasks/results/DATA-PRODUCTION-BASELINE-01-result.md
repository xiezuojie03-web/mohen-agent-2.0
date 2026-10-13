# DATA-PRODUCTION-BASELINE-01 · 既有库 vs 协议 V2.0 合规基线（只读）

- **生成时间**：2026-10-05 01:23:15
- **目标库**：`mohen_dev`
- **依据协议**：`specs/data-production/MoHen_Data_Production_Protocol.md` V2.0
- **性质**：**只读测量**，未执行任何写/DDL；冻结项仅测量不处置。
- **冻结边界**：1246 夜跑图 · SHL-LEGACY-COORDS · visual_assets 写死 depicted_period · ESC-04 数据部分 —— 标注 🧊FROZEN，不计入可处置差距。
- **A 组 BLOCKED**：RECON-02 命名分叉 · ESC-02 双 relation · ESC-03 modern_location · ESC-05①③ —— 需拥有者裁定，不擅自动。

---

## 1｜守卫运行（guard:* 协议层校验）

**guard:registry** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:registry D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-production-registry.mjs

PRODUCTION_REGISTRY schema=v2 entries=18 table_refs=37 queued=110 runnable=110 excluded=0 unresolved=0
```

**guard:identifiers** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:identifiers D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-identifier-registry.mjs

IDENTIFIER_REGISTRY schema=v1 columns=5 fixed_values=9 patterns=15 db_checked_columns=5 covered_values=47 uncovered=0
```

**guard:acquisition** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:acquisition D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-acquisition-intents.mjs

ACQUISITION_INTENTS schema=v1 intents=28 db_rows=317 resolved=317 unresolved=0 retrospective=26 inferred=2
```

**guard:source-gate** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:source-gate D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-source-gate.mjs

SOURCE_GATE providers=17 aliases=12 db_providers=23 resolved=23 unknown=0 importers=3 ops_todo=0 needs_owner_confirmation=0 open_questions=0
  ops_status: 全部 documented（B-08 运维表三项已落地，守卫强制校验）
```

**guard:reconciliation** — ✅ PASS
```
> mohen-agent-2.0@0.1.0 guard:reconciliation D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0
> node scripts/check-reconciliation.mjs

RECONCILIATION proposals=2 pending=0 decided=2 scanned=190 (marker="提案类型：Architecture Reconciliation")
  · tasks\results\DATA-RECON-01-eligibility-field-proposal.md
  · tasks\results\RECON-02-constitution-vs-db-naming.md
```

**guard:promotion** — ✅ PASS
```
  · visual_assets.eligibility_status  已标可用=8  门禁审计行=14368
  · historical_spatial_relations.status  已标可用=0  门禁审计行=56
  · historical_features.review_status  已标可用=0  门禁审计行=35
  · cultural_relation_claims.review_status  已标可用=0  门禁审计行=56
  · cultural_meaning_candidates.review_status  已标可用=0  门禁审计行=14
  · cultural_present_connections.review_status  已标可用=0  门禁审计行=14
```

**guard:triage** — ✅ PASS
```
> node scripts/check-review-triage.mjs

REVIEW_TRIAGE checked=structure+invariants+research-longtail db_checked=1
  · 分诊分布：(未分诊·历史行)=293  hold=24434  reject=2953
  · 研究长尾解耦：研究候选=3909 精选=40 分诊行=0
  · 历史行（triage=NULL）不算违规：它们出生于三分机制之前（迁移不回填，冻结不触碰）
```

**guard:escalations** — ✅ PASS
```
     ESC-02  待裁决           `relations`(521) 与 `cultural_relation_claims`(8) 双存储；原则见 C3，合并设计待你点头
     ESC-03  待裁决           `modern_location` 缺口与现代坐标落位；原则见 C3，建表现址待你点头
     ESC-04  部分处置（解冻·处置中）  1246 图冻结解除，并入老项目数据挖掘主线
     ESC-05  部分处置（②已完成；①③待裁决）  测试写库已隔离；标签修正与其余失败项待裁决
     ESC-06  已处置（R-DP-01～05全过）  Research Production Reconciliation：双模式 / Research Workspace / 双入口 / review 收窄 / 主协议升级
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
| research_association_candidate |
| research_bridge_draft |
| research_mention |
| research_observation |
| research_run |
| research_signal |

_（仅显示前 30 / 共 37 行）_

> 注：应有 ~28 张


### 各表门禁触发器（gate 覆盖）

```sql
select event_object_table as tbl, count(*) as n from information_schema.triggers where trigger_schema='public' group by 1 order by 1
``
| tbl | n |
| --- | --- |
| claims | 2 |
| cultural_meaning_candidates | 2 |
| cultural_present_connections | 2 |
| cultural_relation_claims | 2 |
| discovery_candidates | 2 |
| entities | 2 |
| evidence | 2 |
| historical_features | 2 |
| historical_spatial_relations | 2 |
| relations | 2 |
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
| 317 |


### source_records 去重 provider 分布

```sql
select provider, count(*) as n from source_records group by provider order by n desc
``
| provider | n |
| --- | --- |
| Wikimedia Commons | 98 |
| hushang_legacy | 92 |
| wikidata | 31 |
| wikimedia-commons | 21 |
| 上海图书馆开放数据 | 14 |
| amap | 10 |
| shanghai-library | 9 |
| wikimedia_commons | 6 |
| shanghai-library-open-data | 5 |
| mohen-pipeline | 5 |
| qingpu-government | 4 |
| shanghai-local-chronicles-office | 4 |
| shanghai-library-t11-alignment | 4 |
| historical-gazetteer | 3 |
| shanghai-qingpu-gov | 2 |
| archive-catalog | 2 |
| shanghai-qingpu-museum | 1 |
| shanghai-qingpu-civilization-net | 1 |
| shanghai-qingpu-gov-news-office | 1 |
| scc-legacy | 1 |
| jiangnan-ancient-bridge-research-association | 1 |
| hushang-jingwei | 1 |
| xinmin-evening-news | 1 |

> 注：真库 provider 字符串须能被 source-providers.json 归一解析（B-09）


### entities.status 取值分布

```sql
select status, count(*) from entities group by status order by 2 desc
``
| status | count |
| --- | --- |
| candidate | 6745 |

> 注：状态表达应收敛到 C3 §4.1 一套（现状 8 种，B组）


### entities.canonical_name 重复组数

```sql
select count(*) as dup_groups from (select canonical_name from entities group by canonical_name having count(*)>1) s
``
| dup_groups |
| --- |
| 383 |

> 注：MECHANISM-01 记 367 组；属 E 组标识符治理（非冻结）


### claims.status 取值分布

```sql
select status, count(*) from claims group by status order by 2 desc
``
| status | count |
| --- | --- |
| candidate | 3061 |


### evidence.verification_status 取值分布

```sql
select verification_status, count(*) from evidence group by verification_status order by 2 desc
``
| verification_status | count |
| --- | --- |
| candidate | 13033 |
| evidence_linked | 20 |

> 注：MECHANISM-01：8 个值仅用 verified/published


### evidence_gate_audit 总行数

```sql
select count(*) as n from evidence_gate_audit
``
| n |
| --- |
| 158838 |


### evidence_gate_audit 按 object_type 覆盖

```sql
select object_type, count(*) from evidence_gate_audit group by object_type order by 2 desc
``
| object_type | count |
| --- | --- |
| evidence | 53365 |
| entity | 46158 |
| relation | 44632 |
| visual_asset | 14368 |
| claim | 140 |
| cultural_relation_claim | 56 |
| historical_spatial_relation | 56 |
| historical_feature | 35 |
| cultural_present_connection | 14 |
| cultural_meaning_candidate | 14 |

> 注：cultural_* 全未覆盖（B组）


### review_queue 总行数

```sql
select count(*) as n from review_queue
``
| n |
| --- |
| 27680 |


### review_queue 三分分布

```sql
select coalesce(triage_outcome,'<null>') as triage, status, count(*) from review_queue group by 1,2 order by 1,2
``
| triage | status | count |
| --- | --- | --- |
| <null> | pending | 293 |
| hold | pending | 24434 |
| reject | rejected | 2953 |

> 注：AUTO/HOLD/REJECT 三分（M2 第四条）


### visual_assets 总行数 [FROZEN] 🧊FROZEN

```sql
select count(*) as n from visual_assets
``
| n |
| --- |
| 1465 |


### visual_assets.eligibility_status 分布 [FROZEN] 🧊FROZEN

```sql
select eligibility_status, count(*) from visual_assets group by 1 order by 2 desc
``
| eligibility_status | count |
| --- | --- |
| pending_review | 1389 |
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
| 41 |

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
