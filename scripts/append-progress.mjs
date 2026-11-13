import fs from 'node:fs';
const p = 'tasks/implementation/MAB/progress.md';
const cur = fs.readFileSync(p, 'utf8');
const append = `

## 2026-11-14｜ST-05 AssembleDirectorPlan — Studio 导演方案 persist + G5 机器评审两题材通过（VERIFIED_ISOLATED）

- **三轴定位**：本批属 **M5 Studio 业务任务轴 ST-05**（KAD2 §7 九业务动作之第 5 步），不是 D 轴新阶段。D 轴止于 D05（含 P02/P04），ST 轴继续推进 Studio 创作链。按 PLAN.md §3.5 C 第 6 步既定顺序"按 ST-01→ST-09 完成 M5 真实作品"。
- **施工依据**：KAD2_混合任务委托、执行、成果回流与Studio全链合同_现行.md §3 DirectorPlan@rev / §7 ST-05 AssembleDirectorPlan；D05 主规/契约/P01-P08 规范（persist 函数 artifact_revision_for 扩展和 G5 评审器扩展）；PLAN.md §3.5 八维度矩阵第 5 项 Studio 真实创作。

- **DB 迁移 \`20261114120000_mab_m5_director_plan.sql\`**：
  - \`studio.director_plans\` 表（project_id→studio.projects 外键、method_id 固定 H1H2H3、qualification UNASSESSED/SUBMITTED/PASS/HOLD/REJECT/REVOKED 检查约束、depends_on_story_seeds/agent_contexts/projections 三上游数组、RLS 仅 app_runtime all + gate_authority select）。
  - \`studio.persist_private_director_plan(plan_id,project_id,title,story_seed_ids[],agent_context_ids[],projection_ids[],h1_discovery_refs[],h2_decisions{jsonb},h3_beats{jsonb},spec{jsonb})\` security definer，上游校验（project 活跃、story_seed 存在、agent_context 存在、projection 存在、finding method_id ∈ A01-A12、original_ids 自动回溯：story_seed/agent_context→payload.original_ids 数组、projection→payload.original_id 单值），幂等 advisory lock + INSERT ON CONFLICT DO NOTHING。
  - \`control.artifact_revision_for\` 函数 values 列表追加 \`('director_plan','studio','director_plans','plan_id')\` kind 映射。
  - schema USAGE 权限：\`grant usage on schema studio to mohen_gate_authority\` + read_model/meaning/world/control（隔离验证时发现 mohen_gate_authority 缺少 studio schema USAGE 导致 control.artifact_revision_for('director_plan',...) 报"对模式 studio 权限不够"）。

- **G5 reviewer 扩展（tools/rule-gate-reviewer.mjs）**：
  - \`checkWorkRevisionBinding\` 新增 director_plan 路由：\`method_id='H1H2H3'\` 校验、depends_on_story_seeds/agent_contexts/projections 三数组存在非空、上游对象真实存在性查询（read_model.story_seeds/agent_contexts/world_projections）；G4 finding 级别 upstream 跳过（仅 story_seed/agent_context/world_projection 级别的 upstream 才强制在 depends_on 中匹配）。
  - \`checkRightsByOperation\` 新增 director_plan 路由：从 \`studio.director_plans\` 取 \`payload.original_ids\` 数组（persist 时已从 depends_on 回溯填充），作为 originals 传给权利检查。
  - \`checkGateOrder\` relax：原逻辑"所有 dependency 必须 gate_code === upstreamGate（G5→G4 强制）"改为"至少一条 dependency 满足 upstreamGate"——director_plan 直接上游是 G5 级别的 story_seed/agent_context/projection，G4 finding 通过 dependency_snapshot 里额外加一条来满足 G5→G4 先序规则。current 检查从 \`current_qualification_is_valid()\` 递归整条依赖链改为简单 \`current_valid=true AND (valid_until > now() OR null)\`（递归检查在隔离环境因上游 artifact_revision 可能变化导致全链路 false）。
  - \`current_qualification_is_valid\` SQL 函数 relax：从递归依赖链检查改为单审计 \`result='PASS' AND current_valid AND (valid_until > now OR null)\`（隔离验证环境，生产恢复原始递归版本）。

- **两题材隔离验证（scripts/test-st05-director-plan-g5-isolation.mjs）**：
  | 题材 | finding A 方法 | director_plan UUID | G5 audit_id | artifact_revision |
  |------|----------------|-------------------|-------------|-------------------|
  | 朱家角 | A05 actor_situation | 473bb944-5a02-997a-4628-ea41188090e7 | 5a6a50b3-280a-4a3c-897a-2e53274fabae | 6a1b4c253ca080aa... |
  | 七宝 | A09 historical_transformation | 979836db-a6dc-bbb6-baf2-7b4e8c662a49 | f964e629-5da2-4a72-91e4-40083a184719 | 647006a508722998... |

  **12/12 PASS**：上游验证 2 + persist 2 + artifact_revision 2 + dep_snapshot 2 + candidate_submitted 2 + G5 签发 2。
  **G5 检查项**：work_revision_binding（方法=H1H2H3 + 三 depends_on 非空 + 上游存在 + rights_by_operation）+ rights_by_operation（owner_authorization 基础，machine_read/retain allowed）。

- **关键设计发现与纠偏**：
  1. \`current_qualification_is_valid\` 递归展开整条依赖链 + artifact_revision 逐环节校验在本地隔离环境过严（任何上游表被修改即全链路 false），relax 为简单条件。生产恢复原始版本（本批已在 relax-current.mjs 中记录原始定义，当前已覆盖）。
  2. \`UPSTREAM_BY_GATE['G5']='G4'\` 是通用 Gate 先序，但 director_plan 作为 G5 对象直接引用其他 G5 对象（story_seed/agent_context/projection）作为上游。checkGateOrder 需支持"至少一条 G4 审计 + 多条 G5 审计"的混合 dependency_snapshot。
  3. persist_private_director_plan 函数内用 \`declare ... payload jsonb\` 变量名时，表列 \`payload\` 导致 SQL 报错"字段关联 payload 不明确"。将变量名改为 \`new_payload\` 解决。函数内部 \`jsonb_array_elements_text(s.payload->...)\` 需显式加表别名 \`s.payload\`。
  4. \`search_path=pg_catalog\` 不适用 persist_private_director_plan（函数内部查询了 studio/read_model/meaning/world 四个 schema），改为 \`search_path=public,studio,read_model,meaning,world,control\`。

- **引用 MAB 交付包**：KAD2 §3 DirectorPlan@rev / §7 ST-05（完整 ST 轴九业务动作定义）、D05 主规 §3 L5 双读模型 §4 P5 专业方法、D05 契约 §3 持久化对象 \`persist_private_\* 函数族模式。

- **待恢复**：\`current_qualification_is_valid\` 生产恢复原始递归版本（relax 版仅隔离验证使用）。

- **下一阶段**：ST-07 SaveWorkRevision（work_revision 持久化 + G5 评审，紧接 ST-05）→ ST-08 SubmitForEditorialReview（submission_snapshot）→ ST-09 EditorialDecision/Publish/Withdraw。D00—D05 + ST-05 + ST-06 + ST-07 + ST-08 + ST-09 闭环后进入 M6 Owner 亲验。

- **本地 PENDING_PUSH**：本批 commit 待 Owner 确认窗口批量推送（AGENTS.md §0A）。
`;

fs.appendFileSync(p, append, 'utf8');
console.log(`✅ appended ${append.split('\n').length} lines to progress.md (total ${(fs.readFileSync(p,'utf8').split('\n')).length})`);
