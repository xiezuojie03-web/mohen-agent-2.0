---
name: mohen-historical-spatial-reconstruction
description: 墨痕 Agent 2.0「历史空间切片装配（Assemble）」流水线。当要把若干历史对象（桥/寺/水道）装配成一个**有证据支撑、不发明几何**的时间—空间切片（Historical Spatial Feature → Temporal Semantics → Grounding → Evidence → Confidence → Relation/Change → Slice）时使用。覆盖定义文件/证据选择器/确定性 upsert、E1–E4 关系分级、6+8 种状态词表的用法、以及「就绪门必须诚实判 PARTIAL 而不是刷绿」的纪律。
agent_created: true
---

# mohen-historical-spatial-reconstruction — 历史空间切片装配

## 何时用

已有可信基底（Source/Evidence/HR 决策齐备）之后，要回答「**这些对象的历史空间关系是什么**」——
而不是继续采源、不是做 UI/路线/渲染。

产出是一条链：
`Historical Source → Historical Feature Candidate → Temporal Semantics → Spatial Grounding →
Evidence → Confidence → Relation/Change → Historical Spatial Slice`

## 与相邻 Skill 的边界（§14 冻结，不要合并）

| 角色 | Skill | 干什么 |
|---|---|---|
| Find & Acquire | `mohen-historical-spatial-source` | 采集历史空间源、登记 source/evidence、图版台账、map gate |
| Interpret & Ground | *（尚无独立 skill；本 skill 内含其纪律）* | 对现实空间做接地：CRS 纪律、对象点 vs 近似面 vs 相对陈述 |
| **Assemble** | **本 skill** | 把已接地的要素装配成切片（含关系分级与就绪门），**不产几何** |

## 红线（违反即回滚）

1. **现代坐标 ≠ 历史坐标**。来自 provider 的当前点永不得声明为历史位置证明；库层用
   `check (not (anchor_kind like 'provider_current%' and historical_position_proof))` 强卡。
2. **不发明几何**：不 AI 补画古河道/历史街巷，不因「图上空间接近」就生成精确历史坐标。
   没有来源 ⇒ `geometry_type='unknown'` 且 `historical_position_status` 只能是
   `historical_relative_position_only` 或 `unresolved`。
3. **不混合坐标系**：GCJ-02 与 WGS-84 **分行登记、零换算**，不同字段合并。带坐标必带 CRS
   （库层 CHECK：坐标与 CRS 同时有或同时无）。
4. **不把 OCR/旧描述升级为事实**：凡只存在于 Legacy 描述、无 Evidence 行的历史断言，
   必须在 `legacy_only_assertions` / `change.legacy_only_parts` 显式留痕。
5. **不为把门刷绿而删断言、放宽判据或扩大切片**。门该 PARTIAL 就 PARTIAL，并点名缺失证据。
6. **PG 是唯一真源**：CSV/JSON 导出是投影，不得反向回写；不把同一语义同时存 JSON 与列（第二真源）。
7. **只写自己的表**：切片表（features/anchors/changes/relations/slice）+ `evidence_gate_audit`；
   **不写** `relations` / `claims` / `visual_assets`（不动既有冻结基底）。

## 三个可复用的工程模式

### 1. 定义文件 / 构建器分离（定义 = 数据，构建器 = 逻辑）

- `pipelines/<area>/slice-definitions/<slice-id>.mjs`：人裁定的策展结果（哪些对象、每条断言什么级别）。
- `pipelines/<area>/build-<slice>.mjs`：解析 → 校验 → upsert → 跑门 → 打审计。

**证据用「选择器」而不是硬编码 UUID**：写 SQL where 片段 + `expect` 命中数；
命中数不符即记 **gap**（不静默通过）。这样定义文件可移植、可自查，且证据换了能立刻暴露。

### 2. 确定性 UUID + upsert ⇒ 幂等

`uuid = sha256("<前缀>:<稳定业务键>")` 取 16 字节并按 v4 打版本位；`on conflict (<业务键>) do update`。
重跑必须 `created=0 / reused=n`。分三个前缀：`hf:` 特征 / `hfa:` 锚 / `hch:` 变更 / `hsr:` 关系。

### 3. 门判据「实算 + 投影」，理由写进库

把 §9 的 8 条判据逐条**用库内数据重算**（不是手填），再据「全满足才 YES / 任何伪造几何即 NO /
否则 PARTIAL」写 `readiness_gate` + `readiness_detail`。测试再独立重算一遍对账
（判据 ⇒ 门的映射必须成立）。**三条子门分开算、不得等同。**

### 4. 计数口径必须自解释（踩过的坑）

构建器里「审计行数」极易报错：若累计的是 SQL 语句数组长度，而每门是 `delete` + `insert` 两条语句，
报出来的数就**恰是真实行数的 2 倍**。**同时输出两个字段并命名清楚**
（`audit_rows_written = (features + relations) × 门数`，`audit_statements = 语句数`），
并以 `evidence_gate_audit` 的总量差（after − before）做交叉校验。
同理：条数类结论一律**从库里 count 出来**，不要把定义文件里的数组长度当成入库结果。

## 关系分级 E1–E4（最容易被做错的地方）

| 级别 | 定义 | 常见踩坑 |
|---|---|---|
| E1 | 直接文献/来源支持存在 | **E1 ≠ 已核验事实**。核验等级由 `status` + HR 决策承载（如 HR「据方志记载，须 S1 原文」⇒ E1 + status=candidate）。 |
| E2 | 当前空间几何 + 来源相容身份支持 | 只用「当前 provider 同址/同街」就不得表述为「历史上相邻」。门牌号不等距，禁止据门牌差推距离。 |
| E3 | 历史来源给出相对/拓扑关系，无坐标 | 典型是「一南一北」「横跨某塘」。禁止把当前两点次序当作历史次序的证明（不矛盾 ≠ 证据）。 |
| E4 | 合理但证据不足 | **最有价值的一类**：必须写清「缺哪一条证据」，并与「该断言确实没有证据行」保持一致（写成测试）。 |

另：双向镜像（两条 Legacy 实体各自产出一条互为反向的关系）**不是两条独立佐证**，注释里必须写明。

## 库层强卡（比文档可靠）

```
anchor_coord_requires_crs        -- 有坐标必有 CRS，反之亦然
anchor_current_never_proof       -- provider_current* 的锚不得 historical_position_proof
anchor_relative_has_no_coord     -- 相对陈述锚不得夹带坐标
hs_relation_non_e4_requires_evidence  -- 非 E4 必有证据
hs_relation_no_support_only_e4   -- support_level='none' 只能出现在 E4
change_evidenced_requires_evidence    -- evidenced 必带证据
```

## 验收（勿跳过）

1. `pnpm test`（新表的不变量用例 + 既有用例；**§12-26：断言不变量而不是过期绝对总数**）。
   - 守卫/测试里出现手工写下的总数（如 `skillCount !== 8`、`relations == 30`）时，**新增对象后会恒红**。
     正确处理是把它改成不变量或下限（`SKILL_FLOOR` / `legacy_id is not null = 24`），
     **绝不是**改数据或删断言去迁就它。
2. `pnpm guard:docs` / `guard:structure` / `pnpm -r typecheck` / `pnpm --filter @mohen/web build`
   （构建前 `NODE_OPTIONS=""`）。
3. 幂等：builder 连跑两次 `created=0`。
4. 不变式：`published=0`、`audit_relation_orphan` 不高于基线、`relations`/`evidence`/`source_records` 总量不变、
   Legacy（`hushang-jingwei`）零写。
5. **坑**：本机安全策略禁止 node 自旋 node 子进程（`spawnSync … EBUSY`），凡
   `execFileSync(process.execPath, …)` 的 vitest 用例会红。此时**不要**改测试逻辑，
   改为由外层 shell 直接起进程跑该管线两次并比对计数——这是等价证据。
