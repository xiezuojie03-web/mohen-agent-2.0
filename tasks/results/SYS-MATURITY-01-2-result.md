# SYS-MATURITY-01 段 2 结果｜资产回流 + 资产治理

**状态：✅ 完成**
**日期：2026-10-29**
**任务书：** `tasks/implementation/SYS-MATURITY-01_Studio闭环_资产治理_外部获取_Task-Book_V1.0.md` 段 2

---

## 一、目标（Owner 白话）

1. **资产回流**：一部作品创作/发布完成后，其合格知识叙事沉淀成"知识资产"（read_model），EXP 可见可复用，不再只是 publication 表里的"孤本"。
2. **资产治理**：Admin 能按类别/状态/关键词检索资产；能把候选资产晋级为 verified（留门禁记录）。

## 二、改动清单

| 文件 | 改动 |
|---|---|
| `apps/web/lib/governance-gate.ts`（新） | 治理级 gate：`createGovernanceRun`（承载非生产动作的 gate 记录宿主）+ `writeGovernanceGate`（append-only + current_valid G5） |
| `apps/web/lib/asset-reflow.ts`（新） | `reflowWorkToAssets`：作品发布 → read_model.story_seeds（带 G5 visual_stage 资格，幂等） |
| `apps/web/lib/publication.ts` | `publishWork` 发布成功后自动回流作品叙事（失败不阻断发布） |
| `apps/web/lib/admin-assets.ts` | `listAssets` 加过滤（kind/status/q）；新增 `promoteAsset`（candidate/demo → verified + G5 门禁） |
| `apps/web/app/api/admin/assets/route.ts` | GET 支持 `?kind=&status=&q=` 检索 |
| `apps/web/app/api/admin/assets/[id]/promote/route.ts`（新） | POST 晋级接口（operator 权限） |

## 三、关键设计

- **门禁宿主**：`gate_audits.run_id` 是 NOT NULL FK → `production_runs`。资产晋级/作品回流不是生产动作，故先建「治理 run」（`execution_mode=attended`）作为 gate 记录宿主，再写 G5，遵守 R15「无门禁记录不得晋级」。
- **回流同构**：作品回流写 `read_model.story_seeds` + G5（consumer=`visual_stage`），与生产链 D05 的 story_seed 同构、同资格，EXP 的 `read-model-bridge` 无需改动即可消费。
- **幂等**：回流以 `seed_key = work-{workId}-{revisionId前8}` 唯一，重复发布不重复回流。
- **晋级与撤权成对**：晋级走 `promoteAsset`（写 G5），撤权走既有 `gate-revoke.ts` 的 `revokeGate`（置 current_valid=false）。

## 四、验证证据（真实运行态）

| 验证项 | 结果 |
|---|---|
| TypeScript 类型检查 | 通过（0 错误） |
| 资产晋级（candidate→verified） | ✅ status 变 verified，G5 门禁记录 1 条 |
| 资产回流（作品→story_seeds） | ✅ EXP 可读（join G5 visual_stage），statement 落库 |
| 资产检索 | ✅ verified 总数正确，关键词 `ilike` 命中 |
| 测试数据清理 | ✅ 验证后已删除（资产/作品/story_seed/治理run/gate） |

## 五、验收结论

段 2 目标**达成**：
- 作品发布 → 知识叙事回流 story_seeds → EXP 可消费（不再孤本）；
- Admin 能按类别/状态/关键词检索资产；
- Admin 能把候选资产晋级 verified，晋级动作留 G5 门禁记录（可追溯）。

## 六、遗留与边界（如实记录）

1. **回流的"知识资产"目前是 story_seeds 一类**：作品叙事回流为故事种子；若未来需要把作品回流成更多类 L5（如 discovery_paths、evidence_pointers），按需扩展 `asset-reflow.ts`。
2. **晋级是 operator 单动作**：当前 `promoteAsset` 由 operator 直接晋级并写 G5；严格语义上"独立 Reviewer 签核"与"operator 晋级"是否要进一步分权，可在段 4（资格把关）细化。
3. **验证数据已清理**：段 2 验证产生的测试数据已删除，未污染库。

## 七、下一步

段 2 完成。按任务书顺序，段 3（扩展渠道，放后）待 Owner 决策是否启动。
