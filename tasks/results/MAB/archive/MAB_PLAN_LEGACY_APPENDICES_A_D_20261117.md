# MAB PLAN旧附录 A—D 留档（2026-11-17）

> **ARCHIVE_ONLY / DO_NOT_EXECUTE**。以下原PLAN附录A—D是2026-11-02设计包、批次归属、旧差异/推送快照。保留原文供追溯，不得以其中的建议批次、PENDING_PUSH、旧权限配置或旧任务描述覆盖现行PLAN §0/§3.5 B/C/D/§6及实时源码证据。文件级差异以现行target-diff.csv和实时main重判。

## 9. 附录A｜20项补充工程责任及批次映射

下表直接提取字段级差异清单，责任与断言以原包CSV为准。它约束那些没有随74目标完整提供源码的既有路径，必须先取得当前源码再适配。

### A01｜`apps/web/lib/studio-research.ts`

- 建议批次：M2/M4；责任：MHKA-04/MHKA-03。
- 工程要求：将短期research_tasks.checkpoint与长期Studio修订/项目Owner分离，保留任务事件，新增有权搜索和Agent回执身份。
- 正验：保存同一project的asset@rev并可跨run恢复；无权限/预算或原件时HOLD；原研究功能不退化。
- 反验：删除task后长期修订不消失；跨Owner不得读取；重试不重复写。
- 恢复边界：关闭新资产写路由，保留旧合法任务及永久资产，绝不删除数据库行。

### A02｜`apps/web/lib/studio-production.ts`

- 建议批次：M3/M4；责任：MHKA-04/MHKA-05。
- 工程要求：正式D/G请求仍走原run.mjs和Registry，收到候选与资格拒绝按真实stage恢复；本服务不能冒名Gate。
- 正验：返回run/Stage/候选/G资格精确身份；未激活明确WAITING_GATE。
- 反验：不存在独立G而报道已合格，直接写world/meaning/gate审计。
- 恢复边界：停新Runner写入与发布，保留真实run回执。

### A03｜`apps/web/lib/studio/tool-ledger.ts`

- 建议批次：M2/M4；责任：MHKA-04/MHKA-03。
- 工程要求：现study_asset_receipts可继续做短期日志，长期Delegation/ExecutionReceipt独立追加保存；工具费用与重试关联。
- 正验：两主体回执真实可核，Cost unknown不补0。
- 反验：删除root任务带走长期唯一回执；重复工具计费。
- 恢复边界：保留历史账和新回执，不删除账本。

### A04｜`apps/web/lib/mohen-agent/research.ts`

- 建议批次：M4；责任：MHKA-04。
- 工程要求：依真实project旧资产检索→Plan DAG→批准委托→候选校验T1-T7→D/G请求；Agent必须有可观察动作。
- 正验：首次真实课题内生Agent与外部委托同root，职责互补。
- 反验：模拟回执/外部全包；无外发权仍调用供应商。
- 恢复边界：禁止外部委托，保留合法内部计划与候选。

### A05｜`apps/web/lib/mohen-agent/retrieve.ts`

- 建议批次：M4/M5；责任：MHKA-03/MHKA-05。
- 工程要求：保留现六类L5 agent资格搜索，另增项目内L0-L4/Studio候选合法检索的独立适配器。
- 正验：consumer/purpose/action/revision/current_g/rights每次生效。
- 反验：旧PASS/公众搜索绕过私有项目ACL。
- 恢复边界：关闭新检索端点，不降现有合法读权限。

### A06｜`apps/web/lib/read-model-bridge.ts`

- 建议批次：M5；责任：MHKA-03/MHKA-05。
- 工程要求：visual_stage目的和用途校验、媒体图片权利及撤权、动态G5，主题参数安全。
- 正验：同一ref已获visual_stage展示许可才返回。
- 反验：agent资格直接给visual_stage、旧静态JSON回退。
- 恢复边界：关闭不合规视觉分面，保留其他合法分面。

### A07｜`apps/web/lib/publication.ts`

- 建议批次：M5；责任：MHKA-05/MHKA-03。
- 工程要求：作品修订CAS/Reviewer/合法G5/媒体权限综合可见性；公开pointer与作品状态事务原子或补偿；出版回流仅D/G候选。
- 正验：同一作品rev的发布/撤回和WATCH读一致。
- 反验：只有published pointer即可公开、旧撤权缓存复活、作品审核代G。
- 恢复边界：禁不安全发布，旧合法指针保留并重核权利。

### A08｜`apps/web/lib/asset-reflow.ts`

- 建议批次：M3/M5；责任：MHKA-03。
- 工程要求：保留当前independent_gate_required失败关闭；仅在受控D/G候选申请+独立签发就绪后逐项回流。
- 正验：无资格时明确不回流，有资格后审计知识与作品分流。
- 反验：发布作品就直接回写read_model真值。
- 恢复边界：保持0回流的安全阻断，不自动删旧知识。

### A09｜`apps/web/app/studio/desk/page.tsx`

- 建议批次：M4/M5；责任：MHKA-02/MHKA-04。
- 工程要求：现Studio研究资料台接项目资产授权视图及真实agent子任务进度与可恢复草稿；不用新独立知识平台。
- 正验：首次对话能看见真实候选/缺口/进度，不假DONE。
- 反验：无Agent回执只显示已研究；私有原件被展示。
- 恢复边界：显示有界HOLD与合法工作区。

### A10｜`apps/web/app/admin/AdminWorkbench.tsx`

- 建议批次：M5；责任：MHKA-02/MHKA-05。
- 工程要求：在五图F05 Admin原运营平台内部接AdminAuthorizedItemViewV1/条目/来源/修订/使用历史/缺口；保持现有运营功能。
- 正验：能具体管理历史知识，所有跳转可回具体修订与来源。
- 反验：重新制造独立知识管理平台；以运营者身份签G。
- 恢复边界：关闭新知识面板，其他Admin业务可用。

### A11｜`apps/web/app/watch/WatchGallery.tsx`

- 建议批次：M5；责任：MHKA-02/MHKA-05。
- 工程要求：继续图文章节阅读同published WorkRevision@rev，消费时按现G5/媒体权利对逐分面校验。
- 正验：合法已发布文案可读、失效分面阻断。
- 反验：旧章节缓存/无资格媒体仍公开。
- 恢复边界：仅关闭受影响内容，保留合法章节。

### A12｜`packages/data-access/src/data-production-repository.mjs`

- 建议批次：M3；责任：MHKA-05/MHKA-03。
- 工程要求：main现recordGate写control.gate_candidates但数据库缺表；补表/DB角色及修订/用途检查，不恢复Producer签G。
- 正验：Producer只写候选/独立签发单身份且有有效证据。
- 反验：候选表不存在却报告成功；passed()任意旧PASS可公开。
- 恢复边界：暂停Gate候选新写入，保留旧历史审计。

### A13｜`packages/data-access/src/read-model-repository.mjs`

- 建议批次：M3/M5；责任：MHKA-05/MHKA-03。
- 工程要求：六类L5每次核现行G5用途、consumer、revision、依赖、有效期和操作权，P08精准阻断。
- 正验：合法分面返回来源完整链。
- 反验：跨消费者资格复用、失效缓存复活。
- 恢复边界：只阻断新受影响分面。

### A14｜`pipelines/data-production/run.mjs`

- 建议批次：M3；责任：MHKA-04/MHKA-05。
- 工程要求：保留六阶段唯一runner/Registry授权和D00-D05专业方法，接长期资产来源、原件校验及真实Gate候选申请。
- 正验：只按已激活Job+权限运行；Stage与G资格分别出回执。
- 反验：禁用Job仍被启动；单一模型替换D链。
- 恢复边界：停止新run，保留已有审计与合法中间成果。

### A15｜`apps/web/app/api/studio/materials/import/route.ts`

- 建议批次：M1/M2；责任：MHKA-05。
- 工程要求：适配public.imported_materials RLS/anon权限修复，核当前session/owner，安全上传必须有Storage权。
- 正验：合法本人可导入并查看状态。
- 反验：anon/跨账号可查询或写入其他用户素材。
- 恢复边界：先关闭对外写，修补兼容后灰度。

### A16｜`apps/web/app/api/works/[id]/publish/route.ts`

- 建议批次：M5；责任：MHKA-05。
- 工程要求：有运营角色且精确作品revision、G5/rights仍合法才能切发布指针，失败事务回退。
- 正验：合法发布结果与修订准确一致。
- 反验：编辑审核充当G5、部分发布成功被误报。
- 恢复边界：维持原合法版，拒非法新指针。

### A17｜`apps/web/app/api/public/works/[id]/eligibility/route.ts`

- 建议批次：M5；责任：MHKA-05。
- 工程要求：eligible不只判published pointer，动态验证知识/媒体权利与现行Gate及失效闭包，保持旧wire兼容。
- 正验：现行可公开且资格有效才能eligible。
- 反验：旧pointer存在但证据撤权仍返回true。
- 恢复边界：撤销公众返回权而非降低安全。

### A18｜`apps/web/app/api/public/evidence/[id]/route.ts`

- 建议批次：M5；责任：MHKA-05/MHKA-03。
- 工程要求：Evidence on Demand按当前合法资格展示精确source_version+typed locator，字段最小化。
- 正验：有效权限可返页图证据；无许可报告有界原因。
- 反验：返回source原件给无授权者、只有引用名未定位。
- 恢复边界：不暴露受限引用，保留合规缩略描述。

### A19｜`supabase/migrations/<ENGINEER_CLI_GENERATED_KAD4>.sql`

- 建议批次：M1/M2；责任：MHKA-05。
- 工程要求：只有授权工程按最新main/真实schema去重后生成KAD4迁移：12候选表上限+RLS/Storage物理状态/项目Owner/Gate候选。
- 正验：独立隔离迁移前后PK/FK/CAS/权限/审计/恢复均可重跑。
- 反验：盲执行KAD4非执行SQL、复制现有L/作品/Gate真源。
- 恢复边界：先只追加/兼容迁移、回滚关闭新能力不删数据。

### A20｜`tests/**`

- 建议批次：M6/M7；责任：MHKA-05。
- 工程要求：在既有单元/integration/E2E测试布局扩展KAD5的授权双主体、九层、13资产、SEC-P0、双题跨rev复用与回滚。
- 正验：正例、越权/错rev/无原件/旧PASS/撤权/保存恢复反例均实测。
- 反验：合成fixture替代真实运行；失败码只HTTP200但UI显示成功。
- 恢复边界：保留既有测试与过去有效数据，不撤掉失败关闭。

## 10. 附录B｜74份正式目标登记

此表为范围登记，不表示已实现。CREATE/REVISE是包内原始定性；正式施工需按最新HEAD及等价能力重判。每项后续均须链接真实变更或KEEP依据、测试与恢复证据。

| 序号 | 目标路径（相对真实仓库根目录） | 原动作 | 语义归属 |
|---:|---|---|---|
| 1 | `.github/workflows/ci.yml` | REVISE | MHKA-05 |
| 2 | `AGENTS.md` | REVISE | MHKA-00 |
| 3 | `OWNERSHIP_MAP.md` | REVISE | MHKA-05 |
| 4 | `apps/web/app/api/admin/acl/route.ts` | REVISE | MHKA-05 |
| 5 | `apps/web/app/api/admin/assets/[id]/invalidation-requests/route.ts` | REVISE | MHKA-05 |
| 6 | `apps/web/app/api/admin/publications/route.ts` | REVISE | MHKA-05 |
| 7 | `apps/web/app/api/admin/rights/invalidate/route.ts` | REVISE | MHKA-05 |
| 8 | `apps/web/app/api/admin/users/[id]/status/route.ts` | REVISE | MHKA-05 |
| 9 | `apps/web/app/api/explore/entities/[id]/route.ts` | REVISE | MHKA-05 |
| 10 | `apps/web/app/api/explore/events/[id]/route.ts` | REVISE | MHKA-05 |
| 11 | `apps/web/app/api/explore/relations/[id]/route.ts` | REVISE | MHKA-05 |
| 12 | `apps/web/app/api/governance/gates/revoke/route.ts` | REVISE | MHKA-05 |
| 13 | `apps/web/app/api/public/evidence/[id]/route.ts` | REVISE | MHKA-05 |
| 14 | `apps/web/app/api/studio/attachments/route.ts` | REVISE | MHKA-05 |
| 15 | `apps/web/app/api/studio/works/[id]/revisions/[rev]/panels/[panel]/route.ts` | CREATE | MHKA-05 |
| 16 | `apps/web/app/api/studio/works/[id]/revisions/[rev]/route.ts` | REVISE | MHKA-05 |
| 17 | `apps/web/app/api/studio/works/[id]/revisions/route.ts` | REVISE | MHKA-05 |
| 18 | `apps/web/app/api/watch/sessions/route.ts` | REVISE | MHKA-05 |
| 19 | `apps/web/lib/gate-review.ts` | REVISE | MHKA-05 |
| 20 | `apps/web/lib/gate-revoke.ts` | REVISE | MHKA-05 |
| 21 | `apps/web/lib/mohen-agent/retrieve.ts` | REVISE | MHKA-05 |
| 22 | `apps/web/lib/publication.ts` | REVISE | MHKA-05 |
| 23 | `apps/web/lib/read-model-bridge.ts` | REVISE | MHKA-05 |
| 24 | `apps/web/lib/studio-director.ts` | REVISE | MHKA-05 |
| 25 | `governance/mhka/MHKA-00_Governance_Charter.md` | CREATE | MHKA-00 |
| 26 | `governance/mhka/MHKA-01_Value_and_Strategy.md` | CREATE | MHKA-01 |
| 27 | `governance/mhka/MHKA-02_Humanistic_Product_and_Experience.md` | CREATE | MHKA-02 |
| 28 | `governance/mhka/MHKA-03_Knowledge_World_and_Data_Architecture.md` | CREATE | MHKA-03 |
| 29 | `governance/mhka/MHKA-04_Agent_and_Professional_Capabilities.md` | CREATE | MHKA-04 |
| 30 | `governance/mhka/MHKA-05_Software_Engineering_and_Operations.md` | CREATE | MHKA-05 |
| 31 | `skills/README_DATA_PRODUCTION_SKILLS.md` | REVISE | MHKA-04 |
| 32 | `skills/mohen-carrier-reading/SKILL.md` | REVISE | MHKA-04 |
| 33 | `skills/mohen-humanistic-discovery/SKILL.md` | REVISE | MHKA-04 |
| 34 | `skills/mohen-material-understanding/SKILL.md` | REVISE | MHKA-04 |
| 35 | `skills/mohen-read-model-publication/SKILL.md` | REVISE | MHKA-04 |
| 36 | `skills/mohen-source-intake/SKILL.md` | REVISE | MHKA-04 |
| 37 | `skills/mohen-world-construction/SKILL.md` | REVISE | MHKA-04 |
| 38 | `specs/AGENT_CONTRACT.md` | REVISE | MHKA-04 |
| 39 | `specs/API_TOOL_CONTRACT.md` | REVISE | MHKA-05 |
| 40 | `specs/DATA_CONTRACT.md` | REVISE | MHKA-03 |
| 41 | `specs/EXPERIENCE_CONTRACT.md` | REVISE | MHKA-02 |
| 42 | `specs/FOUNDATION.md` | REVISE | MHKA-05 |
| 43 | `specs/OPERATIONS_DEPLOYMENT.md` | REVISE | MHKA-05 |
| 44 | `specs/SECURITY_ACCESS_CONTRACT.md` | REVISE | MHKA-05 |
| 45 | `specs/SYSTEM_RUNTIME_ARCHITECTURE.md` | CREATE | MHKA-05 |
| 46 | `specs/data-production/MoHen_Data_Production_Protocol.md` | REVISE | MHKA-04 |
| 47 | `specs/data-production/PERSISTENCE_BINDING_CONTRACT.md` | REVISE | MHKA-05 |
| 48 | `specs/data-production/contracts/ENGINEERING_HANDOFF_CONTRACT.md` | REVISE | MHKA-05 |
| 49 | `specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md` | REVISE | MHKA-03 |
| 50 | `specs/data-production/method-binding-contract.json` | REVISE | MHKA-04 |
| 51 | `specs/data-production/production-registry.json` | REVISE | MHKA-04 |
| 52 | `specs/requirements/TRACEABILITY_INDEX.md` | REVISE | MHKA-05 |
| 53 | `specs/requirements/api-route-contracts.csv` | REVISE | MHKA-05 |
| 54 | `specs/requirements/u07-action-contracts.csv` | REVISE | MHKA-05 |
| 55 | `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` | CREATE | MHKA-03 |
| 56 | `specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` | CREATE | MHKA-04 |
| 57 | `specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md` | CREATE | MHKA-02 |
| 58 | `skills/mohen-acceptance/SKILL.md` | REVISE | MHKA-04 |
| 59 | `skills/mohen-project-guard/SKILL.md` | REVISE | MHKA-04 |
| 60 | `skills/mohen-vertical-slice/SKILL.md` | REVISE | MHKA-04 |
| 61 | `skills/mohen-historical-spatial-source/SKILL.md` | REVISE | MHKA-04 |
| 62 | `skills/mohen-historical-spatial-reconstruction/SKILL.md` | REVISE | MHKA-04 |
| 63 | `skills/mohen-visual-asset/SKILL.md` | REVISE | MHKA-04 |
| 64 | `skills/mohen-experience-prototype/SKILL.md` | REVISE | MHKA-04 |
| 65 | `apps/web/lib/kad1-policy.d.mts` | CREATE | MHKA-05 |
| 66 | `apps/web/lib/kad1-policy.mjs` | CREATE | MHKA-05 |
| 67 | `supabase/migrations/202611020900_kad1_watch_revision_isolation.sql` | CREATE | MHKA-05 |
| 68 | `supabase/migrations/202611020910_kad1_consumption_blocks.sql` | CREATE | MHKA-05 |
| 69 | `supabase/migrations/202611020920_kad1_account_transactions.sql` | CREATE | MHKA-05 |
| 70 | `supabase/rollback/202611020900_kad1_watch_revision_isolation.rollback.sql` | CREATE | MHKA-05 |
| 71 | `supabase/rollback/202611020910_kad1_consumption_blocks.rollback.sql` | CREATE | MHKA-05 |
| 72 | `supabase/rollback/202611020920_kad1_account_transactions.rollback.sql` | CREATE | MHKA-05 |
| 73 | `tests/unit/kad1-policy.test.mjs` | CREATE | MHKA-05 |
| 74 | `tests/unit/kad1-route.test.mjs` | CREATE | MHKA-05 |

## 11. 附录C｜来源与本轮交付检查

主要来源（路径均相对原ZIP）：

1. `00_README_交接指引.md`：阅读顺序、完整范围、三方差分、20责任及权限边界。
2. `manifest/MAB_完整设计基线_manifest.json`、`FILE_HASHES.sha256`：基线与文件身份。
3. `repo_target/AGENTS.md`、六MHKA及各唯一专业合同：权威、生效、专业语义与工程边界。
4. `manifest/MAB_74份正式工程目标_manifest.csv`、工程目标审查总索引、KAD6字段级差异CSV：目标范围与原位责任。
5. `acceptance/KAD6_全量工程目标_交付自检矩阵_现行.csv`及静态报告：234路径、设计证据和运行HOLD。
6. `repo_target/specs/requirements/`两份CSV及TRACEABILITY_INDEX：85API/152动作及兼容要求。
7. Knowledge §19、Persistence KAD6完整绑定、安全 §11、Agent能力KAD6与系统运行架构：长期身份/原件/权限/委托的关键增量。
8. `evidence_only/KAD5_关联双课题_知识生产存储与复用验证设计_V0.1.md`：A/B课题、原始验收编号及真实复用证据。

本轮完成：附件解包；92项哈希及74目标哈希核验；完整范围与批次计划编制；20项责任与74目标登记；UTF-8 Markdown实体文件生成与回读检查。

本轮未执行：最新远端/生产现场盘点、代码施工、PG/Storage迁移、真实模型委托、正式Gate签发、部署、双课题研究与Owner业务签收。本文各项未来检查框保持未勾选。

## 12. 附录D｜MAB完整设计交付包（20261102）受控吸收账

**包身份**：KAD6 十门静态终审签发的设计基线（`MAB_DESIGN_BASELINE_EXIT_PASS`），基线 `main@db21cef`（2026-11-01）。Owner 2026-11-12 指令：本地优先施工、推送批量延后（AGENTS.md §0A）；只提取有用文件，不覆盖已建成果。完整解读与核查方法见 `tasks/results/MAB_DELIVERY_PACKAGE_INTERPRETATION_20261112.md`。逐文件哈希比对已确认：包内 74 份 repo_target 路径全部已存在于仓库，无整文件缺失；缺口为 24 份 REVISE 目标（仓库停留在基线）与 19 份包外文档。

**吸收①｜归档（已完成 2026-11-12，本地批）**：19 份包外文档原样归档至 `tasks/implementation/MAB/inputs/mab-package-20261102/`（acceptance 3 + evidence_only 9 + manifest 6 + 交接指引 1）。归档时逐文件 SHA256 与包内原件比对 0 差异；完整性锚为随档 `manifest/FILE_HASHES.sha256`。身份：只读设计证据，不进权威路由正文，不构成第二套现行合同。

**吸收②｜挂 M5**：24 份未推送目标中的消费侧部分——7 份 route.ts（admin/acl、admin/publications、admin/users/[id]/status、explore entities/events/relations、watch/sessions）+ 7 份 SKILL.md（mohen-acceptance、mohen-experience-prototype、mohen-historical-spatial-reconstruction、mohen-historical-spatial-source、mohen-project-guard、mohen-vertical-slice、mohen-visual-asset）。施工方式：包目标 × 当前 HEAD 三方合并，禁止整文件覆盖；7 份 Skill 须与仓库 11-06 六阶段对齐结果合并。见 §5 M5 checklist。

**吸收③｜挂 M6**：7 份代际合同（AGENT/API_TOOL/DATA/EXPERIENCE/FOUNDATION/OPERATIONS_DEPLOYMENT/SECURITY_ACCESS）+ 3 份 requirements（api-route-contracts.csv 85 API 全字段、u07-action-contracts.csv 152 动作全字段、TRACEABILITY_INDEX）。入库方式为逐字段 diff 合并（保留仓库行、以包版补全字段）；**7 份合同的"生效切换"属 M8 并需 Owner 具名授权**（AGENT_CONTRACT 包内原文要求 AGENTS.md 同步切换），M6 前仅作施工依据参照。见 §6 M6 checklist。

**禁止回写清单（护栏，任何批次不得违反）**：以下内容仓库版本已领先，交付包对应文件一律不得覆盖——①六 MHKA（仓库 11-05 Owner 批准版）；②`specs/data-production/` 全部五件（Protocol、Registry、Binding、Gate 合同、Handoff 合同，含 D00-A/B/C 施工增量与隔离链路激活状态，照抄包版会关停现役链路，参见 2026-11-09 D00 交付审计的"危险漂移"预警）；③G0-G5 合同与 Persistence 合同（仓库 11-06 定稿）；④AGENTS.md、OWNERSHIP_MAP.md、ci.yml、skills README 及 5 份已对齐 skill；⑤apps/web/lib 全部演进代码。与包字节一致、无需动作：KNOWLEDGE_ASSET、AGENT_PROFESSIONAL、SYSTEM_RUNTIME、H1_H2_H3、kad1 三迁移+三回滚。

**差异账说明**：24 份未推送目标已在 target-diff.csv 按 MAB234 账逐行登记（状态 BASE_UNCHANGED），本附录不重复登记；本吸收批未改变任何目标语义，target-diff.csv 无需增行。

**推送状态：`PENDING_PUSH`**——本附录及吸收①归档、AGENTS.md §0A 目前仅在本地提交，待 Owner 确认窗口一次性推送 GitHub；推送完成后在此销项并记 `PUSHED`。

**汇报纪律（Owner 2026-11-12 指令）**：自本账生效起，后续每批施工的汇报与 progress.md 回执必须注明：本批实际引用了哪些交付包归档/吸收文件（归档根：`tasks/implementation/MAB/inputs/mab-package-20261102/`）及其发挥的具体作用；某批确无引用时如实写明"本批未引用交付包文件"，不得虚构引用。
