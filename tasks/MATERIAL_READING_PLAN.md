# 库内资料读懂方案（MoHen 数据生产·合法链路 D01–D05 合规执行）

> 状态：方案已确认。**可读文本 D01+D02+D03 本轮已执行**（报告 `tasks/results/D01D02-20261005/`）；**视觉读取仅列入本方案 §5（不执行）**，本轮走 Asset Pending。
> 日期：2026-10-05（执行轮次）
> 依据：《MoHen 数据生产协议》D01–D05（Discovery Research）+《宽进与广联》T01–T14 载体读取 / A01–A12 / AVS。
>
> **本轮三项用户决断（2026-10-05）**：
> 1. **视觉读取列入正式方案文档（仍不执行）** → 见 §5，仅作未来选项与成本拆解。
> 2. **本轮仍走 Asset Pending**：视觉载体只登记 `catalog_only / asset_pending`，不真读图；零新依赖、零新增成本，与护栏（Legacy-first / 不新增外部依赖）一致。
> 3. **其它读懂资料的任务可以执行了** → 可读文本 D01+D02+D03 已离线跑通（不连库、零 Truth 写入）。

---

## 0. 背景与问题

此前 `TASK-DATA-20261004_原始数据样本报告.html` 只报了语料数量，**未对库内资料按载体分类与读懂**，直接违背了《宽进与广联》"宽进（D01 全量盘点）→ 广联（D02 分载体读懂）→ D04 关联 → D05 人文筛选"的合法链路。

本方案修正该问题：先对库内资料**分类读懂**（知道每份资料具体是什么、能支撑什么叙事），再进入下游叙事转化。

---

## 1. 已确认的五项边界决策（用户 2026-10-05 确认）

| # | 决策 | 结论 |
|---|---|---|
| ① | readable 源优先序 | 先吃 `clans` / `gj_*_entries` / `mgts_*_entries` / `press_*` / `protection_index`；catalog / 视觉本轮作 Lead（不假装已读） |
| ② | 视觉读取（舆图/图片） | **本轮 Asset Pending**：视觉载体只登记 `catalog_only / asset_pending`，**不真读图**。零新依赖、零新增成本，与护栏一致 |
| ③ | OCR 质量评估 | 做轻量规则评估（乱码率/字段完整度）后再定 `uncertainty` |
| ④ | derived 文件定位 | `_chatgpt_extract*/` `ocr/` `dig/` `_pdf_extract_*.txt` `press_*_review*.txt` **不当前手来源**，仅作对照/回填线索 |
| ⑤ | T07（近现代测绘/地籍图） | 库内缺失 → 并入 T06（历史舆图变体），**不补采**（遵守 Legacy-first 护栏） |

---

## 2. D01 盘点与分类

**范围**：`hushang-jingwei/data/fetched/` 下全部源文件（只读，不修改原始数据）。

**分类标签**：`readable_text` / `catalog_only` / `visual_carrier` / `ocr_source` / `derived`。

**分类映射（基于文件名模式）**：

| 标签 | 命中模式 | 本轮动作 |
|---|---|---|
| readable_text | `clans*.json`, `gj_*_entries*.json`, `mgts_*_entries*.json`, `press_*.json`, `protection_index*.json` | D02 读懂（执行） |
| ocr_source | `gj_*_ocr*.json`, `mgts_*_ocr*.json` | D02 读懂 + 质量评估（执行） |
| catalog_only | `yutu_catalog*.json`, `yutu_probe/*` 目录索引、各类 `*_catalog*.json` | 仅登记为 Lead |
| visual_carrier | `yutu_probe/*.pdf`(142), `yutu_probe/*.png`(45), `commons_images.json`(437) | **Asset Pending**（不执行） |
| derived | `chatgpt_extract*`, `ocr/`, `dig/`, `_pdf_extract_*.txt`, `press_*_review*.txt` | 排除出一手，仅对照 |

> 实际清单由 D01 脚本对 FETCHED 全量扫描后产出（见执行部分）。

---

## 3. D02 分载体读懂（本轮执行部分）

### 3.1 可读文本载体（执行）
- **T01 方志 / 宗族**：`clans` → 读取卷目/条目结构，抽取 人物 / 地点 / 机构 / 活动 / 时间。
- **T02 诗文**：诗词、记文等。
- **T03 / T05 条目**：`gj_*_entries`（古籍条目）、`mgts_*_entries`（碑刻/文物条目）、`press_*`（报刊）、`protection_index`（保护名录）。
- **产出**：`ContentObservation`（含 `carrier_tag`、`subject_hint`、`quote_text`、`extraction_method`、`uncertainty`）。

### 3.2 OCR 载体（执行 + 质量评估，决策③）
- `gj_*_ocr` / `mgts_*_ocr`：先做规则质量评估（乱码/不可识字比例、字段完整度、是否含 `??`），再据结果给每条 Observation 标 `uncertainty`；高乱码段标 `needs_human_review`。

### 3.3 视觉载体（Asset Pending，决策②，**不执行**）
- `yutu_probe/`（**142 PDF** + **45 PNG**）、`commons_images.json`（**437** 张外部图）。
- 仅登记 `visual_carrier, association_readiness: catalog_only / asset_pending`，不调任何视觉模型、不下载 commons 字节。
- 详细可行性/成本见第 5 节。

### 3.4 本轮执行结果快照（D01+D02+D03 离线，不连库）
- **脚本**：`pipelines/research/d01-d02-offline.mjs`（复用 `research-pipeline.mjs` 的 `d01Inventory/d02Observations/d03Mentions` 纯逻辑，离线写 `tasks/results`，零 Truth 写入）。
- **规模**：可读源 `82`（含 souyun 诗词旁证，原漏判已纳入）；Observation `6828`；Mention `6104`（resolved 1385）；视觉 `asset_pending` 16 组；derived 排除 30。
- **缺陷/空桩缺口（库内损坏，已标记不读取，待补采/修复抓取）**：`13` 个 —— 7 个 `entries:[]` 空桩（`gj_14386/3799/6922_entries`、`mgts_87274/90096/92309_entries`）、5 个 HTTP 403 拦截页（`gj_works_朱家角/朱家角镇志/珠里小志/青浦/青浦县志`、`jp_persons_zhu`）、1 个 `status:200,body:""` 空抓取（`jp_familyname_zhu`）。
- **OCR 质量**：4 个 OCR 源（`gj_14386/3799/6922_ocr`、`mgts_92309_ocr`）做乱码率评估，79 条 Observation 据乱码率定 `uncertainty`。
- **诚实覆盖**：`catalog_only`（0 Observation）为真·索引/统计/词表文件（`clan_pdf_index`、`genealogy_*/scan_by_town`、`geo_placenames_shanghai` lexicon、`jp_*_analysis` 计数统计、`press_*_张堰/练塘` 的 `count:0` 合法空结果），非漏读。
- 报告：`tasks/results/D01D02-20261005/coverage-report.md` + `classification.json` + `observations.json`。

---

## 4. D04 关联扫描 + D05 人文筛选（后续）

- **D04**：跨载体链接（方志人物↔碑刻↔图片↔诗文），建立可辩护的关联。
- **D05**：按叙事价值筛选，输出可进入叙事转化的素材清单。
- 本节不在本轮执行范围，待 D02 可读文本就绪后推进。

---

## 5. 视觉读取可行性 / 成本拆分（**不执行 · 未来选项**）

### 5.1 关键约束
项目当前唯一配置模型为 `app/api/mohen/route.ts` 的 `deepseek-chat`（走 `DEEPSEEK_API_KEY`），**纯文本、不支持图像**。故视觉读取必然要**新接一个视觉 provider**，属新外部依赖，且突破"Legacy-first / 不新增外部依赖"护栏（CURRENT §8 HOLD / R16），需用户特别放行。

### 5.2 真实数量（已盘点）
| 图源 | 数量 | 形态 | 读取前置 |
|---|---|---|---|
| 历史舆图 PDF 页 | **142** | PDF 单页 | 需先**栅格化** |
| 历史舆图渲染 PNG | **45** | 图片（PDF 的派生渲染，冗余） | 直接读 |
| 外部图 Commons | **437** | 外部 URL（含 1280px 缩略） | 需先**下载字节** |

> 去冗余后唯一图量 = 142（PDF 栅格化）+ 437（Commons）= **579 张**；读全量含 PNG 冗余 = 624 张。

### 5.3 候选视觉方案对比
| 方案 | 是否新依赖 | 单图成本(估) | 579 张总成本(估) | 评价 |
|---|---|---|---|---|
| 本地 VLM（Qwen2.5-VL / ollama） | 是(本地算力) | ¥0 调用费 | ¥0 + 本地 GPU 时间 | 零 API 成本，但历史舆图识别弱、需新装 |
| GPT-4o-mini（detail:low） | 是 | ~$0.0002 | ~$0.1–0.2 | 最便宜云端，丢细节 |
| GPT-4o（detail:high） | 是 | ~$0.002–0.003 | ~$1–2 | 细节好、成本可控，推荐精读 |
| Gemini 1.5 Flash | 是 | ~$0.0004–0.001 | ~$0.2–0.6 | 便宜、长上下文 |
| Qwen-VL（DashScope） | 是 | 低 | 约数元 | 中文舆图友好，与项目高德同生态 |
| Claude 3.5 Sonnet | 是 | ~$0.003 | ~$1.5–2 | 精度高但最贵 |

> 成本按"系统提示~300 tokens + 图(1280px≈1 tile) + 输出~500 tokens 结构化读取"粗估，含冗余去除。

**两个隐含外部步骤（非模型调用费）**：
1. **PDF 栅格化（本地二进制）**：142 PDF 需 `pdftoppm`/`mutool`/`Ghostscript` 转 PNG（免费，引入本地工具依赖）。
2. **Commons 取图（网络）**：437 张从 Wikimedia 拉字节（1280px 约 100–400KB/张，总 ~50–150MB，免费但需限速抓取脚本）。

### 5.4 三档成本拆分
| 档位 | 范围 | 调用数 | GPT-4o 估成本 |
|---|---|---|---|
| A 读全量(含冗余) | 142+45+437 | 624 | ~$1.5–2.5 |
| B 去重后 | 142+437 | 579 | ~$1–2 |
| C 智能筛选(推荐若做) | 142 地图全读 + Commons 筛~250 | ~392 | ~$0.8–1.5 |

### 5.5 若执行需新写代码
- 新 D02 视觉分支（图像→base64→视觉模型→`MapLabel/Feature/TopologyObservation` + `VisualObservation`，含 uncertainty 兜底）。
- PDF 栅格化步骤；Commons 取图器（限速/重试/缓存）；去重/筛选逻辑。

### 5.6 建议默认（若未来要做）
1. 先用**本地 VLM 跑 142 张地图 POC**（零调用费）验证可行性；
2. 对 POC 低置信度者用**云端 GPT-4o / Qwen-VL 精读**（档位 C，约 $1 内）；
3. Commons 437 按镇筛选（~250）后云端读，支撑叙事图素材。

---

## 6. 执行步骤与护栏

- `discovery_mode = true`、`truth_write_ceiling = 0`：仅写入 `research_*` 表，不改写任何事实层。
- Legacy-first：不新增外部爬取、不新增模型依赖（本轮视觉 Asset Pending 已保证）。
- derived 文件一律不当前手（决策④），防循环/幻觉。
- 所有 Observation 带 `extraction_method` 与 `uncertainty`，保证可审计、可辩护。
