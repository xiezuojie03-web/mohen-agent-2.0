# D00 专业方法论交付包｜接收审查报告（供外部设计方参考）

- 报告时间：2026-11-09 14:21（Asia/Shanghai）
- 审查对象：`MoHen_D00_专业方法论_统一设计交付包_20261109_V1.0`（24 个文件）
- 审查性质：只读接收审查。未修改任何仓库文件、未执行 SQL、未做数据库迁移、未推送、未启用任何运行能力。
- 审查基线：GitHub `main` @ `dab2950343566a61f73a4bbd22f419df0e80dd92`（= 本地 HEAD，工作区干净）
- 审查结论标签：`PACKAGE_DESIGN_ACCEPTABLE / ENGINEERING_MERGE_HOLD_REBASE_REQUIRED`

---

## 0｜一句话结论

交付包作为“D00 设计增量接收物”是自洽、可追溯、可接收的；但**不能按包内 `05_D00_接收说明` 直接合并到当前仓库**，因为包使用的四个共享文件基线已与真实 `main` 全面不符，其中 Registry 增量如果照抄，会把当前 M5 隔离联调链路整条关掉。设计内容可以收，工程合并必须先重算基线、按 D00-only 最小差异重写，并解决一个跨消费者阻塞点（G0 请求对象目前装不下“D01 预先选定的 C 方法版本”）。

---

## 1｜仓库一致性核验（本报告可信度的前提）

| 项 | 实测 |
|---|---|
| 本地 `HEAD` | `dab2950343566a61f73a4bbd22f419df0e80dd92` |
| `origin/main` | `dab2950343566a61f73a4bbd22f419df0e80dd92` |
| 本地领先/落后远端 | `0 / 0`（无未推送提交、无待合入提交） |
| 工作区 | 干净（`git status --porcelain` 为空），无 stash，分支 `main...origin/main` |
| 最近一次成功 `git fetch` | 2026-11-09 14:18（晚于最后一次提交 13:29），据此确认远端与本地同一提交 |
| 最后一次提交 | 2026-11-09 13:29 `dab2950 docs(mab): 记录 Owner 对 2 条 legacy 演示资产行的裁决` |

**结论：本地仓库与云端 GitHub `main` 完全一致（同一 commit、无本地未提交改动）。**

**但“一致”只对版本化文件成立，以下本地内容云端不可见，外部设计方读不到：**

- `.env` / `.env.local`（密钥、服务连接参数，未入库）
- `node_modules/`、`.next/`（依赖与构建产物）
- 本地隔离数据库 `mohen_dev`（真实实例状态、已应用迁移、业务行数）
- 本地私有原件存储目录（私有原件字节本体，不入库）
- 生产库与本地库的已知差异（见 `tools/check-env-parity.mjs` 输出的 GAP 清单）

因此：**任何“数据库当前真实状态”“迁移是否已落地”“原件是否真的存在”的判断，都不能只靠读云端仓库得出，必须以实际执行为准。** 本报告第 2 节的哈希可在云端复核；第 4 节涉及数据库的判断，均由本地实查得出。

---

## 2｜交付包自身完整性核验（可独立复核）

| 项 | 结果 |
|---|---|
| 包内文件数 | 24（含 `SHA256SUMS.txt`、`DELIVERY_MANIFEST.csv`、`PACKAGE_METADATA.json`） |
| `SHA256SUMS.txt` 逐条校验 | 全部匹配，0 处不符、0 处缺失 |
| 唯一目标正稿 V1.1 | 实测 SHA = `17a7a12b3b72c5214e2428f93fe8bf3c97f8c1fb74d9645ebd78cd7438788773`，与包内 `D00_METHOD_BINDING_8_设计增量.json` 的 `method_def_sha256` 完全一致 |
| 8 条 Y 绑定 | ID 唯一、`stage=D00`、`layer=L0`、`independent_gate=G0`、`may_grant_gate=false`、`implementation_binding=TO_VERIFY_IN_M0` |
| 10 类输出标签 | 均有唯一归属、持久化责任与“D01 能否直接消费”判断，未虚构数据表 |
| 24 项正反场景 | 前置/动作/期望/拒绝/责任齐全，且明确标注为设计试验而非运行结果 |
| 版本保护声明 | 包明确不覆盖共享 Protocol / Binding / Registry / DATA_CONTRACT，不修改 D01—D05 |

**判定**：包内设计逻辑与打包完整性可准出；**不等于**其中的工程增量已被现行目标接收，更不等于 D00→D01 已实际联通。

---

## 3｜硬问题：四个共享文件基线全面漂移

包内 `05_D00_接收说明` 要求：目标文件当前 SHA 与基线不符时先冲突解析、禁止整文件覆盖。实测四个目标文件**全部不符**：

| 受控文件（仓库相对路径） | 包声明基线 SHA256 | 当前 `main` 实测 SHA256 | 漂移性质 |
|---|---|---|---|
| `specs/data-production/MoHen_Data_Production_Protocol.md` | `0f9f3341e9b6743ee9240b98d18c9ea67ae5affa455c59befb545aaa99c5f141` | `077ab9f85595e438b2a38efb15421fae02ab861572a591cf050a69da138359ce` | 实质漂移：现行 §11.2 已含 §2.5「长期资源/获取方法/尝试证据」KAD1-A 补核 |
| `specs/data-production/method-binding-contract.json` | `f3f887c9190b310d2bb066d17a9bec720ce7902fd7b93eda935d5a98ae3ba4e4` | `9fdbf0e6560d76675e600700898884e723fe36d078aa9d4632dbf9f88f222702` | 实质漂移：新增 `stage_d00`、`m5_isolated_binding`、`formal_br_policy`、`validation` |
| `specs/data-production/production-registry.json` | `8bcaaac947c49b86651646da309db1f8641345ac0e7ee4541ccb0dc99055c961` | `d26219b6579196dd27c369dd1ecd4a0ab9d80f2f0eed1ae4eb063665cf2c2eb8` | **危险漂移**：D00 Job 已从「未激活」变为「M5 本地隔离已授权」 |
| `specs/DATA_CONTRACT.md` | `db92892ca5b5c4813e436e7935c55042a0f006105df41bb4604b8c24749dcc27` | `a92ff9d06a98b0ec89a5e3c01edfdd7426b9652f38142b80ff210cf123047628` | 现行已具备包所需封套语义（见 §5） |
| Y01—Y08 **V1.0** 原文 `de303d3e51d9fe4e04fdea4ac084d364139c8080405a61741adae9e4128c879c` | 包称其为“当前来源” | **云端仓库中不存在该文件** | 所以接收 V1.1 实为“新建文件”，不是包表述的“受控升级” |
| `specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md` | `a41290a731280eac51656da21bdcaceda58666718f4c44659c06ca4b126fa0ac` | `a41290a731280eac51656da21bdcaceda58666718f4c44659c06ca4b126fa0ac` | **一致**，G0 侧未漂移 |
| D01 C01—C08 规范 `specs/data-production/standards/d01/规范_P1_C01-C08载体与复合材料专业读取.md` | 包引用 `52ed78d4b67f75259fcd94df67100ea1e2bf5bf3225fdd56d5dd7f8fe41df185` | `8fc9c75e73829e831ae8bb54a89d3504b673d91563469e97be975ed4bff38c7a` | 漂移 |

**包以为“D00 五份旧规范与 Library 一致”，实测仓库内五份也各有差异：**

| 文件 | 仓库实测 SHA256 |
|---|---|
| `standards/d00/主规_P0_D00机制总规_最终版.md` | `86acb63250fe6e2701bbb422d742550daacdc9d9012989a8a20ee20f3038c4fa` |
| `standards/d00/契约_P0.3_新L0_G0与D01交接_最终版.md` | `a502704da26930baaad5209eff397da34d1b04ab415f897c32a610addb5c5d9a` |
| `standards/d00/规范_P0.1_资源发现与获取方法体系_最终版.md` | `3a43f5c4843669128decf33db986eee580455f2442973b8ff34c16a49677e00b` |
| `standards/d00/规范_P0.2_来源身份版本权利与依赖_最终版.md` | `221f186eec1d32364db1e77fc3099defebaf56fe7f0a1e4271db37a9dca40c28` |
| `standards/d00/规范_P0_长期资源与获取方法维护_最终版.md` | `1144fc6d331a98e8efc10eac9f043e9ff057fca8daec15d09b4409b07bd1a712` |

**既有系统性问题（非本包造成，但会误导外部设计方）：** `method-binding-contract.json` 中 C/H/W/A/P 的 `method_version` 全部写为 `source-sha256:<某哈希>`，而这些哈希与当前规范文件实测值普遍不符（例：D02 规范实测 `5467f0f4…`，Binding 写 `bdc4a8f1…`；D01 C 规范实测 `8fc9c75e…`，Binding 写 `52ed78d4…`）。全仓代码中没有任何运行时校验该哈希（`grep 'source-sha256|method_version'` 在 `*.mjs/*.ts/*.js` 命中仅一处注释性用法）。**结论：`method_version` 目前是文档字段，不是运行约束。** 因此“SHA 不一致即 HOLD”只能严格用于新增的 8 条 Y，不能反过来要求改动既有 63 条。

---

## 4｜Y01—Y08 在真实工程中的现状

| 方法 | 现状判定 | 事实依据 |
|---|---|---|
| Y01 来源需求与存量缺口 | **未实现** | 无 `source_need` 任何落点；`source.sources` 承载不了“覆盖维度/缺口/复用决定” |
| Y02 机构集合与多渠道发现 | **仅登记层** | `specs/data-production/source-providers.json`、`acquisition-intents.json` 存在；Protocol §2.5 已明确二者**不等于**可持续扩展的资源总目录/获取方法目录/尝试日志 |
| Y03 时空异名与跨语言扩展 | **未实现** | 无 QueryCluster / 扩展证据结构 |
| Y04 聚合目录原机构回溯 | **未实现** | 无 OriginalProviderTrace / holding 回溯结构 |
| Y05 来源对象、版本与依赖鉴别 | **部分具备** | `source.sources`（provider/title/source_type/carrier_type/rights/original_locator/scope/provenance_status/content_availability）、`source.source_versions`（checksum_sha256/retrieved_at/metadata/rights_snapshot 不可变）、`source.raw_items`（append-only，触发器 `source.forbid_raw_mutation`）；**缺** Work→Edition→Holding→DigitalAsset 分层与 dependency 边 |
| Y06 资源价值互补与优先级 | **未实现** | 无优先级决策回执结构 |
| Y07 合法获取方案与协议路径组合 | **未受控** | 存在真实抓取脚本 `tools/fetch-shl-original.mjs`、`tools/fetch-naj-page.py`、`tools/fetch-naj-pdf.py`、`tools/land-shl-original.mjs`；但**没有** `ACQUISITION_METHOD:Mxxxx@version` 登记表，也**没有**不可变 Attempt 追加日志（迁移文件中检索 `acquisition/attempt` 仅命中无关列名） |
| Y08 来源资产完整性与取得证据鉴定 | **已实现，但为窄版** | `pipelines/data-production/adapters/private-evidence-adapters.mjs` 的 D00 适配器 + `workers/private-evidence-stage.mjs` 的 `verifySourceIntake`：核原始字节、SHA256、byte_size、来源版本、raw_item、权利 → 产出 `qualification='UNASSESSED'` 的 G0 候选 → 只提交 `control.gate_candidates`，适配器内注释明确“PASS 只是生产者完成，绝不是已签 G0”。**缺**：取得范围分母、缺失部件、官方校验值比对、原始/预览/派生区分、等价远程资产指针 |

**一句话**：八法里只有 Y08 有真实代码，且是“单件/单页图片”形态；Y07 有零散脚本但无受控台账；Y01—Y06 全为空白。云端仓库中**不存在任何 Y 方法正文**（检索 `### Y0[1-8]`、`Y01—Y08`、`Y方法` 均无命中）。

**与既有 MAB 计划的关系（重要，用于判断这是否“新增范围”）：** `tasks/implementation/MAB/PLAN.md` §3.3「施工要求」已明确写：*“D00 通用来源获取必须从来源意图/Provider/Work/Version/Holding/Digital Asset/获取尝试连到真实原件、SHA、权利和 L0/G0；不得固定金泽样板。”* 也就是说，**Y01—Y08 所要求的能力在既有计划里本就是硬要求**，接收这 8 条方法是对既有计划要求的显式化与补齐，而不是新开范围。反过来讲，目前只跑通“金泽单页图片”这一条窄链，按现行计划口径属“固定样板”，尚未满足 D00 通用性要求。

> 阅读提示：`PLAN.md` §3.3 中“Registry 仍关闭／仍指向旧 layer1-adapters”（第 262 行）是 M3 退出时的历史缺口记录，与当前 `main` 状态不符（现为 enabled=true、绑定 private-evidence-adapters），外部设计方不要把它当作现状。

---

## 5｜L0 / G0 / D01 接口核查

### 5.1 L0（可承载基础资产，缺辅助类型落点）
- 已有：`source.sources` / `source.source_versions` / `source.raw_items` 三件套；`rights_by_action`、`rights_evidence`（`20261108110000_mab_m5_source_rights_actions.sql` 新增，空=unknown=HOLD，禁止推断回填）；`rights_snapshot` 登记后不可变（触发器 `source.forbid_rights_snapshot_mutation`）。
- 缺：`source_need`、目录候选（`source_candidate`）、`search_trace`、`acquisition_attempt`、`source_dependency` 均无落点。包内给出的处置是 `DESIGN_BINDING_PENDING`，与现状一致——**不得为此临时造表**。

### 5.2 G0（唯一真阻塞点）
- 现行 G0 机器合同的 `GateReviewRequest` 字段为：`request_id, run_id, stage, gate_code, artifact_ref(type/id/revision), producer_method_id/version, definition_ref, input_hashes, output_hash, source_refs, lineage_refs, evidence_refs, purpose, allowed_scope, consumer, dependency_snapshot, ruleset_version, requested_at, requester_identity`。
  **有 `consumer`，没有 `consumer_method_plan_ref`，也没有任何字段能声明“D01 将使用哪个 Cxx@version”。**
- 运行侧同样缺：`packages/data-access/src/data-production-repository.mjs` 的 `recordGate()` 写入 `control.gate_candidates` 的列固定为 `run_id, stage, gate_code, object_type, object_id, artifact_revision, purpose_namespace, purpose_code, purpose_version, allowed_scope, consumer, dependency_snapshot, evidence_refs, input_fingerprint, candidate_status`，**无消费者方法版本**。
- 因此包 §8.3「D01 先预选 C 方法 → G0 按预选计划审 → 正式读取」**当前无法无损表达**。按包自身场景 T19 的规则，此情形应为 **G0 HOLD**，不得报“已联通”。
- 可行的最小承载（待 Owner 裁）：在 `evidence_refs` 内放类型化引用 `{type:'consumer_method_plan', id, revision, method:"Cxx@v"}` 并由机器评审器强制校验存在性与版本匹配（零 DDL）；若验证证明装不下，才讨论 `gate_candidates` 加列（属 Gate Owner 的 DDL 与合同修订）。

### 5.3 D01（合同不需改，运行缺一条校验）
- `pipelines/data-production/orchestrator/contracts.mjs` 中 D00 的输出名为 **`qualified_source`**；而 Registry、`DATA_CONTRACT`、包内十类映射均写作 **`source_asset`**。这是**既有命名分叉**，包未提及；接十类映射前必须先给出“同义别名”的书面决议，否则会造出第二个类型名。
- D01 私有适配器当前只校验“签名 stage request + 当前有效 G0”，**不比对 C 方法版本与 G0 记录是否一致**。补该校验属 D01 代码施工，本轮按要求未动。

### 5.4 DATA_CONTRACT（包以为要改，其实已满足）
现行 `specs/DATA_CONTRACT.md` §4 已规定 stage result 必须显式区分 `produced_refs / qualification_refs / eligible_handoff_refs / blocked_refs / control_events`，§2 已规定 `artifact_ref.type/id/revision` 封套。这正是十类映射所需的承载方式，**无需为 D00 修改 DATA_CONTRACT**。

### 5.5 权利侧（包以为要新增，其实已具备）
`packages/data-access/src/rights-actions.mjs` 的九动作集已覆盖 V1.1 §8.2 的全部要求：`access_view / machine_read / retain / download / quote / display / adapt / redistribute / external_processing`；G0 必检 `machine_read`，需留副本时叠加 `retain`；取值集为 `allowed / denied / unknown / restricted`，空/缺失一律等价 unknown 并 HOLD，且代码中**没有任何推断放行分支**（Owner 2026-11-08 裁定）。**不需要新增动作名或新词表。**

> 需注意的两处既有措辞不一致：① Protocol §13 正文写 `public_display`，代码词典用 `display`；② `studio.asset_revisions.rights_by_action` 的默认值仍是 KAD 六动作（`read/quote/display/download/adapt/external_processing`），其中 `read` 在代码词典里叫 `access_view`。重写 D00 方法文本时请统一使用 `packages/data-access/src/rights-actions.mjs` 的九动作名，不要引入第三种写法。

---

## 6｜与现行合同冲突清单（8 条，全部实测）

1. **Binding 自我表述冲突**：现文件 `stage_d00` 写明「D00 由来源标准治理，不计入 C/H/W/A/P，`method_count=63`」，`m5_isolated_binding.note` 亦写「D00 不是 C/H/W/A/P 方法绑定」。包要求把 8 条 Y 计入并变 71。必须在同一文件内显式改述，否则文件自相矛盾。
2. **Registry 增量会导致 M5 回退**：包内 Job 为 `enabled=false` + `adapter_binding=pipelines/data-production/adapters/layer1-adapters.mjs` + `gate_reviewer_binding=TO_VERIFY_IN_M0`；当前 `main` 实际为 `execution_policy.enabled=true`、`adapter_binding=private-evidence-adapters.mjs`、`gate_reviewer_binding=m5-owner-reviewer-g0g1-producer`、`activation={enabled:true, reason:"M5 isolated local activation (MAB step 2 batch C): owner-authorized remediation scope on the local isolated database, D00-D05 enabled via the bound private-evidence adapters and the local execution authorizer; production deployment is not authorized by this status."}`。该 Job 的 `methods` 当前为空数组。**照抄即关闭当前可用的隔离联调链路。**
3. **Protocol §11.2 语义相反**：现行 §11.2「2.1 三个专业方法的完整责任」仍把 P0.1 / P0.2 / P0.3 并列为三个专业方法；包要求 P0.x 不再计为 METHOD，Y01—Y08 为唯一方法集。
4. **G0 装不下 C 方法预选**：见 §5.2，属包内自认的 HOLD 条件。
5. **Skill 文件过期且越权**：`skills/mohen-source-intake/SKILL.md` 仍写 `Stage: D01`、`Canonical Entry: pipelines/data-production/executors/d01-source-intake.mjs`、`Write Scope` 含 `G0 audit records`，并写“Run G0 Source Gate”。这同时冲突于 MHKA-04（D00 为 owner）与“G0 由独立 Reviewer 签发”。而包的 8 条绑定 `method_owner_skill=mohen-source-intake`，会让这个旧文件成为隐藏前提。
6. **命名分叉**：`qualified_source`（运行合同）vs `source_asset`（Registry / DATA_CONTRACT / 包内映射）。
7. **包的最小差异表漏项**：`specs/data-production/identifier-registry.json` 的 `professional_methods` 只列 63 项（`C01—C08/H01—H25/W01—W10/A01—A12/P01—P08`），包未把它列入受控目标。不补则 Y 在“唯一 ID 命名空间”中属未登记状态。
8. **M6 分母不一致**：`tasks/implementation/MAB/PLAN.md` CP4.3 写“63 方法”作为回归分母；接收 8 条 Y 后须改 71，否则 M6 证据分母失真。

**另有两处包表述与事实不符（需在重写版修正）：**
- 包称“从 V1.0 受控升级为 V1.1”，实际云端仓库无 V1.0 文件，接收动作应为**新建**；
- 包称“会保留 `activation=false`”，实际当前 `activation.enabled=true`（M5 隔离授权）。

**另有一处代码注释陈旧（仅提示，不构成本次判定依据）：** `pipelines/data-production/adapters/private-evidence-adapters.mjs` 第 4 行仍写 “Registry is still disabled until independent gates”，而 Registry 现为 `enabled=true`。外部设计方不应把这类注释当成当前状态。

---

## 7｜最小实施差异清单

### D00-A｜纯文档与元数据（不改运行行为，建议先做）
1. 新建 `specs/data-production/standards/d00/规范_P0_Y01-Y08来源探寻与合法获取专业方法_V1.1.md`（原样接收，SHA 锁 `17a7a12b…`），**不动现有五份 d00 规范**。
2. `specs/data-production/method-binding-contract.json`：仅追加 8 条 Y；`method_count` 63→71；`stage_d00` 补一句“Y01—Y08 为 D00 方法集，C/H/W/A/P 63 条不变”；其余 63 条逐条比对字节不变。
3. `specs/data-production/identifier-registry.json`：`professional_methods` 追加 `Y01—Y08`。
4. `specs/data-production/production-registry.json`：**只**填 `jobs[d00.source-intake].methods = [Y01..Y08]` 并加 `method_design_note`；**禁止**改动 `execution_policy.enabled`、`adapter_binding`、`gate_reviewer_binding`、`activation`、D01—D05 的 Job。
5. `specs/data-production/MoHen_Data_Production_Protocol.md` §11.2：仅改 2.1 的表头表述 + 追加 6 条 Y 接口语义（对应 V1.1 §8.1—§8.3 精简版）；§2.2—§2.5 与 §11.3 及其后一字不动。
6. `skills/mohen-source-intake/SKILL.md`：最小订正 `Stage → D00`、`Canonical Entry → d00-source-intake.mjs`、`Write Scope` 去掉 Gate 审计写权。

### D00-B｜G0 承载 C 方法预选（需单独裁决）
7. 首选零 DDL：`evidence_refs` 内类型化引用 + 机器评审器强制校验；否则才考虑 `gate_candidates` 加列。在此之前 D00→D01 的预选链路一律记 `HOLD`。

### D00-C｜后续批次（不属本增量）
8. Y01—Y06 的持久化落点、Y07 的不可变 Attempt 台账、Y08 的范围/缺损字段。均需字段级迁移授权，必须单独立项，不得夹带在文档批内。

---

## 8｜可复用代码与资产（不要重写）

| 能力 | 现成资产 |
|---|---|
| Y08 事实核验 | `pipelines/data-production/workers/private-evidence-stage.mjs`（`verifySourceIntake`）＋ `pipelines/data-production/adapters/private-evidence-adapters.mjs`（产出 UNASSESSED 候选，不写 Gate） |
| 逐动作权利判定 | `packages/data-access/src/rights-actions.mjs`（九动作、空=HOLD、无推断放行）|
| G0 候选提交 | `packages/data-access/src/data-production-repository.mjs`（`recordGate` 只写 `control.gate_candidates`） |
| 独立签发分离 | `tools/rule-gate-reviewer.mjs`、`tools/machine-reviewer-session.mjs`、`tools/owner-sign-g0.mjs`、`tools/provision-3-gate-authority.mjs` |
| 验证范式 | `tools/verify-3-gate-chain.mjs`、`tools/verify-2-a-scanned-page.mjs`、`tools/verify-6-asset-backlinks.mjs`、`tools/check-env-parity.mjs` |
| 本地放行授权 | `tools/local-execution-authorizer.mjs`（`enable_requires` 的证据链，非签名自报） |
| Y07 技术路径实现 | `tools/fetch-shl-original.mjs`、`tools/fetch-naj-page.py`、`tools/fetch-naj-pdf.py`、`tools/land-shl-original.mjs`（须先登记 `Mxxxx@version` 才算 Y07 受控路径） |
| 阶段执行骨架 | `pipelines/data-production/executors/create-stage-executor.mjs`、`pipelines/data-production/orchestrator/contracts.mjs`（加 Y 无需改骨架） |

---

## 9｜建议接入批次

- **不要在当前施工窗口并入**：当前处于 CP4.2（M5 维度 6—8），QR-07 已收口、下一步 QR-06；现在改共享文件会让既有全量测试基线（172/172、638 passed / 2 skipped、类型检查全绿）与 Gate 链证据失效。
- **建议窗口**：QR-06 收口后、CP4.3（M6 全量回归）开工前插入 D00-A 文档批。原因：M6 回归分母“63 方法”在接收后变 71，晚于 M6 修改会导致整轮证据重跑。
- D00-B / D00-C 不排入 M5/M6，按 Owner 单独授权的时间点执行。

---

## 10｜验证要求（D00-A 准出条件）

1. **结构**：8 条 Y 的 `definition.source_sha256` 必须等于 V1.1 文件实测 SHA；ID 唯一；`stage=D00`、`layer=L0`、`independent_gate=G0`、`may_grant_gate=false`。
2. **零回归（逐字节）**：原 63 条方法条目内容不变（允许顺序变化但须显式声明）；D01—D05 的 Job 子树完全一致；Registry 的 `activation`、`execution_policy`、`adapter_binding`、`gate_reviewer_binding` 与改动前完全一致。
3. **语义**：`node tools/verify-3-gate-chain.mjs` 结果不得劣于接收前基线（接收前实测为 7 项有效资格、0 项无效）；`node tools/verify-2-a-scanned-page.mjs` 仍 PASS；`node tools/check-env-parity.mjs` 不新增 FAIL。以上三项须在改动前后各跑一次并留存输出。
4. **防伪负向**：Y 不得新增任何 Gate 写权限（Producer 身份签 G0 仍被拒）；Y01—Y06 输出不得写 `raw_items`；仅 `content_availability='catalog_only'` 的线索不得生成 D01 请求。
5. **全量**：`tests/data-production/**`、`vitest.unit`、`pnpm -r typecheck` 不退化。接收前的最近一次记录为 172/172、638 passed / 2 skipped、类型检查全绿；实施前请以实际重跑结果为准，不以本报告数字代替。
6. **文档一致性**：`identifier-registry` 与 Binding 的 Y 集一致；Protocol §11.2 与 V1.1 §8 引用一致；Skill 与 D00 边界一致。
7. **环境**：本批不产生任何 DDL；本地 `mohen_dev` 与生产库差异继续按既有 GAP 清单登记，不得粉饰。

---

## 11｜给外部设计方（ChatGPT）的重写要求与边界

1. **基线必须重取**：以上表 §3 中“当前 `main` 实测 SHA256”为唯一基线；不得再引用 Library 镜像哈希作为“当前值”。若仓库在重写时又前进，需重新计算并以新值为准。
2. **不得整文件覆盖**：`Protocol`、`method-binding-contract.json`、`production-registry.json`、`DATA_CONTRACT` 只能给“逐条差异 + 落点位置”，不得给整份副本。
3. **不得改 D01—D05**：包括 §11.3 及以后、D01 五份规范、C 方法条目、G1—G5 任何语义。
4. **不得打断 M5**：任何会改变 `activation`、`execution_policy.enabled`、适配器绑定、`gate_reviewer_binding` 的增量都必须显式标注“禁止并入”。
5. **必须写明“新建而非升级”**：云端无 Y V1.0；V1.1 是新建文件。
6. **必须补 `identifier-registry.json`**（包当前漏项），并把 `qualified_source` / `source_asset` 的别名关系写清。
7. **必须区分五级证据口径**：代码存在（`CODE_PRESENT`）、隔离测试通过（`VERIFIED_ISOLATED`）、真实环境通过（`VERIFIED_LIVE`）、生产实况、Owner 体验签收。不得用设计自洽替代运行证据。
8. **Facts 不可由设计推断**：数据库表是否存在、迁移是否落地、原件是否真实存在、Gate 是否已签，均须以实际执行与执行环境为准；只有仓库文件与哈希可由读云端仓库确认。

---

## 12｜本次核验所用命令（可复现）

```powershell
# 仓库一致性
git rev-parse HEAD
git rev-parse origin/main
git rev-list --left-right --count HEAD...origin/main
git status --porcelain
git stash list
git log -1 --format="%ci %h %s"

# 目标文件哈希
Get-FileHash <file> -Algorithm SHA256   # 逐文件对 §3 表

# 交付包完整性
Get-FileHash "<包>/02_REPO_TARGET_D00_ONLY/specs/data-production/standards/d00/规范_P0_Y01-Y08…V1.1.md" -Algorithm SHA256
# 包内 SHA256SUMS.txt 逐行比对 → 0 处不符

# 现状取证
# · method-binding-contract.json 结构与方法清单（63 条，无 Y）
# · production-registry.json 的 d00.source-intake 与 activation
# · Protocol §11.2 正文（三 P0 方法并列）
# · G0 合同 §GateReviewRequest 字段
# · data-production-repository.mjs recordGate 写入列
# · rights-actions.mjs 九动作
# · 迁移文件检索 acquisition/attempt（无台账表）
# · 全仓检索 "### Y0[1-8]" / "Y01—Y08" / "Y方法"（无命中）
```

---

**报告状态**：`READ_ONLY_AUDIT_COMPLETE / NO_REPOSITORY_CHANGE / NO_DB_CHANGE / NO_GATE_ACTION`
**待 Owner 决定**：① 是否按“D00-A 只做文档与元数据、绝不动 enabled/适配器/Gate 绑定”的口径接收；② C 方法预选采用 `evidence_refs` 类型化引用（零 DDL）、`gate_candidates` 加列（改 Gate 合同），或整体 HOLD。
