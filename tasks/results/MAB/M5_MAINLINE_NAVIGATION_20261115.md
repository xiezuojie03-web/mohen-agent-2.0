> **2026-11-18｜Codex Cloud 首批：Node 数据生产套件 357/357 通过；GitHub Actions 在 runner 启动前因账单或支出上限拦截。Vercel staging 唯一部署 URL 的匿名 /login 返回 302 至 Vercel SSO，Preview 与 staging 过滤均返回同组部署，Custom Environments 为空，四项机器变量仅 Preview，部署实际注入仍待证实。Production 自动 Git 部署已关闭，正式域仍指向 83560224。机器真实 TLS、低权限云端验证及同作品八维仍 HOLD。**

# 墨痕 M5 全链路导航｜现行主线分流与工程断点（非权威）

> **2026-11-18第五批机器凭据更新**：Owner经Supabase iPad网页已安全初始化Producer/Worker两专用LOGIN密码，数据库只读确认均已配置、无BYPASSRLS；无需再重复重置。为避免用户手工编码特殊字符，已在现有Cloud Runner加入两条URL（不含密码）＋两条Vercel仅Preview Secret原始密码的独立内存编码能力；精确代码`eaf233f5`受保护staging构建READY，尚未配置4项Vercel变量，真实TLS未测。后续先配置Preview、再测低权限/独立Gate，不得提交密码到对话/GitHub；M5仍0/8。

> **2026-11-18第四批（真实数据库变更与拒绝验收）**：已在开发`mohen-cloud`实际应用`studio.search_qualified_project_layers`受控窄读函数（云迁移`20261117172439`），Studio经现有签名Owner会话、受限角色事务、ACTIVE Project归属核验后调用；不向应用账号开放正式表SELECT。PG实测：app_runtime可执行，匿名、认证、service_role、Producer无执行权；无合法Owner会话42501拒绝。受保护staging精确代码`3d0ace33` READY/类型检查通过，GitHub Node CI仍NOT_VERIFIED。**当前项目0、有效Gate资格0、Policy0、active Reviewer0；真实正向复用和撤权均未通过。** B线机器角色密码仍NULL，Preview为无效占位、必须安全管理员通道激活；Production未改。**M5 0/8 OVERALL_HOLD**；37节点54连接状态未提升。


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
| **业务功能最前断点** `STUDIO_UNIFIED_L0_L5_ROUTING` | Studio研究决策入口 | 已接Project候选/现行G0—G4/G5及开发DB实际受控窄读桥，代码`3d0ace33`受保护Preview READY，PG负权限通过。**当前没有Owner Project或有效Gate资格，合法正向/错权/撤权和共享ACL仍HOLD**；不得误启动D00 |
| **子路径云端运行HOLD** `E_D00_REVIEW`、`E_D00_QUALIFY` | 任务确实选择新来源/补来源准入时 | 低权Producer/Worker、Executor、独立Gate策略/绑定/凭据以及同Root真实资格消费仍未接通；继承原件、Runner、Reviewer，不重建 |
| **后续实际接收待验** `E_L1_TO_D02` | 已有同Root当前L1/G1且目标需D02 | C01 typed接口已有代码，待真实云端接收、独立G2及负例；不要把旧接口当缺代码重做 |

**现行准出**：同一真实作品M5八维 `0/8 OVERALL_HOLD`，仅为最近审计时点，非代码完成率。运行事实先重新核查最新main/CI/PG/HTTP及受保护部署。

## 3. 机器与交互导航的精确读取

- [JSON机器导航](M5_MAINLINE_NAVIGATION_20261115.json)：先读 `creative_mainline_routing`，再读 `navigation_policy`、`audit_tracking.next_frontier`、`construction_tracking`，最后按受影响 `nodes[]/edges[].verification_layers` 查原证据。
- [HTML交互主图](M5_MAINLINE_NAVIGATION_20261115.html#creative-route)：顶部先展示新增分流；旧37节点、54连接仍按原图展开定位。D00独立签发可点[审核](M5_MAINLINE_NAVIGATION_20261115.html#edge-E_D00_REVIEW)与[资格](M5_MAINLINE_NAVIGATION_20261115.html#edge-E_D00_QUALIFY)。
- **证据不变**：37节点、54连接（M5 52条，EXP未来2条），原`verification_layers`、历史SHA/回执、8维分母、10组内部链均不提升、不删除。新分流是顶层条件编排说明，不是假造新增主图边或生产Gate。

## 4. 下一项无需Owner参与的工程任务

1. 取得既有受保护非生产部署上四项机器变量的服务端存在性回执。只记录部署 ID、环境标识及布尔值。
2. 保护与注入同时证实后，复用专用连接池及身份检查完成真实 TLS、允许与拒绝、Secret 不透传验证。
3. GitHub Actions 恢复 runner 后重跑精确 main SHA，回读每个受影响作业。
4. 等合法 Project/Root、当前资格、独立 Policy/Reviewer Binding 就绪，再验证同作品从 Studio 到 WATCH 及撤权。

Codex Cloud按额度启停，不是永久模式。每批必须把代码、测试、SHA、部署/运行回执和下一断点同步GitHub；任何未提交成果必须显式保留并标记，ChatGPT接手只以GitHub main和本账为准。
