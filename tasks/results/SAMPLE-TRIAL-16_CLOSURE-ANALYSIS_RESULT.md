# 数据生产作业样板试验 全景分析报告（SAMPLE-TRIAL-16 收口）

> 性质：对《数据生产作业样板试验_立项任务书》§七 四步 + 三层递进**全部执行结果**的全景复盘，目标是让「架构迭代迁移后的首轮数据生产样板试验」对**后续数据生产**有指导作用、少走弯路。
> 日期：2026-10-18。前置任务书 V1.5。
> 关联：`DEPLOYMENT-OPERATIONS-RUNBOOK.md`（部署/连接操作手册）、`SAMPLE-TRIAL-01~15`（分步结果档案）。

---

## 一、一句话结论

**首轮样板试验已跑通「真实资料 → 六阶段六门 → 前端展示 → 线上部署」完整闭环**：金泽最小切片 `jinze-min-001` 用 2 份方志 + 4 帧今貌照片 + 6 段原文，产出 8 实体、11 关系、4 时间变化、2 冲突、5 发现、14 证据指针，六门 G0–G5 全 PASS，前端内容看板/关系空间/时间轴/今貌照片/Agent 追问全部接真实 `read_model`，并已上线 vercel（`https://mohen-agent-2-0.vercel.app`，线上 Agent 追问读真实数据）。

---

## 二、全景：做了什么（主线）

### 第一步｜前置准备（已完成）
评估 A 字段级盘点 → 改库 36→42 表 → 评估 B（UI 双向核对）→ 落地 C（BR-M1 + Owner 视觉验收）。

### 第二步｜模型选用（已完成）
评估 D 重做 + 金样本实测框架（`SAMPLE-TRIAL-08`）。**已拍板**：① 部署混合（D01 本地 OCR/ASR + D02–D04 云端 LLM）；② 视觉允许云端多模态；③ embedding=pgvector+本地开源；④ D02–D04 主模型 DeepSeek 为主、真实评测前不认定型号。

### 第三步｜三层递进（已完成）
- **第一层**（最低成本真实闭环）：2 份方志 → D00–D05 + G0–G5 全链，7 实体+7 关系+4 发现+4 故事种子+4 证据指针（`SAMPLE-TRIAL-12`）。
- **第二层**（视觉与空间）：接通真实 `read_model` 到视觉舞台与 Agent，解决冻结 JSON 双事实源；内容看板 + 关系图 + 时间轴 + 今貌照片 + Agent 追问（`SAMPLE-TRIAL-13` + V1.5 视觉维度）。
- **第三层**（边界纠错）：同名桥消歧、水道名差异、年代冲突、人物传说；**正确拒绝无据关系与成功发布同等计分**；P08 依赖传播 13/13（`SAMPLE-TRIAL-14` + V1.5）。

### 第四步｜收尾与交付（本次完成）
全链回归（42/42、typecheck、build、关键守卫 ×7、真库隔离）→ 受控预览 → 回滚复验 → Owner 前端 UI 终验 → 修复 build 500（next 15.5.28）→ GitHub 推送 → **数据层改造（消费层 serverless 化）** → **云端 42 表迁移** → **vercel 线上部署 + 公开访问 + 防滥用治理**。

---

## 三、关键架构决策（后续沿用，勿推翻）

1. **前端展示是唯一终点**：数据库再完善、前端看不到都是枉然；前端问题无论源于前端还是数据库，都是工程改造要解决的（任务书 §一）。
2. **落点是基石**：D/方法/L 数据/G 闸门分工明确，各阶段只做自己的事，落点缺失的正确动作是补全落点而非越界代做（§四）。
3. **事实（L3）与解释（L4）不混淆**：adapter 不自行授门，`producer_may_self_qualify=false`（§四）。
4. **正确拒绝与成功发布同等重要**：无据关系明确拒绝并登记开放问题，不静默合并、不强行建立因果（§七 第三层）。
5. **消费层与生产链的访问方式分开**（本次新立边界）：
   - 生产链（pipelines 写库）走 **psql 二进制**——离线、确定性、零依赖、可复现；
   - 消费层（前端 Agent/视觉舞台读 `read_model`）走 **node pg**——适配 serverless。
   - 见 `OWNERSHIP_MAP.md` §packages 的 `data-access` 双后端说明。

---

## 四、踩坑与教训（后续务必绕开）

| # | 坑 | 教训 | 落点 |
|---|---|---|---|
| 1 | Next.js 15.5.25 服务端 build 把内置 OpenTelemetry 拆成 chunk 903/509，`_document.js` 引用路径错乱 → `next start` 全站 500 | 升级 next 到 15.5.28；生产模式（build+start）与 dev 模式要分别验证 | `apps/web/package.json` |
| 2 | `data-access` 用 psql 二进制，云端 serverless 无 psql → 线上读不到数据 | 读路径切 node pg，写路径保留 psql；部署形态与访问方式要匹配 | `node-pg-client.mjs` |
| 3 | Supabase 直连域名是 IPv6-only，vercel/IPv4 环境 `ENETUNREACH` | 一律用连接池 pooler（IPv4） | runbook §3 |
| 4 | vercel CLI `env add` 经 stdin 传值引入 UTF-8 BOM，pg 解析 host 错成 `"base"` | 环境变量用 vercel API 写入（curl），不走 CLI stdin | runbook §5 |
| 5 | vercel `Secret` 类型环境变量在 build（SSG）不可用 | 需要 build 期读取的变量用 `Config` 类型 | runbook §2 |
| 6 | Vercel 找不到 commit 作者 Git 账户 → 部署 Blocked；真实邮箱触发 GitHub GH007 | commit 作者用 GitHub noreply 邮箱 | runbook §1 |
| 7 | Supabase Free 计划 7 天不活动自动暂停，域名变 Non-existent | 云端库状态要与本地架构演进同步，且注意 Free 暂停 | runbook §3 |
| 8 | serverless 多实例下内存限流失效（实例级状态不共享） | 防滥用以**缓存**为主（防重复打库），全局限流需 Upstash/Redis | `guard.ts` |
| 9 | 测试在 PowerShell 用 GBK 传中文，Agent 问句乱码误判为回归 | 中文请求用 UTF-8（node 脚本/文件）而非 PowerShell 内联 | — |

---

## 五、对后续数据生产的指导清单

**立项/规划阶段**：
1. 先定「前端能看到什么」再定「数据库建什么」——验收终点永远是前端，不是表结构。
2. 每步前置真实数据写入前单独备份（沿用 preflight `pg_dump` 惯例）。
3. 范围用「最小切片 + 三层递进」推进：最低成本闭环 → 视觉空间 → 边界纠错，逐级准入，不靠扩资料/加调用掩盖本层阻断。

**实现阶段**：
4. 新方法落地必须带对应测试；未注入实现诚实 HOLD，不得冒充 PASS；FAIL/BLOCKED 不自动进下一步。
5. 真实 LLM 接入前须金样本实测 + Owner 决策；模型评估记录真实版本/提示词/token/重试/缓存/计费。
6. 消费层查询走 node pg、生产链写库走 psql，不要混用。

**部署阶段**：
7. 部署/连接照 `DEPLOYMENT-OPERATIONS-RUNBOOK.md` 执行（代理、pooler、BOM、noreply 邮箱等坑都已固化）。
8. 云端 Supabase 库要随本地架构迭代同步迁移（本次就因云端停留在第一代而返工）。

**红线（持续有效）**：
9. 真实 G5 只来自真实生产、合格证据、规定资格检查；56 条 HOLD 逐 ID 释放；不碰 `hushang-jingwei` Production；不动 main 分支。

---

## 六、遗留与边界（诚实标注）

- 历史舆图/老照片（V1/V2 视觉层）仍待未来材料；「上游变化后自动重跑依赖」端到端自动化未做（P08 算法+落库已验）。
- 线上防滥用为「缓存 + 实例级限流」，全局限流（Upstash/Vercel Pro）未引入。
- 旧代际守卫失败（structure/registry/source-gate/identifiers/naming/escalations/links）与第一代 `tests/data/**` 测试失败，属「隔离旧代际」技术债，非本次回归，未在本次清理。
