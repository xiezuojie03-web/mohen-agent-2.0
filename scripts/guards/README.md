# Data Production Guards — MHKA六阶段有效边界

> 2026-11-06｜C0—C4下已认可的六阶段D00—D05/G0—G5被MHKA继承。本目录记录守卫入口和代码契约，不定义独立Gate专业签发权；Registry当前仍禁用，代码/文档存在不等于实际放行。

## 现行唯一六阶段资格与守卫责任

| Stage | Layer | 独立Gate | 资格职责 |
| --- | --- | --- | --- |
| D00 | L0 | G0 | 来源身份/版本/真实原件/权利及指定D01操作 |
| D01 | L1 | G1 | 载体读取、原文定位、完整性与缺失范围 |
| D02 | L2 | G2 | 材料类型、声音/转引、证据化观察与依赖 |
| D03 | L3 | G3 | 历史对象/时空/关系/冲突，七项独立用途 |
| D04 | L4 | G4 | 解释边界、人文增量、反例与五项用途 |
| D05 | L5 | G5 | 可信事实/解释读模型、用途与消费者、精确血缘 |

**独立G Reviewer签发资格**；Runner、守卫、生产Stage、Skill、Operator和Agent不能自签。Guard只进行当前资格与权限检查（`ELIGIBLE/BLOCKED`），不产生正式G资格。D05的事实投影可依赖合法G3，不得为凑齐顺序伪造G4；P08是失效控制，不是第七类L5内容。

## 工程守卫及执行边界

- `check-production-registry.mjs`：校验六阶段Registry约束。
- `check-stage-handoff.mjs`：阶段交接契约。
- `check-no-legacy-production-entry.mjs`：只拒绝Registry指向旧Research/Legacy Runner，**不是全仓旧源码清理证明**。
- `check-gate-enforcement.mjs`、`check-cross-layer-write-boundary.mjs`、`check-physical-data-model.mjs`、`check-runtime-data-boundary.mjs`及对应测试：具体范围按实际代码/CI回执判定。
- 正式专业语义：`specs/data-production/MoHen_Data_Production_Protocol.md`、`specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md`、`gate-contracts.v3.json`和各`standards/d00—d05/`。

## 早期五阶段静态文档退出审查

同目录仍有`G0_SOURCE_GATE.md`、`G1_EVIDENCE_QUALITY_GATE.md`、`G2_WORLD_INTEGRITY_GATE.md`、`G3_INTERPRETATION_GATE.md`、`G4_RUNTIME_ELIGIBILITY_GATE.md`。其中旧G1“证据”/旧G2“世界”/旧G3“解释”/旧G4“发布”编号**不能再当本代G1—G4资格或测试依据**。这些文件属于`RETIRED_HISTORICAL_ONLY / DELETE_CANDIDATE`，等当前引用、CI、文档链接与合法历史证据去向核查后按原MAB清理；当前M5暂停，不执行无依据的批量删除。需要回溯史料可用Git历史及ChatGPT原始研究资料库。

**验收底线：** 旧五阶段不可继续在GitHub作为正式运行入口；六阶段Skill/Registry/Executor/独立Gate/DB和消费链经正反验证后才能称完全继承。已发现的Skill旧L/G错位和D05事实分支/混合P08配置仍HOLD，详见`specs/data-production/pipeline-internal-flows.md`§6。
