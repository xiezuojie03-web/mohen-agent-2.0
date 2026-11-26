# 墨痕｜当前施工断点

> **Owner 授权口径（2026-11-25，长期有效）**：目标是墨痕**真正运行、持久运行**；除**安全问题**与**费用问题**外，施工方自行授权推进，不再逐项请示技术选择。费用边界：M5 导演生成两题材各封顶 **1.00 USD**（Owner 2026-11-25「费用全权授权、按计划全力推进」已落为可核账委托，逐次真实调用以 Receipt 对账）；超出额度、新增付费来源或扩大用途仍需 Owner 批准。安全底线（密钥不入 git、不自签 Gate、不伪造会话/资格/PASS、不改迁移规避授权）不因该授权放宽。

> 核验时间 2026-11-26（第三十四批收口）｜工程代码核验基准 `e5c36922`（第三十二批 PENDING_PUSH 已随第三十三/三十四批推送对账清零）；其后main仅增加本轮审计归档文档提交，未修改业务代码｜CI：`ci` 45726227097 **success**、MAB M1 隔离认证 HTTP 验收 45726226950 **success**、mab-isolated-db 45723945111 **success**（宿主级 CI_BLOCKED 解除的直接证据）｜本文件**只保留一个当前断点块**，每批原地替换；逐批原始回执见 [progress.md](tasks/implementation/MAB/progress.md)，施工标准见 [PLAN.md](tasks/implementation/MAB/PLAN.md)。


> **工程审计归档（2026-11-26）**：本轮全面审计报告已归档：[《墨痕工程全面审计报告 2026-11-26 V1.0》](tasks/results/MAB/audits/MAB_工程全面审计报告_20261126_V1.0.md)（报告编号 `MAB-AUDIT-20261126-01`；审计基准commit `e89e33101ba5351b12a71f1f1e0805b51f1e5f83`）。报告记录设计实现、施工节点、双维度缺口及后续建议；它是历史审计基准，不替代本文件的当前断点，也不改变PLAN V1.7的施工顺序。归档动作只修改审计报告、PLAN和CURRENT文档，不修改业务代码、数据库或部署。


## 1. 当前断点：M1 隔离认证 HTTP 验收红灯根因修复完成、双绿收口；本地 3100 已含全部修复

第三十三批（`d0bc9e4f`）修复 ci 红灯（retrieve 空检索词资格枚举契约回归）与 M1 HTTP 链缺正式正文权威迁移；第三十四批（`e5c36922`）修复 M1 503 根因——node-pg 参数化 `:'x' is null` 触发 **42P18 参数类型推断失败**（`formal-publication-chain.ts` 与 `studio-director.ts` 两处 cast 前置，本地一次性链式隔离库复现+实证修复），并消除 e2e fixture 陈旧（POST /api/works 的 project 绑定契约 5×400）。

**CI 真实回执**：批34 `ci`=success、M1=success；批33 额外 `mab-isolated-db`=success——此前具名的宿主 CI_BLOCKED 已按证据解除。本地 3100 体验服务器已用批34代码重建并重启（/api/auth/me 200），Owner 走网页投稿流程已含 503 修复。

## 2. 下一步（唯一施工顺序）

**产品深化工作流已按MAB PLAN V1.8 §3.6正式确定，下一项为PDW-01 HOME CEI工程衔接。** 先盘点现有CEI成果、核实正式文件与版本、评估工程可用性，整理正式交付材料和继承边界；不重新启动HOME设计研究，不提前进入代码施工。

PDW-01关闭后依次执行PDW-02 Studio设计与工程自检、PDW-03 EXP真实主题双组件试验、PDW-04 Admin视觉与Agent辅助治理深化、PDW-05个人空间产品与数据架构规划。不得调序或按CEI交付包历史阶段0—7顺序执行。

M5原有真实作品闭环、八维准出及Owner最终体验责任均保持不变；PDW-02负责将Studio设计/工程差距转化为可操作的Owner验收任务。当前本地服务、真实作品和CI回执仍是已记录的运行事实，不代表PDW-01已开始或M5已签收。未跟踪文件组的裁决暂不作为PDW-01前置条件，按实际需要另行处理。

## 3. 剩余 HOLD（如实，不阻 Owner 体验）

1. **设计层缺口（Owner 裁决取向）**：正式桥 L0/L1/L3 对象类型错配；G3/G4 用途白名单禁止 agent_read；Studio auto-create 项目无去重；意图分类鲁棒性。
2. **M6 范围**：57 方法绑定、全量合同回归（不提前开工）。
3. **生产部署 / M7 / M8**：另行授权。
4. **权利边界（本轮决策范围）**：display 仅放开「上海地名志·静安寺」一条来源一项动作；download/adapt/redistribute 保持 HOLD，其他来源权利未动。
5. **本地验证限制（具名）**：K3 13 类资产全矩阵在本地 Windows 双实例内存冲突下无法全跑（CI mab-isolated-db 已于批33 success，本地限制仍在）。

## 4. 事实边界

- 以上为本机隔离库与本地服务证据，不等于生产部署、CI 或专业 Gate 签收；部署未动（web staging `e563161c`，authority production `48c9169b`；本地 3100 为构建产物模式，已含第三十三/三十四批全部修复并重启）。
- 费用：累计 **0.026836 USD**（11-25 两题材 0.017140 + 11-26 静安寺 0.009696），逐次 Receipt 对账；本两批为 CI 修复，无新增 Provider 调用。
- 密钥仅在 gitignored `.secrets/`；G0—G5 与 agent 用途审计均为独立机器评审签发，非自签；静安寺作品 creator 为 creator.demo@mohen.local、签核/发布为 Owner 账号（operator ≠ creator，无自审）；权利放行由 Owner 明确批准并留痕。


> **产品与UI反向工程审计归档（2026-11-26）**：已归档[《墨痕UI反向工程审计与产品完整性评估 2026-11-26 V1.0》](tasks/results/MAB/audits/MAB_UI反向工程审计与产品完整性评估_20261126_V1.0.md)（报告编号 MAB-AUDIT-20261126-02；审计基准 main b9de0d29fed4ef6fa0f29ce2441b97ce814b83c7）。本报告从用户旅程和UI反向追溯页面、业务逻辑、Agent、数据与权限，覆盖HOME、Studio、Admin、EXP、个人空间及WATCH跨空间关系。**该索引仅表示产品与UI审计成果已归档，不代表任何设计补强、页面改版、个人空间建设、EXP试验或工程验收已经完成；不改变PLAN V1.7和M5当前施工顺序。**
