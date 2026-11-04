# 墨痕｜当前真实工程状态

> **2026-11-04 M3最新顺序裁定**：`M3_CONDITIONAL_EXIT`，范围仅代码/标记隔离环境的独立服务工程闭环；**当前唯一收口阶段为M4**。真实HTTPS+专用Signer/Reader LOGIN+hash凭据认证，M2持久L1经G0依赖→合成G1→Runner精确资格接收，祖先撤销即时拒绝；默认OFF，生产迁移/凭据/专业Reviewer/发布均未激活。固定M3-C01—C03及既有M1/M2条件继续有效，原完整M验收和M8最终标准不降低。源码`2082dd8`/证据归一化`e0aab7c`已推main；精确e0aab7c的主CI41744442502、PG1741744442477、HTTP41744442467、M3协议41744442389全部SUCCESS（HTTP6PASS/1StorageSKIP；本地官方Storage完整PASS）。测试、已修定向缺陷及证据见 `tasks/results/MAB/CODEX_M3_SERVICE_20261104.md`；旧条目保留历史，不再把M3写成当前待重建阶段。

> **2026-11-03 Owner批准M施工顺序与有条件准出（最新执行裁定）**：M1核销为 **M1_CONDITIONAL_EXIT，仅供M2代码/标记隔离环境施工**；完整生产验收仍HOLD，固定M1-C01—C04及最迟完成点已写入PLAN。**M2现已按本轮实际交付有限条件准出，当前唯一收口阶段转为M3**；M2官方Storage字节→唯一Runner→不可变L1→落盘候选refs/digests→M3候选仓储接收、精确证据桥及同backup_id恢复均已隔离实跑，源码`c923b5b`主CI41660282238、PG1741660282267、M1 HTTP41660282246均SUCCESS；见 `tasks/results/MAB/CODEX_M2_L1_20261103.md`。M2-C01生产、C02非文本、C03正式复用固定条件保留；M4—M5既有成果保全，暂停新增横向功能。M2交付可持久追溯的私有待审资产给M3，不再循环等待M3先完成生产审签。最终安全/权限/费用/专业资格及M8标准不降低；生产启用仍须原授权。M1无变化的历史有效验收继承，只对具体缺陷/受影响变更重开。详见PLAN“M阶段有条件准出与顺序收口”与progress末尾。

> **2026-11-03 Codex接续实码增量（最新）**：基于远端main@02eecd6e，补默认关闭的Owner私有worker惰性装配与独立Gate签发/当前资格HTTP读取，复用唯一Runner、专用低权Signer和现有资格SQL。313单测PASS/4既有SKIP、116生产边界PASS、类型/构建通过；一次性PG17验证真实低权身份/精确资格/撤权。源码`b609efa2`主CI41641917991、PG1741641918045、M1 HTTP41641918101、M3协议41641918296均SUCCESS；另补真实隔离PG17 TLS受信CA成功/未信证书拒绝。详见 `tasks/results/MAB/CODEX_M2_M3_SERVICES_20261103.md` 及progress末尾。生产21:00+08只读仍项目0/资格0/桶0、私有原件及签发函数未部署；官方Storage字节→L1/G1—G3、生产独立认证和业务全链仍HOLD，M1—M8及HANDOFF_NOT_READY不变。

> **2026-11-03 20:23+08:00 Owner 最新指令：转回 Codex 施工（最高时序优先）**：聊天插件本轮源码与计划已全部推送 GitHub `main@9f4e1485150c02db48425525a435c9527104b390`；主 CI [41638572066](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638572066) SUCCESS。Codex 从远端最新 main 和 `tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md` 开工；后者开头新增本轮成果差异表、证据和下一 P0。此举只转移执行权，M0—M8原准出与生产权限不变。下方此前“ChatGPT接力/转回Codex”表述均为时间顺序中的历史记录，不作为当前指令。


> **2026-11-03 当前最新工程提交（优先）**：本轮ChatGPT接力已把M3当前G0—G5资格/谱系合法读取子能力在[独立PG17 41637142076](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637142076)和[主CI 41637141950](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141950)验证通过；随后`64eed3f5`补M2唯一Runner有界冻结续跑输入及按阶段Adapter路径绑定，[主CI 41638126713 SUCCESS](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638126713)。这些是**工程代码/隔离验证子能力**；正式Owner私有原件工作器、Reader持久化、Reviewer部署/签发、生产Registry与真正Studio→Admin→WATCH业务仍HOLD。详见`progress.md`末尾；无本次正式DB/Storage写入或收费Provider调用。


> **2026-11-03 M3最新真实代码／隔离测试收口（优先）**：远端`main`源码到`f79dc436`；已修正Producer上游谱系与read_model使用资格不可只凭旧PASS/`current_valid`，统一精确消费者／用途／范围＋当前独立Gate验证，拦截序列化后空scope。最终源码主[CI41637141950](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141950)、独立[PG17 41637142076](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637142076)、[M1隔离HTTP41637141998](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141998)全部SUCCESS。**这里只能签本批P0代码及隔离验收；正式M2原件生产链、M3 Reviewer部署/资格签发及M4—M8仍HOLD**；具体日志、变更与风险见`progress.md`末尾。


> **2026-11-03 最近执行权变更（优先）**：Owner因Codex额度不足再次授权ChatGPT聊天环境使用GitHub插件接力施工。当前执行以GitHub远端main最新HEAD及`tasks/implementation/MAB/PLAN.md`、`progress.md`为准；本次HP11和M3源码批次/CI/生产只读证据见progress末尾。此举不改变已批准设计方向、M0—M8及HP工作包，也不代表生产迁移、私有外发、真实Gate或付费调用已授权。下方“2026-11-03转回Codex”的既有入口是**此前执行工具变更的历史记录**，不再作为本时点工具分配结论。M0仅审查准出，M1—M8运行状态继续HOLD。


> **2026-11-03 最新执行入口变更（优先于下方原11月2日历史状态）**：Owner决定现在转回Codex执行，而非等聊天插件先完成所有HP。请从GitHub远端main最新HEAD阅读 `tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md`（唯一当前执行交接索引）、`PLAN.md §6B`和`progress.md`，继续当前源码、CI与隔离核证。交接是执行权转移，**不代表**M1—M8已准出、技术HANDOFF_READY、生产迁移/专业Gate/资料外发/费用已授权。旧`PLATFORM_HANDOFF_20261103.md`保留历史事实，其“停止施工”的旧窗口状态已被后续HP03/HP08等GitHub施工更新覆盖。下文各时间点的回执应按各自SHA核实，不要误读为最新完整PASS。


更新：2026-11-02。状态事实与设计目标分开，旧日期报告仅供追溯。

## 当前施工范围与授权

Owner已批准MAB更新计划并授权持续施工：最终GitHub仅main，Vercel可访问的Studio/WATCH/EXP三模式、运营管理与知识资产真实存储。纯技术自主处理；产品功能/效果/方向/成本变化先以白话说明原因、选项和影响。现有模型服务本轮测试费用上限20元，尚未付费调用。

- 完整计划：`tasks/implementation/MAB/PLAN.md`。
- 逐路径差异：`tasks/implementation/MAB/target-diff.csv`。
- 执行与决策账：`tasks/implementation/MAB/progress.md`。
- 首批事实：`tasks/results/MAB/M0_M1_20261102.md`。

## 已验证与阻断

| 项目 | 当前证据与边界 |
|---|---|
| 仓库 | 设计起点main@db21cef；接续基线main@dae824f；CI修复提交7e83f3b，后续提交SHA以progress.md为准；远端仅main，默认分支main |
| 设计完整性 | ZIP列示92项哈希、74目标哈希匹配；不代表运行通过 |
| 本地验证 | 交接基线CI失败已真实复现5项路由mock缺失；修复后单测103通过/4原联网项跳过，六工作区类型检查通过，Next生产构建通过，GitHub CI41460853487全部成功；M2原件真实验证未完成 |
| 数据库隔离验证 | PG17真实迁移/角色/RLS/独立资格/撤权/并发/回滚/重跑通过；public及extensions加密扩展位置均验证 |
| 默认全套测试 | NOT_PASS：缺本地.env.local及历史Windows隔离环境；不以其他测试替代此结论 |
| 真实库安全 | 素材表已启用RLS、移除anon/authenticated直接访问；有同库受保护备份；已接独立短时数据库身份，真实库合法/过期/伪造签名只读断言通过；M1已发布；新资料台浏览器流程在隔离数据库验证，不在生产库生成测试资料 |
| 真实知识存储 | 98条原件登记有ref/hash；Storage桶0；两座证据桥0；字节回读尚未证明 |
| 遗留附件入口 | ENG-NEXT-01识别原public/uploads写入不安全，现受控拒绝，直至M2私有原件/哈希/权限验收；文本/PDF阅读导入保持原路径 |
| Gate | 现有代码已具独立资格实现；候选/资格空表已迁移；独立Gate权限迁移及真实策略未启用，HOLD |
| Vercel | 截至2026-11-02现场核查，production已READY@c032ec6，包含M2源码；此后提交/部署须按实际SHA复核，不声明三模式和Owner体验通过 |
| 产品总体验收 | 三模式、Admin、知识资产、双课题与最终线上验收未完成 |
| 凭据 | 七项旧plain配置已转encrypted；网站登录密钥已随c032ec6新部署生效；Owner新增数据库密码Sensitive/Production后，网站只读数据库查询通过；未独立验证旧密码失效；其他已暴露服务凭据仍待轮换；数据库身份另用全新独立密钥 |

## 权威与保护

实际AGENTS仍指向旧代际；新MHKA为已批准施工目标，待合同/守卫/运行验证齐全后原子切换，不提前宣称双活或激活。保留已有合法成果、原件、作品与审计；恢复不复活已撤权限。平台确认窗口过期的变更保持未执行，不绕过。

## M2本批实现边界

生产库已增量新增七张私有Studio资产表和待审候选表，未删除旧数据。资料台已实现项目、人工研究记录、不可覆盖的历史版本、刷新重开、重试防重复和跨账户隔离；原件文件存储、完整三模式、正式资格及AI生产链仍未完成。数据库密码尚未声称已更换；代码新增MOHEN_DATABASE_PASSWORD独立安全覆盖，特殊字符与TLS回归5项通过。

## MAB-ENG-01接续（2026-11-02）

已读取增量交接书V1.0，从真实main@dae824f接续；未直接读到资料库受控任务书原文，仅按本交接书承接约束。GitHub优先、CI按批；不逐提交人工部署或验收Vercel。20261102140000私有原件迁移尚未生产执行，上传开关继续关闭；隔离PG/官方Storage、故障恢复、权限与证据桥继续施工。

### M2原件隔离验证（生产保持关闭）

私有原件新增真实PG17/官方Supabase Storage v1.43.0 localhost文件后端/HTTPS浏览器接口验证；该版本协议验证不代替当前托管服务的生产验收。已验证精确hash、禁止覆盖、公有URL及跨Owner拒绝、PENDING恢复、并发幂等、下载中撤权；同备份ID对象与DB dump/restore及失败关闭rollback通过。生产只读复核private_originals不存在、Storage桶0、旧raw_items98、两桥0；候选迁移未生产执行，原件开关未开启，不宣称M2已完工。全单测109 PASS/4既有联网SKIP，生产边界73 PASS，浏览器2 PASS，最终提交前复验及独立静态审查见progress。

### M2证据桥增量（仍为隔离/候选）

基线4b75c7a的CI41465083552已全绿。私有text/plain的真实UTF8字节→L1→L2→准确L3 revision已在原有表上隔离验证；原件Owner、错定位/引文/版本、直接SQL绕过、短时核验签名、密钥撤销、固定版本不覆盖与回滚有正反证据。新桥仅待核验候选，不授G。候选迁移20261102145410未生产执行，独立字节核验密钥只设合成环境；现有生产worker/专业Reviewer、PDF与图像区域、生产激活仍HOLD，原M0—M8未完成。

证据桥提交cf1c3ed，GitHub CI41469702928全绿；M2原件/证据桥实际测试与安全汇总见`tasks/results/MAB/M2_SECURITY_RECEIPT_20261102.md`。生产准备待Owner本项确认，当前生产迁移/bucket/新核验密钥均未实施，上传开关保持关闭。

## 2026-11-03｜Owner要求平台切换

本会话停止新增施工，已将已提交源码/测试/回执、原设计输入、增量交接书及未应用UI patch保全到GitHub main。接续唯一入口：`tasks/implementation/MAB/PLATFORM_HANDOFF_20261103.md`。本轮生产准备确认未获回复，迁移/bucket/新核验密钥/原件开关仍未执行；不得将“全部推送”视为生产授权。

### 2026-11-03｜接续API-023安全边界（待CI复核）
公开证据单项接口此前未经独立G5资格校验；已准备改为限定server-side资格上下文与现有合格读模型仓储，生产配置和独立Gate均不激活，缺条件统一503失败关闭。源级变更不等于M3运行准出，CI/真实资格/撤权及WATCH体验另验；施工账见`tasks/implementation/MAB/progress.md`。
