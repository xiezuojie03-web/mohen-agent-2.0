# 墨痕 M5 全链路导航｜现行主线分流与工程断点（非权威）

> **2026-11-18双线最新实际进展**：A线现已接入当前Project的正式G0—G4资格读取适配器，受保护staging代码SHA `b4bbd1cc`构建/类型检查READY；但云库现行资格投影为0，正式读权限不匹配（测试postgres没有资格函数EXECUTE，app_runtime虽可EXECUTE但缺正式表SELECT），无法证明真实有效Gate复用。跨Project共享合法ACL未建立，缺来源仍为`SOURCE_GAP_UNCONFIRMED`。B线Producer/Worker两个LOGIN密码仍NULL，Preview敏感变量为不可登录占位，Cloud Executor/独立Gate未启用；执行接口的安全检查阻断密码设置。**M5仍0/8 HOLD，14组单元测试实际回执未验**。真实证据见[progress](../../implementation/MAB/progress.md)本批。


> **2026-11-17｜第一批真实代码进展**：GitHub main已接Studio当前Project L0—L4**候选**与既有G5 L5**合格**读模型，安全路由仅做缺口与资格判断，不擅触D00；受保护非生产构建`344a763d` READY（Next类型/页面构建通过），单测CI未获可核回执、Owner同Root云运行未执行。**共享全局L0—L4合格检索仍是最前实际代码缺口，M5仍0/8 HOLD。** 精确批次详见[progress](../../implementation/MAB/progress.md)。


> 2026-11-17定向同步。**本文件是机器JSON的可读解释，不是第二任务书**。唯一施工顺序：[PLAN §3.5 B/C/D](../../implementation/MAB/PLAN.md)；最近云端事实：[CURRENT](../../../CURRENT.md)；精确代码问题：[Studio→Admin审计 §7](M5_STUDIO_TO_ADMIN_CHAIN_AUDIT_20261117.md)。同步前全文已[原样归档](archive/M5_MAINLINE_NAVIGATION_MD_PRE_ROUTING_20261117.md)，其中历史“下一步”不得执行。

## 1. 唯一现行业务主线：先检索，再决定是否生产

```text
Studio用户问题（同一Creator/Project/Root）
  ↓
统一检索L0—L5（项目私有＋合法共享；当前Gate、rights、ACL、purpose、consumer、source/version）
  ↓
Agent识别可复用资产、缺口及真实研究目标
  ├─已有合格L0—L5：精确版本直接复用，不重复上游
  ├─原件/候选已在库但缺资格：只补登记、当前独立Gate及必要审查
  ├─合格L0已有、缺读取L1：按批准输入进入D01/G1
  ├─仅缺下游成果：按Registry/Runner支持的typed input补最早必要阶段
  ├─确实缺少来源：D00 Y01—Y08发现/合法获取→私有存储/SHA/source版本→独立G0
  └─Owner主动上传/指定：可选输入，按原件/研究成果/笔记/创作素材分类
  ↓
合法研究成果＋适用的知识资产→H1/H2/H3导演与不可变WorkRevision
  ↓
Creator投稿→作品Reviewer审核＋独立专业G5＋媒体权限→Operator发布→WATCH与撤权
```

分流不是绕过Gate。L0—L5是统一知识资产认知；D00—D05是统一生产能力；G0—G5是阶段独立资格。禁止把“上传字节→D00→G0”误当所有问题的起点；同时不能把已有L1—L5复用误称为任意D阶段跳转已实现。Agent与外部Provider的权限、真实费用Receipt、安全运行和恢复随进入的具体节点处理。

## 2. 本轮两类不同前沿

| 前沿 | 适用范围 | 事实与下一动作 |
|---|---|---|
| **业务功能最前断点** `STUDIO_UNIFIED_L0_L5_ROUTING` | 所有Studio研究的决策入口 | **已做第一、二批定向接线**：`runResearch`组合Owner当前项目L0—L4未评估候选、Project限定正式G0—G4资格读取和G5合格L5；`knowledge_route`有显式分流。**仍缺合法共享全局L0—L4授权/当前资格检索**，无源只能标`SOURCE_GAP_UNCONFIRMED`而不自动D00。受控Preview精确344a763代码构建READY，单测和同Root实跑未验 |
| **子路径云端运行HOLD** `E_D00_REVIEW`、`E_D00_QUALIFY` | 任务确实选择新来源/补来源准入时 | 低权Producer/Worker、Executor、独立Gate策略/绑定/凭据以及同Root真实资格消费仍未接通；继承原件、Runner、Reviewer，不重建 |
| **后续实际接收待验** `E_L1_TO_D02` | 已有同Root当前L1/G1且目标需D02 | C01 typed接口已有代码，待真实云端接收、独立G2及负例；不要把旧接口当缺代码重做 |

**现行准出**：同一真实作品M5八维 `0/8 OVERALL_HOLD`，仅为最近审计时点，非代码完成率。运行事实先重新核查最新main/CI/PG/HTTP及受保护部署。

## 3. 机器与交互导航的精确读取

- [JSON机器导航](M5_MAINLINE_NAVIGATION_20261115.json)：先读 `creative_mainline_routing`，再读 `navigation_policy`、`audit_tracking.next_frontier`、`construction_tracking`，最后按受影响 `nodes[]/edges[].verification_layers` 查原证据。
- [HTML交互主图](M5_MAINLINE_NAVIGATION_20261115.html#creative-route)：顶部先展示新增分流；旧37节点、54连接仍按原图展开定位。D00独立签发可点[审核](M5_MAINLINE_NAVIGATION_20261115.html#edge-E_D00_REVIEW)与[资格](M5_MAINLINE_NAVIGATION_20261115.html#edge-E_D00_QUALIFY)。
- **证据不变**：37节点、54连接（M5 52条，EXP未来2条），原`verification_layers`、历史SHA/回执、8维分母、10组内部链均不提升、不删除。新分流是顶层条件编排说明，不是假造新增主图边或生产Gate。

## 4. 经Owner审阅后下一项施工任务（尚未启动）

继承2026-11-17第一批已实现的`knowledge-routing.mjs`及Owner项目L0—L4候选/G5合格L5初步接线；**下一批首先补全合法共享L0—L4当前资格检索、证实缺源及按需D分支调用**，随后基于同Root真实资产正反运行。原计划曾要求：继承`apps/web/lib/mohen-agent/research.ts`、`retrieve.ts`、`studio-research-read.ts`、G5读模型及现有ACL/资格服务。先做现有资产直接复用、无权限拒绝、已有L0缺L1、确实缺来源与用户可选上传的最小可验证分流，不新建知识库/Runner/Gate。对云执行低权角色、Executor、独立Reviewer配置可并行做授权范围内的准备；真实同Root运行仍按依赖推进。每批实际回执入progress，相关状态才更新CURRENT及三件导航；不以文档同步冒充业务施工。
