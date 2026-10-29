# SYS-MATURITY-01 段 1 结果｜Studio 研究自驱动闭环（自由主题创作生产）

**状态：✅ 完成（任意自然语言委托 → 真实 D00–D05 生产，已端到端验证）**
**日期：2026-10-29**
**任务书：** `tasks/implementation/SYS-MATURITY-01_Studio闭环_资产治理_外部获取_Task-Book_V1.0.md` 段 1

---

## 一、目标（Owner 白话）

用现有渠道（上海图书馆 + DeepSeek），让"任意自然语言委托"走完完整创作流程：**DeepSeek 抽实体 → 上海图书馆检索 → 获取材料 → 来源核验（D00/G0）→ 登记 source → 喂 D01–D05 生产 → 数据落库 → 前端可见**。不是只产金泽/绿之丘。

## 二、改动清单

### 阶段 A：引擎接入（已完成，前一轮）

| 文件 | 改动 |
|---|---|
| `pipelines/data-production/run.mjs` | 加 `--run-id`；`onStage` 阶段进度落库 |
| `pipelines/data-production/orchestrator/orchestrator.mjs` | 加可选 `context.onStage` 回调 |
| `apps/web/lib/studio-production.ts` | `triggerProduction` spawn run.mjs + `getProductionStatus` |
| `apps/web/lib/studio-research.ts` | `requestProduction` 改为真实触发 |
| `api/studio/research-tasks/route.ts` | 委托后自动触发生产 |
| `api/studio/research-tasks/[id]/production/route.ts` | 生产状态查询 |
| `StudioWorkbench.tsx` / `studio.css` | 生产进度轮询显示 |

### 阶段 B：自由主题入口（本轮完成）

| 文件 | 改动 |
|---|---|
| `pipelines/data-production/adapters/layer1-adapters.mjs` | 支持 `MOHEN_TOPIC_JSON_FILE`（动态主题 JSON）；新增通用 D03/D04 提示词模板（schema/门禁规则通用，去金泽特定） |
| `apps/web/lib/mohen-agent/retrieve-shl.ts` | 新增 `searchShanghaiLibraryMaterials()`（把端点返回组装成生产材料，非线索） |
| `apps/web/lib/mohen-agent/prepare-topic.ts`（新） | `prepareFreeTopic()`：抽实体→检索→组装主题配置→写 JSON |
| `apps/web/lib/studio-production.ts` | `triggerProduction` 先调 `prepareFreeTopic`，spawn 传 `MOHEN_TOPIC_JSON_FILE`；无材料诚实降级 |
| `StudioWorkbench.tsx` | 委托/编导主题从硬编码 `jinze` 改 `generic`（自由主题） |

## 三、材料来源（已实测探测上海图书馆端点）

上海图书馆开放数据能提供的材料是**书目/地名/人名级元数据 + 描述**，不是古籍全文：

| 端点 | 能拿到什么 | 用于 |
|---|---|---|
| 地名志 dmz | `description`（实质描述文本，如朱家角条目全文）+ name/placeLabel/riverLabel | 主材料（描述文本） |
| 古籍书目 instances | dtitle/creator/edition/temporalValue/classLabel（书目元数据） | 材料（书目） |
| 人名规范 kg | chsAgent/roles/annoList.hasBody（含正文注释） | 材料（人名） |
| 方志书名 works | dtitle + uri（仅书名） | 材料（书名） |

**诚实说明**：开放数据拿不到古籍全文 OCR，材料是"元数据 + 描述"级别。生产中如实标注来源，不冒充全文。

## 四、验证证据（真实运行态）

| 验证项 | 结果 |
|---|---|
| mjs 语法检查 | LAYER1_SYNTAX_OK |
| TypeScript 类型检查 | 通过（0 错误） |
| 金泽/绿之丘固定主题生产（阶段 A） | PASS（entities 103、relations 87、gate_audits 79） |
| **自由主题「朱家角」生产（阶段 B）** | **PASS**，`current_stage=D05` |
| 自由主题投影 key | `free-test-zhujiajiao-layer3-world@33333333`（证明动态主题生效，非 jinze） |
| 自由主题种子 | story_seeds 新增「朱家角」3 条 |
| 自由主题实体 | 「朱家角」「朱家角古镇」「所属县份」 |
| 自由主题门禁 | gate_audits 44 条 |

## 五、验收结论

段 1 目标**达成**：任意自然语言委托（如"朱家角古镇的历史与古桥"）→ 上海图书馆检索材料 → 组装自由主题 → 真实 D00–D05 生产 → 数据落库（key 隔离、门禁齐全）→ 前端可见进度。

## 六、遗留与边界（如实记录）

1. **材料深度受限于开放数据**：上海图书馆只提供书目/地名/人名级元数据+描述，拿不到古籍全文。自由主题生产的材料深度因此有限（诚实如实，不冒充全文）。这是渠道本身的边界，不是代码缺陷；要更深的材料需扩展渠道（段 3）。
2. **检索耗时**：`prepareFreeTopic` 在委托时同步检索（串行请求 + 节流，约几秒），HTTP 响应会略慢；可后续改为异步队列。
3. **spawn 依赖本机 node/psql/PG**：本地 dev 可用；vercel（serverless）需换队列/worker，届时单独处理。
4. **验证产生的数据**：朱家角（1 条地名志材料 + 3 条种子 + 少量实体）、金泽/绿之丘样板数据已真实入库；是否保留由 Owner 决定。

## 七、下一步

段 1 完成。按任务书顺序，段 2（资产回流 + 资产治理）待 Owner 验收后启动。
