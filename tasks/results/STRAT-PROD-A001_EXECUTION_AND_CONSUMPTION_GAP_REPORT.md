# 墨痕 A001 任务执行结果与前端消费断链诊断报告

> 任务：`MH-STRAT-PROD-A001`（杨浦滨江绿之丘 · 工业仓储如何成为今日公共场所）
> 状态：**`UI_PASS_PENDING_OWNER`**（工程自检完成，因 Owner 反馈的方向性问题未达成最终 UI 认可）
> 分支：`a001/production`　｜　提交：`a4e597f` / `f799416` / `122557e`
> 本报告合并两部分：① A001 的 P0–P5 实际执行结果；② Owner 关于「前端人文体验」的反馈所暴露的两类断链（数据生产标准缺失/索引、C4 前端 UI 消费断链）。

---

## 0｜摘要

1. A001 已完成 P0–P5：D00–D05/G0–G5 真实生产 run `4719c713`（20 条证据、3 条判断、1 条今日联系、5 条时间变化），前端 `/experience/lvzhiqiu` 从「上一轮看板」重做为「视觉舞台 + 墨痕」双组件。
2. Owner 反馈确立了**两条不可退让的原则**：① 前端必须消费 D00–D05 数据，其中 D00 的原始载体（图片、舆图、书影、照片等一切可支撑视觉展示的实体）是视觉要素；② 视觉舞台 + 墨痕双组件中，墨痕是指挥者（向导/知己/文化老师），指挥舞台展示什么，同时用户可互动探索——这两条在 C4 宪法里其实已有明文，**问题不在「标准缺失」，而在「标准未落地」与「数据链断点」**。
3. 诊断结论：**真正的病根不是「等素材」，而是两处断链**——
   - **数据生产标准缺失/索引断链**：`specs/data-production/standards/d00–d05/` 索引指向空目录；D01「载体读取（读图）」未落地（`evidence.reading_units` 全表为 0，照片只进了 `raw_items` 资产层、没被读成画面观察）。
   - **C4 前端 UI 消费断链**：L5 固定六类里**没有视觉资产**，`world.visual_objects` 是 L3 表，导致「舞台该从哪个 G5 资格读取 V1–V5 视觉层」在物理契约上没有落点。

---

## 1｜任务执行结果（P0–P5）

| 阶段 | 结论 | 关键产物 |
|---|---|---|
| P0 基线 | `ACCEPT_MINIMAL` | `P0_BASELINE_AND_ADMISSION.md` |
| P1 改造 | 11 文件改动、6 项守卫通过 | `P1_IMPLEMENTATION_AND_SAFETY.md` |
| P2 生产 | run `4719c713`，G0–G5 全 PASS | `P2_REAL_PRODUCTION_AND_EVIDENCE.md` |
| P3 前端 | `/experience/lvzhiqiu` 双组件 | `P3_UI_CONSUMPTION_AND_EXPERIENCE.md` |
| P4 复测 | U1–U5/D1–D7/E2–E5 通过 | `P4_REGRESSION_AND_HUMAN_REVIEW.md` |
| P5 交付 | B 履约卡 + manifest.sha256 | `A001_FINAL_HANDOFF_AND_B_CARD.md` |

- 真实数据：20 条证据（`exact_fragment_match` 归属，带来源/机构/日期/片段序号/原页面 URL）、3 条解释增量、1 条今日联系（D04）、5 条时间变化；G5 双 consumer 各 16 条审计全 PASS。
- 前端：体量剖面舞台（9 热点）+ 墨痕追问 + 证据抽屉 + 窄屏；追问正例引原句、负例（同一栋/因果）被拒绝并给边界；撤权负例不复活旧内容。
- 复用与废弃：复用上一轮的主题参数化适配层、`read-model-bridge` 主题隔离、Agent 链路；**删除上一轮「内容生产看板」UI**与 4 个垃圾文件；上一轮 4 次 run 的 G5 全部置失效，仅保留本轮一份有效。
- 费用：两轮共 22 次 LLM 调用、约 75,870 tokens，估算 ≈¥0.05–0.10（估算非账单），未超授权。

> **以上「完成」仅指工程闭环完成；Owner 反馈已明确：视觉主体「体量示意」不达标，须回到「真实视觉载体」路线。因此整体状态维持 `UI_PASS_PENDING_OWNER`，不封 UI_PASS。**

---

## 2｜Owner 反馈确立的两条硬性原则

| # | 原则 | 出处 |
|---|---|---|
| 一 | 前端消费 D00–D05 数据；D00 原始载体（图片、舆图、书影等一切支撑视觉展示的实体）是视觉展示要素；**不能是体量示意**，更不能把自绘舞台并入通用 Surface 契约 | 本次反馈 |
| 二 | 双组件：右侧视觉舞台展示所有值得展示的要素；左侧墨痕是向导/知己/文化老师，**指挥**舞台展示什么（如老师放课件），同时允许用户互动探索，而非被动检索 | 本次反馈 |

Owner 同时指出：① 舆图、书影只是举例，近代实体同样有叙事可能；② 双组件如何互动，C4 已有规定，若有不清楚应改标准而非另起炉灶。据此，下面两节分别诊断「数据生产标准/索引」与「C4 前端消费」的真实断点。

---

## 3｜问题一：数据生产标准缺失与索引断链

### 3.1 标准文件的「索引」指向空目录

- `MoHen_Data_Production_Protocol.md`（V5.0）与 `specs/DATA_CONTRACT.md`（V3.0）都规定各阶段专业标准位于：
  ```
  D00 → specs/data-production/standards/d00/
  D01 → specs/data-production/standards/d01/
  ...   D02/d03/d04/d05 同理
  ```
- 但 `specs/data-production/standards/` 目录**当前不存在**（`d00–d05` 均无文件）。
- `AGENTS.md` 路由表同样索引到 `specs/data-production/standards/d00/`—`d05/`（并标注「逐文件见 verification/arch-mig-prep-01/TARGET_FILE_COVERAGE.csv」），属于**死索引**。
- 实际的方法标准原文散落在 `specs/data-production/墨痕_数据生产机制_宽进与广联详细协议_V1.0.md`（T01–T14 载体转换协议、Observation Contract、W1–W9 多模态读取红线、A01–A12 关联）等文件里，但未被 `standards/` 目录归位，也未在路由表里形成唯一权威路径。

**结论**：这是「索引失效 + 标准未归位」，不是「标准不存在」。它导致执行方（我）上一轮没有按 T01–T14 载体协议去补视觉载体的读取，而是绕开标准自造了「体量示意」。

### 3.2 D01「载体读取（读图）」未落地 —— 数据链在 L1 断掉

实测库现状（`mohen_dev`）：

| 对象 | 计数 | 说明 |
|---|---|---|
| `source.raw_items`（text/plain） | 30 | 文本载体已入原始资产层 |
| `source.raw_items`（image/jpeg） | 4 | 金泽 4 张今貌照片已入原始资产层 |
| `source.read_runs` | 11 | 有读取运行记录 |
| `evidence.reading_units` | **0** | **载体读取单元表为空** |
| `evidence.material_evidence` | 129 | 证据层有产出 |
| `world.visual_objects` | 8 | 视觉对象（4 张照片 × 2 run 重复） |

- `PHYSICAL_DATA_MODEL_V2.md` 明确 L1 物理承载待定（`TO_VERIFY_IN_M0`），`evidence.reading_units` 从未被生产链路写入。
- 后果：**照片作为 `raw_items` 进了 D00，但 D01 没有对它们「读图」**（无 reading_unit、无画面观察），因此视觉资产无法进入关联池，也无法被下游 L3/L4/L5 引用为有内容的视觉要素。

### 3.3 视觉对象停留在「资产清单」，不是「画面阅读」

对 `world.visual_objects` 的实测：

- `literal_reading` 内容是「普济桥 金泽镇南市梢 北宋咸淳元年(1265年)」这类**馆藏/元数据式说明**，不是「画面里看见了什么」；
- `correspondence_claim` **全部为空**（照片未与任何世界主张建立对应）；
- `maturity` **全部为 `candidate`**（未进入可发布成熟度）。

对照宽进广联协议 §5 的**图片宽进 Gate**：「只有标题、文件名、自动标签而没有画面阅读的图片，只能停留在 Source Lead / Asset Pending」；W4「进入关联池的图/地图 100% 有 Map/Visual Observation，禁止标题识别替代读图」。**当前 4 张照片严格处于 Asset Pending 状态，尚未满足进入关联池的门槛。**

### 3.4 素材缺口（分题材，供采集而非开发）

对照 C4 §16 的 V1–V5 视觉层：

| 视觉层 | 含义 | 金泽现状 | 绿之丘现状 |
|---|---|---|---|
| V1 历史原件 | 舆图、方志图、绘画、档案 | 0（方志仅 digital_text，无书影） | 0（有档案图纸潜力） |
| V2 历史影像 | 老照片、明信片、旧摄影 | 0 | 0（改造前影像潜力） |
| V3 今日现场 | 现代摄影 | 4 张（有资产、没读图） | 0（需实地拍/授权） |
| V4 解释标注 | 克制线框/热点 | 可基于真实图现做 | 无底图可做 |
| V5 重建想象 | AI/人工重建 | 禁止在无真实 Evidence 时使用 | — |

**绿之丘作为近代实体，合法视觉要素是 T11（今日现场）、T08（历史影像/工程影像）、档案图纸**，不是「没有视觉要素」——但当前库里一张都没有。金泽的 4 张照片则卡在「没读图」这一环。

---

## 4｜问题二：C4 前端 UI 消费断链

### 4.1 L5 六类里没有「视觉资产」，舞台无数据可读

- `DATA_CONTRACT.md` 固定 L5 六类：`world_projections`、`agent_contexts`、`story_seeds`、`discovery_paths`、`map_timeline_projections`、`evidence_pointers`。
- 六类中**没有任何一类承载视觉资产**；`world.visual_objects` 属于 L3（`world.*`），不在可消费的 L5 分面内。
- 而 C4 §16 要求舞台按 V1–V5 五层展示视觉（历史原件/历史影像/今日现场/解释标注/重建），C4 §3.1 又规定「视觉舞台与墨痕默认读取同一 L5 修订的合法分面」。
- **冲突点**：C4 要 V1–V5 视觉层，但 L5 六类里没有视觉资产的分面——「舞台从哪个 G5 资格、读哪张表拿到 V1–V5」在物理契约上没有落点。这正是 C4 与 DATA_CONTRACT 之间的接口断链。

### 4.2 visual_objects 的消费资格无标准

- `world.visual_objects` 字段齐全（`visual_type` / `asset_ref` / `literal_reading` / `time_scope` / `space_scope` / `correspondence_claim` / `maturity`），但：
  - 没有对应的「发布/消费分面」定义（谁能在什么权利下展示）；
  - `maturity` 是 `candidate` 状态，缺一条「candidate → published」的资格链路；
  - 前端既无读它的统一服务，也无受 G5 约束的消费路径。
- 结果：金泽页当前的照片展示，实际靠**冻结 JSON 清单**（`jinze-present-day-photos.json`）驱动，**不是消费 `world.visual_objects`**——这违反 DATA_CONTRACT §7「禁止一条路径受 G5 而另一条靠旧 status/静态 JSON 绕过」。

### 4.3 上一轮「体量示意」违反的 C4 条款（供存档）

| 违规点 | C4 条款 |
|---|---|
| 以 AI 绘制的体量剖面顶替真实视觉载体 | §24 反模式「AI 图填历史缺口：气氛被误当事实」 |
| 在没有真实 Evidence 的情况下制造视觉化「历史故事」 | §25 硬边界「禁止没有真实 Evidence 时制造视觉化历史故事」 |
| 跳过 V1–V3 直接造 V5 重建想象 | §16「V5 重建不得与史料图同级呈现」+ 默认视觉节奏「先图→墨痕指细节→证据→文字」 |
| 上一轮看板化 | §24「Debugger / Dashboard 化」 |

---

## 5｜结论与建议落地顺序

**结论**：A001 的工程闭环已完成，但前端人文体验尚未达标，根因是**两条标准未落地导致的断链**，而非「素材永远缺」：

1. **数据生产标准缺失/索引断链**（`standards/d00–d05` 死索引 + L1 读图未落地 + 视觉对象停在 Asset Pending）；
2. **C4 前端 UI 消费断链**（L5 六类无视觉资产分面 + `visual_objects` 无消费资格契约）。

**建议按以下顺序落地（1、2 为纯工程改动，可立即执行；3 需 Owner 定素材来源；4 为结果）：**

| 步 | 动作 | 解决 |
|---|---|---|
| 1 | 补标准接口：DATA_CONTRACT 明确 `visual_objects` 的发布/消费分面；C4 §3.1 补「视觉资产走 visual 分面，V1–V5 按 §16 分级约束」 | 问题二（4.1/4.2） |
| 2 | 打通 D01 读图：对 image 载体产出 `reading_units` + Visual Observation，令照片从 Asset Pending 进关联池 | 问题一（3.2/3.3） |
| 3 | 归位标准索引：将宽进广联协议等原文归位到 `standards/d00–d05/` 或修正路由表唯一权威路径 | 问题一（3.1） |
| 4 | 补素材：绿之丘 T11 现状照片/T08 改造前影像，金泽 T06 舆图/T01 书影/T08 老照片 | 问题一（3.4） |
| 5 | 视觉舞台改为真消费 V1–V5，墨痕按 C4 §11 ExperienceAction 指挥舞台 | 原则一、二 |

**待 Owner 决策**：是否按「1、2、3 先落地（改标准 + 修读图 + 归位索引），4 素材来源另行拍板」推进。

---

### 附：本报告关键证据文件

- 数据库实测：`tasks/results/STRAT-PROD-A001/evidence/_visual_check.sql`（执行输出见命令记录）
- 结果包：`tasks/results/STRAT-PROD-A001/`（P0–P5 + manifest.sha256 + evidence/）
- 标准原文：`specs/data-production/墨痕_数据生产机制_宽进与广联详细协议_V1.0.md`、`specs/DATA_CONTRACT.md`、`specs/data-production/MoHen_Data_Production_Protocol.md`、`governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.2.md`
