# M5 HP07／HP11／HP12｜精确作品资格桥与13类资产隔离验收

日期：2026-11-05（北京时间）。基准：`a38190ac5526beea154b2b85edcc2b8a61bb0a25`。本批源码SHA与GitHub实测回执在末节逐项追加，不把文档提交当源码或运行证明。

**裁定：仅本批工程子项；M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。** MHKA/KAD6、原M0—M8、原HP分母、既有M1—M4条件、原独立G0—G5及全部最终验收不变。无生产迁移、正式签审/开关激活、私有资料外发或付费模型调用。导演CAS与fork/restore源码继承，不重做功能；综合HTTP套件自然回归原用例。

## 1. 现场与失败根因

- 初始本地干净`work@759dbbd`不是实时main。先执行`git fetch origin`，默认refspec指向已不存在的`a001/production`；按指定main显式fetch，核实`origin/main=a38190a`，从它创建本地施工分支，保留旧work分支，无reset/force覆盖。
- 最新main主CI `41929766191 FAILURE`，取得原始日志确认`studio-candidate-assessment.test.mjs`超时负例预期1次authority查询、实际2次。不是G5审签失败，也不是所有历史PASS失效。
- 冻结`Date.now`、只推进定时器稳定复现RED。原逐候选核验仅比较墙钟，定时器提前/墙钟未推进时会继续下一项；补sticky `timedOut`，GREEN后不继续authority查询。不是放宽deadline或删除断言。既有ReceiveCandidate的修复直接继承，本次只修新证据涉及的assessment。

## 2. 源码实现与权威边界

`packages/data-access/src/work-qualification-reader.mjs`只读既有`publication.work_revisions`、`control.gate_audits`、`qualification_current`、`gate_policy_versions`与原`qualification_allows`；不新建表、Gate、签审服务、正文或Writer。

服务端显式配置consumer/purpose/非空scope后，读取者必须同时核验：

1. 精确work_id/revision_id及持久JSONB内容；冻结输入后计算递归键排序JSON的SHA256，数组次序保留。
2. 当前独立G5本身指向六种合法L5之一；原资格函数重算真实物理artifact revision并核全部依赖闭包、当前指针、Reviewer/policy/有效期和撤销。
3. **独立签审的不可改receipt.details.work_revision_binding**绑定schema、work/rev、content_sha256、title、description、complete_work、精确consumer/purpose/scope、动作权利及rights_valid_until。签审绑定scope须与服务端scope相等，不能以较小scope取巧。
4. 原G5 policy.required_checks必须包含`work_revision_binding`与`rights_by_operation`，签审checks均须true。普通G5 PASS、Producer回执、作品审核或作者自报qualification_refs均不能授予整稿许可。
5. WATCH/visual_stage取display，Agent取内部read，Evidence取quote；这些动作不授download/adapt/external_processing。媒体逐项要求cleared、非空license及未过期，且独立整稿摘要与动作权利覆盖相同持久content。

权威映射来自独立当前G5审计本身（object_type/object_id/artifact_revision与签审绑定），不从作者qualification_refs制造资格，也不要求作者在尚未签发时预知未来gate_audit_id造成循环摘要。正式Reviewer、专业检查和生产policy启用仍需原授权；本批未修改Gate签发器或正式策略。

Web发布与WATCH逐请求接入该reader；无server context、无签审绑定、无权利、损坏/不可读服务均返回原`independent_g5_required`。没有为历史指针补签。公开API wire与no-store保持。

## 3. PG／HTTP的实际覆盖及不能扩大部分

- 四消费者真实PG：持久WorkRevision、真实G0→G5、精确purpose/scope/consumer、无绑定拒绝、错work/revision/content、签审wrong hash/title/description/complete-work、unknown动作权利、过期权利、服务不可用、真实L5物理换版、通用G5 policy不足、祖先撤销即时拒绝。
- WATCH真实Next HTTP：同一作品目录/详情/program/share可读；祖先撤销后即404/目录移除、no-store。其它三个消费者本批为真实PG reader，**不是三个各自产品HTTP入口的E2E**。
- ST08/ST09：通过原HTTP提交精确版本，Operator不能代作品Reviewer，错版审核拒绝，另一真实登录的作品Reviewer审核后Operator可发布，发布指针为同rev；祖先撤销后WATCH拒绝，运营撤回保留作品修订。所有身份、资料和专业检查均为隔离合成fixture，不是正式Reviewer资格。
- 十类私人候选逐类PG/HTTP：research_brief/source_anchor/reading_note/evidence_note/spacetime_candidate/relation_hypothesis/humanistic_insight/research_collection/citation_snapshot/consented_feedback，各自save→二修订→旧版回读/history，精确来源/依赖保留；跨Owner读/写拒绝，WORKING/RESTRICTED/UNKNOWN_DEPENDENCY/UNASSESSED、动作rights=unknown、formal_l_refs=[]。
- 三类canonical对象director_plan/media_selection/work_revision逐类确认通用save拒绝，不生成第二份正文。导演与作品规范入口沿用此前成功证据；**媒资规范业务与13类完整专业语义不能由通用拒写测试核销**。
- use_events逐资产逐精确rev私有可见、另一rev/另一Owner不可见；Admin真实浏览器查看本人项目具体条目、来源依赖、历史修订、动作权利；切换旧/当前rev对应0/1条实际事件，不把保存或记录事件称作复用许可。

## 4. 仍未关闭条件及下一施工

| 项目 | 当前边界／下一证据 | 原责任及阻断 |
|---|---|---|
| 正式生产与专业G5 | 生产schema/专用最小身份/TLS/policy/Reviewer和真实来源逐阶段审签未授权/未验；不启用本批消费context | M1-C01—C04、M2-C01—C03、M3-C01—C03原责任及最迟点不变，正式公开/生产继续HOLD |
| 三其它消费者HTTP | 逐真实产品入口接收同WorkRevision绑定、用途/权利及撤销；本批不能把reader PASS写成E2E | 原HP07/HP12、M5对应消费启用前 |
| 六L5映射矩阵 | 本批绑定正例为story_seed；其余五类实际fingerprint逐类绑定尚缺 | 原HP07/HP12；不泛签所有L5 |
| 13类专业业务 | 10+3是持久/身份/默认不晋级矩阵；真实来源合法解引用、跨项目复用、反馈同意撤回、canonical媒资动作权利仍须完整业务验收 | M4-C04/HP11原责任，正式复用/对应启用前 |
| ST01—09完整业务 | 本批补ST08/09隔离业务，并继承ST05—08局部；ST01—04真实研究/跨L/正式ProductionRequest、真实混合和全部H1/H2/H3/19组件体验未全验 | M4-C01—C04、M5原标准，不签九动作整体PASS |
| Storage/Provider | 本批官方Storage配置缺失应SKIP；真实Provider/资料外发/收费、双课题与M6—M8均未验 | Owner原授权条件与预算不变 |
| 默认测试入口 | `node scripts/test-isolated.mjs`实跑因缺`.env.local`失败；该入口还依赖历史Windows快照工具，不冒称全仓默认test PASS | 沿用原已知环境限制；不连接生产快照来造测试 |

独立代码review未发现Critical/Important；minor延后两项：三个消费者各自HTTP入口、其余五种L5逐类绑定正反，均已具名保留，不能从验收分母消失。

Ruling：只在原独立签审receipt增加被只读者要求的整稿/权利绑定；不修改正式Gate或专业标准，不将作者ref当可信映射。缺授权/证据时继续HOLD，代价是作品暂不可公开，不会授予额外权限或费用。

## 5. 回滚与验证记录

- 本批无生产DDL，回滚不涉及数据删除。撤销新server context或恢复资格桥为原失败关闭即可扣留新消费；保留原稿、历史修订、审查与审计。不得恢复旧published/legacy PASS旁路。
- Admin回退仅撤历史查看控件，不改资产/事件；逐候选超时修复不能恢复过期继续查询。
- 测试仅标记本地一次性PG17，结束drop测试数据库。角色变更按既有安全触发器撤销旧会话，HTTP测试必须重新登录，不关闭撤销守卫。
- 本地依赖最初缺AJV，按锁文件pnpm9.15.4恢复；旧HTTP失败为测试客户端路径不符、Playwright CJS导入ESM、嵌套Admin locator和角色变更后旧会话401，均保留实际日志并定向修正测试，不改安全策略/资格断言。

实际源码SHA、全套本地结果、GitHub CI/PG/HTTP及证据hash清单待下方追加；未取得前一律PENDING。

### 5.1 最终本地源码与实际结果

源码：`ff5283ea8a719f69d37eee4ff4e8a1d4c5e4738e`。

| 实际命令/环境 | 结果 |
|---|---|
| CI=true vitest.unit.config.ts 全套 | 432 PASS / 4既有实网SKIP，68文件；不是默认test入口PASS |
| node --test --experimental-test-isolation=none tests/data-production/*.test.mjs | 133 PASS / 0 SKIP；首次沙箱localhost监听EPERM后用受支持权限执行 |
| 六工作区各自tsc --noEmit -p | 全PASS；绕开环境默认pnpm11误入home store，源码/锁文件未变 |
| MOHEN_TEST_SOCKET=/workspace/mab-m5-pg node scripts/test-k3-db.mjs | 最终全套exit0，MAB_WORK_G5_BINDING_POS_NEG_PASS/REVOKED_PASS、10类PRIVATE/3类CANONICAL标记及K3_DB_TEST_PASS；原711 synthetic legacy未变，迁移重复/rollback失败关闭通过 |
| node scripts/test-mab-http.mjs，真实Next生产构建＋本地Chromium | 最终15 PASS / 1官方Storage缺配置SKIP，MAB_ST08_ST09_HTTP_PASS、MAB_WORK_G5_HTTP_PASS、MAB_ADMIN_EXACT_REVISION_HTTP_PASS、MAB_HTTP_BROWSER_PASS；一次性数据库清除 |
| auth107路由／85API+152动作静态追溯 | auth缺口0；K3_TRACEABILITY_OK。仅静态分母，不升级运行验收 |
| 74目标审计 | errors=[]；74语义仍未全核销。kad1-policy已适配，当前字节不再冒称冻结目标完全相同；M0历史列不覆盖 |

GitHub源码push及三条Actions结果取得后续记，不能用本地成功冒称远端PASS。

### 5.2 第一源码提交的GitHub实际回执（保留失败）

`ff5283ea8a719f69d37eee4ff4e8a1d4c5e4738e`已普通快进落main：

- [隔离PG17 41932575876](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41932575876)：SUCCESS。
- [真实Next/HTTP/Chromium 41932576000](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41932576000)：SUCCESS，15 PASS/1Storage缺配置SKIP；实际业务标记与清除日志已下载。
- [主CI 41932575992](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41932575992)：**FAILURE**；类型/单测/边界/构建已通过，失败步骤为74目标审计`HANDOFF_DECLARED_SHA256_MISMATCH`：源码kad1-policy已适配，但旧差异账仍声明SHA256_BYTES_MATCHED。工程将差异账留到证据提交造成该次失败，不能写成源测全SUCCESS。原位将该行如实改为ADAPTED_CURRENT_RUNTIME_NOT_FROZEN_BYTES；未修改冻结目标或审计逻辑，M0历史不变，本地审计errors=[]。修复提交与新CI须另核，不覆盖旧失败。

原始run JSON及失败/成功日志保存同名evidence；下一批继续补六L5/媒体及实际应用wrapper的隔离证据，不借已有story_seed正例签全部六类。

## 6. 沿原M5继续补证：六类L5、媒体与实际应用wrapper（优先于上文首批局限）

首批远端PG/HTTP运行期间继续完成可独立执行的缺口；本节不是新计划或新Gate。**不修改生产reader/Gate/策略代码**，只参数化合成fixture、接入原PG脚本/Actions与真实应用集成测试。

最终本地`work-g5-facets.integration.mjs`和原PG17全套exit0：

- `world_projection / agent_context / story_seed / discovery_path / map_timeline_projection / evidence_pointer`六类逐一实际持久化、取得真实物理指纹、独立G0→G5；四消费者每类正例均PASS，修改对应物理行generated_at改变artifact revision后逐消费者拒绝，祖先撤销后仍拒绝，WorkRevision保留。原先“仅story_seed/另五类未验”这一**PG绑定测试缺口关闭**，不授正式专业许可。
- 另用已独立签审的整稿媒体分别验证空license、rights unknown、已过期媒体四消费者拒绝；cleared+license+未过期且签审动作允许的精确整稿四消费者PASS。该合成媒体许可不代表真实素材版权已取得。
- `vitest.work-binding-db.config.ts`调用**真实应用**`requireCurrentWorkConsumerQualification`，不是同名测试替身；四消费者精确work/rev正例、错rev、内容篡改、server scope错配、server context缺失，以及出版必须WATCH分面均在实际PG通过，标记`MAB_WORK_APPLICATION_WRAPPER_PG_PASS`。其它三消费者各自产品HTTP仍未证，不能借wrapper PG扩大为HTTP。
- 共享fixture参数化后，真实Next/Chromium完整HTTP重新15PASS/1Storage缺配置SKIP，ST08/ST09、Admin历史事件和撤权标记仍在；全PG重复/rollback和711 legacy保全继续PASS。

原review两个minor中，六L5的逐类PG范围已通过本节补证关闭；三个消费者各自HTTP保留。13类完整专业语义、反馈同意撤回、合法解引用与跨题复用、canonical媒资、ST01—04与完整19组件、全部生产最小身份/Reviewer及M6—M8仍未关闭。本节不能作为这些条件的替代证据。

六类测试文件/fixture/配置均加入现有PG/HTTP workflow路径触发，沿用相同隔离标记、唯一Runner/资格服务。最终GitHub补证源码SHA和Actions取得后追加；first-source失败不改写。

### 6.1 补证提交与当前远端核证

补证源码/测试/差异账修正：`3929d9df7496fc883c684304f19c1908977b7982`，已普通快进推main，未force。正式reader/Gate业务代码继续为`ff5283e`，本提交增加六类/媒体/真实应用wrapper测试、workflow触发及原位账证；不把文档源码行数当新产品能力。

- 主CI：41933637116（SUCCESS_VERIFIED_3929D9D）。
- 隔离PG17：41933636834（SUCCESS_VERIFIED_3929D9D）。
- 真实HTTP/Chromium：41933636716（SUCCESS_VERIFIED_3929D9D）。

本地最终PG包含六个`MAB_WORK_L5_FACET_PASS`、`MAB_WORK_MEDIA_RIGHTS_PASS`、`MAB_WORK_APPLICATION_WRAPPER_PG_PASS`及完整K3_DB_TEST_PASS。HTTP共享fixture复验仍15PASS/1StorageSKIP。只读确认本地标记实例的`mohen_k3_*_test`数据库为0后，已移除本会话创建的mohen-m5-pg17；未触及生产。原始日志按Git暂存blob字节生成SHA256SUMS，避免日志CRLF规范化导致证据hash不符；raw日志保留空白/终端控制字节，不以去空格改变原始测试记录。

### 6.2 最终GitHub核证（本件最高时序）

精确补证提交 **`3929d9df7496fc883c684304f19c1908977b7982`**：

| 实际运行 | 结果与原始证明 |
|---|---|
| [主CI 41933637116](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41933637116) | **SUCCESS**；类型、432单测/4原SKIP、133边界、构建、鉴权及74目标审计通过。此前first-source audit旧声明失败由本提交原位ADAPTED修正闭合，旧失败记录不删除 |
| [真实隔离PG17 41933636834](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41933636834) | **SUCCESS**；下载日志逐一确认六类MAB_WORK_L5_FACET_PASS、真实应用wrapper PG、媒体正反、K3_DB_TEST_PASS、迁移/rollback与711 legacy保全 |
| [实际Next/HTTP/Chromium 41933636716](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41933636716) | **SUCCESS**；15 PASS/1Storage缺配置SKIP，ST08/ST09、WATCH资格/祖先撤销、Admin精确历史及MAB_HTTP_BROWSER_PASS/数据库清除标记全部存在 |

**核销仅为VERIFIED_ISOLATED**：精确WorkRevision与六类真实L5/current独立G5的签审整稿/用途/范围/权利只读桥；四消费者PG/实际应用wrapper；WATCH HTTP；13类10+3私有持久与规范边界；Admin本人具体条目历史和使用史；ST08/ST09隔离业务。没有正式Reviewer/真实专业生产PASS、真实版权确认或M5整体准出。

**固定未关闭**：其它三消费者各自产品HTTP；13类完整专业语义、合法来源解引用与跨题复用、consented_feedback同意/撤回完整机制、canonical媒资运营；ST01—04/完整H1/H2/H3/19组件；正式PG/Storage/专用最小身份/Reviewer/恢复/生产context、真实Provider外发费用及双课题/M6—M8。原责任和最迟完成点继续依PLAN及M1—M4条件，不因本轮成功自动延期/关闭。

回滚依据：`a38190a`为本轮起点，`ff5283e`为业务桥源码，`3929d9d`为补证和账证修正；生产未迁移。关闭consumer context或恢复原资格拒绝即可扣留新消费；保留作品/修订/候选/审计和撤销，不恢复旧published/legacy PASS旁路。全部GitHub成功/失败run JSON、原始PG/HTTP日志与Git blob SHA256清单在同名evidence目录。后续仅文档证据提交不冒称新增源测或正式Gate许可。
