# T06 数据生产 · 无人值守批次 派工与 Gap 映射（V1.1 × T03 × 无人值守协议 V1.0）

> 目的：把三份输入咬合——
> - **无人值守协议 V1.0** = 方法/运行层（怎么安全自动造数据：N01–N06 批次、G0–G6 闸门、AUTO/HOLD/REJECT、Truth Store=PG、Candidate Reservoir vs Runtime World）。
> - **V1.1** = 内容层（每母题要填哪些专用字段 §7、四状态盘点 §10、L0–L4 映射、判断 ID `Mx-C0n` §3–§7⑤）。
> - **T03 覆盖矩阵** = 状态层（PG 真源已有哪些 Evidence/候选、缺哪些、优先级 §3）。
>
> 流程：**T03 给缺口 → V1.1 给该缺口须填的字段与判断 ID → 协议决定这些填充能否无人值守 AUTO，还是必须 HOLD 等人工。**
> 范围：第一阶段仅服务 Jinze Canonical Experience 的真实缺口（协议 §10），**不预选主母题**（V1.1 §10 / T03 §1）。

## 0. 三者如何咬合（一张图）

```
T03 覆盖矩阵 ──(缺什么/优先级)──┐
                                 ├─→ 派工：每个缺口 → V1.1 字段+判断ID → 协议批次+闸门
V1.1 §7/§10 专用字段+L0–L4 ──────┤
                                 │
无人值守协议 V1.0 N01–N06 / G0–G6 ──┘
        │
        ├─ AUTO  → Candidate Reservoir →（确定性足够）Runtime World / Projection
        ├─ HOLD  → 隔离区，第二天晨报仅汇总高价值阻塞项
        └─ REJECT→ 隔离/去重日志
```

## 1. 不可违背的硬约束（三者交集，任何批次不得破）

1. **Truth Store = PostgreSQL `mohen_dev`**（`supabase/migrations/` 定义）；`apps/web/data/experience/*.json` 仅为构建/审计投影，入库写 PG 不写 JSON（T03 §0/§4；协议 §6）。
2. **来源门禁 `data/fixtures/source-providers.json`**：S1 上图/方志·政府 Heritage（可证）、S2 Wikimedia/Internet Archive（可证）、S3 高德（**仅现代空间**）、S4 社媒（不可证）。取回守门禁（T03 §1/§4）。
3. **当今坐标 ≠ 历史坐标**；历史锚点/几何/同景 → HOLD（协议 G3；V1.1 §12-7/§10 禁 AI 补画河道/历史复原）。
4. **无 Evidence 不晋级**（G4）；冲突保留双方不自动选边（G5）；同名/歧义 → HOLD（G1）；**AI 生成 ≠ Evidence**（L1 规则）。
5. **Candidate Reservoir 与 Runtime World 分离**；无人值守不改 Canonical Experience（L5 HOLD）、不改 C0–C4、不改 Schema/写权限（协议 §6/§13）。
6. **依据须绑定具体判断 ID `Mx-C0n`**（V1.1 §8.3）→ 数据生产产出的 Claim 必须带 `judgment_id` + `evidence_ids` + `relation_path`。
7. **示例隔离**：EX1–EX5 / S1–S7 为方法演练，不得导入真实库（V1.1 §0/§10）。当前《T05_B1_M1_完整实例.html》里的 EX1 仅是原型示意，待本 T06 产出真实 Evidence 后替换其各帧 `review.dataIn` 与 `evidenceText`。

## 2. 结构性前置（必须先解，否则母题数据无法结构化入库）

- `packages/domain` 仅有 `SourceRecord/Evidence/Claim` 占位，**无 `Material/Motif/Judgment/SpatialEntity/Actor`**；PG 中 M1–M5 无表/枚举（T03 §0/§4）。
- 派工前需 **开发总工程师** 定义映射（**非无人值守自动**，属协议 §9 人审 Contract）：
  - **母题/节拍/判断**：在 `Claim` 或 `cultural_relation_claims` 加 `motif`/`beat` 标签；或新建 `cultural_judgments` 表存 `judgment_id=Mx-C0n`、`claim_ids`、`status`（支持/部分支持/冲突/尚未证实/已被反证）。
  - **Material**：映射 `Material → source_records + evidence + historical_features + cultural_events / cultural_relation_claims / cultural_present_connections`。
  - **Actor**：`entities` 增 `type=person|group` + `relation_to_jinze` 字段（解 HR-1 吕颐浩 unproven 悬停）。
- 此迁移不得进无人值守 AUTO；须先有 Contract + 测试 + 回滚点。

## 3. T03 六大缺口 → V1.1 字段 → 批次与闸门分类

| # | 缺口（T03 §3） | V1.1 字段 / 判断 | 来源门禁 | 无人值守批次 | AUTO / HOLD 判定 |
|---|---|---|---|---|---|
| 1 | **M3 人物/交接类记录**（最大短板） | §7 M3：行动者与代表范围、目的与任务、节点角色、次序路径、条件选择、主观意义 | S1 方志人物卷/寺志 | N01 抓取→N03 抽 Candidate→N05 Weave | **HOLD**：人物关系/生活目的=判断性，仅进 Reservoir；吕颐浩 `relation_to_jinze=unproven` → G1 HOLD |
| 2 | **M2 历史地图归因**（HR-MAP-01，1879 图说 p36） | §7 M2：位置与覆盖 `Place(精度/reconstruction_status)`、历史几何 | S1 图籍 | N02 可定位 Fragment→N03 抽 feature Candidate | **HOLD**：历史锚点/几何 G3 HOLD；绝不自动画河道/复原（V1.1 §12-7/10） |
| 3 | **M1 寺—桥历史功能文献**（县志寺观/津梁卷+寺志） | §7 M1：关系两端、活动与参与者、角色方向、有效时期、空间资格、支持/反对、变化今日对应 | S1 县志/寺志 | N01→N02→N03；E1 已多证据 | **E1 桥—水—桥：AUTO-PROMOTE**（确定性空间关系，G4 PASS）；**E2 寺—桥仅当前相邻，不得升历史功能**；寺—桥功能=历史因果 → **HOLD + research lead** |
| 4 | **历史视觉证据**（古照/可归因古图，当前=0） | §8 历史视觉：仅可溯源原图/现场图/注释/数据驱动重建；首期禁生成式历史场景图 | S2 Wikimedia CC | N01 Visual Asset ingest | metadata **AUTO**；同景判断/权利不清 → **HOLD**；老照片同景判定=HOLD（协议 §5/§10） |
| 5 | **金泽塘几何/名称**（水道名冲突：金泽塘/市河/秀州塘；无走向/改道） | §7 M5：对象身份链、承接维度、状态时间；§7 M2：位置与覆盖 | S3 仅现代水道坐标 | N03/N04（现代） | 现代水道 S3 坐标 **AUTO**；历史名称统一/走向 → **G1/G3 HOLD** |
| 6 | **吕颐浩↔颐浩寺方志原文**（HR-4 现 candidate） | §7 M3 行动者；Entity Resolution | S1 方志原文 | N01 S1 抓取→N04 确定性对齐 | 吕颐浩 Wikidata ID 强一致 **AUTO**；`relation_to_jinze` 仍 unproven → **G1 HOLD**；升 fact 需 S1 原文（G0 来源完整） |

## 4. 第一阶段 无人值守批次 派工（协议 §10 N01–N06，针对金泽）

| Job | 范围 | 为什么先跑 | 闸门 / 输出层 |
|---|---|---|---|
| **N01 Source Refresh** | 增量抓 S1（上图/方志寺观·津梁卷·寺志）/S2（Wikimedia 古照）覆盖缺口 1/3/6 | 确定性高，最易无人值守 | G0 来源完整；写 L0 Raw（append-only）+ Source Record |
| **N02 Evidence Fragment** | 1879 图说 p36、县志、寺志 生成 page/locator/quote/region | 直接增强 Evidence，不要求历史判断 | locator 缺 → G0 HOLD；写 L1 Evidence |
| **N03 Candidate Extraction** | M1/M2/M3/M5 缺口抽 Entity/Time/Place/Relation Candidate | 只进 Reservoir，风险可控 | 仅写 Candidate；L2/L3 Candidate |
| **N04 Deterministic Resolution** | 吕颐浩(Wikidata ID)、双桥(strong ID) 精确对齐/去重 | 机器擅长的确定性劳动 | 歧义(HR-1 unproven) → G1 HOLD |
| **N05 Relation Candidate Weave** | E1 桥—水—桥 簇 + M1/M3/M5 candidate relation 生成 path+evidence | 服务当前体验，不追数据量 | 历史因果/功能/跨源 → HOLD；仅 Candidate |
| **N06 Gate & Projection** | G0–G6、AUTO/HOLD/REJECT、刷新 Agent Read Model | 形成完整无人值守闭环 | 仅 E1 类确定性空间关系 AUTO-PROMOTE；其余 HOLD；Projection 不反写 Truth Store |

> 暂不作为第一阶段无人值守：Historical Geometry 重建、历史地图配准、同景老照片判定、历史因果自动裁决、跨源冲突裁决、Meaning/Present Connection 自动发布、L6/L7 正式入库（协议 §10）。

## 5. 必须 HOLD（绝不自动晋级）清单

- 寺—桥**历史功能关系**（M1）：零前现代文献 → HOLD + research lead（T03 §2 U5/U8）。
- M2 **历史地图归因/几何**：G3 HOLD。
- M3 **全部**人物/生活目的/交接：判断性 → HOLD（仅 Candidate）。
- 金泽塘**历史名称/走向**：G1/G3 HOLD。
- 吕颐浩↔颐浩寺 **relation**：G1 HOLD。
- 老照片**同景/Visual meaning**：HOLD。
- 任何 **Meaning / PresentConnection** 自动发布：L4 HOLD（协议 §5）。

## 6. 晨报预期（协议 §8）

首轮金泽批次预期 **`PASS WITH HOLD`**：新增若干 S1/S2 Source/Evidence/Candidate，少量 E1 类确定性关系晋级入 Runtime World；M1/M2/M3 缺口大量 HOLD 待人工。**有 HOLD 不是失败**；仅当 schema drift / 写权限异常 / 连续高错误率才 `STOPPED`。

## 7. 与 T04 / T05 衔接

- **T04 体验脚本**：选切片（建议 M2 单母题，或 M1+M2）写五分钟核心体验；其数据缺口由本 T06 批次供给。
- **T05 逐帧 UI**：当前《T05_B1_M1_完整实例.html》以原型 EX1 数据运行；本 T06 产出真实 Evidence/Claim 后，替换 M1 各帧 `review.dataIn` 与 `evidenceText` 为 PG-backed `Mx-C0n` 判断与出处（依据绑定判断 ID，V1.1 §8.3）。
- **优先级**（T03 §3，按缺口紧急度，**非母题排名**）：M3 人物/交接 > M2 历史地图 > M1 寺桥文献 > 历史视觉 > 金泽塘几何/名称 > 吕颐浩方志原文。

## 8. 反"瞎搞"自检（每轮批次必过）

- [ ] 所有写入走 PG，不写 JSON 投影
- [ ] 取回守 S1–S4 门禁，S3 仅现代空间、S4 不取
- [ ] 每个晋级 Claim 带 `judgment_id` + `evidence_ids` + `relation_path`
- [ ] HOLD 清单未被悄悄晋级
- [ ] 未把 EX1–EX5 / S1–S7 示例导入真实库
- [ ] 无人值守未改 C0–C4 / Schema / 用户布局选择
- [ ] 有 `run_id`、规则版本、源/证据 ID、Gate 结果与回滚定位

---
*本文件为 T03→（数据生产）→T04/T05 的衔接层；最高依据仍为 C4 V2.1、V0.9.1、五母题主稿 V0.1。与它们冲突处以最高依据为准并回写本文件。*
