# 授权备忘录模板（AUTHORIZATION MEMO TEMPLATE）· V1.0 · 2026-10-05

> **用途**：项目拥有者向开发平台/开发总工程师下达的任何"数据生产/再利用/挖掘"类授权，必须用本模板表达。
> **核心原则**：授权用**价值语言**写，禁止开发平台静默重写成**量语言**（如把"挖掘有用的老数据"落成"完整挖干 + max 200"——这一重写曾导致 AI 把"挖"理解成"按上限抽干"，产出大量低价值候选）。
> **版本源唯一（C0 §10）**：本模板为治理基线，引用须带版本号；修改须走 Architecture Reconciliation，不得孤立改名。
> **生效**：自 2026-10-05 起，任何老库再利用 / Legacy 再利用 / 批量抽取授权，未含本模板的"过程闸门"与"非目标清单"者，开发平台不得执行。

---

## 一、授权备忘录（填写模板）

```
【授权编号】AUTH-<主题>-<日期>            【版本】V1.0
【授权人】项目拥有者 / 唯一架构设计师
【执行方】开发平台 / 开发总工程师（同一角色）

■ 1. 意图（Intent · 价值语言，非量语言）
  本次授权 = <在 XX Legacy 库中【补证 XX 真实体验缺口】，
  并利用余量【抽取高人文价值的 <地名/建筑/人物/关系> 候选>>。
  目标动词是"挖对 / 挖透"，不是"挖干 / 抽满"。

■ 2. 明确禁止解读为（非目标 / 反例清单 · 必填）
  ✗ 为凑数把整库文本按 max-per-source 截断式抽干；
  ✗ "挖掘"= 全文片段化 / 无内容解读的批量落库；
  ✗ 诗词分词碎片算作地名实体；
  ✗ 纯共现（co-occurrence）算作已成立的文化关系；
  ✗ 模板化、一字不差重复的"发现"计入发现数。

■ 3. 过程闸门（Process Gate · 不可跳过 · 守卫强制）
  任何 candidate 实体 / 关系 / 发现写入前，必须先有
  D02 内容级 Observation 留痕（locator / region / uncertainty）；
  无内容解读 → 写入被拒（process-gate，见第六节）。

■ 4. 价值闸门（Acceptance · 非条数上限）
  以 C2 §3.3 Humanistic Selection 评分
  (novelty / specificity / cross-source / humanistic potential) 为
  "是否值得继续"的唯一判据。
  完成标准 = "内容已解读且可被 Humanistic Selection 评估"，
  不以保证 N 条行为目标。

■ 5. 人类终审点（C2 §3.4 / §10）
  Selected Discovery 之前机器自处置长尾；
  进入 Truth Promotion 必须人工确认，不得自动晋级。

■ 6. 安全网语义校正
  保持 candidate-only、可回滚 —— 这是"兜底"，
  不是"可因此跳过过程纪律"的许可证。

■ 7. 运行前复述校验（Echo-Back · 强制）
  AI 必须在跑批前用一句话复述：
  "我理解您的授权是 <X>，因此我不会做 <Y>。"
  确认不做什么，再执行。
```

---

## 二、为什么需要这份模板（根因）

原 2026-10-03 "解禁"授权原文为"项目拥有者全权授权：**完整挖干沪上经纬老数据**"。
该表述优化的是"量"（max-per-source 200）与"安全"（candidate + 可回滚），
**未编码"价值 / 意图"**。AI 据此把"挖"执行成"按上限抽干"，导致：
- 15 个老来源各触顶 200 片段配额，仅 21% 被抽取，79% 未挖；
- 诗词分词碎片（共闭关/复无书/客到山…）被落为 0.42 假实体；
- 纯共现被落为 0.2 关系；1138 条模板化发现一字不差重复。

责任不在授权意图，在于**意图→执行的翻译层没有把"价值"编码进去**。本模板强制在授权侧写入"非目标清单"与"过程闸门"，使 AI 无解释空间。

---

## 三、本模板的首次实例化（Legacy 再利用 · 价值限定）

> 对应 `production-registry.json` 中 `unattended.*` 作业 2026-10-05 修订后的价值限定。

- **意图**：在沪上经纬 Legacy 库中补证金泽真实体验缺口，并抽取高人文价值候选。目标"挖对/挖透"。
- **非目标**：不为凑数抽干；诗词碎片不算地名；纯共现只算关联候选；模板发现不计分。
- **过程闸门**：新批次不得再走旧 `unattended-runner` C1–C6；须改路由到 `research-pipeline.mjs`（D02→D04→D05）。
- **原 carve-out 状态**：2026-10-03 解禁视为**已耗尽并冻结**；旧路线不再用于新批次。

---

## 四、Process-Gate 守卫规则文本（步骤 4 · 拟加入 `mohen-project-guard`）

> 以下为规则草案，应作为 `mohen-project-guard` 的契约条款与执行器校验逻辑落地。
> 目的：把"candidate + 可回滚 = 安全"的误解，改为"**过程合规 + 产出可逆**"双重校验。

```
RULE process-gate-content-observation (severity: BLOCK)

适用：任何向 entities / relations / discovery_candidates 写入
      status='candidate' 或 confidence<1 的"新材料"的作业
      （含 unattended-runner、research-pipeline 及未来任何 ingestion 入口）。

前置条件（MUST，否则写入被拒）：
  1. 该批次存在对应的 D02 内容级 Observation 留痕
     （来源载体已被内容读取，且至少记录 locator / region / uncertainty 之一）；
     仅做"片段抽取 / 全文切分"而未做内容解读的批次，不得写入实体或关系。
  2. 写入的实体不得为诗词分词碎片：
     若 canonical_name 来自诗词语料（如 verify_souyun 类来源）且长度为 2–3 字、
     无独立地理指称，必须排除出实体表（移入 Observation / Raw，永不晋级）。
  3. 写入的关系须区分"已成立关系"与"关联候选"：
     纯共现 / 相邻 / 相似 只许写入关联候选（Observation Graph），
     不得直接写入 Truth 关系表或以关系 predicate 落库。
  4. 写入的发现须通过模板检测：
     humanistic_why 等叙事字段一字不差重复超过 N 条的，
     标记为模板产物，不计入发现数、不进入 publishable。

放行条件（安全网，仍须满足）：
  - 产出为 candidate-only（status='candidate'，零自动晋级）；
  - 全批次可回滚（run attribution + Raw append-only）。

校验失败动作：
  - 阻断该批次写入，产出异常摘要，统一 HOLD，交人类复核；
  - 不得静默降级为"反正 candidate 可逆就先落库"。

依据：C2 §3.4（Observation≠Evidence / Mention≠Entity /
      Association Candidate≠Cultural Relation）、
      C2 §3.5（mohen-data-ingest 不能把"抓到文件"当成"读懂内容"）、
      C2 §2.1（三向绑定 + 过程可审计）。
```

---

## 五、与宪法/协议的关系

- 本模板是 C2 §10（治理：谁有权决定什么）的**授权侧落地件**：把"项目拥有者的价值判断"固化为可机器校验的字段。
- 本模板与 `MoHen_Data_Production_Protocol.md`（D0）互补：协议规定"怎么做"，本模板规定"为达成什么价值而做、不做什么"。
- 本模板不新增宪法文件；它是 C2/C3 之下的**操作层授权规范**，版本受 C0 §10 约束。
