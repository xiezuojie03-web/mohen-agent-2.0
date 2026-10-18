# P4｜正负例、稳定性、撤权与视觉复测

> 复测对象：`a001/production` @ `a4e597f`，本地 `next dev -p 3000`，真实库 `mohen_dev`，run `4719c713`。
> 复测脚本：`evidence/p4-replay.mjs`（可重放，产出 `evidence/p4/*.png` 与 `p4-report.json`）；撤权脚本：`evidence/_revoke_test.mjs`。
> **最终「是否认可前端人文体验」由 Owner 判定；本文件只给工程自检结论，不替 Owner 准出。**

## 1｜U1—U5 逐项

| 项 | 结论 | 证据 | 说明 |
|---|---|---|---|
| U1 现在 | **PASS（示意降级）** | `p4/01-today.png` | 页面第一屏就是「今天这处空间」，主角是建筑体量与「缓坡上二层→漫游至滨江」的到达关系；今日联系来自 D04 发布内容，不是计数或字段。视觉为自制体量示意（无授权照片）。 |
| U2 回看 | **PASS** | `p4/03-then.png`、`p4/04-then-anpu-evidence.png` | 1995 六层厂房体量 + 安浦路规划横切；右栏时间轴同步（切换时点即切换叙事，不同屏矛盾）。年代只到有据精度（改造=十年精度、获奖=年份未载）。**不制造 1920=1995 的假同一性**：图上写「前身 1920 怡和冷库（未证同一栋）」。 |
| U3 理解 | **PASS** | `p4/05-understand.png` | 3 条解释增量（功能转变可证 / 身份连续未证 / 安浦路止于空间约束），每条可点开依据；页面显式区分「材料原话、墨痕的解释、尚缺、不认定」。 |
| U4 返证 | **PASS** | `p4/02-evidence-drawer.png`、`p4/06-claim-evidence.png`、`p4/07-evidence-all.png` | 每条原句带：来源名、发布机构、发布日期、片段序号、**可打开的原页面 URL**（实测 `https://www.shyp.gov.cn/…/20231007/438359.html`）。20 条证据全部 `exact_fragment_match` 归属。 |
| U5 追问/返回 | **PASS** | `p4/08`~`p4/11` | 正例：问「今天怎么上去」→ 直接给材料原句（不再用「不给你编路线」兜底）。负例：问「同一栋楼」→ 结论降为部分据 + 明确「不能答成是同一栋」；问「贯通工程造成改造」→ 补「共现≠因果」。追问不把用户踢出当前步骤，答案不消失；「回到我刚才看的地方」可用。 |

## 2｜D1—D7 真实生产/消费验收

| ID | 结论 | 证据 |
|---|---|---|
| D1 D00—D05 运行 | **PASS** | `evidence/_facts.json`、`A001_RUN5_D00-D05.log`、`verification/data-production-runs/4719c713-*.machine.json`。含 1 次失败记录（`1bbf7873`，证据归属外键失败，已登记 FAILED 并修正重跑）。 |
| D2 来源与权利 | **PASS** | `evidence/L5_AND_SOURCES.txt`：3 份来源均含 `source_id`、URL、发布机构、发布日期、`rights`/`usage`、片段序号。无授权图片一律不发布。 |
| D3 实体与年代/空间 | **PASS** | 地块（怡和冷库 1920）、建筑（烟草公司机修仓库 1995）、功能（工业仓储→公共综合体）、今日使用（缓坡/平台/步道）四层分开；年代不冒认；空间只到「近似区域」，不承诺坐标。 |
| D4 G0—G5 | **PASS** | 16 条 G5 审计全 PASS、`current_valid=true`、双 consumer 分面；无人工伪造 PASS（均由管道写 gate_audits）。 |
| D5 L5 双消费 | **PASS** | `P3 §3` 的 ID 表 + 查询过滤条件（`consumer` 分面 + `a001-*` 前缀 + `run_id`）。前端与 Agent 读同一批 L5。 |
| D6 可逆与失效 | **PASS** | 备份 `D:\MoHen\backups\STRAT-PROD-A001\A001_PRE_*.sql`；撤权实测：置 `current_valid=false` 后页面显示「暂无有效成果」、**不复活旧内容**（`p4/14-revoked-no-content.png`），恢复后内容回来（`p4/15-restored-content.png`）。4 次旧 A001 run 的 G5 已按同一机制失效。 |
| D7 费用及效能 | **PASS（估算）** | `evidence/_facts.json` + `_facts_prev.json`：两轮共 22 次 LLM 调用、约 75,870 tokens；估算 ≈¥0.05–0.10（**估算，非账单**）。未超授权、无未授权付费。 |

## 3｜E1—E7 实际 UI 与 Human 审阅

| ID | 结论 | 证据 / 说明 |
|---|---|---|
| E1 真实预览 | **PARTIAL（待 Owner 访问）** | 本地预览可用：`http://localhost:3000/experience/lvzhiqiu`，commit `a4e597f`，branch `a001/production`；**尚未部署到 Production**（Gate C 未触发）。 |
| E2 Visual Focus | **PASS** | `01-today.png`、`05-understand.png`、录屏。第一屏即对象与问题，不出现调试字段/表名/uuid。 |
| E3 Agent 与舞台一致 | **PASS** | `08/09/10` 三张：同一问题下裁决、舞台聚焦、证据同源（今日联系、身份未证、因果未证三处状态一致）。P4 期间发现并修复「追问导致步骤跳走、答案消失」的真实缺陷。 |
| E4 来源与错误处理 | **PASS** | 证据点击可开原页面；撤权负例不复活（`14`）；冲突/未证以边界说明呈现，不并列造假。 |
| E5 布局可用 | **PASS** | 桌面 1440×960（`01`）、窄屏 414×900（`12`/`13`）：舞台在上、墨痕在下，无遮挡；热点有键盘可达性；`prefers-reduced-motion` 生效。 |
| E6 Owner 效果验收 | **PENDING** | 等 Owner 在同一预览版本上判定 `UI_PASS / UI_PARTIAL / UI_FAIL`。 |
| E7 UI 专项衔接 | **记录** | 本案暴露的 L5→UI 缺口：①缺「今日联系」在检索侧的材料化（已补，但只是本工程层）；②缺统一 Surface 渲染契约（A001 仍自绘舞台，未并入通用 Surface 组件）；③缺「多主题并行时的投影命名与消费隔离」通用规则（当前靠 `a001-*` 前缀 + topic 参数）。这些应移交 UI 专项，不在本题里改 C4。 |

## 4｜必须成对展示的正反例

| 主题 | 正例（有据） | 负例（无据，必须拒绝） | 证据 |
|---|---|---|---|
| 功能转变 | 工业仓储 → 公共综合体（1995 厂房经改造） | — | `05-understand.png` |
| 身份连续 | 材料称「前身可追溯到 1920 怡和冷库」 | **「同一栋楼」不认定** | `08-ask-negative-identity.png` |
| 因果关系 | 安浦路横切是改造前的场地约束 | **「贯通工程造成改造」不认定** | `10-ask-negative-causal.png` |
| 今日使用 | 缓坡上二层、漫游至滨江（材料原句） | 不编造开放时间/人流/票价 | `09-ask-positive-access.png` |
| 数据有效性 | 有效 G5 → 正常呈现 | G5 撤权 → 不画、不代理 | `14` / `15` |

## 5｜工程检查（实际执行）

```
guard:runtime-boundary   OK      guard:cross-layer-write  OK
guard:gate-enforcement   OK      guard:physical-model     OK
guard:stage-handoff      OK      guard:no-legacy-entry    OK
tsc --noEmit(web/pkg)    OK      Playwright 复测 13 张截图 + 2 张撤权图，pageerror=0
```

单元测试（`scripts/test-isolated.mjs`，隔离库，真库一行未动：`ISOLATION_VERDICT real_db_untouched=YES`）：

- **通过**：`experience/composition2`(25)、`cultural-world-projection`(11)、`exp-0001-intent-translation`(10)、`multi-intent`(29)、`replan-loop`(15)、`visual-grammar`(38)、`foundation`(2)。
- **既存失败（与本任务无关，未由本次改动引入）**：
  - `experience/contract.test.ts`：文档未含 `SET_COMPOSITION`（契约文档漂移）。
  - `experience/renderer.test.ts` 第 14 项：工作区中 `data/seed.master.json` 处于被修改状态（非本任务改动）。
  - `tests/data/*`（data-factory、evidence-recovery、knowledge-weave、review-triage、spatial-grounding、historical-spatial-reconstruction 等）：断言引用第一代已退役表（`evidence`/`entities`/`review_queue` 等），在本代库上不存在——属架构迁移后的既存红灯，非 A001 引入。

## 6｜复测可复现

```powershell
cd "D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0"
# 1) 起服务
cd apps\web; npx next dev -p 3000
# 2) 正向复测（13 张截图 + 录屏 + JSON 报告）
cd ..\..; node tasks/results/STRAT-PROD-A001/evidence/p4-replay.mjs
# 3) 撤权负例
node tasks/results/STRAT-PROD-A001/evidence/_revoke_test.mjs revoke
node tasks/results/STRAT-PROD-A001/evidence/_revoke_test.mjs restore
```

## 7｜工程自检结论

**`UI_PASS_PENDING_OWNER`** —— U1—U5、D1—D7、E2—E5 通过（U1 为「示意降级」通过，E1 待部署/待 Owner 访问，E6 待 Owner 判定）。

需 Owner 重点判断的三件事：
1. 没有实景照片时，「体量剖面示意」是否足以作为 U1 的视觉主角；
2. 「今日联系」这类 L4 内容是否应继续进入 Agent 检索侧（本轮已做，属工程层决定）；
3. 下一版是否要把 A001 自绘舞台并入通用 Surface 渲染契约（属 UI 专项，需批准）。
