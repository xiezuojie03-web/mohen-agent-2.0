# 墨痕｜当前施工断点

> **Owner 授权口径（2026-11-25，长期有效）**：目标是墨痕**真正运行、持久运行**；除**安全问题**与**费用问题**外，施工方自行授权推进，不再逐项请示技术选择。费用边界：M5 导演生成两题材各封顶 **1.00 USD**（Owner 2026-11-25「费用全权授权、按计划全力推进」已落为可核账委托，逐次真实调用以 Receipt 对账）；超出额度、新增付费来源或扩大用途仍需 Owner 批准。安全底线（密钥不入 git、不自签 Gate、不伪造会话/资格/PASS、不改迁移规避授权）不因该授权放宽。

> 核验时间 2026-11-26（第三十二批收口）｜main 本地 `619a8f9e`+第三十二批未推送提交（**PENDING_PUSH**：网络代理 127.0.0.1:51081 不可达，恢复后对账推送；推送前重核远端）｜`ci`=`CI_BLOCKED`（宿主级 runner_id=0，非代码红灯）｜本文件**只保留一个当前断点块**，每批原地替换；逐批原始回执见 [progress.md](tasks/implementation/MAB/progress.md)，施工标准见 [PLAN.md](tasks/implementation/MAB/PLAN.md)。

## 1. 当前断点：网页端真正创作全程已跑通（静安寺第三题材 0→WATCH 发布），交 Owner 用户式体验

第三十二批按 Owner「实现网页端的真正创作」完成**网页端全链路真实运行**（非脚本、非冒充）：知识库没有的「静安寺」题材从提问到 WATCH 发布全程在网页完成，第 4 部已发布作品上线。

**网页全程证据链（真实浏览器操作）**：Studio 提问静安寺 → 知识库无内容、缺口如实 → 外部来源发现（上海图书馆开放数据等）→ 网页保存私有原件 → 外发授权确认 → deepseek 导演方案 A/B → 采纳 A → 3 章分镜落稿 → 投稿冻结 → Admin「资格审核」签核通过（编辑裁决 APPROVED，G5 审计绑定）→「已通过」发布按钮 → **权利门禁如实拦截一次**（display 权按 Owner 2026-11-08 授权为 HOLD，指针未动）→ Owner 2026-11-26 批准展示权（按金泽先例，只放 display 一项）→ 重新发布成功 → **WATCH 首屏第 4 部作品**《静安寺：从寺名到市集》。

**本批同时修复的工程缺口（已提交待推送）**：正式链投稿在管理后台不可见/签核落库后误报失败（资格审核队列并入正式作品 + 签核 early-return + /api/works/decided 路由 + 作品审核四子页）；单字检索词噪声命中遮蔽 D00；Commons 原图 URL/超时/体积错误分类；外发同意落权（external_processing 幂等留痕）；Worker 会话身份按项目 owner 数据库事实解析。

**费用（第三十二批）**：静安寺 5 次真实 Provider 调用 **0.009696 USD**（D02 0.003418 + 导演 0.006278，receipt 对账）；累计 **0.026836 USD**，两委托各 1.00 封顶内、未超未扩。display 展示权为 Owner 2026-11-26 单独批准（脚本留痕 `scripts/approve-m5-jingan-display-right.mjs`）。

**验证**：全量 unit 116 文件 **833/833 PASS**、typecheck 干净；静安寺发布后指针 `4c8dfc98`、WATCH 真实可见。

## 2. 下一步（唯一施工顺序）

1. **网络恢复后**：重核远端 main HEAD → 推送第三十二批（含 PENDING_PUSH 对账）→ CI 核验（mab-isolated-db 全矩阵、精确 SHA 检查仍待宿主 CI_BLOCKED 恢复）。
2. **交付 Owner 用户式体验（第 14 项）**：http://localhost:3100，账号 `20195689@qq.com`，密码见 `.secrets/local-owner-password-reset.txt`（本机自用，不入 git）。Owner 可亲手走：Studio 提问任意知识库外的题材 → 看外部获取 → WATCH 看 4 部已发布作品（静安寺 3 章 + 金泽 5 章 + 朱家角 4 章 + 每亩多少）→ Admin 下架撤权体验。
3. **未跟踪文件裁决（Owner）**：4 组（`.mohen/`、`apps/web/.mohen/`、`.trae-html-share-packages/`、`apps/web/.tmp_trigger.ts`）：保持 / `.gitignore` / 择优提交。

## 3. 剩余 HOLD（如实，不阻 Owner 体验）

1. **CI_BLOCKED**（宿主级）：mab-isolated-db 全矩阵与精确 SHA CI 检查待宿主恢复；13 类资产 K3 全矩阵同此（本地 Windows 双实例内存冲突具名阻断）。
2. **设计层缺口（Owner 裁决取向）**：正式桥 L0/L1/L3 对象类型错配；G3/G4 用途白名单禁止 agent_read；Studio auto-create 项目无去重；意图分类鲁棒性。
3. **M6 范围**：57 方法绑定、全量合同回归（不提前开工）。
4. **生产部署 / M7 / M8**：另行授权。
5. **权利边界（本轮决策范围）**：display 仅放开「上海地名志·静安寺」一条来源一项动作；download/adapt/redistribute 保持 HOLD，其他来源权利未动。

## 4. 事实边界

- 以上为本机隔离库与本地服务证据，不等于生产部署、CI 或专业 Gate 签收；部署未动（web staging `e563161c`，authority production `48c9169b`；本地 3100 为构建产物模式，已含第三十二批全部修复并重启）。
- 费用：累计 **0.026836 USD**（11-25 两题材 0.017140 + 11-26 静安寺 0.009696），逐次 Receipt 对账。
- 密钥仅在 gitignored `.secrets/`；G0—G5 与 agent 用途审计均为独立机器评审签发，非自签；静安寺作品 creator 为 creator.demo@mohen.local、签核/发布为 Owner 账号（operator ≠ creator，无自审）；权利放行由 Owner 明确批准并留痕。
