# MoHen Data Production Execution — D00–D05 only

本目录是六阶段生产主链的目标执行入口。**当前 Registry 标记为 `DESIGN_TARGET_NOT_APPLIED`，六阶段生产未获授权激活**；以下是合同要求，不是运行PASS证明。

```text
pipelines/data-production/run.mjs
  → registry / execution-authority / orchestrator
  → D00 source-intake              → L0 candidate → independent G0 → eligible D01 input
  → D01 carrier-reading            → L1 candidate → independent G1 → eligible D02 input
  → D02 material-understanding     → L2 candidate → independent G2 → eligible D03 input
  → D03 world-construction         → L3 candidate → independent G3 → eligible D04 input
  → D04 humanistic-discovery       → L4 candidate → independent G4 → eligible D05 input
  → D05 read-model-publication     → L5 candidate → independent G5 → authorized consumer
  → machine report + human review report
```

- **唯一需要继承的专业主线**：C0—C4时代经认可并完成迁移和样板验证的 `D00—D05 / L0—L5 / G0—G5`，在MHKA-00—05架构下原职责继承、规范和工程适配。保留原C/H/W/A/P及P0专业方法、版本、权限、失败与历史验收证据。
- 原来**从D01开始的五阶段生产体系**（`D01→G0 … D05→G4`、Discovery/Directed、`N01–N06` 旧生产桥）已经被六阶段取代，**不再是现行生产入口、规则权威或回退执行链**。不允许静默切回其旧runner/Registry/Skill映射。
- Stage Producer 的 `PASS` 只是阶段候选，必须由独立G0—G5按对象修订、用途、范围、消费者和当前依赖完成审核后才能向下游发放资格。Guard不能自签Gate。
- 六阶段方法、结构和权限受 `specs/data-production/MoHen_Data_Production_Protocol.md`、`specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md`、`specs/data-production/production-registry.json`、`specs/data-production/method-binding-contract.json` 及MHKA上位规范约束；不得以本README取代合同。
- `pipelines/research/`、`pipelines/legacy/` 中曾属于旧五阶段的代码仅作为待清退对象和历史证据。**清退前须逐项查真实调用方、CLI/CI依赖、测试和数据影响，验证不再提供现行能力后删除；禁止在M5暂停期间误删已施工实现。** 历史Git提交可作为可追溯证据。
- 旧 `N01–N06`、五阶段映射、旧G0–G4或旧Rule的运行资格不得因历史PASS在MHKA新架构中自动生效。
