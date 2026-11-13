import fs from 'node:fs';
const p = 'tasks/implementation/MAB/progress.md';
const cur = fs.readFileSync(p, 'utf8');

const topics = [
  {
    name: "朱家角 (A05 actor_situation)",
    projectId: "d9d48901-3aa3-4424-b50f-965d6749ee8e",
    workRevisionUuid: "8c5a7cc4-2b08-38d6-361e-456c1fb06bfd",
    dpG5AuditId: "5a6a50b3-280a-4a3c-897a-2e53274fabae",
    artifactRevision: "9b39ab89966ddb76964c6c8ab1fe8e65ba5027b86bd5217d631cbf6e36de8d7d",
    g5AuditId: "711bafa9-603e-425f-8f70-f6dc36785308"
  },
  {
    name: "七宝 (A09 historical_transformation)",
    projectId: "b1ecefa4-3320-4932-94b4-e57e16a2779c",
    workRevisionUuid: "333ab162-31ce-aa65-234c-ab74adcb61b6",
    dpG5AuditId: "f964e629-5da2-4a72-91e4-40083a184719",
    artifactRevision: "b8d9b361d3b588c6b78b09db56876305a4398cccd48d2446b1bc7d037005bacb",
    g5AuditId: "91dbb175-9ce6-4822-9e91-c4170becb64d"
  }
];

const topicTable = topics.map(t =>
  `  | ${t.name} | ${t.workRevisionUuid.slice(0,12)}… | ${t.dpG5AuditId.slice(0,12)}… | ${t.g5AuditId.slice(0,12)}… | ${t.artifactRevision.slice(0,16)}… |`
).join("\n");

const record = `

## 2026-11-14｜ST-07 SaveWorkRevision — Studio 作品修订 persist + G5 机器评审两题材通过（VERIFIED_ISOLATED）

- **三轴定位**：本批属 **M5 Studio 业务任务轴 ST-07**（KAD2 §7 九业务动作之第 7 步），不是 D 轴新阶段。D 轴止于 D05（含 P02/P04），ST 轴继续推进 Studio 创作链。按 PLAN.md §3.5 C 第 6 步既定顺序"按 ST-01→ST-09 完成 M5 真实作品"。
- **施工依据**：KAD2_混合任务委托、执行、成果回流与Studio全链合同_现行.md §3 WorkRevision@rev / §7 ST-07 SaveWorkRevision；D05 主规/契约/P01-P08 规范（persist 函数 artifact_revision_for 扩展和 G5 评审器扩展）；PLAN.md §3.5 八维度矩阵第 5 项 Studio 真实创作。

- **DB 迁移 \`20261114150000_mab_m5_st07_work_revision.sql\`**：
  - \`studio.work_revisions\` 表（主键 revision_id；work_id+revision_no 唯一不可变修订链；project_id→studio.projects 外键；depends_on_director_plan→studio.director_plans 外键；depends_on_story_seeds/agent_contexts/projections 三上游数组；qualification UNASSESSED/SUBMITTED/PASS/HOLD/REJECT/REVOKED 检查约束；publication_status draft/submitted/rejected/accepted；RLS 仅 app_runtime all + gate_authority select）。**旧 publication.work_revisions (202610280900) 是简化版（缺 CAS/content_hash/payload/depends_on/qualification），新表放 studio schema。**
  - \`studio.persist_private_work_revision(work_id,revision_id,revision_no,expected_revision_no CAS,project_id,creator_id,title,content,beats,source_and_rights_refs,depends_on_director_plan)\` security definer：上游校验（project 活跃 + director_plan 存在且 G5 PASS current + story_seeds/agent_contexts/projections 存在）；CAS 乐观锁（expected_revision_no=已有最高 revision_no 或 0）；content_hash=sha256(content+beats)；original_ids 从 director_plan.payload.original_ids 自动回溯；幂等 advisory lock。
  - \`control.artifact_revision_for\` 追加 \`('work_revision','studio','work_revisions','revision_id')\` kind 映射。

- **G5 reviewer 扩展（tools/rule-gate-reviewer.mjs）**：
  - \`checkWorkRevisionBinding\` 新增 work_revision 路由：method_id='H1H2H3' 校验（从 payload 取，不是显式列）+ content_hash=64 位 hex 校验 + depends_on_director_plan 存在性 + director_plan 有 G5 PASS current 审计 + depends_on_story_seeds/agent_contexts/projections 至少一个非空。
  - \`checkRightsByOperation\` 新增 work_revision 路由：从 studio.work_revisions.payload.original_ids 取 originals 传给权利检查。
  - **修正 \`now()::text\` 类型错误**：reviewer 里 dpG5 audit 查询原写 \`ga.valid_until > now()::text\`（timestamptz vs text 类型不匹配），改为 \`ga.valid_until > now()\`。

- **两题材隔离验证（scripts/test-st07-work-revision-g5-isolation.mjs）**：
  | 题材 | finding A 方法 | work_revision UUID | 上游 director_plan G5 | 本题材 G5 audit | artifact_revision |
  |------|----------------|-------------------|----------------------|----------------|-------------------|
${topicTable}

  **16/16 PASS**：上游验证 2 + persist 2 + artifact_revision 2 + dep_snapshot 2 + candidate_submitted 2 + g5_dryrun 2 + g5_signed 2。
  **G5 检查项**：work_revision_binding（方法=H1H2H3 + content_hash sha256 + depends_on_director_plan 有 G5 PASS + 至少一条 upstream depends_on 数组非空）+ rights_by_operation（original_ids 回溯 originals）。
  **dependency_snapshot**：4 条（G5 director_plan + G5 story_seed + G5 world_projection + G4 finding）满足 relax 后 checkGateOrder（至少一条 G4 + 多条 G5）。

- **两题材完整 G5 签发链（从 ST-05 director_plan 到 ST-07 work_revision）**：
  - 朱家角 (A05)：finding_id=749414aa → story_seed G5 → director_plan G5=5a6a50b3 → **work_revision G5=711bafa9 current=true**
  - 七宝 (A09)：finding_id=3cffc174 → story_seed G5 → director_plan G5=f964e629 → **work_revision G5=91dbb175 current=true**
  - **泛化证据**：两题材均为非 A06 finding，persist + G5 全链路无题材特定代码，说明 ST-07 设计具备泛化性。

- **施工发现**：
  - **SET ROLE 会话级持久**：decideGate 里用 SET ROLE mohen_gate_signer_m5_machine（会话级，sign_gate_candidate 取 current_setting('role') 需要），RESET ROLE 需在每个题材开始前执行，否则后续题材默认用签发者角色无 studio.director_plans 访问权限。
  - **queryRows 渲染验证**：reviewer 内部 SQL 用命名参数 \`:'xxx'\`，queryRows 转换成 \`$1\` 参数；sign_gate_candidate SQL 里不能用 \`now()::text\` 和 timestamptz 比较，PG 不做隐式类型转换。

- **本地 PENDING_PUSH**：commit 待生成，连同之前的 f902a5a（ST-05）等，按 AGENTS.md §0A 等待批量推送窗口。

`;

fs.writeFileSync(p, cur + record, 'utf8');
console.log(`✅ appended ${record.length} chars to progress.md (total ${cur.length + record.length})`);
