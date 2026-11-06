# 六阶段工程衔接总合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 1｜文档与实现分责

standards/宪法/Protocol/DATA/PERSISTENCE/Gate与机器配置是ChatGPT已编制的目标专业文件。真实代码/SQL由CodeBuddy在用户授权、M0核实后按tasks/implementation/ARCH-MIG-01逐文件实施。未实现的.mjs/.ts不放空壳冒成完整目标源码；每个受影响源码必须在TARGET_FILE_COVERAGE.csv有明确动作、合同与场景，且没有未分派缺口。

## 2｜稳定接口封套

Method输入run/request/context、typed refs、carrier/material profile、method/source version、purpose/scope/consumer、current qualifications与snapshot；输出typed drafts/limitations/control requests。Stage保存候选与生产过程，不自授资格。独立Gate请求/返回遵DATA_CONTRACT与qualification schema。Hand-off仅显式eligible refs；消费上下文不可省略。物理表/服务接口按M0核定，现存export改动所有调用方需测试，不能用猜测签名冒现状。

## 3｜新增与退役

新增D00-source-intake与D01-carrier-reading执行入口，旧d01-source-intake退出新代际；不机械复制两份旧mixed executor。新method/gate配置禁用，激活需要完整语义验证、真实独立绑定及用户授权后的运行配置版本。新配置不能直接喂给仍固定5 job的旧loader。

## 4｜文件与场景齐备

TARGET_FILE_COVERAGE逐目标文件；PINNED_REPOSITORY_DISPOSITION全仓库树归类；REAL_PATH_FINDINGS记录实际代码证据；scenario-contracts逐场景预期。齐备=专业目标文件真实存在且格式/引用一致，受影响源码都有具体实施合同和测试归属，真实工程未知明确M0。齐备不等于源码已改或运行已测；ZIP已由用户明确授权，工程仍须分批发令。

## 7｜KAD1六阶段设计继承→MAB施工的单向交接（2026-11-06）

仅继承C0—C4认可的六阶段D00—D05/L0—L5/G0—G5；早期D01起五阶段不再拥有运行入口。新架构MHKA-03/04/05及现行生产协议§13、G合同§12、持久化唯一Owner条款、**Library目标**Registry六Job分别提供完整施工目标；现有GitHub旧Skill/Registry/Adapter/SQL保持保护，不盲覆盖。

**复工前设计结论不是施工授权**。交给原MAB M0—M5的待做精确责任为：M0/M8核旧五阶段依赖和单入口；M2真实P0资源/方法/尝试/私有原件及D01/C方法；M2—M4 63个方法逐项选择/回执、Skill标识、Adapter唯一绑定；M3候选`qualification_request`与独立Reviewer/DB权限；M2/M3 L0—L5唯一写入Owner/对象回读与恢复；M4 D05两种合法分支、P08独立控制；M5真实研究作品/双消费者端到端。每个缺口要`changed_paths/before_after_sha/tests_positive_negative_auth/DB_storage_evidence/unresolved_HOLD/rollback`；方法登记、Fixture PASS、旧样板回执和普通CI success不构成真实完工。

**文件更新顺序**：锁最新HEAD→保护已施工数据/审计→按差异账修改代码配置与测试→隔离环境六阶段真实Adapter/Gate/Storage复演→恢复Gate策略授权→M5双课题与Studio作品验收；任何阶段没有负例/真实Reviewer/字节回读即HOLD。M5是否恢复以及生产写入/部署由Owner另行明确批准。本合同仅提供可施工的设计目标。
