# KAD4｜知识生产、长期存储与AI消费——双向专业设计终审及阶段裁决（现行）

**2026-11-02。核查基线**：GitHub `main@db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`；2026-11-02只读Supabase schema/PK/FK/RLS/计数；KAD1现行专业合同、04/repo_target的`KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`、`PERSISTENCE_BINDING_CONTRACT.md`、`SECURITY_ACCESS_CONTRACT.md`、`DATA_CONTRACT.md`及KAD2/KAD3业务设计。静态审查不等于运行测试。**KAD3独立UI原型被Owner否定，UI递延，不阻断本阶段。**

## 1｜本轮裁决所依据的实际事实

- L0—L5原有`source/evidence/world/meaning/read_model/control`表组存在；`source.raw_items`98行有ref/hash但业务Storage桶与对象0，不可称原件已保全。
- `evidence.read_unit_evidence_links`、`world.claim_evidence_links`当前均0行；表和FK可复用，但未形成经运行验证的完整证据链。
- 现行`source.read_units`是D01可回放读取身份，`evidence.reading_units`是材料结构/分类层；`read_unit_evidence_links`桥接D01与D02；不得平行创造第二套D01主数据。
- `public.research_tasks.checkpoint`可覆盖；`research_events/study_asset_receipts`有任务删除级联；永久工作资产/委托回执必须脱离task生命周期。
- 现行main的`data-production-repository.mjs/recordGate`已改向`control.gate_candidates`提交候选，但实际DB该表不存在；`passed/legalInput`仅看G PASS/current_valid，不能表示完整资格。`writeGovernanceGate`已经因独立G未接线而拒绝写入。**保留这项现实CODE-DB冲突**，不误写为旧版直接自签逻辑仍在该方法发生。
- `public.imported_materials`RLS关闭、anon有表级读写权限，`SEC-P0`；其他安全项的实际可访问性仍需授权工程负测。`asset-reflow`依独立G未就绪而返回阻断，WATCH发布指针不等于当前合法知识引用。
- 现有04镜像已拥有上述专业和物理规范的唯一目标Owner；新的KAD4方案不是第二个可独立生效的工程规范。

## 2｜正向和反向设计检查

| ST门 | 正向：任务→主数据/服务→消费 | 反向：存储/服务→唯一责任/合法拒绝 | 专业判断 |
|---|---|---|---|
| ST-01 九层 | L0—5既有原生主表（L5修订追溯需补绑定）；L6 runtime、L7 consent、L8 traces有独立身份、版本字段及受控启用条件 | 每层可回查D/L/G或体验/参与职责；不是9个数据库；不存在第7个正式L5真值 | `DESIGN_PASS` |
| ST-02 原件 | D00 source@ver/raw_item→私有字节hash→D01 locator；98旧指针单独待核 | blob必须对应正确权利、版本、源、保存许可、恢复manifest；不存在/未许可→HOLD | `DESIGN_PASS / BYTES_NOT_TESTED` |
| ST-03 安全 | Owner项目授权→外部AI最小包→按动作许可→拒无权；SEC-P0先修复再上线 | 所有拟新表/对象桶/操作可追到Actor、Owner和合法拒绝；Gate签名独立 | `DESIGN_PASS / RLS_RUNTIME_HOLD` |
| ST-04 13资产 | 13kind有工作独立修订或已有作品/媒资/导演真源链接，CAS/幂等/源修订 | asset@rev反查project/来源/权利/贡献，不随task删除，不能把作品引用封套当第二作品正文 | `DESIGN_PASS / CAS_RUNTIME_HOLD` |
| ST-05 内外AI | Studio有权读L0—4+工作候选，Agent读合格L5；外部AI仅接最小包，回候选/收据 | 读写接口从consumer/purpose/action/ref/rights返回唯一允许操作，拒外传/旧PASS/缓存复活 | `DESIGN_PASS / API_RUNTIME_HOLD` |
| ST-06 Admin归属 | F05 Admin内部知识子功能可读条目/原件/资格/消费/缺口 | 后台只读授权投影，无独立平台路由/知识真相表/运营代签G | `DESIGN_PASS / UI_DEFERRED` |
| ST-07 L6—8 | L6体验态、L7追加同意贡献、L8当代观察候选独立身份且可按权利删除/撤回 | 行为点击不可冒同意或文化新事实，L8仅通过D00受控入正式知识 | `DESIGN_PASS / ACTIVATION_DEFERRED` |
| ST-08 恢复预算 | 业务Blob+SQL双份快照、manifest/hash/locator、恢复默认关闭发布和Gate | 数据库备份不自动含blob；无权或超预算的源不能被复制/外发；明示恢复和失败责任 | `DESIGN_PASS / RESTORE_NOT_RUN` |
| ST-09 旧链保护 | D00—D05与G0—G5独立、六类L5与13 Studio种类继承，04路径唯一Owner | 每个新实体只补旧结构明确缺口，不重复另造World Truth/D01主表/作品表 | `DESIGN_PASS / MIGRATION_HOLD` |

### 本次定向修复的五项关键设计矛盾

1. **设计与工程双门拆开**：不以运行PG SQL、创建桶或上线部署作为KAD4专业设计准出前置；原任务书ST九门仍须逐门有主数据/接口/失败/测试责任。
2. **长久资产不能靠任务存在**：委托的`root_task_id`改为可空FK并保留不变的`root_task_ref/root_task_snapshot`；asset修订同样保存`origin_task_snapshot`，删除任务时仅解除短期链接。
3. **项目身份必须受权威约束**：`studio.projects.project_id`+Owner是首期稳态；新增任务的project_id映射仅作为有界适配，历史任务不能按主题自动回填，也不允许跨项目检索默认开放。
4. **引用须精确到修订**：Studio链接要求`target_revision_ref`明确，不允许只拿标题或主张名称推断跨题复用；作品/导演/媒体仍保持原主正文。
5. **同意撤回不能只覆盖一行**：L7贡献以series/修订/追加撤回保留审计，在失效Guard上执行实际停止使用；L8当代线索不因贡献而自动升格史料。

以上是KAD4专业语义与DDL**非执行草案**的修复，不表示上述约束已经在生产库具备。

## 3｜正式裁决、工程责任及切换

**专业设计裁决：`KAD4_PROFESSIONAL_DESIGN_EXIT_PASS`。** 现行KAD4方案§1—10、九层映射、非执行DDL草案、12候选表（11业务+1Gate候选）、44项正反测试设计、最小工程差异清单已对照ST-01—09完成**设计层正反核验**。该准出仅指业务+数据语义+保存/授权/恢复目标及落地路径可交接，不代表SQL可执行、G已激活、Storage文件存在或KAD5已运行。

**明确保留的工程/运行HOLD**：`SEC-P0 imported_materials RLS`、`GATECAND代码-DB缺表`、`98条raw_items存储指针未回放`、`L1→L2/L2→L3真链接0行`、`真实数据库角色/Gate签发`、`研究跨题权限/回执/修订原子性`、`Storage备份恢复及成本`、`WATCH当前G5+rights Guard`、`新目标规范尚未应用GitHub`、`PG隔离DDL/权限与KAD5真实双题均未运行`。这些不得被专业设计PASS覆盖，也不得用本审查报告当工程授权。

**单一工程承接原则**：不立即制作Codex施工包、迁移SQL或重新设计Admin页面；04/repo_target既有目标规范按其唯一Owner承接：物理DDL→`PERSISTENCE_BINDING_CONTRACT`；资产→`KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT`；安全→`SECURITY_ACCESS_CONTRACT`；受控调用→`API_TOOL_CONTRACT`；原D/G→原专业协议，L6—8→`EXPERIENCE_CONTRACT`及对应领域规范。新工程事实冲突才回溯这次设计定向修正；不得把GitHub迁移难度无期限转成KAD4研究HOLD。

**阶段报告最新衔接（2026-11-02 Owner设计先行裁决）**：KAD5双题验证**设计**已有专项脚本，真实运行按最新KAD-02 §00.8移交完整MAB设计交接后的工程线实施；**当前唯一下一项是KAD6全量设计目标集成和交付包双向自检**，不得先做最小工程实验。原KAD4专业设计准出继续有效，工程/权限/原件/Gate/两题真实LIVE仍HOLD；不因新排序重开KAD4的Storage语义研究。KAD3 UI独立递延。
