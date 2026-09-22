# TASK-0012 Result — 金泽 3 分钟 Evidence-Grounded Experience Script

- 任务书：`tasks/TASK-0012-jinze-3min-evidence-grounded-experience-script.md`
- 就绪报告：`data/exports/jinze-3min-experience-readiness.md`（本地交付物，exports 目录按 gitignore 约定不入库）
- 构建器：`pipelines/experience/build-jinze-3min-experience.mjs`
- 测试：`tests/data/experience-script.test.ts`（**21 用例**，#21 为 TASK-0012A 组合解释防线）

## 1. §19 精确对账

| 项 | 值 |
|---|---|
| scenes | **8**（s01-today-hook / s02-time-travel / s03-two-bridges-water / s04-temple-enters / s05-evidence-reveal / s06-change-through-time / s07-return-today / s08-next-question） |
| total seconds | **206**（目标 150–210 ✓；逐场 26+26+28+28+28+26+24+20） |
| factual narration units | **15**（FACT_EVIDENCED 11 + FACT_LIMITED 2 + CONFLICT 2）；全部叙事单元 26 |
| evidence-traced units | **15/15**（全部事实单元带非空 evidence_refs，19 个不同 evidence UUID 全部经构建期 DB 校验存在；测试 #6 用 trace CSV 对账 UUID 存在性） |
| questions | **3**（QUESTION） |
| limited facts | **2**（FACT_LIMITED：A5 转引 s04-u2、T11-C3 免责 s06-u4） |
| conflicts surfaced | **2**（T11-C1 普济桥方位 / T11-C2 万安桥跨水道，均在 s05 证据面板浮出，CONFLICT 级单元 2 个） |
| unknowns surfaced | **4**（UNKNOWN，含 1879 p36 三标签未决等） |
| 其他层级 | INTERPRETATION_CANDIDATE **2**（s05-u4 + TASK-0012A 后的 s08-u1b）/ QUESTION 3 / INTERACTION 3；总叙事单元 **27**（TASK-0012A 前为 26） |
| spatial-mode transitions | **3 次**：EXACT→RELATIONAL（s01→s02）、RELATIONAL→EXACT（s06→s07）、EXACT→RELATIONAL（s07→s08） |
| exact/approximate/relational/unknown 场景数 | GEOGRAPHIC_EXACT **2**（s01/s07，均 time_state=当下）/ GEOGRAPHIC_APPROXIMATE 0 / RELATIONAL_HISTORICAL **6** / HISTORICAL_MAP_SOURCE 0 / SPATIAL_UNKNOWN 0 / RECONSTRUCTED_HISTORICAL **0（禁用）** |
| Primary/Secondary Discovery | **1 / 2**（primary=「三处遗存是同一片水网上的三个节点」+未决对点显式；**TASK-0012A 后 epistemic_classification=INTERPRETATION_CANDIDATE**） |
| follow-up patch preserved/changed | preserved **6** 字段 / changed **3** 字段（scene_focus / user_question / composition）；behavior_contract：restart_experience=false、patch_not_replace=true、may_invent_answer=false；invariants 5 条（不升级 E2→E1 / 不重启 / 不编造 / 不改已播场景 / HR-MAP-01 维持） |
| visual assets by type | photo **3**（万安桥 `75f9bd12`、普济桥 `d46a8996`、颐浩寺遗址 `e818b2a1`，全部 confirmed current、CC BY-SA）；按场景白名单挂载（s01=万安桥、s04/s06=颐浩寺、s07=全部 3 张） |
| historical visual assets used | **0**（visual_policy.forbidden 含「AI 历史场景生成 / AI 补画河道街巷 / 1879 p36 升级为直接金泽地图」） |
| historical geometry created | **0**（state-sequence 全文无历史经纬度；关系空间场景 map_state 显式 no_coordinates） |
| DB migrations | **0**（纯构建产物） |
| DB writes | **0**（构建器对 DB 只读；测试 #20 构建前后 evidence/source_records/claims/evidence_gate_audit 行数逐项相等） |
| published before/after | 0 → **0** |
| orphan before/after | 63 → **63（≤63）** |
| Legacy seed.master.json | 零写：git `status --porcelain data/seed.master.json` 干净；mtime 不变（2026-09-17 基线）；测试 #18 断言 |
| idempotent rerun | 二次运行 **5 文件全部 unchanged**；hashes（TASK-0012A 后终值）：script.json `4a3dbf15…` / script.md `8d039c16…` / evidence-trace.csv `2157432d…` / state-sequence `014141fc…` / followup-patch `c81c1791…` |

## 2. 冻结裁定落实（T11-C1…C5，全部 applied）

| 裁定 | 落实（脚本 `t11_rulings_applied` 在场 + 测试断言） |
|---|---|
| T11-C1 | ACCEPT_CONFLICT：只说「跨金泽塘」，方位冲突保留 s05 |
| T11-C2 | ACCEPT_CONFLICT+SUSPECTED_CROSS_TOWN_MISALIGNMENT：官方措辞+上图「秀州塘」证据展开可见，不静默归一 |
| T11-C3 | ACCEPT_RETIREMENT：「1992 原址重建」口径；「开放为宗教活动场所」仅在免责式 FACT_LIMITED 出现，FACT_EVIDENCED 层零出现（测试 #9） |
| T11-C4 | ACCEPT_LIMITED：引文以「转引」身份（s04-u2，挂 yihao_a5_quote，含「原书至今没有取得」限制）（测试 #10） |
| T11-C5 | temporal_assertion=**none** / temporal_evidence_status=**not_applicable**；note 明示 attested_time_evidence_backed=true ≠「历史年代已证明」；全文无「金泽塘+年代」绑定句（测试 #11 正则） |

**金泽塘口径特别声明（用户原话红线）**：本 Experience 全程不对金泽塘作任何年代陈述；切片字段 attested_time_evidence_backed=true 的语义是「该字段无时间断言、故无可证伪项」，**不是**「金泽塘历史年代已获证据证明」。

## 3. 验证

| 项 | 结果 |
|---|---|
| `tests/data/experience-script.test.ts` | **21/21 PASS**（§18 全覆盖 + TASK-0012A 组合解释防线；import 构建器不 spawn，规避 EBUSY；beforeAll 共享构建） |
| 回归：historical-spatial-reconstruction | **17/17 PASS** |
| 回归：spatial-grounding | 17/18；唯一失败 #16 = spawnSync **EBUSY**（本机环境限制，TASK-0011 已记录的 4 个重放型用例之一，非回归） |
| typecheck | `pnpm -r typecheck` **7 workspace 全过**；tests/ 补检（单文件 tsc，前后 .js 产出均为 0）：TS7016 与既有测试基线一致（.mjs 无声明文件为既有模式），无新增错误 |
| guard:docs / guard:structure | **PASS** |
| web build | `NODE_OPTIONS="" pnpm --filter @mohen/web build` **exit 0** |

## 4. 修复记录（本轮构建器 3 处）

1. `validate()` primary discovery 判空 bug（`.length` on object）→ 改对象判空；
2. `buildSceneOutput` 视觉资产三元逻辑（3 场景误挂全部 3 张图）→ 改 `SCENE_VISUAL_LABELS` 每场景白名单；`transitionIntent: " establishing"` 前导空格修正；
3. `readiness` 判定（切片字段为对象 `{gate:"YES"}`）+ `buildExperience` 补 `export`（测试 import 需要）+ evidence-trace CSV 加固为标准引号包裹格式。

## 5. Commits 与 worktree

| commit | 内容 |
|---|---|
| `8e96f73` | TASK-0012 主体：构建器 + 测试 + 任务书 + result 文档（4 files，+2069） |
| `1f13ced` | TASK-0012A：Primary Discovery 认识论分类 hotfix（构建器 + 测试 #21 + result 文档） |

worktree：tracked 文件 clean（exports/gitignore 产物与 TASK-0011 期遗留的 probe/_debug 脚本不属本任务交付）。

## 6. TASK-0012A — Primary Discovery Epistemic Classification Hotfix（总架构验收 PARTIAL PASS 后）

**问题**：原 s08-u1 将「三处遗存 = 同一片水网上的三个节点」组合解释整句标为 FACT_EVIDENCED——成分事实各有 Evidence，但组合命题本身无直接 Evidence，Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C 解释)，分类过强。

**修复（只改认识论分类，不删 Discovery、不降产品价值）**：
- 拆三个紧邻单元：s08-u1 FACT_EVIDENCED（桥—水同水道事实，保留 puji/wanan/rel_spans 证据）→ s08-u1b **INTERPRETATION_CANDIDATE**（解释框架，evidence_refs=[]，显式「不是已证历史事实」）→ s08-u2 UNKNOWN（寺—桥功能关联「没有任何证据支持，也没有证据否证」）
- `discoveries.primary.epistemic_classification = "INTERPRETATION_CANDIDATE"` + `classification_note`
- validate() 构建期防线（分类必检 + 组合措辞泄漏即构建失败）+ 新增长期测试 **#21**（21a–21e）

**不变项全部保持**：8 scenes / 206s / 15 事实单元 / Primary Discovery 恰好 1 / T11-C1…C5 / Historical Geometry 0 / Historical Visual 0 / Patch-not-Replace / DB writes 0 / migrations 0 / Legacy zero-write / published 0 / orphan ≤63。验证：测试 **21/21** + historical-spatial 回归 17/17；幂等复跑 5 文件 unchanged。

## 7. 结论

**TASK-0012 PASS**：墨痕第一条 3 分钟 Evidence-Grounded Experience Script 完成。完整链路首次端到端验证：现代精确地理（GEOGRAPHIC_EXACT，仅当下）→ 时间倒退（坐标淡出）→ 精确历史几何不可得 → RELATIONAL_HISTORICAL（关系空间，零伪造几何）→ Evidence（15 事实单元全溯源）→ Discovery（1 primary + 2 secondary）→ Uncertainty（4 unknown + 2 conflict 并列）→ 回到今天 → canonical follow-up → ExperienceState Patch（非 reset、不编造）。零 DB 写、零迁移、零 Legacy 写、published 0、orphan ≤63。

按任务书 §20：PASS 不代表体验视觉完成；后续 ExperienceState/Renderer Runtime 属独立任务（本任务已停，不自行启动 TASK-0013）。
