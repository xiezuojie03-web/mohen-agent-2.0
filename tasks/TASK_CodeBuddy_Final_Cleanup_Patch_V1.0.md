# TASK｜MoHen A–G 最终收尾修正 Patch

**版本：V1.0 · 2026-10-07**  
**执行者：CodeBuddy**  
**任务性质：小范围收尾修正，不重跑 Phase A–G，不改数据库结构**

---

# 0｜目标

本任务只做两类修正：

## A｜恢复仍有价值的来源/视觉采集经验

把实施前 dirty tree 中被 Target 覆盖、但仍有长期价值的经验迁入当前 A–G 新体系：

1. Wikidata / Wikimedia Commons 的来源采集策略；
2. Visual Asset 的身份确认与 Commons 使用边界；
3. 这些经验只能进入新 D01/D02 的 source/provider/capability 体系。

不得恢复旧：

```text
unattended.*
Discovery / Directed
production_mode
truth_write_ceiling
research workspace
old lifecycle owner
```

---

## B｜清理 package.json 旧 active script 痕迹

检查并清理仍指向旧体系的 scripts，例如：

```text
guard:research
guard:promotion
guard:triage
```

以及其它明确服务：

```text
Research Workspace
old promotion lifecycle
old triage lifecycle
old G0–G6 lifecycle
```

的 active script。

不得删掉仍被最终 A–G tests / guards 使用的脚本。

---

# 1｜Authority

按以下顺序：

```text
CURRENT.md
AGENTS.md
OWNERSHIP_MAP.md
governance/C0–C4
specs/data-production/MoHen_Data_Production_Protocol.md
specs/DATA_CONTRACT.md
production-registry.json
G0–G4 Machine Gate Contract
```

最终 A–G 架构优先于 implementation 前 patch。

---

# 2｜资料来源

以当前真实 Repo 为工作对象。

另外只读参考：

```text
implementation_artifacts/preflight/GIT_DIFF_BEFORE.patch
```

如果该文件不在 Repo 内，则从：

```text
MoHen_Final_Implementation_Result_Lite_20261007.zip
```

中读取对应 preflight patch。

不要凭记忆补写旧内容。

---

# 3｜Step A · 提取有价值的被覆盖知识

从 `GIT_DIFF_BEFORE.patch` 中只检查以下文件的 implementation-before 修改：

```text
specs/data-production/acquisition-intents.json
skills/mohen-visual-asset/SKILL.md
```

如 patch 中还有同主题内容，可一并审阅。

目标不是恢复旧文件，而是提取：

```text
provider knowledge
source acquisition rule
identity-confirmation rule
visual-source boundary
Commons/Wikidata operational lesson
```

---

# 4｜Step B · 迁入新 D01/D02 体系

优先归位到：

```text
specs/data-production/source-providers.json
specs/data-production/acquisition-intents.json
skills/mohen-source-intake/SKILL.md
skills/mohen-material-understanding/SKILL.md
skills/mohen-visual-asset/SKILL.md
```

按职责放置：

## Wikidata

允许表达为：

```text
identity / authority / external node / structured lookup provider
```

不得表达为：

```text
automatic truth source
```

## Wikimedia Commons

原则必须体现：

> Commons 不用于仅凭同名对象进行视觉资产发现。

合法流程：

```text
已确认 Entity identity
→ 已确认 Wikidata / authority identity
→ 使用明确 media relation（如 P18 / Commons category / confirmed page）
→ 获取 Visual Asset
→ D02 literal visual reading
→ D03 correspondence adjudication
```

不得：

```text
name search
→ image found
→ assume same entity
```

如果旧经验包含更具体且与新体系不冲突的规则，可以保留。

---

# 5｜禁止恢复的旧内容

即使 patch 中存在，也不得恢复：

```text
unattended.image-link
unattended.external-identity
unattended.external-visual
production_mode
truth_write_ceiling
directed/research dual mode
bridge-to-directed
old Registry jobs
old promotion gate lifecycle
old research workspace workflow
```

这些属于已退出架构。

---

# 6｜Step C · package.json Script Audit

列出所有：

```text
scripts
```

逐项判断：

```text
KEEP
REBIND
REMOVE
```

重点检查：

```text
guard:research
guard:promotion
guard:triage
```

如果它们只服务旧体系：

```text
REMOVE from active scripts
```

如果脚本文件仍需保留作历史参考：

```text
可以留文件
但不得留 active package.json command
```

---

# 7｜最终 Active Guard 集

至少保留并可执行：

```text
guard:registry:v3
guard:no-legacy-production-entry
guard:stage-handoff
guard:physical-model
guard:runtime-boundary
guard:e2e-completeness
guard:cross-layer-write
```

如果最终项目还有：

```text
guard:docs
guard:structure
guard:naming
```

且与新体系不冲突，可保留。

不得要求 Research Workspace 存在。

---

# 8｜不得做

本任务不允许：

```text
DB migration
DB schema change
old data backfill
old data cleanup
re-gating
Production deploy
push
merge main
修改 hushang-jingwei
重做 Phase F/G
重做 A–G 架构
```

---

# 9｜验证

修改完成后必须运行：

```text
pnpm guard:registry:v3
pnpm guard:no-legacy-production-entry
pnpm guard:stage-handoff
pnpm guard:physical-model
pnpm guard:runtime-boundary
pnpm guard:e2e-completeness
pnpm guard:cross-layer-write

pnpm test:data-production
pnpm test:phase-f
pnpm test:phase-g

pnpm build
git diff --check
```

如果最终 `pnpm guard` 已经清理为新体系，也运行：

```text
pnpm guard
```

---

# 10｜输出报告

生成：

```text
tasks/results/FINAL_CLEANUP_PATCH_RESULT.md
```

必须说明：

```text
1. 从 GIT_DIFF_BEFORE.patch 中保留了哪些知识
2. 分别迁入了哪些新文件
3. 哪些旧内容明确没有恢复
4. package.json 哪些 scripts KEEP / REMOVE / REBIND
5. Active Guard 最终列表
6. tests / guards / build / diff-check 结果
7. DB changed = NO
8. hushang-jingwei changed = NO
9. push / deploy = NO
10. unresolved risks
```

---

# 11｜成功标准

只有同时满足：

```text
有价值的 Wikidata / Commons / visual acquisition 知识已迁入新体系
未恢复任何旧 lifecycle
package.json 不再把旧 research/promotion/triage 当 active required path
所有最终 Guards PASS
所有 Tests PASS
Build PASS
git diff --check PASS
DB unchanged
hushang-jingwei unchanged
```

才可报告：

```text
FINAL_CLEANUP_PATCH = PASS
```

---

# 12｜最后动作

完成后：

```text
不 push
不 merge
不 deploy
```

只输出：

```text
FINAL_CLEANUP_PATCH = PASS / HOLD / FAIL
result_report = ...
git_status_after = ...
unresolved_risks = ...
```

然后 STOP。
