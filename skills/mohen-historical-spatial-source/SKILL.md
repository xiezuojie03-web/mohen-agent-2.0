---
name: mohen-historical-spatial-source
description: 墨痕 Agent 2.0「历史空间源采集与审计」流水线。当要为一个镇（如金泽）采集可审计的原始历史方志/地图扫描、把图版索引成结构化台账、并以不失真方式把 Source/Evidence 写入本地 PostgreSQL 真值库时使用。覆盖 Raw Store 布局、checksum 完整性、G0–G6 审计、63 孤儿/published=0 不变式、以及「模型不能看图、只有 OCR 文本才是真实证据」的诚实纪律。
agent_created: true
---

# mohen-historical-spatial-source — 历史空间源采集与审计

## 何时用

为一个镇（当前 = 金泽）**采集并审计**原始/近原始历史空间源（方志图组、地图图版、目录级存在性证据），目标是支持：
`历史地图/图页 → 金泽/局部要素可见性 → 空间锚点/关系 → 后续 Map Gate 复核`。

**本能力只做采集 + 审计，不做地理配准（georeferencing）。**

## 红线（违反即回滚）

1. **不生图**（R7）；无 AI 地图补绘、无历史场景重构。
2. **模型不能看图**：唯一真实证据是 **OCR 文本**。标签未出现在 OCR token 中 = **未获可读证据**，**不得**因"区域吻合/看起来像"反推标签存在。OCR 只是导航/抽取辅助，不替代原件。
3. **不以视觉相似作历史身份证明**（14 条 SHL 判据全部来自文本题录，非视觉）。
4. **现代坐标不回投为历史坐标**；现代规划/测绘图永远是**现代**证据。
5. **Raw append-only**：派生裁切不得覆盖原件。
6. **只写三张表**：`source_records` / `evidence` / `evidence_gate_audit`。**绝不**写 `relations` / `claims` / `visual_assets`（不触发 Knowledge Weave，不触发 published）。
7. **不变式**：`evidence_gate_audit` 中 `object_type='relation'` 的孤儿行 **恒为 63**；`published`（claims verified/published）**恒为 0**。新 evidence 的 `extraction_method` 必须**区别于**既有方法（如 `historical_map_source_acquisition`），审计行 `object_type='evidence'`。

## Raw Store 布局

根：`D:\MoHen\data\raw\historical-spatial\<town>\`（gitignored `data/raw/*`）

```
<t town>/
  1879-guangxu-qingpu/   原件 pdf + _work/（OCR json、full_pNN.png 渲染页、contact 表）
  1788-qianlong-qingpu/  原件 pdf + _map_index.json
  1934-republic-qingpu/  原件 pdf + _map_index.json
  1597-wanli-qingpu/  1669-kangxi-qingpu/   modern-water-conservancy/  heritage-survey/
  planning/  international-maps/  research-leads/
  _raw_store_manifest.json      ← 各原件 file / size / sha256 / pages
  _registration_manifest.json   ← sources[] + records[]（§8 候选字段 + gate_facts）
```

每条采集**必须**保留：原件、source URI、馆藏/provider、retrieved_at、权利、**checksum、原始页/印刷页、像素尺寸、派生关系**。

## 工作流

1. **定位**：优先机构/Commons/NLC 系原件（完整 PDF），不用截图/OCR 页。古籍用**区县名或旧称**检索（现代镇名命中 0）。
2. **下载 + 校验**：落盘原件 → 计算 **文件 sha256**（`_gen_manifest.py` 风格）→ 记入 `_raw_store_manifest.json`。
3. **索引图版**：定位舆图/图版**页段**后**再** OCR 定位（**不要**默认整卷 OCR）。`_map_index_incr.py` 用 append-mode JSONL，抗中断。
4. **建登记清单**：`_build_registration.py` 产出 `_registration_manifest.json`：`sources[]`（7 源）+ `records[]`（地图候选 + 存在性证据），每条带 §8 字段与 `gate_facts`。
5. **入库**：`node pipelines/historical-spatial/register.mjs` → 打前后不变式快照，断言 `invariant_ok`。
6. **出账**：生成 source-matrix / map-index / backlog / breakthrough / human-review 等 §13 交付物（数据驱动生成，避免手抄）。

## 数据模型要点

- 库：本机 PostgreSQL 18（`:5432`，`mohen_dev`），连接串在 gitignored `.env.local`；访问层 `packages/data-access/src/index.mjs`（`run/runMany/queryRows/queryValue`，经 `psql -f` 临时 UTF-8 文件，密码不进日志）。
- **无 `map_candidates` 表**：地图候选 = `evidence` 行（`evidence_type='map'`），§8 字段放 `region_json`（无需新迁移）。
- `evaluateGates(facts)`（`pipelines/evidence/gates.mjs`）→ `{gates:G0..G6, tier}`；无坐标 → `G3 spatial=false` → 全部 tier B。
- `verification_status` 恒 `candidate`，**绝不** verified/published。
- **幂等**：`source_records` 用 `unique(provider,checksum)` 去重；evidence/audit 用**确定性 UUID**（`sha256("ev:"+id)` 派生）+ delete-then-insert。

## 坑（都踩过）

1. **checksum 必须等于原件 file sha256**。若登记清单里的 `checksum` 是"另一副本的哈希"，会出现"`raw_path` 文件与登记 checksum 不符"的审计缺口；且改 checksum 后重跑 `register.mjs` 会因 `unique(provider,checksum)` 失配 + 确定性 UUID 相同而 **PK 冲突**。修正：按 `raw_path` 匹配 `UPDATE source_records SET checksum=<file sha256>`，**再**重跑 register（→ reused，无重复）。
2. **数据访问 ESM import**：脚本要放在**项目内**（如 `pipelines/historical-spatial/`）用相对路径 `../../packages/data-access/src/index.mjs`；放 Raw Store 里用 Windows 绝对路径 import 会报 `ERR_UNSUPPORTED_ESM_URL_SCHEME`（需 `pathToFileURL`）。
3. **`nohup ... &` 后台在沙箱不可靠**（0 字节日志）；用 append-mode JSONL 增量落盘抗中断。
4. **Bash PATH 会坏**（`ls: command not found`）→ 命令前加 `export PATH="/usr/bin:/bin:$PATH"`。
5. **RapidOCR** 返回 `[box,t,s]` 三元组（`for _,t,s in res[0]`）；固定最大边 zoom（`maxedge/max(w,h)`）避免 "Overly large image"(code=5)。
6. **1934 等大 PDF 首下可能失败**：用 Commons API 重下并核 SHA1。

## 命令速查

```bash
export PATH="/usr/bin:/bin:$PATH"
cd "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0"
NODE="C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe"
PY="C:/Users/Administrator/.workbuddy/binaries/python/versions/3.13.12/python.exe"

# 入库 + 拿前后不变式快照
NODE_PATH="C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules" "$NODE" \
  pipelines/historical-spatial/register.mjs

# Phase 0 SHR 叠加层回归（§2）
"$NODE" pipelines/visual/check-shr-overlay.mjs

# 空间不变式测试（含 63 孤儿 / published=0）
"$NODE" node_modules/vitest/vitest.mjs run tests/data/spatial-grounding.test.ts
```

## 源状态词表（每个目标必须落在其一）

`A_ACQUIRED` / `B_LOCATED` / `C_CONFIRMED_EXISTENCE` / `D_RESEARCH_LEAD` / `E_SEARCHED_NOT_FOUND`。
`E_SEARCHED_NOT_FOUND` **从不**等于"不存在"。可附 `OPEN` / `ACCESS_REQUIRED` / `RIGHTS_PENDING` / `DOWNLOAD_FAILED` / `CATALOG_ONLY`。

## Map Gate

`HISTORICAL_MAP_READY=YES` 需要"描绘金泽本身 或 给出可辩护金泽空间锚点"的地图；**宏观区域图不够**。
取得直接/局部金泽图 → 标 `BREAKTHROUGH_CANDIDATE` + 备复核证据，**但不自判** Map Gate。

## 交接边界（下游 = Assemble）

本 skill 到此为止：**采到并审计完源**。把源变成「历史空间切片」（特征 / 时间语义 / 接地 /
E1–E4 关系 / 变更 / 就绪门）是下游 **`mohen-historical-spatial-reconstruction`** 的职责，见该 SKILL.md。

两条交接纪律：
1. 本 skill 产出的 `source/page identity`、`grid sheet`、`unresolved labels` 等复核结论，
   **不得**被下游改写成「已确认」；下游只能以**新的** Human Review Decision **追加**（如 `HR-MAP-01`），
   且不得沿用 `HR-[1-6]` / `SHR-*` 前缀以免碰撞。
2. 「Historical Spatial Source = YES」**不等于**「图上有可归因于某对象的要素」。若图上标签未读出/
   UNRESOLVED，下游**必须**把该图登记为「不可归因于切片对象」（`attributable_to_slice_objects=false`），
   禁止因「这个区域应该有某镇」而生成历史位置。

