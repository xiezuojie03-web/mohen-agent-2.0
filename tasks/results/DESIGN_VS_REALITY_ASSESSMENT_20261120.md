# 设计文件 vs 工程实况匹配度评估｜2026-11-20

> 只读评估，不改设计文件、不改代码、不改数据。方法：深读治理宪法六份 + PLAN V1.7，三路独立核验源码/迁移/测试CI，再对今天回写后的本地库做实测校准。

## 一、评估对象

- **设计权威**：`governance/mhka/MHKA-00—05`（六份宪法，身份均为 `ENGINEERING_DESIGN_AUTHORITY_ACTIVE / RUNTIME_NOT_ATTESTED`）、`specs/` 11 份核心契约、`tasks/implementation/MAB/PLAN.md` V1.7。
- **工程实况**：`apps/`（270 文件）、`packages/`、`pipelines/`、`supabase/migrations/`（121）、`tests/`（243）、`.github/workflows/`，以及 `CURRENT.md` / `progress.md` 证据账。

## 二、结论速览：四层匹配度

| 层 | 匹配度 | 含义 |
|---|---|---|
| 设计文件内部一致性 | **高** | 六章职责互斥、下游唯一、证据分层明确；自身诚实标注大量 HOLD/NOT_APPLIED，几乎无自相矛盾 |
| 源码 vs 设计承诺 | **高（存在性）/ 低（可用性）** | 12 项承诺中 11 项代码就位且实现考究；但"正向跑通"普遍未证 |
| 数据库 DDL vs 设计契约 | **高（结构）/ 中（资格运行）** | 六阶段/六类 L5/13 类资产/身份注入/不可变/CAS/撤权/SEC-01 全部有迁移；资格与激活另论 |
| 验收证据 vs 准入门槛 | **低** | CI runner 未启动、八维 0/8、152/442/75 无逐条 PASS、无 Owner 正式签收 |

**一句话**：这是一套"设计写得很成熟、代码搭得很忠实、但证据链没闭合"的工程。三类落差性质不同——有的是**时点问题**（已随今天回写改变），有的是**授权问题**（设计禁止自动签发，不能靠写代码解决），只有少数是**真缺口**。

## 三、设计文件本身：内部一致性高

- 六份宪法职责严格互斥（00 治理 / 01 价值 / 02 产品体验 / 03 知识语义 / 04 能力 / 05 工程），`MHKA-00 §4` 明确"同一业务只在一个 Owner 层定义，其他层只写消费要求"。
- 证据术语不可混用：`RESEARCH → OWNER_APPROVED_DESIGN → ENGINEERING_APPLIED → RUNTIME_VERIFIED → PRODUCTION_AUTHORIZED`（`MHKA-00 §6`），与 `PLAN §6.1` 的七层证明表一致。
- 设计文件**主动承认**自身不是运行证明：六份头部统一 `RUNTIME_NOT_ATTESTED`；`MHKA-05 §11` 明确 152 动作 `0 PASS/151 NOT_RUN/1 UNVERIFIED`、442/75"只做静态继承，无一条 E1 PASS"。
- 判断：**设计文件不是"吹牛文档"，它把自己未落地的部分标得比实现还清楚**。这种诚实反而让"匹配度评估"可以按证据等级逐层对话，而不是笼统说"做完了"。

## 四、源码层：11/12 CODE_PRESENT，但存在性 ≠ 可用性

| 设计承诺 | 源码落点（节选） | 存在性 | 可用性证据 |
|---|---|---|---|
| 五图 F01—F05 | `apps/web/app/{page,studio/page,watch/page,explore/page,admin/page}.tsx` + 五大 Workbench | 有 | 页面在；EXP 设计自身标"延后"，有页面≠纳入准出 |
| Studio 三栏/委托/改稿/保存 | `StudioWorkbench.tsx`、`lib/studio-{research,production,director,creation}.ts`、`api/studio/*` | 有 | 真实任务停在 `hold`，缺口 `FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE` |
| 统一合格消费门面 + 六类 L5 | `packages/data-access/src/read-model-repository.mjs`（六类 MODELS、consumer 断言）、`retrieve-formal.ts` | 有 | 曾有 2 个确定性 bug；修复后只证"合法空结果/非法拒绝"，从未读到真实合格知识 |
| POL-01 项目级 L0—L4 读 | `studio-research-read.ts`、`api/studio/research-read/route.ts`、`20261105110000` 迁移 | 有 | anon/producer 越权拒绝有 PG 实证；正向同项目读取未证 |
| D00—D05 唯一链 + 独立分权 | `pipelines/data-production/run.mjs`、六 executor、`registry.mjs`、`data-production-repository.mjs recordGate()`、`gate-stage-qualification.mjs` | 有 | 生产链代码骨架完整；历史 run 收敛为 2 FAILED/3 HOLD |
| 13 类知识资产 | `asset_heads.asset_kind` 13 类 CHECK + `asset_revisions` + `studio-asset-repository.mjs` | 有 | 单表枚举实现符合契约"不是13张表"；13 类逐项落库未全核 |
| Admin/发布/WATCH 同修订 | `AdminWorkbench.tsx`、`api/admin/*`、`20261114190000` 撤权迁移、`kad1_watch_revision_isolation` | 有 | 撤权连锁运行未验证；无真实已发布作品 |
| 独立 Gate / Reviewer | `apps/d00-authority/*`、`independent-gate-service*.mjs`、`tools/rule-gate-reviewer.mjs` | 有 | 分权考究（拒 producer 自签）；**从未真实签发过一张 Gate** |
| 身份/RLS/事务局部身份 | `app-transaction.mjs`（`set local role` + `set_config(...,true)` + `current_app_user_id()`）+ 多个安全迁移 | 有 | 拒绝侧有实证，正向 Owner 会话读取未证 |
| 私有原件/来源登记 | `private-original-repository.mjs`（reserve/finalize + SHA 回读 + 超时不覆盖）、`source-acquisition-record.mjs` | 有 | 存储单元完整；候选→获取→SHA→Source/Version/Raw→D00 桥接曾被判"未发现"，今天已推进到 D00 接收 |
| 内外 AI 混合 | `studio/provider-dispatcher.ts`、`execution_controls` 迁移、`execute-receipt` | 有 | 测试多为 synthetic-fixture-no-provider |
| 开发 Skill 自生长 | `.agents/skills/mohen-dev-continuation/SKILL.md` 存在；`scripts/dev-skills/{experience,continuation}.mjs` | 部分 | **语义降级**：SKILL.md 自述"不是自动采集/语义发现，不能激活 Skill"，是人工投喂→惰性候选建议 |

## 五、数据库层：结构齐，资格状态被今天回写改变

**重要时点校准**：三路核验引用的 `progress.md` 旧批次记载 `qualification_current=0 / gate_policy enabled=0 / binding=0`，这是**回写前**快照。今天（2026-11-20）完成云端→本地回写后，本地 `mohen_dev` 实测：

| 指标 | 回写前（旧记录） | 回写后（今日实测） |
|---|---|---|
| `control.qualification_current` | 0 | **49** |
| `control.gate_audits` | 711（legacy） | **802**，其中 independent_gate **91** |
| `control.gate_policy_versions` enabled | 0 | **6** |
| `control.gate_reviewer_bindings` active | 0 | **46** |
| `studio.private_originals` | 90 | **91** |
| `source.sources / raw_items` | 51 / 188 | **52 / 189** |
| `studio.delegations / execution_receipts` | 0 / 0 | **25 / 23** |
| `studio.work_revisions / published_pointers` | — | **5 / 7** |

这说明：
1. **"资格空转"部分成立、部分过时**：资格表、策略、绑定、独立审计在今天回写后**已有真实存量**，不再是零。但 `qualification_current` 的 49 条中，按当前 Project `e03c4ba8` 的 scope 精确匹配是否命中，仍需正式读取正向验证（正式读取 count=0 的记载在 progress/专项审计批次，**不在 `CURRENT.md`**；CURRENT 只记 `machine_read 仍为 unknown`）——即"资格有存量"与"当前任务可消费"是两回事。
2. **DDL 结构高**：六阶段 schema、六类 L5、13 类资产、资格审计分离三表、`current_app_user_id()` HMAC 身份注入、私有原件、权利三件套（`rights_by_action`/`rights_evidence`/`rights_snapshot` + 不可变触发器）、不可变修订/CAS/幂等/撤权、`SEC-01` 的 `imported_materials` RLS 整改——全部有可定位迁移，`SEC-01` 最新回执已标 CLOSED。
3. **契约自身标注 NOT_APPLIED**：`DESIGN_TARGET_NOT_APPLIED`、`本合同无可执行DDL`、`NOT_VERIFIED_RUNTIME` 多处出现，说明设计文本把运行验证明确留在 DDL 之外。

## 六、验收层：最大短板

- **CI 断层**：`progress.md` 最新多条 run（`44431800686`/`44432723926`/`44438122930`/`44442000666`）均 `runner_id=0`、`steps=[]`、约 2 秒失败——步骤启动前失败，新测试 `NOT_RUN`。历史成功（`98c5e78` 等）只属旧 SHA。当前 `c456f8c` 尚无可执行 CI 结论。
- **八维总装未闭合**：`CURRENT.md` 停在"Studio 原件登记 → D00 接收已验收，独立 G0 审核前"；`progress.md` 最新真实节点为 D00 候选 `48766904`（SUBMITTED），独立 Gate 决定 0、后续阶段候选 0。八维仍 `0/8 OVERALL_HOLD`。
- **验收账无逐条 PASS**：152 动作 `0 PASS/151 NOT_RUN/1 UNVERIFIED`；442 基线/75 新增/41 断言只有静态继承与 SHA 校验；`TRACABILITY_INDEX` 大量 `ENGINEERING_NOT_RUN`。
- **Owner 签收缺失**：`tasks/results/` 严格搜索无 M5/八维/五图正式签收文件。Preview 请求回执（身份链 PASS、合格知识 count=0）只是诊断，不是业务签收。P4 结案书结的是"数据统一搬运"，与 M5 验收无关。
- **合成 ≠ 真实**：`CODEX_*` 下 PG17/HTTP/Chromium PASS 属一次性合成环境（日志自述 `no-production-data no-paid-provider-calls`）；真实持久集成只到 D00 接收一个节点。

## 七、落差定性：哪些是真问题，哪些不是

| 落差 | 性质 | 说明 |
|---|---|---|
| 代码完整但运行空转 | **授权问题，非代码缺陷** | 守卫（拒自签、拒全局读、SHA 回读、超时不覆盖）正是按合同"禁止性条款"实现；设计禁止无人值守签发，不能靠写代码解决，须 Owner 具名授权 |
| 资格/策略/binding 为零 | **时点问题，已被今天回写部分解决** | 回写后已有存量；当前 Project 精确命中仍需正式读取正向验证 |
| 统一门面从未读到真实合格知识 | **真缺口（数据+运行）** | 门面与加固代码在，但需真实资格样本与完整 Project 范围结果才能正向证明 |
| 登记主线桥接 | **正在收敛** | 旧记录判"未发现完整桥接"，今天已推进到 D00 接收候选，下一步是独立 G0 |
| 自生长闭环被降级为惰性建议 | **表述落差** | SKILL.md 自我限定清楚，不算谎报，但"闭环"措辞夸大了实际能力 |
| CI 步骤启动前失败 | **环境/基础设施问题** | 根因未确证（不能归因为代码或账单），当前批次所有测试事实上未执行 |
| 验收账无 Owner 签收 | **流程未到** | 设计要求的最终门槛，项目尚未走到，不是文档缺失 |

## 八、总判断与建议

**总判断**：设计文件与工程实况是"**结构性匹配、证据性脱节**"。设计—代码—DDL 三层高度对齐，说明施工方向没有跑偏；真正没兑现的是跨层证据链（隔离/线上/总装/Owner），而这部分恰恰是设计自己反复强调"不能混用"的。

**最值得关注的 3 件事**（按优先级）：
1. **CI runner 启动前失败**——它让当前 `c456f8c` 及以后所有提交无法获得可执行测试结论，是证据链断裂的最上游堵点。先定位 runner 根因，再谈八维。
2. **独立 G0 决定**——当前唯一真实节点是 D00 接收候选已 SUBMITTED，只差把同一候选交给独立 Reviewer 并回读 G0。这是从"接收"迈向"生产链真正跑通"的第一步。
3. **资格正向命中验证**——回写后 qualification_current=49，但当前 Project 精确 scope 是否能命中 L0—L5，仍无正向证据；这是门面"从未读到真实知识"的直接原因。

**不建议做的**：不要因为代码/DDL/设计都在就宣布"基本完成"；不要把历史隔离 PASS、Preview READY、P4 数据对齐或 D00 接收升级为 M5/Owner 准出；不要为消除"资格为零"的表面差异而批量把 legacy 审计标为真资格（设计明令禁止）。

---
证据均来自仓库只读检索与今日本地库实测；子代理报告完整文本见会话工具结果存档。
