# research_task → N01–N06 桥接 + 人工确认闸 · 首批试验

> **日期**：2026-10-04
> **定位**：Research Workspace（C3 V1.2 §2.9）内的桥接暂存，不是真值层。本桥接**绝不**向 L0–L7 写任何行。
> **依据**：用户指令「建 research_task → N01–N06 桥接 + 人工确认闸，用现有 2,219 个候选做首批试验」。

## 1. 缺口（此前状态）

`research_association_candidate` / `research_task`（`task_type='directed_research'`）的候选**没有任何消费者代码**把它们编译成 N01–N06 作业——Discovery 与 Directed 两线之间断流。这是 LR-ADS-01 之后 P6（严证）唯一阻塞点。

## 2. 落地对象

| 类型 | 文件 | 说明 |
|---|---|---|
| 迁移 | `supabase/migrations/202610040001_research_bridge_queue.sql` | 新建 `research_bridge_draft`（桥接草稿表）+ 硬约束 `bridge_no_execute_before_confirm`：未确认不得标记已执行 |
| 桥接 | `pipelines/research/bridge-to-directed.mjs` | 三子命令：`--plan` / `--confirm-all` / `--emit-njobs` / `--stats` |

## 3. 人工确认闸设计

```
Discovery 候选 ──(--plan)──▶ research_bridge_draft（human_confirmed=false）──(--confirm-all 人工开闸)──▶ human_confirmed=true
                                                                                    │
                                                                          (--emit-njobs 仅输出 N 作业交接 JSON)
                                                                                    │
                                                                          unattended-runner 消费 → N01–N06 严证 → G0–G6 → 才可能 PROMOTE
```

- `--plan`：读取 `research_association_candidate`，按 `disposition` 编译 N 作业草稿（truth_promotion→N05 关系编织，其余→N04 补证抽取），**默认 `human_confirmed=false`**。
- `--confirm-all`：**人工复核后**开闸（置 `human_confirmed=true`）。此步由人执行，AI 不擅自确认。
- `--emit-njobs`：仅对 `human_confirmed=true` 的草稿输出 N 作业交接 JSON（`tasks/results/BRIDGE-20261004-njobs.json`），供 `unattended-runner` 消费；**本脚本不写真值层**。

## 4. 首批试验（2,219 候选）

```
PLAN drafts=2219  N04=2199  N05=20   (human_confirmed=false，待人工复核开闸)
EMIT_NJOBS confirmed=0   → 闸门关闭，0 个 N 作业被放出（证明人工确认闸生效）
```

- 全部 2,219 条草稿落在 `research_bridge_draft`，**0 行进入 L0–L7**。
- 闸门验证：当前 0 条确认 → `--emit-njobs` 输出 0，确认「未确认不晋级」的硬约束真实生效。

## 5. 下一步（人工侧）

1. 人工审阅 `tasks/results/BRIDGE-20261004-njobs.json` 草案（或 `research_bridge_draft` 表）；
2. 对可信子集执行 `--confirm-all`（或按 `draft_id` 单条确认）；
3. `--emit-njobs` 生成 N 作业交接，交由 `unattended-runner` 跑 N04/N05，经 G0–G6 后才可有条件 `PROMOTE`；
4. 真正晋升 L0/L1/L2 的数量，即为「无人值守生产首次真实增长」——届时 L0 才会动。
