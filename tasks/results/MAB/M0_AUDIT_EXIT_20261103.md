# M0｜现场盘点、三方差异与独立审查准出回执

审查日期：2026-11-03。**基线**：GitHub `main@ff4577afacd9031d91695d706eea597102f2ca56`。设计基线：`db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`。性质：MAB-ENG-01 §11.1 的**M0工程基线审查**，绝非M1—M8运行验收或全部设计目标实施验收。

## 1. 三方核销

- 设计权威输入：资料库 `MAB_工程目标文件审查总索引_现行.csv`（234行）、`MAB_74份正式工程目标_manifest.csv`（74行）、`KAD6_新增工程字段级差异与Codex自主适配清单.csv`（20行）；保留现行原始文件，不以本报告替换。
- 实际GitHub树：递归完整，不截断。234行：KEEP 154（138条基线blob不变，16条已变），REVISE 53（51条不变，2条已变），CREATE 21（尚无对应正式目标路径），5条旧C宪章待M8授权切换，1条迁移CLI占位符并非真实文件；KEEP、REVISE、合法归档路径均没有未解释缺失。共18个原有路径相对设计基线有Git blob变化。变化仅是物理事实，不表示达到最新设计目标。
- 74项正式目标：53条REVISE路径目前存在，21条CREATE路径尚未创建，全部可反查234权威索引及后续责任；未伪称53项目标已通过语义、安全、真实运行验证。
- 20项新增责任：18条是现存实体源码，2条是`supabase/migrations/<ENGINEER_CLI_GENERATED_KAD4>.sql`和`tests/**`，属规范模式而不是文件缺失；其中3条实体路径不在原234清单，纳入增量映射，不误报为路径意外缺失。
- 设计身份索引：85项API及152项操作保存在`specs/requirements/`两现行CSV中，63方法登记在`method-binding-contract.json`。19 Skill为设计要求，不以存在Skill目录宣布正式注册或激活。它们的逐ID实际效果与正反合同验收由M3/M5/M6承担。
- **逐项回查文件**：`M0_234_BIDIRECTIONAL_RECONCILIATION.csv`对应234来源、blob、阶段责任；`M0_KAD6_20_RECONCILIATION.csv`对应20个补充ID；原位`tasks/implementation/MAB/target-diff.csv`对应74正式目标，记录源码blob、原索引和下游责任。

## 2. 真实环境观察及局限

- Supabase PostgreSQL当前五条MAB迁移：`20261102094218`、`20261102095611`、`20261102104020`、`20261102105810`、`20261102105829`。
- `public.imported_materials`、`studio.projects`、`studio.asset_heads`、`studio.asset_revisions`、`control.gate_candidates`的RLS已开启。素材表anon直接SELECT/INSERT为false，authenticated直接INSERT为false；运行/Gate三个角色均NOLOGIN、非super、无BYPASSRLS。Studio不可变资产修订表自定义触发器和约束可观察。
- `source.raw_items=98`，正式两桥均0，生产Storage桶0；私有原件与M3独立Reviewer策略尚未生产启用，移交M2/M3继续，不能据此阻止M0盘点准出或冒充已生产完成。
- GitHub最新基线CI `41549216459` SUCCESS；生产部署相应SHA在Vercel显示READY。这不证明合法登录、公开资格、用户操作、视觉体验通过。仅可核远程main完整树，不可宣称Codex某台本地工作树干净。
- 运行超时、浏览器、私有原件和备份恢复等历史及隔离回执保留在`tasks/results/MAB/`；没有将历史测试当成M0重新执行。

## 3. 风险与下游承接

- **M1安全P0：** 旧日志泄露过凭据；受保护环境变量存在，近期发布已发生，但**旧密码真正失效/全部凭据轮换的官方回执仍未得到完整证明**。M1必须单独闭环，禁止重开放旧匿名GRANT或非私有附件。
- **M2：** 原件私有桶、数据库候选迁移、精确定位/证据桥生产启用及D00—D03工作器联线，需依法定安全门执行，当前HOLD。
- **M3：** 独立Reviewer、策略、资格签发/用途/撤权，当前HOLD；Producer不能把自己的PASS当Gate PASS。
- **M4—M8：** 真实混合Agent、Studio/Admin/WATCH、85API与152动作逐ID回归、双课题、权威原子切换和Owner体验签收保持按计划责任。
- 原有旧宪章五文件须在M8正式切换前继续留存，不可因M0已确认缺失6份MHKA新文件而擅自改权威路由。

## 4. 阶段判定

**`M0_AUDIT_EXIT_PASS / DOWNSTREAM_IMPLEMENTATION_NOT_ATTESTED`**。

本判定仅说明原设计—GitHub事实—下游责任的基线核销可追溯，未发现M0自身的不可解释路径缺失，真实权限/数据风险均被识别、保留并指定关闭阶段。所有未落地目标仍HOLD并按M1—M8施工。新HEAD发生变化后，后续批次必须刷新对应目标实现证明，但不因此无限重做M0审查。

本回执不授权生产迁移、轮换密钥、启用Gate、自动归档旧C文件或发布。
