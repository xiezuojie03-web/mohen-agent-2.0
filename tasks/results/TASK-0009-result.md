# TASK-0009 — 结果报告（Jinze Historical Spatial Source Acquisition）

**Status:** COMPLETE（PASS）
**Task:** `TASK-0009-jinze-historical-spatial-source-acquisition-V1.1.md`
**Depends on:** TASK-0008 PASS (`ab77436` / `034dfb2` / `ae185a4`)
**Scope:** Jinze only ｜ **性质:** source acquisition & audit，**非** georeferencing
**Date:** 2026-09-22 ｜ **Stop rule:** 完成后 STOP，不启动 TASK-0010

---

## 0. 结论（Gate 三问）

| 输出 | 值 |
|---|---|
| `DIRECT_JINZE_HISTORICAL_MAP_FOUND` | **NO** |
| `JINZE_LOCAL_SPATIAL_EVIDENCE_FOUND` | **PARTIAL** |
| `HISTORICAL_MAP_GATE_REASSESSMENT_REQUIRED` | **NO** |

**未产生 `BREAKTHROUGH_CANDIDATE`**（头号靶位 1879 p36 三标签未清晰可读 → 高潜线索，非突破）。

---

## 1. §14 精确计数

### 1.1 P0 目标（5 个，全部显式）

| 状态 | 数 | 目标 |
|---|---|---|
| `A_ACQUIRED` | **3** | P0-1 1879、P0-2 1788、P0-3 1934 |
| `B_LOCATED` | **0** | — |
| `C_CONFIRMED_EXISTENCE` | **2** | P0-4 1597、P0-5 1669 |
| `D_RESEARCH_LEAD` | **0** | （1597 的 NDL 通道为**子状态** RESEARCH_LEAD，主状态仍 C） |
| `E_SEARCHED_NOT_FOUND` | **0** | — |

### 1.2 P1 目标（4 个，DEFERRED）

| 状态 | 数 |
|---|---|
| acquired / located / confirmed / research_lead / searched_not_found | **0 / 0 / 0 / 0 / 0** |
| 显式状态 | **DEFERRED_NOT_ATTEMPTED**（P1 门槛 = 所有 P0 显式 ✓，本任务按 STOP 纪律未执行；见 backlog BK-P1-1…4） |

### 1.3 P2 目标（3 个，DEFERRED）

| 状态 | 数 |
|---|---|
| acquired / located / confirmed / research_lead / searched_not_found | **0 / 0 / 0 / 0 / 0** |
| 显式状态 | **DEFERRED_NOT_ATTEMPTED**（未越序；见 backlog BK-P2-1…3） |

> `E_SEARCHED_NOT_FOUND` 永不等于"不存在"；P1/P2 本任务**未曾检索**，故不适用该状态。

### 1.4 资产与台账

| 指标 | 值 |
|---|---|
| Raw Store 文件总数 | **138**（`D:\MoHen\data\raw\historical-spatial\jinze\`） |
| 原件 PDF | **3**（1879 / 1788 / 1934） |
| 渲染页/派生裁切 PNG | **60**（含 `full_p*.png`、`ocr_hi/*.png` 8 张、contact 表等） |
| JSON（OCR/索引/清单） | **46** |
| 已登记 checksum 的**内容文件** sha256（distinct） | **3**（原件）＋派生登记 5 条 = **8** 台账条目 |
| 新增 Source Records | **7**（SRC-1879/1788/1934/1597/1669/SHL/SCC） |
| 新增地图候选（`evidence_type='map'`） | **15** |
| 新增 Evidence（总） | **17**（15 map + 2 record 存在性） |
| 直接描绘金泽的地图 | **0** |
| 金泽**局部**空间页（金泽所在区域） | **2**（MC-1879-XINAN p49、MC-1879-P36；均 `jinze_visibility=uncertain`） |
| 印刷有"金泽/金澤"标签的地图 | **0** |
| 含**可辩护金泽空间锚点**的地图 | **1**（MC-1788-PUSHAN 濮山湖图 = 澱山湖，近邻区域锚） |
| 权利已知（known） | **6**（1879/1788/1934/1597/1669 PD；SHL OPEN） |
| 权利未决（pending） | **1**（SRC-SCC legacy_provenance = PENDING） |

### 1.5 按 `usage_mode_candidate` 分档（17 条候选）

| 用途模式 | 数 | 备注 |
|---|---|---|
| `global_registration` | **5** | 全境/区域图 |
| `local_registration` | **2** | 1879 西南境水道图、二里半方图网格组 |
| `anchor_points` | **1** | 1788 濮山湖图（澱山湖） |
| `local_registration / anchor_points`（混合） | **1** | 1879 p36 网格格 |
| `historical_spatial_reconstruction` | **0** | 无可支撑者 |
| `original_map_narrative` | **0** | 无 |
| `not_usable` | **8** | 6 幅山湖图/县城图/保甲图 + 1597/1669 存在性记录 |

### 1.6 TASK-0008 十四条 SHL unresolved 视觉

| 结果 | 数 | 条目 |
|---|---|---|
| **身份已决**（判为 non-Jinze） | **12** | HRV-03…11、HRV-14、HRV-15、HRV-16（全部文本题录判据） |
| **时间已决** | **0** | 无新取得可审计年代证据 |
| **仍未决** | **2** | HRV-12、HRV-13（不在 281 条 Legacy 索引 → `pending_scc_lookup`） |

（交付：`jinze-scc-visual-crosswalk.csv` 等 3 份，属 Phase 0B 输出。）

### 1.7 门禁与不变式

| 指标 | 值 |
|---|---|
| 新增 G0–G6 审计**行** | **119**（17 evidence × 7 gate） |
| 新增审计**语句**（含幂等 delete） | **238** |
| `audit_relation_orphan` before / after | **63 / 63**（未变） |
| `published` before / after | **0 / 0**（未变） |
| `source_records` before / after | **181 / 188**（+7） |
| 本任务 evidence（hs） before / after | **0 / 17** |
| Legacy mtime before / after | `2026-09-21 19:31:02`（未变） |
| Legacy tree sha256 | `98a4758fe6683811a05d4b5397977143047e25001ee5a3fa6d8d8adac7d596d2`（`legacy/` git 状态：**clean**） |
| Legacy 写次数 | **0** |
| **幂等重跑** | `source_created=0, source_reused=7, evidence_written=17, audit_written=238`，前后快照一致，`invariant_ok=true` |

### 1.8 验证（tests / guards / typecheck / build）

| 检查 | 结果 |
|---|---|
| `pipelines/visual/check-shr-overlay.mjs`（Phase 0 §2 回归） | **ok=true**，4 行齐全，无 missing/mismatch，SHR-04 名称异写保留 |
| `tests/data/spatial-grounding.test.ts`（含 63 孤儿 / published=0） | **20/20 passed** |
| `guard:docs`（`check-doc-budget.mjs`） | **OK**（specs 5 件均在预算内） |
| `guard:structure`（`check-structure.mjs`） | **exit 0**（`skills=9`，含新增 `mohen-historical-spatial-source`） |
| `pnpm -r typecheck` | **6/6 包 Done**（web / agent-runtime / data-access / domain / experience-engine / ui） |
| `pnpm --filter @mohen/web build` | **✓ Compiled successfully**，静态页 4/4，Next 15.5.25 |

### 1.9 提交

| 项 | 值 |
|---|---|
| 基线 HEAD | `ae185a46c1ff4714da08460b47960483f13c2d34` |
| 本任务 commit | **见 §4（commit hash 由提交时写入）** |
| worktree clean | **见 §4** |

---

## 2. 关键诚实结论

1. **p36（1879 二里半方图 第三排四/五號）**：图形已获（A_ACQUIRED），区域吻合（`吴江界`/`青浦界`/`湖山湖=澱山湖`），但 **4800px 全页 OCR 仅 16 token，`金泽`/`蔡浜`/`槍開河` 三标签全部缺席**；格位身份亦 OCR 不一致（"三排四號" vs "三排五號"）。→ **不满足 "obtained and legible"** → **不标记 BREAKTHROUGH_CANDIDATE**，记为高潜线索。**模型不能看图，OCR 缺席即"未获可读证据"**，不得以区域吻合反推。
2. **1788 / 1934**：图版**从源资产实际索引**（非纸面推断），均为县域/区域级，**无聚焦金泽地图**；金泽在 1788 仅见于志文。
3. **1597 / 1669**：**存在性确证**（明/清《青浦县志》均有 图考/乡保区图/市镇/桥梁/水利），但数字扫描未获；NDL 8 卷 API 502 不可达 → 子状态 RESEARCH_LEAD。
4. **14 条 SHL unresolved**：**12 条以文本题录判为 non-Jinze**（身份已决，非视觉判据），**2 条仍待 SCC/opendata 找回**，**0 条时间已决**。图像相似一律只作 `possible_match`。
5. **Phase 0 §2 修复**已就位并被回归测试覆盖：`retrieve-amap-jinze.mjs` 用 `case … jsonb_set(excluded.region_json,'{human_review}',evidence.region_json->'human_review',true) …` 保留人工叠加层。

---

## 3. §13 交付物

| # | 文件 | 说明 |
|---|---|---|
| 1 | `data/exports/jinze-historical-spatial-source-matrix.csv` | 采集矩阵（24 行 = 7 源 + 17 候选/存在性） |
| 2 | `data/exports/jinze-historical-map-acquisition-report.md` | 主报告 |
| 3 | `data/exports/jinze-historical-map-index-1597-1934.csv` | 图版索引（17 行 = 15 图版 + 2 目录级） |
| 4 | `data/exports/jinze-manual-acquisition-backlog.csv` | 人工待办（13 项） |
| 5 | `data/exports/jinze-map-breakthrough-candidates.md` | 突破候选判定（=无） |
| 6 | `data/exports/jinze-historical-map-human-review.csv` | 真实复核项（4 项） |
| 7 | Raw Store manifests/checksums | `D:\MoHen\data\raw\historical-spatial\jinze\_raw_store_manifest.json` |
| 8 | 抽取原页 + 派生裁切 | `…/1879-guangxu-qingpu/_work/`（`full_p36.png`、`ocr_hi/*.png` 等 60 PNG） |
| 9 | `skills/mohen-historical-spatial-source/SKILL.md` | 可复用流水线 skill |
| 13 | `tasks/results/TASK-0009-result.md` | 本文件 |

**代码/管线**：`pipelines/historical-spatial/register.mjs`（新增）；`pipelines/ingest/retrieve-amap-jinze.mjs`（§2 最小修复）；`data/exports/**`；`skills/mohen-historical-spatial-source/**`。

---

## 4. 提交与收尾

- **基线 HEAD**：`ae185a46c1ff4714da08460b47960483f13c2d34`
- **本任务 commit**：`<见提交后回填>` — message：`TASK-0009: 金泽历史空间源采集与审计（Source → Raw → Evidence → Map Index → Gate 复核）`
- **worktree clean**：提交后 `<见回填>`。
- **STOP**：本任务完成后停止，**不启动 TASK-0010**。
