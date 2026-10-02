# H2 · 金泽 Canonical Human Experience — 施工计划 V1.0

**Document ID:** MOHEN-H2-CONSTRUCTION-PLAN-001
**Version:** V1.0
**Date:** 2026-09-26
**Owner:** 沙漠绿洲（用户 / 日常验收权）
**Executor:** 开发总工程师（角色名，工具中立；授权见 `CURRENT.md` §12 R13）
**Status:** APPROVED（2026-09-26 用户审核通过）
**Authority context:** 本计划是 H2 金泽 Canonical Human Experience 的唯一施工计划真源。
授权依据见 `CURRENT.md` §12 **R13**（开发授权与权责归一）。本计划全部阶段均
in-contract，不触碰 C0–C4 核心边界；仅当触碰核心边界才走正式 Architecture Reconciliation。

---

## 0. 现状基线（已实测，非推测）

- **Runtime 健康**：dev server `/` 与 `/experience/jinze-water-net` 均 200，金泽页为真实
  SSR（148KB，标题 `墨痕 · 金泽：一公里之内的南宋`）；`POST /api/mohen/ask` 返回
  `ok:true, degraded:false`，说明 PostgreSQL `mohen_dev` 可达、ADR-003 三层 Agent 真实联通
  数据库，且对模糊问句按 C4「展示→提问→揭示」返回澄清而非编造。
- **工程基座真实**：8 幕骨架、`beats.ts` 五 BEATS、`SpatialSurfaces`、`checkFrozenInvariants`
  4 冻结 JSON、`AskBar`（全仓库第一个 input）、`?inspector=1` 闸门均在。
- **但用户视角仍是"调试构建物"**：与金泽导演稿
  （`specs/experience-ui/墨痕_Agent_2.0_金泽最小体验导演稿_V1.0.docx`，最高体验权威本地缺口已闭合）
  差距明确。
- **已坐实的三处默认态泄漏**（grep 实证，非文档声称）：
  - `SpatialSurfaces.tsx:124` 默认保留 `GCJ-02` 坐标系 banner（`:125` 六位坐标已
    `ctx.devMode` 门控，但 banner 本身未门控）；
  - `ExperienceShell.tsx:265` `Beat {n}/5 · {sceneIndex+1}/{len}` 默认常驻、零门控；
  - `EvidenceNarrativeSurfaces.tsx:451` 默认直出 `来源：008/cultural_conflicts` 内部路径。

---

## 1. 当前最大体验缺口（决定施工顺序）

1. **第一幕主角错配**（最致命，直接废掉 P1 重新看见）：开场把 GCJ-02 抽象经纬网当"今天的金泽"
   抛给用户，而非"今天能去的一公里水乡"。
2. **技术元数据默认泄漏**：GPS 六位、认知枚举、冲突静默裁决标签、伪代码在默认 UI 可见。
3. **五幕中段塌空**：史料原页 Surface 空槽（`imageAvailable=false`）；回到今天（s07）未保留任何
   历史痕迹 → 第四、五幕断在中间。
- 较轻两项：首页是 Foundation 工程自检页、**零入口**；Agent 理解层偏保守（"金泽有什么桥"被判
  `unknown` 而非给对象清单）。

---

## 2. 阶段施工计划（每阶段可独立验收）

> 每个阶段开工前，Executor 先出**具体改动清单**（含：Baseline 必守条款、涉及文件、预期视觉变化、
> 验收证据），由 沙漠绿洲 过方案后再写码（授权 C = 轻量报告）。里程碑级 canonical 改动才写完整
> Task Book + §29 15 项报告。

### Stage 0 — 入口与默认路径
- **目标**：让用户体验进得来，且默认不先撞见工程/坐标/调试。
- **改动**：建 human-facing 入口 / landing 路由进金泽第一幕；Foundation 自检页移出默认路径
  （gate 到内部路由，如 `/foundation`）。
- **授权依据**：A + E（入口路由属 in-contract UI，非新镇 / 新主题）。
- **验收**：从根路径直接进入金泽第一幕；Foundation 页不再默认暴露。
- **状态**：待启动。

### Stage 1 — 第一幕主角纠正（Beat 01 合规补齐）★ 最高优先
- **目标**：第一眼是"今天能去的一公里水乡"，建立"重新看见"。
- **改动**：隐藏默认态 `IMMERSIVE_SPATIAL` 调试条 + GCJ banner；第一幕用真实今貌意象 + 钩子
  "你站在一公里之内的南宋"；核验 `?inspector=1` 默认态确实藏住上述三处泄漏；**先坐实真图资产能
  在沙箱加载**（见 §5 前置风险）。
- **授权依据**：B（Baseline §13.1 + Beat 01 明文要求，属合规补齐，不触发升级）+ D（若需微调冻结
  JSON 的 Beat 01 编排）。
- **验收**：第一眼无坐标 / 枚举 / 调试条；VAG-2 drift 对比截图；冻结不变量若挡第一幕重建，按已授权
  方式分路由调形状（认识论红线一行不动）。
- **状态**：待启动（第一步 = 资产加载探针）。

### Stage 2 — 第二幕前半（时空连续感）
- **目标**：用户感到"同一地方进入另一时间"，世界 visibly 变化而非整屏重置。
- **改动**：历史几何无支撑时"今天坐标权威"视觉退场（Baseline §8.4）；时间转换用连续 patch
  （淡出 / 点亮），不把 timeline 当数据库筛选。
- **授权依据**：B + E。
- **验收**：录屏显示时间切换有可见世界变化；无"只改年份标签、世界不变"。
- **状态**：待启动。

### Stage 3 — 中段补空（史料原页 + 回到今天）
- **目标**：第四、五幕不再塌空。
- **改动**：史料原页 Surface 接真实原页图（先核验资产加载）；回到今天保留至少一处历史痕迹
  （如某桥 / 关系以新含义仍在视图中），使"地点获得新意义"可感知而非纯文字。
- **授权依据**：D（若需修订冻结脚本的 return-to-present 台词）+ B。
- **验收**：历史原页可见可查；回到今天时过去改变了如何看待当下的场景可感知。
- **状态**：待启动。

### Stage 4 — Agent 理解层调参（P3 继续行动）
- **目标**：自然语言对象问询能进入"意图→对象→追问"链路，不再直接 `cannot_answer`。
- **改动**：调 ADR-003 `understand.ts` 的切分 / 阈值 / 分支（**不碰 Evidence Gate 红线**、不编造）。
- **授权依据**：in-contract agent-runtime 工作（属既定施工权限）。
- **验收**：自然问句能给出对象清单 + 追问；六类问句冒烟 `degraded=false` 且对象命中正确，零回归。
- **状态**：待启动。

### Stage 5 — 收口与 Human Gate 预备
- **目标**：全链路 Patch 连续性回归，准备真人盲测。
- **改动**：跑 VAG-1 ~ VAG-3；准备 VAG-5 真人盲测（不预先灌输内部架构词）。
- **验收**：Runtime PASS + Visual PASS + 真人盲测 P1/P2/P3。
- **状态**：待启动。

---

## 3. 明确不做（HOLD，不在本计划）

第二古镇 / 第二主题产品化；全量旧库迁移；PostGIS / Vector / Graph 基建扩张；Participation /
Living Culture Schema；商业化优化；新一轮高保真 Figma 主战场。

---

## 4. 坚守红线（任何阶段不破）

- Evidence Gate / 事实-解释防火墙 / 不编造坐标·来源·原文·古图；
- Geometry 是 Claim（历史空间 ≠ 历史几何）；
- Canonical 五幕与视觉层级不退化；
- Human Experience Gate P1/P2/P3 为验收定义；
- Agent 无 Truth Store 写权、不绕过 Evidence Gate；
- 双线治理与 C0–C4 权威；
- 数据诚实与 provenance（L4 不反向污染 L0–L3）。

---

## 5. 前置风险（开工前必须先核验）

CORRECTION-MAP-01 指出历史照片在沙箱"**存在但空白**"属**资产加载**问题而非数据缺失。Stage 1/3
的"今貌 / 史料原页"呈现依赖真图可加载——若加载不通，这两步是空谈。因此 **Stage 1 第一步先做资产
加载探针**（确认真实底图 / 史料原页能在运行态渲染），再决定呈现方案。

---

## 6. 建议开工节奏

先 **Stage 0 + Stage 1**（ROI 最高，直接命中 P1 重新看见，且 Stage 1 第一步先做 §5 资产探针）。
Stage 2–5 视 Stage 1 验收结果滚动推进。

**终点口径**：H2 Exit = Human Experience Gate PASS + Integration Gate PASS（CURRENT §2）。

---

## 7. 验收口径（映射 Baseline VAG）

- **VAG-1 Contract Gate**：不违反 Baseline / Evidence·Geometry·Meaning 防火墙 / ExperienceState·Action
  契约 / Surface Eligibility。
- **VAG-2 Canonical Drift Gate**：对比导演稿 / canonical 参考，回答"同一人类问题是否还在、主角是否
  仍明显、揭示序列是否保留、技术信息是否更突出、是否更 card/page/chat-like"。
- **VAG-3 Screenshot / Recording Gate**：真实运行态截图；多步体验附录屏。
- **VAG-4 Visual Review**：由**项目拥有者**浏览器验收（R13：终裁权归项目拥有者，**不设第三方复核**）。
- **VAG-5 Human Gate**：里程碑级真人盲测，不预先灌输内部架构词。

---

## 8. 授权依据（指向 CURRENT.md §11.1）

- A. 日常验收权归用户（VAG-4 浏览器验收）
- B. 契约沉默 / 冲突可自行决断；合规补齐不升级
- C. 轻量化报告（里程碑才写全套）
- D. 冻结可受控修订（staging → 修订 → 重冻 + bump invariant）
- E. 允许镇无关重构（不 ship 第二镇）
- F. §9 升级触发词收紧为具体红线（用户定稿）

---

## 9. Progress Log（跨会话同步区）

> 每次施工阶段完成时，Executor 在此追加一行状态；并同步更新 CURRENT.md 的 NOW / NEXT /
> Current Gaps / Proven Baseline（见 CURRENT.md §11.2 同步规则）。此规则不因会话结束失效。

| 日期 | 阶段 | 动作 | 状态 | 验收证据 | 备注 |
|---|---|---|---|---|---|
| 2026-09-26 | — | 计划 V1.0 审核通过，建立同步规则 | APPROVED | 本文件 + CURRENT §11.1/§11.2 | Stage 0+1 待启动 |
| 2026-09-26 | Stage 0+1 资产探针 | 实测：8 张 Commons 今貌照可加载；GCJ-02 默认泄漏坐实；历史影像 0 件硬缺口 | DONE | tasks/results/STAGE0-1_ASSET_PROBE_RESULT.md | 历史影像缺口移交 Stage 3 重定义 |
| 2026-09-26 | Stage 0+1 设计 | 入口 landing + 第一幕主角纠正（门控泄漏 + 今貌 surface）方案 | APPROVED | tasks/results/STAGE0-1_DESIGN.md | 用户「同意」过审 |
| 2026-09-26 | Stage 0+1 实施 | 入口 landing + 门控 3 处泄漏（GCJ-02/WGS-84/Beat/史料路径）+ 今貌影像 Hero（Beat 01 主角替换）；tsc 0 错；A1 默认态内部词零命中 | DONE | tasks/results/STAGE0-1_RESULT.md | 未自动部署（feature 非 fix）；Hero 注册复用 current_photo 键 |
