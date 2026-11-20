# 首批施工任务清单｜2026-11-20

> 依据 PLAN V1.7「最前阻断」与 CURRENT 断点（D00 接收已验收、停在独立 G0 审核前）。本清单是施工规划，未执行任何 Gate 签发、生产部署或授权启用。

## 施工前置核验（已做）

- HEAD：docs 修复批次 `4a8d282`，local=remote 分叉 0/0，无并发写入。
- CI：当前工具无法确证 GitHub Actions 状态（`gh` 未安装、GitHub 页面 404/不可达）。连续 4 次 run 历史上记 `runner_id=0/steps=[]` 启动前失败。按今日补入 PLAN 的新口径，记 `CI_BLOCKED`，不冒充测试通过。
- 生产部署隔离：未验证自动部署是否与 main 推送隔离；按 PLAN §0.2 B，隔离未证实前不做新业务代码写入的部署结论。
- 本地库 Gate 就绪（只读实测）：`mohen_gate_signer_m5_machine` 角色存在、gate reader 角色存在、D00 候选 `48766904` / 运行 `bfcdfad6` / grant 消费记录均在；但 `independent_decisions(G0)=0`。本地为回写镜像，真实链在云端 `mohen-cloud`，本地角色存在 ≠ 云端 Reviewer 已配置可用。
- 独立 Gate 执行入口（`tools/rule-gate-reviewer.mjs` CLI、`independent-gate-service.mjs` HTTPS 服务、`apps/d00-authority`）均存在，但需要一组专用低权凭据、TLS、session key 与 Owner 具名放行，且历史无真实成功签发先例。

## 首批任务清单（按优先级，含必须先解决的授权/环境依赖）

| # | 任务 | 目标/产出 | 依赖 | 能否立即执行 |
|---|---|---|---|---|
| A1 | 定位 CI 宿主启动前失败根因 | 明确 `runner_id=0/steps=[]` 是平台/网络/配置哪类原因，产出可执行的 CI 恢复条件 | 需要 GitHub Actions 平台访问或 Owner 提供 run 详情 | **否（环境阻断）**：当前工具无法访问 GitHub Actions |
| A2 | 准备独立 Gate 签发的环境前置（只做配置盘点，不启用） | 列出 gate service 所需变量清单（MOHEN_INDEPENDENT_GATE_SERVICE_ENABLED / SIGNER/READER_DATABASE_URL / SESSION_KEY / TLS cert/key / CA）及当前是否具备；产出具名缺口 | Owner 提供凭据渠道；不得读取/输出密钥值 | **部分**：可列清单与缺口，凭据配置须 Owner |
| A3 | 将 D00 候选 `48766904` 交独立 Reviewer 并回读 G0 | 真实 G0 决定回执（PASS/HOLD/REJECT + audit_id），关闭⑤后第一处阻断 | A2 完成 + Owner 对当前目标库/候选的具名放行 + 独立低权身份 | **否（授权阻断）**：Creator/Operator 不能代签，缺 Owner 具名放行 |
| B1 | 资格正向命中验证（不依赖 Gate 启用） | 用现有正式读取路径，在当前 Project `e03c4ba8` 上验证 49 条 qualification_current 是否精确 scope 命中、能否读到真实 L5 合格知识 | 只读查询；需确认用云端还是本地口径 | **是（只读）**：可先做只读诊断，产出 HOLD/命中结论 |
| B2 | 承接 D00 接收证据，核对 D01 typed input 就绪度 | 核 registry 映射、D00 候选 output_digest、D01 所需 typed input 与当前资格；只验证下一处交接 | A3 的 G0 决定（正式推进前）；B1 可作输入 | **部分**：可只读核对输入契约，实际交接待 A3 |
| C1 | 文档链一致性收尾 | 已补 PLAN/CURRENT/progress/失效标注；剩余 P0 CSV 与临时文件为历史未跟踪项 | 无 | **已完成主体**；P0 CSV 为 Owner 原有改动，未动 |

## B1 只读诊断已执行（2026-11-20）

对本地回写库执行只读诊断（当前 Project `e03c4ba8`）：

- `qualification_current` 共 49 条，按 gate 分布：G0=7、G1=5、G2=5、G3=5、G4=5、G5=22。
- 以 `gate_audits.allowed_scope->>'project_id'` 精确匹配当前 Project 的结果：**`project_scoped_qual=0`**——49 条里没有一条绑定 `e03c4ba8`。
- 这些资格的 scope 实际绑定在其他项目：机器/测试 project `b0a11000-0000-4000-8000-000000000001`、`d9d48901-...`、`b1ecefa4-...`；且抽样 G0/G1 的 `current_qualification_is_valid` 均为 **false**。

**结论**：统一门面读不到真实知识的根因被实证锁定——资格存量存在，但对当前真实任务 Project **既无 scope 命中、也不当前有效**，与 CURRENT「停在独立 G0 审核前」一致。真实任务 G0 资格本就尚未签发，不能靠"有 49 条资格"替代，也不应把其他 Project 的资格改写绑定到当前任务（PLAN 禁止灌假资格/拼接实验）。B1 关闭，产出为 diagnostic，未改任何数据。

## 建议的立即动作（当前可执行且不越权）

1. 执行 **B1 只读诊断**：确认回写后当前 Project 的资格命中与正式读取是否可用——这是「统一门面从未读到真实知识」的直接原因，且不需要任何授权启用。
2. 产出 **A2 的具名缺口清单**：把独立 Gate 签发所需的凭据/宿主/TLS 配置逐项列「已具备 / 缺失 / 由谁提供」，交 Owner 放行 A3。
3. 把 **A1 的 CI_BLOCKED** 记入下一批 progress，等待平台侧恢复或 Owner 提供 run 详情。

## 红线（不可越过）

- 不代 Owner 或 Creator 签发任何 Gate；不把 Owner+Creator 同一人的人文终签例外当独立 Reviewer 验收。
- 不启用正式 Gate、不做生产部署、不公众开放、不新增付费（均须单独授权）。
- 不用本地回写镜像的角色存在冒充云端 Reviewer 已配置。
- 不把 CI_BLOCKED 写成测试 PASS/NOT_RUN 后继续；不伪造八维证据。
