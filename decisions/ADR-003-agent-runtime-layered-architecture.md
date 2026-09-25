# ADR-003 · 墨痕 Agent 分层架构（理解与表达可生成，事实只来自库）

- Status: **Accepted**（2026-09-26，WorkBuddy 接任总架构师后第一份架构决策）
- 上级权威：`specs/experience-ui/墨痕_Agent_2.0_金泽最小体验导演稿_V1.0.docx`（产品体验母稿，§7 施工顺序 A→B→C→D→E→F 冻结）
- 相关：`ADR-001`（greenfield local-first）、`ADR-002`（Cultural World Claim-level epistemic model）
- 不改变：`FOUNDATION.md` / `EXPERIENCE_CONTRACT.md` / `DATA_CONTRACT.md` 的既有红线

---

## 1｜背景：为什么必须改架构，而不改目标

用户裁决：**墨痕的目标就是 Agent，目标不变；架构有问题就改架构。**

实测事实（`GOV-STATUS-AUDIT-01` / `CORRECTION-MAP-01`，均经代码核对）：

1. `packages/agent-runtime/src/index.ts` = 1 行 `foundation-only`，全仓库零 import；`packages/ui` 同。
2. 体验页运行期**零 DB、零 fetch、零 LLM**：内容全部来自 5 个冻结 JSON + 确定性 reducer。
3. 追问 = `classifyFollowUp` 四组正则 + `decideEvidence` 硬编码 switch，`nextActions` 写死；未匹配即返回"未能识别"，无澄清、无兜底。
4. 全站 `apps/web/app` **0 个 `<input>` / `<textarea>`** → 用户只能点 4 个冻结按钮。

结论：当前"Agent"是**预烘焙体验**，不是 Agent。这不是措辞问题，是架构缺了一层。

---

## 2｜决策一：Agent 分层五段，LLM 只负责理解与表达

```
用户自由输入
   ↓
① 理解 Understand —— 自然语言 → Intent + 对象/时间槽位
     LLM 可用。**不产生任何事实**，只产生结构。
   ↓
② 检索 Retrieve —— 按槽位从 mohen_dev 读已审核材料（只读，不改）
     **确定性**。Agent 也不得绕过。
   ↓
③ 裁决 Adjudicate —— Evidence Gate 决定这条材料能支撑到哪一档
     已有库层 CHECK 与既有 `decideEvidence`，Agent 不得绕过。
   ↓
④ 编排 Compose —— 选主角 Surface + 组织墨痕短句
     规则部分确定性（可复现）；表达部分 LLM 可润色，
     但**不得引入材料中不存在的实体、年份、关系**。
   ↓
⑤ 呈现 Render —— 既有 Surface Registry / ExperiencePatch（FOLLOWUP_REPLAN）
```

**核心不变式：LLM 永不提供事实，事实只来自库里已审核的 evidence。**

这条把「Agent」与「证据门禁」从对立变为协作：
- Agent 是真的 —— 能听懂自由输入、能自己检索、能自己选主角、能组织回答；
- 认识论防线完好 —— E2 不升 E1、冲突并列不择一、无证据说不知道、`routeVerified` 恒 false。

---

## 3｜决策二：可降级，本地优先

| 层 | 无 LLM key 时 | 有 LLM key 时 |
|---|---|---|
| ① 理解 | L0 确定性槽位打分（加权，非 first-match） | LLM 语义理解；失败/超时静默降级 L0 |
| ② 检索 | 读库（始终确定性） | 同 |
| ③ 裁决 | 库层门禁（始终） | 同 |
| ④ 编排 | 模板化墨痕短句（确定性） | LLM 润色，输出经「不得引入新材料」校验后采用，校验不通过回退模板 |

理由：`ADR-001` 立 local-first、工具可替换，中国大陆网络环境是关键链路约束。
**Agent 能力不得依赖外部服务的可用性。**

---

## 4｜决策三：冻结链解耦（解除"改比评贵"）

体验内容当前全部锁在 5 个冻结 JSON，改一句要同步 builder → exports → `apps/web/data/experience/` 三处并重跑确定性对账测试，导致改体验的成本远高于写审计报告，系统理性退化为只评不改。

拆成两层：

| 层 | 内容 | 约束 |
|---|---|---|
| **证据事实层** | entities / evidence / claims / relations / 年刻度 / 冲突双值 | **维持 fail-loud 校验**，不可随意改 |
| **编排表现层** | 各 scene 的主角 surface、点亮时序、墨痕台词、标题 | 剥离为可编辑文件，**不进 fail-loud**，改它不重建、不对账 |

效果：改第一幕主角从"半天 + 风险"降为"十分钟"。

---

## 5｜决策四：冻结不变量调整（用户已授权总架构师处置）

现有服务端不变量 `scene 数 6–8` / `duration 150–210s` 会挡住导演稿第一幕重建。处置：

- **不删除不变量**，改为**按来源分流**：冻结脚本（预烘焙路径）继续受 6–8 / 150–210s 约束；
- 导演稿重建路径（C 步之后的 D 步）允许独立 scene 编排，但必须满足新的替代不变量：
  - 幕数 = 5（对应导演稿五幕）；
  - 每幕主角唯一（One-Moment-One-Focus）；
  - 历史场景不得出现 `GEOGRAPHIC_EXACT` / `RECONSTRUCTED_HISTORICAL`（既有，不变）。
- 两条路径通过 `scriptSchemaVersion` 区分，互不污染。

---

## 6｜决策五：验收断言（机器可判，杜绝"声称已修、实测未修"）

既有教训：`EXP-UI-AUDIT-01` 查出 7 项漂移，签发的 `EXP-UI-RECON-01` 只覆盖 5 项，仍判 PASS；实测 `Beat n/5 · m/8`（`ExperienceShell.tsx:265`）默认常驻零门控、`来源：008/cultural_conflicts`（`EvidenceNarrativeSurfaces.tsx:451`）默认直出 —— 均未被覆盖。

新增两条断言，进 vitest + E2E：

- **A1 技术词零泄漏**：默认模式（不带 `?inspector=1`）走完场景，页面文本中内部词表
  `GCJ-02 / WGS-84 / 六位小数坐标 / eligible / ineligible / 008_ / cultural_ / Beat n\/5 / HR- / U-xx / E1–E3 / 伪公式`
  命中数必须为 **0**。
- **A2 主角正确**：每个 Beat 的 primary surface 类型 == 导演稿指定主角。

目标层验收仍以导演稿 §6「六关」为准：
**代码测试全通过只代表程序没坏；六关不过，不能说墨痕做成了。**

---

## 7｜决策六：施工顺序服从导演稿，C 先于 D

导演稿 §7 冻结顺序：A 确认 → B 取舍 → **C 先补墨痕最小能力** → D 按导演稿重建舞台（第一→第二→第三幕）→ E 看图验收 → F 五幕成立后再真人测试。

A 已完成（导演稿入库）。B 已完成（`CORRECTION-MAP-01`：KEEP 29 / BACKSTAGE 12 / STOP 7 / MISSING 9）。

**因此下一步是 C，不是 D。** C 步范围（导演稿 §4「墨痕真正需要具备的最小能力」）：

1. 自由输入（当前 0 个 input → 至少 1 个）
2. 真实意图理解：想看地方 / 追时间 / 验证证据 / 理解关系 / 去现场
3. **从已审核金泽材料里检索并决定下一步**（运行期读库，当前为零）
4. 守住边界（已具备，不得破坏）

C 步**不做**：开放式回答任意历史问题、自动生成任意历史地图、多智能体、长期记忆。

---

## 8｜不做什么（Scope Firewall）

- 不重写 `ExperienceState` / `Composition` / `SurfaceRegistry` / 引擎 reducer（结构已被审计判定合规）
- 不建立第二套 Replan 系统（TASK-0017 纪律：扩展既有 `FOLLOWUP_REPLAN`）
- `classifyFollowUp` 保留为**降级兜底**，不删除
- 不扩第二个古镇、不碰 GIS Track / Data Factory / 商业化
- 不改任何证据事实层的冻结数据（本 ADR 范围内的 C 步零数据写入）

---

## 9｜后果

**正面**：Agent 名实相符；改体验成本下降；"声称 vs 实测"落差由机器断言消灭；无 LLM 也能演示完整闭环。

**代价 / 风险**：
1. 引入运行期 DB 依赖（psql 二进制）→ 仅服务端 route 调用，浏览器不直连；离线降级：检索失败回退冻结材料 + 明确告知"暂时查不到"。
2. LLM 引入不确定性 → 有输出校验 + 降级；默认不启用（无 key 即 L0）。
3. C 步先于 D 步意味着**舞台重建延后**：第一幕仍是抽象经纬网，直到 D 步。这是导演稿冻结的顺序，不是妥协。

**待用户补充**：LLM 凭据（`MOHEN_LLM_BASE_URL` / `MOHEN_LLM_API_KEY` / `MOHEN_LLM_MODEL`）。无凭据 C 步照常完成，L0 路径全绿。
