# 墨痕 Agent 2.0 · Architecture Candidate Backlog V1.0

**状态：ACTIVE GOVERNANCE REGISTER · 非 Architecture / Plan SOT**  
**日期：2026-09-25**

## 0. 职责

本文件承接“跨 Task 有长期价值、但尚未成熟为冻结 Contract”的候选。它解决一个治理问题：**重要候选不能只留在聊天记忆中，但进入 Backlog 也不等于获得施工授权。**

候选只有在真实证据满足 Trigger 后，经过 Architect Review，并显式触发 Architecture Reconciliation 或 Plan Reconciliation，才能进入 V4.9 / Current Phase Execution Plan / Task Book。

禁止：因为候选已登记就提前改 schema、扩 Runtime、加 UI、启动 Track 或改变 CURRENT / NEXT。

---

## CAND-ARCH-001 · Evidence Perspective / Provenance Model

**状态：CANDIDATE / NOT COMMITTED**  
**来源：2026-09-25 趋势简报与架构讨论**

### 问题

现有 Evidence / Provenance 主要回答“这条判断凭什么成立”。随着 Cultural World 扩展，墨痕还可能需要回答：**这是谁留下的历史？这个叙述来自什么位置、传统或记忆机制？**

这不是为了“所有观点都一样正确”，而是为了在保持 Evidence Gate 的同时，让系统区分史料来源与叙事位置，避免把 official record、local gazetteer、scholar interpretation、oral memory、later legend 压成同一种声音。

### 当前禁止的过早简化

不得现在直接增加一个单字段 `perspective` 并假定问题已经解决。至少需要先区分并验证：

- source_type；
- author / compiler / publisher；
- institutional position；
- historical actor / observer；
- narrative perspective；
- later interpretation / legend；
- 与 epistemic_status、Evidence Fragment、MeaningCandidate 的关系。

### Trigger

当第二批或后续真实 Cultural World 内容中，出现**同一对象/事件由至少两类不同来源传统共同叙述，并且这种差异会实际改变 Agent 的解释、冲突呈现或 Human Experience**时，启动最小建模验证。

### 验证问题

1. 当前 Provenance 字段是否已经足够表达差异？  
2. 差异属于 Source metadata、Evidence、Claim、Meaning 还是独立 Perspective 对象？  
3. 它是否影响 Evidence Gate / Expression Contract？  
4. 用户是否真的需要感知“谁留下了这段历史”？  
5. 最小模型是什么，是否需要 schema change？

### 当前裁决

`NO SCHEMA CHANGE / NO TASK / NO TRACK ACTIVATION`。等待 Trigger。

---

## CAND-ARCH-002 · Timeline Source Unification（M4 Future Candidate C1）

**状态：CANDIDATE ONLY / NO TASK / NO MIGRATION**  
**来源：M4-CLOSURE-01（M4 Integration Closure Audit，@ aaf6910）Future Candidate C1**

### 问题

Timeline 当前由 legacy `SliceShape.changes` 驱动；008 `culturalEvents` 已入 `WorldEvidenceState` 但未驱动 timeline，轴 A 六值 `epistemicStatus` 已 join 进 `relationEvidence` 但未参与 `decideEvidence` 判定。两数据源语义一致、投影路径分离。

### 当前禁止的过早简化

不得现在统一数据源、不得让 `culturalEvents` 直接驱动 timeline、不得让 `decideEvidence` 立即消费轴 A——除非 Trigger 满足并经 Architect Reconciliation。

### Trigger

M5 Human Experience Validation 暴露时间表达不足（如 P1/P2/P3 因时间叙事不可感而失败），或未来第二 Cultural World cluster 接入，或任一冻结路径发生变更。

### 验证问题

1. 时间表达不足是否确实来自数据源分离而非文案层（O1 文案残余）？  
2. 统一是否破坏 KEEP_COMPATIBILITY_PATH 裁决与 Evidence Gate？  
3. 最小统一是否只需新增 Surface consumer 而非改 schema？  
4. 用户是否真感知到差异？

### 当前裁决

`NO SCHEMA CHANGE / NO TASK / NO MIGRATION`。等待 Trigger（由 M5 真实结果或第二簇接入触发）。本条目仅登记，不授权任何施工。

---

## CAND-ARCH-003 · Dual-Projection Consistency Guard（M4 Future Candidate C2）

**状态：CANDIDATE ONLY / NO TASK / NO MIGRATION**  
**来源：M4-CLOSURE-01（M4 Integration Closure Audit，@ aaf6910）Future Candidate C2**

### 问题

`slice.changes` 与 008 `culturalEvents` 双冻结投影的值一致性目前靠人工逐值对齐（M4 审计已核验一致）。若未来任一侧 JSON 变更，无自动守卫会重新比对。

### 当前禁止的过早简化

不得现在写一致性守卫脚本、不得因守卫而提前迁移任一冻结数据源——除非 Trigger 满足。

### Trigger

M5 暴露时间表达不足，或未来第二 Cultural World cluster 接入，或 `slice.changes` / 008 events 任一冻结路径发生变更。

### 验证问题

1. 变更是否真发生？  
2. 守卫应覆盖哪些字段（年 / 事件 / 冲突值）？  
3. 守卫失败应阻断 CI 还是仅告警？  
4. 是否破坏 Current-only working tree 纪律？

### 当前裁决

`NO SCHEMA CHANGE / NO TASK / NO MIGRATION`。等待 Trigger。本条目仅登记，不授权任何施工。

---

## 已晋升出 Backlog 的 2026-09-25 结论

### Agent-native Experience Architecture

**PROMOTED → Architecture Roadmap V4.9 Part II / III。**  
冻结核心：Agent 不是固定页面上的附加聊天能力；动态的是受 Contract 约束的体验编排，不是任意 UI 生成。

### Present-day Connection / Everyday Life Test

**PROMOTED → Phase II Execution Plan V1.1 / M5 Human Experience Gate。**  
正式验证：P1 重新看见今天；P2 感到与我有关；P3 产生继续行动。

---

## Governance Rule

以后 Architect 若判断某个讨论结论“值得以后保留”，必须进一步做三选一：

1. 已成熟且改变长期原则/Contract → 归位更新 L1 Architecture Roadmap；
2. 已成熟且改变当前 Phase 的 Milestone/Exit/Gate → 更新 L2 Current Phase Execution Plan；
3. 有长期价值但尚未成熟 → 登记本 Candidate Backlog。

只有纯讨论、无跨 Task 长期价值的信息，才允许仅停留在对话中。
