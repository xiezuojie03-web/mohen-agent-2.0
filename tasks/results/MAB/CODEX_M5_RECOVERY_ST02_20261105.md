# Codex M5 中断现场核对与 ST-02 有界接续｜2026-11-05

基线 `5efd0085edc979f99dec51df159a68f88fa8eee4`；Owner V1.2 连续施工授权；本批三项操作，M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。

## 1. 恢复与三方核对

- 找到 `/workspace/mohen-agent-2.0`，work@759dbbd0c206c4acfe2ebdc3e94aa556528b330c；暂存/未暂存/未跟踪均空，stash空，reflog最近只有旧work重定位；fsck未发现不可达施工对象。其它可访问scratch/shared/library-files未找到中断源码。**未找回额度中断时的未提交现场，不能声称恢复该现场。**
- 本地对象库已有origin/main@5efd0085，与GitHub实时API及随后成功fetch一致；旧work领先0/落后369，无独有未推送提交。三条历史线索9cc25f65/9838abb3/3edfb0e6全部在main祖先，分别为ST02服务/限额/3单测；不是重新施工指令。
- 操作前完整Git bundle保全在 `/workspace/work/m5-recovery/pre-fetch.bundle`，bundle verify通过；原work目录不改，独立非硬链接副本 `/workspace/work/mohen-m5`，分支m5/continuation-20261105。未reset/clean/强推。
- 基线CI 41984534921 FAILURE；本地准确复现TS2353(title不属于Material)和2×TS2451(privateMaterialIds重声明)。已有代码不等于ST02已验收，旧账中的ST02下一任务正确。

## 2. 三项操作与回退

1. 继承Material合同：entityIds=[]，标题进入sourceRef；去掉重复局部声明，未扩张Material或伪造实体。
2. ST02现有服务接私有POST `/api/studio/research-read`：服务端签会话、UUID项目、ACTIVE校验、no-store/统一错误、候选身份及外发禁止。POST因现有reading_note幂等写入，不提供有副作用GET。沿现有仓储/RLS读取，不调用模型或正式生产。独立审查找到生成note首次/重放重复，已回归并仅由当前L1上下文纳入自动note；仓储在LIMIT100前排除生成note，避免挤掉旧候选，普通笔记列表不受影响。现有PG套件补100候选边界；现有HTTP套件补真实Owner/跨Owner/no-store/候选精确版本/重复读取，runner仅在标记隔离DB应用已有原件元数据迁移（不接Storage/生产）。
3. DS03首个离线经验分析基础：严格脱敏结构回执、相同签名分组、去重冲突拒绝、四路待评价建议、失败不计成功、默认不可激活。接口在同一Skill references/EXPERIENCE.md，脚本experience.mjs；非宿主遥测采集/模糊语义发现/自动准入。权限不因建议增加。

回退：撤回本批新增私有入口/分析脚本或按Git差异回退；保留已合法保存笔记与原件。数据库及Storage生产环境未改；不能复活撤权材料。仅测试runner使用现有迁移，不创建新Schema权威。

## 3. 实测与宿主边界

- Node24.19.0、git2.52.0；宿主pnpm11.25.0有版本差异，已改用仓库指定pnpm9.15.4完成frozen安装，锁文件不变。pnpm11自动生成workspace占位配置已定向移除，不提交依赖变化。
- 沙箱Node spawnSync初报EPERM、git fetch代理端口拒绝；相同授权命令在正常执行权限下成功。无绕过网络策略或关闭TLS。初次offline缓存缺元数据、pnpm11忽略构建均真实失败，不冒称安装PASS；pnpm9安装成功后执行测试。
- 本轮会话已实际读取canonical Skill正文、工具映射与宿主规范，实际运行doctor/static/typecheck/unit/production负例。CLI的hostSkillLoaded:false仅表示CLI不能证明宿主加载，读取与执行由本轮会话轨迹证明；不声称原生自动发现/后台调度或CodeBuddy验收。
- 类型修复后六workspace typecheck PASS；首次完整unit467PASS/4既有SKIP；生产边界133PASS；Skill11PASS；新入口/服务最终16PASS；Playwright收集20项/7文件仅语法证据；Build PASS。审查后最终整套与精确远端CI/PG/HTTP结果待补§4。
- 中间一次Skill unit profile与新增RED测试并行，返回FAIL，已保留，须最终稳定源码重跑后独立记录，不用较早单测PASS覆盖。
- 首次目标审计发现六MHKA已改但旧差异账仍称字节相同，按实际字节原位修正为ADAPTED；不撤销历史M0，不把修账当语义验收。

## 4. 精确提交与远端证据（收尾更新）

当前源码提交、最终CI与真实PG/HTTP以本节随后精确回写为准；未核实部分NOT_RUN/PENDING，正式Gate/生产/外发/费用/Owner体验及M6—M8所有HOLD不变。

唯一下一优先：继续原M5/ST02真实原件L0→L1→L2→自动reading_note的PG/HTTP首次与回放、撤权正反验证；再接用户材料选择与ST03，不跳过来源/资格依赖，不重复ST01。
