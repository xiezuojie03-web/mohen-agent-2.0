# V1.5 收口批次结果：视觉维度真实闭环 + 依赖传播实测 + Agent 水道问句 + run 终态（SAMPLE-TRIAL-15）

> 日期：2026-10-17（跨至 10-18）
> 性质：授权内工程改造 + 真实生产（真实 DeepSeek + Wikimedia Commons 摄取 + 真实写库）
> 依据：任务书 §七 第二步第二层遗留待办（视觉维度）+ 第三步第三层遗留（P08 依赖传播实测）；Owner 已拍板视觉维度本批投入
> 前置备份：`D:\MoHen\backups\SAMPLE-TRIAL-15_20261017\mohen_dev_preflight.dump`（custom 格式，批次内多次实测恢复成功）

---

## 〇、一句话结论

**照片第一次作为史料进了生产链**：4 张 Wikimedia Commons 今貌照片经 D00 来源登记 → D01 读取 → D02 材料观察 → W03 视觉对应落 `world.visual_objects` → P06 视觉证据返还，前端 s01 主角换成真实生产照片（身份「今日观察」、license/作者/出处/条目自述随行）。**依赖边首次真实落库（112 条）**，P08 精准失效在真实注册依赖上 13/13 实测通过（含"不误伤原材料/时间轴"的精确性验证）。**Agent 对「万安桥跨的是哪条河」从转澄清改为正确回答**并带出三说着录名。

## 一、生产链改造（layer1-adapters.mjs）

### 1.1 照片摄取（D00/D01，确定性，无 LLM）
- `wikimedia-commons` 来源：`Special:FilePath` 下载到 `apps/web/public/production-assets/`（4 帧：万安桥/普济桥/迎祥桥/颐浩寺遗址），Commons API 取 license/作者/条目自述/尺寸。
- 网络操作 3 次退避重试（瞬时失败不静默跳过——实测万安桥首帧曾 `fetch failed`，重试后成功）。
- `rights` 落 `{basis, artist, license}`；照片作为 `source.sources`（carrier_type=image）+ 独立 `read_unit`。

### 1.2 D02 视觉材料观察（C04）
- 确定性登记 `evidence.material_evidence`（modality=image，assertion_kind=record，voice_basis=reported——Commons 条目自述属转述非目击）；`extraction_method` 落 jsonb。
- 文本材料观察保持 DeepSeek（本批实测模型 `deepseek-flash`——API 对 `deepseek-chat` 的实际映射，如实记录，不认定具体型号为最终绑定）。

### 1.3 D03 视觉对应（W03）
- `world.visual_objects`：`visual_type=today_photo`、`time_identity=今日观察`、`correspondence_claim={license,artist,basis,description}`；`subject_entity_id` 由实体别名匹配（照片对象名含 万安桥/普济桥/迎祥桥/颐浩寺 时挂靠）。

### 1.4 D05 发布 + 血缘
- P06 视觉证据返还：照片 → `read_model.evidence_pointers`（visual_type=today_photo，display_url 指向本地资盘），G5 双消费端。
- **world.dependency_edges 首次真实落库（112 条）**，`dependency_type` 受 schema 约束限定为 supports/derived_from：
  - 精确性：时间投影只挂有变化的实体；开放问题挂其"关于"实体（泛称问题靠 D03 显式 `entities` 声明）；证据指针只挂原材料，不挂实体（实体身份变化不波及原材料）。
- **run 终态**：production_runs 置 `status=PASS` + `finished_at`（此前旧 run 停在 RUNNING，属迁移遗留）。
- **追加式 supersession**：新 run 发布前旧 run 同类型 current G5 决策置失效（append-only 留痕）。

### 1.5 追加式重跑的幂等性修复（本批实测暴露并修复）
- `world.conflicts.conflict_key` 唯一约束 → 同键登记改**着录汇集（只增不减）**：新着录追加 + `world.claim_revisions` 修订留痕；措辞粒度差异（「南市梢」⊃「南市」）按包含等价视为同一说法；不阻塞、不静默。
- `world_projections/map_timeline_projections.projection_key` 唯一约束 → 键改 run 作用域（`@<runId8>`），读取侧取 newest current_valid 与键无关。

## 二、真实生产结果（run `a3cb68ac`，status=PASS，G0–G5 全 PASS）

| 层 | 产出 |
|---|---|
| L0/L1 | 7 来源（3 文本 + **4 照片**）/ 13 片段 |
| L2 | 10 文本 evidence + **4 图像 evidence** + mentions |
| L3 | 8 实体 + **11 关系**（含 3 spans_waterway + 1 formerly_named + 1 built_on_site_of）+ 4 时间变化 + 2 冲突（T11-C1 方位、T11-C2 水道名，含第三说「金泽古镇」着录汇集）+ **4 视觉对象** + 3 关系拒绝 |
| L4 | 5 findings（含 A10 冲突发现） |
| L5 | world_projection ×1 + map_timeline_projections ×1 + story_seeds ×5 + agent_contexts ×5 + evidence_pointers ×14（**10 文本 + 4 视觉**）+ discovery_paths ×5 |

- 门禁：旧 run G5 current_valid=f，新 run t；`production_runs` 终态 PASS。
- 依赖边 112 条：entity→relation/finding/change/open_question/visual_object、finding→projection/story/agent、relation→projection、change→timeline、open_question→path、material_evidence/visual_object→pointer。

## 三、P08 依赖传播实测（第三层最后一项）

- 场景：provisional 水道实体「桥所跨水道（名称待定）」身份被裁决（T11-C2 有着落）——真实上游变更。
- 结果 **13/13 PASS**：闭包含 world_projection + 2 story_seeds + 2 agent_contexts + 1 discovery_path（水道开放问题）；**不含** evidence_pointers（原材料不因实体身份变化受影响）与 map_timeline_projection（水道无有着录年代）——精确性成立；disposition=BLOCKED + suspension/recheck 请求；**G5 current 决策一行未动**（P08 不自授不自驳）；负面对照失败关闭。
- 控制事件落库 `control.invalidation_events`（标注「能力实测，非真实历史事件」）。
- 期间修复：`changed_dependency_ref` 与 face 依赖键的 version 同构问题（depKey 仅在带 version 时追加 `@v`）。

## 四、Agent 水道问句（V1.5 检索/理解层）

- 实测三问（dev server 实跑）：
  - 「寺和桥真的有关系吗？」→ partial「已审核材料里还没有登记它们之间的历史关系」（P0-1 保持）
  - 「万安桥和普济桥是什么关系？」→ answered「…这一条是有据可依的：万安桥 · 形制相仿 · 普济桥」
  - 「万安桥跨的是哪条河？」→ **answered**「关于万安桥，这一条是有据可依的：万安桥 · 跨越 · 桥所跨水道（名称待定）（又称：金泽塘 / 秀州塘 / 市河）」——不再转澄清
- 改动：understand 关系信号补 跨/水道/河道 类；疑问词 哪/哪条 入分隔词；跨越/跨 入二级分隔；retrieve relation snippet 追加对象实体的着录别名（`objectAliases`）；路由别名表对齐世界模型（含临时水道实体及三种着录名）。
- 纪律守住：只追加真实别名、不生成新内容；覆盖规则未动（P0-1 失败关闭语义保留）。

## 五、前端接线

| 面 | 内容 |
|---|---|
| `read-model-bridge.ts` | 新增 `visuals` 读取（视觉证据指针：displayUrl/excerpt/sourceTitle/license/artist/timeIdentity/commonsTitle/entities） |
| s01 照片 | 真实优先分支：主角=生产链照片、身份「今日观察」、license/作者/出处/条目自述随行；冻结策展清单降级 |
| 内容看板 | 新增「今貌影像」区（7 区） |
| Agent 检索 | objectAliases + 别名表扩展（见 §四） |

## 六、验证

- 单元测试：data-production 42/42；experience 144/146（2 失败既存：spec 文档内容断言、seed.master.json 工作区状态）。
- 真实预览自检 **10/10 PASS**：徽章「8 实体 · 11 关系」；s01 真实照片（今日观察 + CC BY-SA 3.0 + Fayhoo + 条目自述）；看板影像区；s05/s06/s08 回归全在。截图 `D:\MoHen\selfcheck-15\`。
- 守卫：docs/structure/registry/no-legacy-production-entry 全过。

## 七、成本验收（成文）

3 次 PASS 全链 run 累计：prompt 8,503 / completion 23,707 / cached 4,992 tokens（DeepSeek，模型实记 `deepseek-flash`）。
- **单次全链 run < 0.1 元人民币**（DeepSeek 公开价目估算：输入约 ¥2/M、输出约 ¥8/M 量级，缓存命中输入更廉）。
- 缓存命中：prompt 缓存 4,992/8,503 ≈ **59%**（重复提示词前缀被 DeepSeek 自动缓存）。
- 判断：**扩大生产经济**——每 run 认知层三阶段（D02/D03/D04）合计约 2.4 万 token，分币级；D00/D01/D05 确定性零 LLM 成本；唯一新增成本项为照片摄取（Commons 免费、本地下载）。下一轮扩大生产（更多切片/更多材料）成本随 token 线性，仍在可负担区间。
- 模型纪律：未认定具体型号/价格为最终绑定；真实模型 `deepseek-flash` 已随每 run 留痕。

## 八、遗留与红线

- 遗留：视觉维度已闭环（今貌照片 V3）；历史舆图/老照片（V1/V2 视觉层）仍待未来材料；「上游事实变化后自动重跑依赖」的端到端自动化未做（P08 算法+落库已验证，人工触发场景已实测）。
- 红线复核：写库前 preflight 备份并多次实测恢复；照片仅下载 Wikimedia Commons（license CC BY-SA 3.0 随行，无再分发风险，无出域 LLM 调用）；未伪造历史（照片身份=今日观察，条目自述标「来源自己的话」）；真实 G5 只来自真实生产；未碰 hushang-jingwei Production；56 条 HOLD 未动。
