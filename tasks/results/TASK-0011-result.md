# TASK-0011 结果报告 — 金泽 Minimum Slice 证据闭环专项（Evidence Closure Sprint）

- 日期：2026-09-22
- 状态：**完成**（测试 / 守卫 / build / commit / worktree clean，STOP 于本任务，不启动 TASK-0012）
- 任务书：`tasks/TASK-0011-jinze-minimum-slice-evidence-closure-sprint.md`

---

## 0. 唯一主目标达成判定

**5 条 Legacy-only historical assertions 全部关闭**（TASK-0010 §3.2 的 5 条 → 0 条 active）：

| 断言 | 终态 |
|---|---|
| A1 普济桥「位于金泽镇北市，横跨金泽塘」 | **EVIDENCED**（跨水道部分；「北市」方位无独立来源 → T11-C1 冲突转人审） |
| A2 万安桥「旧志载其形制为亭桥（桥上建亭）」 | **EVIDENCED**（4 类独立来源；变更记录 `tingqiao-form-unknown` 升 evidenced） |
| A3 颐浩寺「1938 年毁于兵燹」 | **EVIDENCED**（青浦博物馆 + 区政府新闻办，均 .gov.cn 逐字） |
| A4 颐浩寺「1992 年原址修复开放」 | **EVIDENCED(a)** 原址重建 / **UNSUPPORTED_RETIRED(b)** 开放场所（无文号 → research lead，T11-C3/U10） |
| A5 「虽杭之灵隐、苏之承天，莫匹其伟」 | **CANDIDATE_WITH_EVIDENCE_LIMIT**（引文之引文，《松江府志》正德本原文未取得 → U11/T11-C4） |

处置原则遵守：**Legacy 原文 / provenance / research lead 全部保留**，仅退出 active assertion set；无删除、无篡改。

新增冲突（并列保留、不静默择一）：
- **T11-C1** 普济桥方位三方着录不一（地方志办「南市」/ 江南古桥研究会「中部」/ 区政府「金泽古镇」无方位）。
- **T11-C2** 万安桥跨水道（上图地名志「秀州塘」vs 官方「金泽塘／市河」；上海市地名志「秀州塘＋万安桥」组合另存金山朱泾 → 上图条目疑跨镇误挂）。该冲突**并入关系 note**，关系本身 E4→E1（官方两源）。

## 1. 交付物清单（§13 八项）

| # | 文件 | 位置 |
|---|---|---|
| 1 | `jinze-evidence-closure-search-log.csv`（检索日志 24 步） | `data/exports/`（本地产物，不入库） |
| 2 | `jinze-evidence-closure-matrix.csv`（A1–A5+A1b 终态矩阵） | 同上 |
| 3 | `jinze-shl-knowledge-alignment.md`（SHL 对齐 pilot 报告） | 同上 |
| 4 | `jinze-shl-endpoint-dataset-matrix.csv`（53 图谱族 × 探针结果） | 同上 |
| 5 | 确定性切片导出更新（feature-inventory / anchors / relations / change-inventory / slice.json / slice-readiness.md / spatial-human-review.csv 共 7 件） | 同上 |
| 6 | `jinze-evidence-closure-readiness.md`（就绪报告） | 同上 |
| 7 | `jinze-evidence-closure-human-review.csv`（T11-C1…C5 提案，非决策） | 同上 |
| 8 | 本报告 | `tasks/results/`（入库） |

Raw Store（append-only）：`D:/MoHen/data/raw/historical-spatial/jinze/t11-closure/`
- `t11-shl-20260922-558ac496/`（226 项：b2-* 53 族探针、sq-* 41 名称发现查询、pdflist* 70 份书目探测、s1c-* 8 份官方网页快照、align-entity-dump-v2.json 61 subjects）
- `t11-gazetteer-20260922-13784981/`（光绪《青浦县志》卷四至六 17MB 扫描件 + `_ocr/` + 整幅拼图）
- `t11-sources-20260922-closure/`（registration manifest + 11 源登记文件）

## 2. 精确计数（§14 对账）

### 2.1 库增量（三次落库，均确定性 UUID + upsert 幂等）

| 通道 | source_records | evidence | evidence_gate_audit |
|---|---|---|---|
| persist（`t11_s1a_*` / `t11_s1c_*`） | 188→200（+12） | 126→166（+40） | +280（40×7） |
| register（`official_*` / `shl_*` / `research_lead_unresolved`） | 200→212（+12） | 166→185（+19） | +266（19×7） |
| **合计** | **+24** | **+59** | **+546**（1785→2065→2198） |

幂等复跑：persist ×2 / register ×2 各重跑一次 → created=0、reused=12/19，计数不变。

### 2.2 不变式

| 项 | before → after |
|---|---|
| `claims` | 20 → **20**（0 新增） |
| `relations`（Legacy 基底） | 30 → **30**（零写入） |
| `historical_spatial_relations` | 8 → 8（普济桥跨水道 E4→E1，行数不变） |
| `published` | **0 → 0** |
| `audit_relation_orphan` | **63 → 63**（≤63 成立） |
| `human_review_decisions` | **13 → 13**（HR-1…HR-6 冻结） |
| active Legacy-only assertions | **5 → 0** |
| Legacy `seed.master.json` | mtime 2026-09-17（早于任务）零写入 |

### 2.3 切片判据

`c6_every_assertion_traceable`: **NOT MET → MET**（`legacy_only_assertions=0`，`all_attested_time_evidence_backed=true`）。
金泽塘 `attested_time_label=null`（语义＝「切片不作时间断言」，非「已证年代」）→ **U12/T11-C5 待架构师复核**，已入人审 CSV。

五门：`HISTORICAL_SPATIAL_SLICE_READY` PARTIAL → **YES**（readiness_gate=YES、failed_criteria=[]、8 判据全过）；
`HISTORICAL_MAP_READY`=PARTIAL、历史视觉=0、`EXPERIENCE_SCRIPT_SUBSTRATE`=PARTIAL、`PAST_PRESENT_COMPARISON`=PARTIAL、`SPATIOTEMPORAL_OVERLAY`=NO —— 均按实报不变（任务书允许）。

### 2.4 SHL Knowledge Alignment pilot（限定本切片）

- **遗产图（red/building）**：金泽 5 对象（普济桥/万安桥/颐浩寺遗址/迎祥桥/金泽放生桥）+ 消歧 3 桥（天皇阁桥两写法并存等）+ **同名异地万安桥 7 座**（嘉定/金山山阳/大团/宣桥/徐泾/新场/赵屯陈岳）全部 X-SAME-NAME-OTHER-PLACE 并列登记——名称完全一致 ≠ 同一对象，T11-C2 的关键反证即由此而来。
- **地名志（dmz）**：迎祥桥条「跨金泽塘」（A1 水道名 SHL 独立着录）；万安桥条「跨秀州塘」（冲突方）；金泽/金泽镇/青浦县上位地对齐。
- **家谱（gen）**：3 个同名「吕颐浩」祖先实体 temporalValue 互冲（明/南宋/无）→ 同名异人警示，禁止对齐南宋宰相。
- **舆图（yutu）**：1907 地形图 1 件（日陆地测量部）→ 按 P-05 DEFER，只登记不裁定，HR-MAP-01 权威不动。
- **古籍（gj）**：《金泽小志》4 版本书目 + 《吕忠穆公年谱》+ 《武林靈隱志》——书目定位完成，正文未取。
- **端点知识**：53 图谱族批量探针 16 HIT/37 ZERO；「一个查询形状 0 命中 ≠ 上图没有」已证伪（可用路径＝主语 URI 前缀发现 → 逐主语属性展开）；主语命名空间与图子域不一致（`entity/physicalculturalheritage/…`、`dmz/entity/place/…`、`jp/entity/person/…`）。
- 入库：40 条 `t11_s1a_*` evidence + register 互补 19 条；详见 `jinze-shl-knowledge-alignment.md`。

### 2.5 P-01…P-07 处置（§8）

P-01/P-02/P-03 **RESEARCH FIRST 完成**；P-04/P-07 **Opportunistic Only**（E2 不变）；P-05/P-06 **DEFER**（历史地图权威＝HR-MAP-01； dedicated reconstruction 不启动，仅机会性文本证据、零几何）。

## 3. 验证记录

| 项 | 结果 |
|---|---|
| `pnpm vitest run tests/data/historical-spatial-reconstruction.test.ts` | **17/17 passed** |
| 全量套件其余文件 | human-review-s1 #6/#7、spatial-grounding #8+9 为 TASK-0011 合法新增触发的**陈旧绝对总数/宽匹配断言** → 已按 §12-26 修为不变式（`shanghai-library` ≥9、S1 record 断言限定 `extraction_method like 's1_%'`、yutu 绊线收窄 `public/yutu`），修后 ✓；evidence-recovery #8 / human-review-s1 #11 / knowledge-weave #12 / spatial-grounding #16 共 4 处为 `spawnSync node EBUSY`（本机禁止 node 自旋 node 子进程的既有环境限制，非本任务回归，单文件运行时同报） |
| `pnpm -r typecheck` | 6/6 包 Done |
| tests 类型补检 | 仅既有 `TS7016`（data-access 无声明文件），非本任务引入；`find tests packages -name '*.js'` 前后 0→0（未在源码目录单文件跑 tsc） |
| `pnpm guard:docs` / `guard:structure` | OK / OK（skills=10 floor 8） |
| `pnpm --filter @mohen/web build` | ✓ Compiled successfully（Next 15 静态输出正常） |
| 构建器自检 | `build-jinze-historical-spatial-slice` ok=true、selector_gaps=[]、evidence_not_created 等 9 项检查全 true（首跑 2 gaps 已修：万安桥 2025 行改全角括号锚；A5 行两行均 .gov.cn 逐字 → expect=2） |
| Legacy 零写 | `seed.master.json` size 10,721,985 B / mtime 2026-09-17 未变。注：Legacy 工作区存在与本任务无关的未提交改动（.gitignore/app 页面等，来源非本会话管线），本任务未触碰 |
| worktree | commit 后 clean |

## 4. 已知限制（不夸大）

1. **A5 为引文之引文**：正德《松江府志》卷次错乱 + shtong SPA + OCR 对木刻本无效 → 原文页未取得；对外显示须带「转引」档位。
2. **shtong.gov.cn 为 JS 渲染 SPA**：桥乡条 excerpt 取自检索索引快照，相关 evidence `verification_status` 恒 candidate。
3. **光绪县志 OCR 页级定位未完成**（92 页纯图像，仅命中「市河/水利」）——OCR 只可找不可引，原件留 Raw Store 供人读。
4. **上图地名志万安桥条疑跨镇误挂**（T11-C2），按「数据不销毁」红线并列保留，待总架构裁定。
5. register 与 persist 双通道 extraction_method 命名并存：切片选择器仅引用 `t11_*` 命名；register 行作为补充目录留存（不构成 orphan——均挂有效 source），后续任务如需统一须总架构授权。

## 5. 下一步（不自行启动）

等待总架构对 `jinze-evidence-closure-human-review.csv` T11-C1…C5 的裁定；TASK-0012 由总架构下发。
