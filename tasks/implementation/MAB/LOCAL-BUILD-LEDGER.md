# 墨痕 M5 完整闭环施工台账（本地主导 · 持久化）

> 本文件是**本地主导施工的持久台账**，任何新会话接手先读这里 + `PLAN.md` + `progress.md`。
> 目的：不受对话上下文影响，随时能知道"做到哪一步、每步闭环了没、下一步是什么"。
> 施工铁律：**严格按依赖顺序，每步做完自检清单（PG+HTTP 证据）才进下一步，不跳步、不脚本代跑表面。**

## 一、施工路线（5 步，对齐 PLAN）

| 步 | 目标 | PLAN 依据 | 状态 |
|---|---|---|---|
| 1 | M2 底座：studio schema 全表 + 私有原件 + L0→L1→L2 真实链（含 13 类资产） | PLAN §3.2 / §5-M2 | 🔵 施工中 |
| 2 | M3 真实 D 链：production-registry 激活 + 63 方法绑定 + D00–D05 真实执行 | PLAN §3.3 | ⬜ 待施工 |
| 3 | M3 独立 Gate：真实 Reviewer 投运 + G0–G5 签发/撤权/消费 | PLAN §3.3 | ⬜ 待施工 |
| 4 | M4 受控 Provider 执行器（B 线）：解阻断 + 真实派发/费用/Receipt | PLAN §3.4 | ⬜ 待施工 |
| 5 | M5 八维度完整闭环：Studio 真实走一遍 + Owner 亲自体验 | PLAN §3.5 / 八维矩阵 | ⬜ 待施工 |

> 说明：原 6 步里的"M2 原件链"和"13 类资产表"实为**同一 studio schema 迁移链**（private_originals 依赖 projects+asset_revisions），合并为第 1 步。

## 二、每步闭环自检清单（做到才算"这一步闭环"）

### 第 1 步 · M2 底座（自检 10 项）
- [x] 1.1 studio schema 8 张表建齐（projects/asset_heads/asset_revisions/delegations/execution_receipts/asset_links/use_events/private_originals）
- [x] 1.2 项目创建：studio.projects 有"松江府田赋"项目（owner=Owner）
- [x] 1.3 私有原件入库：NAJ 田赋页字节入 private_originals，state=STORED_VERIFIED，SHA 回读一致（本地文件系统 D:/MoHen/data/private_originals）
- [x] 1.4 L0 来源登记：source.sources + source_versions + raw_items 有 NAJ 记录（rights/uri/locator + 字节项）
- [x] 1.5 L1 载体读取：source.read_runs + read_units（method_code=C02 扫描书影）
- [x] 1.6 L2 材料理解：evidence.reading_units + material_evidence 有 OCR 证据（literal_reading + source_voice）
- [x] 1.7 13 类资产：research_brief/source_anchor/reading_note/evidence_note 四类真实落库（不可变 revision，5 heads + 5 revisions）
- [ ] 1.8 同输入回放：同 idempotency_key 重复读取不产生重复记录（幂等）
- [ ] 1.9 撤权拒绝：撤权后 L0-L2/私有原件访问被拒（PG 负例）
- [ ] 1.10 HTTP 正反：通过 API 正例 200，撤权后 403/拒绝（HTTP 证据）

### 第 2 步 · M3 D 链（待第 1 步闭环后细化）
### 第 3 步 · M3 Gate（待细化）
### 第 4 步 · M4 执行器（待细化）
### 第 5 步 · M5 八维度（待细化）

## 三、当前进度（最新状态，持续更新）

- 2026-11-07 已建立本台账。第 1 步施工中：本地 PG 缺 studio schema，需先应用 M2 studio 迁移链。
- 前置核实：L0/L1/L2 表（source.sources/read_units/material_evidence）已存在；studio schema 不存在（0）；Gate 表已由前批应用补齐。

## 四、施工历史（每次施工追加一行）

- 2026-11-07：建立台账，核实第 1 步前置（studio schema 缺失，需应用 20261102105810/20261102140000 等 M2 迁移）。
