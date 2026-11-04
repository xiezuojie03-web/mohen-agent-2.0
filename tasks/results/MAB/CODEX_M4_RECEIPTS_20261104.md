# M4 永久回执逐项资格核验｜2026-11-04（北京时间）

基线：fetch远端 main@a7c18dde0bd423b21cad2261cf0ffb146f82f025，HEAD相同、工作树干净。按PLAN M4第2/4/5项续建；不重开M1—M3，不改原Gate SQL、Registry或任务体系。

## 已施工

- 新增只读 `assessStudioReceiptCandidates`，接收Owner仓储读出的永久delegation/receipt；核对委托ID、request hash、实际provider/version、期限及候选格式。T1只记BINDING_MATCHED，不证明Provider或原件真实。
- 每item校验M3当前资格的run/stage/job/Reviewer/consumer、object ID/type、revision、输入输出digest、PASS来源和有效期；祖先撤销/过期/错版本/错消费者/服务不可用均拒绝，不缓存成功。不将Producer资格变成Agent许可。
- 原回执保持不可变；整体及item仍HOLD，T2—T6明确NOT_VERIFIED；执行和知识消费授权恒false，UNKNOWN费用不补零。16项上限，整次默认5秒截止（最大10秒），不因单item错误将全包称SUCCESS。
- 现有Owner GET `/api/studio/delegations/:id?assess_receipt=:receipt_id` 可读取选定已存回执的核验缺口；先过原身份/项目RLS，不可见对象404。普通GET不变。Web不注入Producer凭据/验证器，因此Web这里只显示缺口（无验证器时T7为NOT_VERIFIED，不误报Gate失效），不发起独立资格查询；可信内部生产调用使用已有M3客户端及其服务端范围凭据。
- 实际PG接收：已有真实持久L1及独立合成G0/G1资格→Owner永久委托/回执（重复attempt同ID）→实际M3客户端核验T7→上游撤权后同回执T7拒绝；费用null/UNKNOWN、永久HOLD均保持。

## 证据与边界

- 新增逐项核验与路由8项测试，目标13项全通过；慢资格服务及路由缺接线先RED后GREEN。
- 全套unit **332 PASS / 4既有实网SKIP**；生产边界 **133 PASS**；六工作区typecheck、Next build、105路由auth、85API/152动作追溯通过。
- 完整一次性标记PG17套件exit0，日志 `MAB_M4_RECEIPT_T7_PASS`、`MAB_PRIVATE_READING_M3_SERVICE_PASS`、`K3_DB_TEST_PASS`；恢复3项及各rollback通过。
- 本批无官方Storage配置，PG日志明确byte-buffer-only/no-Storage；M3上批官方Storage原始成功证据原样继承，未当成本批Storage实跑。M4的M3 client fetcher在进程内分派真实服务处理器+真实PG，不声称本批新增真实网络/provider调用。
- 独立fresh-context review无Critical/Important。Minor留账：新类型声明schema/cost_confidence/checks仍为宽string，后续可收窄；运行时核验和拒绝不受影响。

原始日志与SHA256清单见 `evidence/CODEX_M4_RECEIPTS_20261104/`。没有生产写入、外部委托、私人资料外发或Provider费用。

## M4状态

**M4仍为当前唯一施工阶段，未整体准出**。本批闭合M3有效输出到M4永久回执的只读核验接线；没有把T7通过当作完整ReceiveCandidate、真实混合执行或最终accept。Plan DAG、T1—T6实际验证、实时传输授权、真实双主体/费用对账、九动作全接线及完整恢复仍须按原任务书继续完成，不能以本回执核销。M1/M2/M3固定条件全部保留。

Ruling: 本批仅做Producer工具链回执的只读核验，不扩展为Agent消费许可或Web签审 — 当前M3服务只支持Producer且其范围由独立凭据决定 — 若判断不适配，结果仍HOLD，代价仅是不能提前消费，不会误放行。

Final fixed: 以新增RED→GREEN测试明确无验证器时为NOT_VERIFIED，避免把未检查误报成资格已失效；整体HOLD与任何授权不变。独立审查12项目标已过，新增该项后本地目标13项及完整unit332通过。
