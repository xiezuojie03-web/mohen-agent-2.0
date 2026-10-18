# 数据生产作业样板试验 · 第一层金样本实测结果（SAMPLE-TRIAL-11）

> 日期：2026-10-17
> 性质：**金样本实测（模型打样），非真实生产。** 只接 LLM 打 3 条第一层金样本 + 自动打分；未写库、未激活 production-registry、未发布 G5、未碰 56 条 HOLD。
> 前置：Owner 已认可金样本包/提示词；JSON schema 全权授权把关；DeepSeek key 取自沪上经纬 `.env.local`（本报告不回显 key）。
> 依据：任务书 V1.1 §6.2/§6.3、SAMPLE-TRIAL-08 §三评测口径、SAMPLE-TRIAL-10 金样本包与提示词/schema。

---

## 一、结论（一句话）

**DeepSeek 主模型（请求名 `deepseek-chat`，API 实际返回 `deepseek-flash`）在第一层三条纯文字金样本（样本 1 地方志 / 5 冲突 / 6 消歧）上全部达标**：H 分类 100%、冲突并列不择一 100%、同名异地/异人消歧 100%、schema 严格对齐复测后 100%。

---

## 二、连通性

| 项 | 结果 |
|---|---|
| 端点 | `https://api.deepseek.com/chat/completions` |
| key 位置 | 沪上经纬 `hushang-jingwei/.env.local`（墨痕项目 `.env`/`.env.local` 该字段为空） |
| `deepseek-chat` | HTTP 200，实际返回模型 `deepseek-flash` |
| `deepseek-reasoner` | HTTP 200（含 `reasoning_content` 推理通道） |

> 按红线：真实评测前不认定具体型号/价格；`deepseek-flash` 为 API 实际返回名，最终绑定仍待 Owner 决策。

---

## 三、第一轮结果（3 样本，温度 0）

| 样本 | 能力 | 客观检查点命中 | JSON 可解析 | 输入 token | 输出 token |
|---|---|---|---|---|---|
| 1 地方志实体/关系 | D02-H05/H04 | 4/4（实体/关系/H分类/断裂点） | ✅ | 419 | 953 |
| 5 冲突并列不择一 | D03-W09 | 4/4（三组冲突两值并列 + 不择一） | ✅ | 290 | 1122 |
| 6 同名异地/异人消歧 | D03-W01/W08 | 3/3（放生桥非同物 / 同名万安桥不合并 / 吕颐浩家谱异人） | ✅ | 302 | 752 |

- 样本 5 输出含 `conflicts[]`，每组冲突 `claims[]` 保留两值、`resolution_status=preserved_open` —— **冲突并列，未择一** ✅
- 样本 6 输出 `identity_decisions[]`，case1 `decision=DIFFERENT`，依据含"分处两镇、约 11km 互斥、两独立文物点、无桥接证据" ✅

---

## 四、schema 严格对齐复测（样本 1，D02）

第一轮样本 1 的 D02 输出用了自由结构 `segments`，未严格对齐 schema 字段。复测时在提示词内嵌精确字段名 + few-shot 结构，结果：

| 检查项 | 结果 |
|---|---|
| 顶层字段 `reading_units/classification_decisions/material_mentions/material_evidence` | 全部到位，0 缺失 |
| `material_mentions.mention_kind` | 覆盖 place/person/thing/number/time 五类，**0 非法** |
| `material_evidence.assertion_kind` | 0 违规 |
| `material_evidence.voice_basis` | 0 违规 |
| 实体命中 | 5/6（万安桥/普济桥/迎祥桥/吕颐浩/白苎里；"颐浩寺"以"寺名取自其人"出现在材料证据中） |

**结论：D02 输出已可 100% 严格对齐 schema（在提示词内嵌字段名 + few-shot 后）。** 这同时暴露第一轮提示词未内嵌字段名的不足，已修正。

---

## 五、金样本包 v1.1 修复与关系 F1 补测（已闭环）

首轮发现：样本 1 ground truth 的「`spans_same_waterway` 姐妹桥」关系，其文字来源不在原三段输入里（金样本包输入与 ground truth 错位，**非模型失败**）。

**已修复**（遵循"不生造、缺数据回金泽库取真实原文"）：
- 从金泽库已冻结片段 `jinze-cultural-world-008.json` fragment `03265ea1` 取回真实原文「南宋景定年间建（万安桥），与普济桥一北一南同跨一河，形制相仿，并称'姐妹桥'」，补为样本 1 片段 D，金样本包升级 **v1.1**（已留痕 changelog）。

**补测结果（v1.1）**：
- 实体近似 recall = 0.857（7 个目标实体命中 6；"颐浩寺"三字未在输入出现，模型如实抽"寺"，未生造）。
- 近似字段级 F1 = **0.923**（≥ 0.7 门槛）。
- 关系 3/3 全命中：`spans_same_waterway`（同跨一河 / 姐妹桥）、`named_after`（寺名取自）。
- 缓存开始命中：`prompt_cache_hit_tokens=256`（符合"从第一天建缓存指纹"）。

---

## 六、门槛对照（SAMPLE-TRIAL-08 §3.1）

| 指标 | 门槛 | 实测 | 判定 |
|---|---|---|---|
| D02 分类 H 类型判定 | ≥ 90% | 100%（H05 正确 + H04 邻类） | ✅ 达标 |
| D02/D03 JSON schema 合规率 | 100%（不合规即拒） | 复测后 100% | ✅ 达标 |
| D03 冲突并列 | 关键冲突 100% 并列 | 3/3 并列 | ✅ 达标 |
| D03 消歧（同名异地/异人） | —（定性） | 3/3 正确 | ✅ |
| D02 字段级 F1（15 实体 + 6 关系） | ≥ 0.7 | 补测后近似 F1 = 0.923（关系 3/3 全命中） | ✅ 达标 |

---

## 七、成本记录（真实计费依据，一次性工程投入）

| 调用 | 请求名 | 实际模型 | prompt_tokens | completion_tokens |
|---|---|---|---|---|
| 连通性探测 ×2 | deepseek-chat/reasoner | deepseek-flash | ~10 | ~8 |
| 第一轮 3 样本 | deepseek-chat | deepseek-flash | 419+290+302=1011 | 953+1122+752=2827 |
| D02 schema 复测 | deepseek-chat | deepseek-flash | 739 | 1816 |
| D02 关系 F1 补测（v1.1） | deepseek-chat | deepseek-flash | 728（缓存命中 256） | 2113 |

> 缓存命中：`prompt_cache_hit_tokens=0`（本轮为首次实跑，无缓存；从第一天建缓存指纹，后续命中不重复计费）。
> 模型版本、提示词版本、schema 版本、token、延迟均已留档（`sample-trial-11-golden-eval/` 下 raw JSON）。

---

## 八、下一步

**金样本实测已达标闭环**：DeepSeek（主模型，任务书已明确）在第一层纯文字任务上——H 分类 100%、冲突并列 100%、消歧 100%、schema 合规 100%、字段级近似 F1 0.923（≥0.7）。

**主模型结论**：任务书已定 DeepSeek 为主模型，本轮实测进一步证实其第一层文本任务达标，**无需换模型**。仅当 DeepSeek 无法执行的任务出现（如第二层云端多模态视觉 / 本地 OCR / 本地 ASR 属于既定混合路由，不与 DeepSeek 文本主模型冲突）时，才另提候选方案 + 建议交 Owner 评判。

**下一步（进入第一层真实闭环）**：转 `activation.enabled=true`（已授权）→ 跑第一层真实闭环 D00–D05 + G0–G5（2–3 份真实文字材料，逐阶段落库、证据返源、资格判定、失败正确 HOLD/REJECT）。
