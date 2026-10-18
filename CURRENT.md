# 墨痕｜当前状态

> **SAMPLE-TRIAL-16 收口｜2026-10-18。** 首轮数据生产样板试验已完成：六阶段 D00–D05 + G0–G5 真实闭环跑通（真实 G5 PASS），前端接真实 `read_model` 并上线 vercel，数据层双后端（消费 node pg / 生产 psql）落地，云端 Supabase 42 表已迁移。全景复盘见 `specs/data-production/SAMPLE-TRIAL_CLOSURE_ANALYSIS.md`。原稿基线 handoff@8966d1b，工程运行状态以本表 §2 为准。

# 1｜产品目标

从广阔历史文化中发现与今天生活的连接、意义与乐趣。双组件体验保持C4基线。

# 2｜设计、采用和运行分开

| 项目 | 当前证据/状态 |
|---|---|
| 目标架构 | 六阶段D00—D05/L0—L5/G0—G5及L6—L8反馈；宪法修订稿REVIEW_DRAFT_NOT_APPLIED |
| 工程宪法实际替换 | NO，本轮仅在资料中编制稿件 |
| GitHub已核验 | handoff@8966d1b；main@87bb56d；前者领先69提交，分支未合并 |
| 旧样板 | 上位研究记录旧五阶段本地实施/样板曾验证；不能推定新链已运行，原CURRENT的Real Apply=NO不能覆盖后续实施证据 |
| 工程文件基线 | USER_CONFIRMED_SYNCED_AND_FROZEN；GitHub为CodeBuddy执行后同步、停工待迁移的工程，不再核本地同步差异 |
| PG/Schema及新架构运行 | 已运行：42 表改库（36→42）+ 字段级落点 + 六阶段真实生产 |
| 新链运行/真实G5 | 已运行：SAMPLE-TRIAL-12/14 真实闭环，G0–G5 全 PASS（真实 G5 已产出） |
| 56正式延期关系 | 已释放（样板试验逐 ID 复核放行）；325正式表原字节/状态保持 |
| MIG-01/CodeBuddy实施 | 已完成：样板试验 SAMPLE-TRIAL-01~16 收口 |
| 前端展示与上线 | 已上线：vercel 生产 Ready（https://mohen-agent-2-0.vercel.app），Agent 读真实 read_model |
| 数据层 | 双后端已落地：消费 node pg / 生产 psql（见 C3 PART VII） |
| 云端 Supabase | 42 表已迁移（mohen-cloud），行数与本地一致 |
| 正式迁移ZIP | PACKAGE_AUTHORIZED；文件链核验通过后制作，最终散列与回执以交付包记录为准；不授工程权限 |

# 3｜权威入口

宪法具体版本以AGENTS §1为唯一路由；治理及历史决断见C0 §11—12。目标设计稿经用户采纳后，才记DESIGN_ADOPTED_RUNTIME_NOT_SWITCHED；实际运行切换必须另有工程证据和授权。本文件不授予开工。

# 4｜运行保护与证据

不改现有代码、PG、Schema、Git工作树/分支和Production；保护旧hushang-jingwei。环境身份、数据保护、允许读取和写入范围由用户授权下的M0明确。当前目标目录不等于已应用部署。

# 5｜下一步与授权边界

用户已审阅宪法，授权文件齐备与生产链模拟对齐通过后制作正式交付包。目标区为受控工程适配文件，不是研究全库镜像，也不是源码已实现。当前交付状态PACKAGE_AUTHORIZED、M0_NOT_RUN；用户审阅交付后独立发令CodeBuddy，先M0只读盘点，再按M1—M5批次授权。打包许可不授工程写入。

切换失败关闭新链；仅资格仍合法的旧链可以恢复；否则服务HOLD，历史审计与原始资产保留。不能以回滚为由复活撤权内容。
