# 墨痕 MoHen｜MAB完整设计基线 — Codex一次性交接说明

**唯一用途：** 供Codex或其他获授权工程AI依完整设计目标制定工程实施、适配、验收、恢复计划。不是仅做一次最小试验；要覆盖所有设计范围。工程可按技术依赖多批次提交。2026-11-02静态设计准出，不代表工程已实现。

## 使用顺序

1. 本包`manifest/`中的`MAB_完整设计基线_manifest.json`、`FILE_HASHES.sha256`核对资料及74目标文件字节完整。
2. 先从`repo_target/AGENTS.md`读取唯一权威，然后MHKA六章→专业规范→API/Registry/Gate/Data/Persistence/Security/H-I→全部目标。不要把历史旧研究目录当成另一个active法源。
3. **GitHub三方差分**：本包base `main@db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`。首先检查新main SHA、实际数据库/Storage/schema和已完成的Codex代码，不强制覆盖。`manifest/MAB_74份正式工程目标_manifest.csv`的21 CREATE/53 REVISE是目标原始定性；工程已实现的内容要KEEP，尚缺才修订。
4. **逐路径工程差异**：不仅有74份规范目标；`manifest/KAD6_新增工程字段级差异与Codex自主适配清单.csv`还规定20项原源码修补责任，覆盖原先KAD1 KEEP但因KAD2-KAD5新增需求需要施工的路径。先查等价实现，存在则复用，不能为了名称新建同义文件/表。
5. **存储施工约束**：`evidence_only/KAD4_存储与知识资产最小DDL_非执行设计草案.sql`是专业候选而不是可执行迁移。按真实数据库核表/索引/Role后用正规迁移编制，先备份、隔离正反测试，再申请真实环境执行的分别授权。12候选表数不是KPI。
6. **业务验收**：KAD5两题从开始都由MoHen Agent+外部AI混合完成；精确记录原件、D00-D05、独立G0-G5、不可变Studio资产/跨题重用、人文新发现、作品修订和WATCH合法消费。HTML或fixture不能假冒真实通过。Admin知识子功能仍在F05，勿恢复Owner否决独立平台方案。
7. **后续状态**：设计`MAB_DESIGN_BASELINE_EXIT_PASS`；真实工程、PG/RLS/Storage/Gate、KAD5和Owner UI分别HOLD。变更具体授权、密钥、预算/资料外发、生产数据/部署须另行明确。

## Codex自治范围

- 不改变架构/权限/正式生产职责的情况下，Codex可以自主定向修复代码、真实字段映射、兼容迁移、测试和回滚，并在自己的工程报告中记录变更及理由；不要求Owner逐个确认普通技术细节。
- **不可自主更改** MHKA唯一权威、D00-D05/G0-G5、用户资料/版权的授权语义、公开资格、五图产品级结构或重大预算与外部数据传输范围。遇这种冲突需按事实提出具名Owner决策。
- 不可因为工程不便，把设计能力悄悄降级为一个最小功能试验。

## 目标与证据身份

`repo_target/`：真正准备写入仓库的设计目标内容；
`manifest/`：逐路径处理动作、SHA及必须施工的新增字段级责任；
`acceptance/`：静态设计自检与未来真实验收准则（非已执行运行结果）；
`evidence_only/`：原任务、KAD2-5研究与非执行SQL设计来源，不构成第二个active工程规范。
