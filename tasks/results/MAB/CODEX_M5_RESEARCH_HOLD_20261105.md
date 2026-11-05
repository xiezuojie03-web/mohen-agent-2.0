# M5 / HP10 / ST01：自然语言研究委托的真实HOLD业务

日期2026-11-05（北京时间）；BASE3873256，本批源码`876ff39be2990c888b9075d0e42d7146de171d48`。仅VERIFIED_ISOLATED，M5整体HOLD。

## 实码与实测

- Studio原自然语言入口保留原意图，真实创建研究任务；缺实际llmUnderstand所需MOHEN_LLM_BASE_URL/API_KEY、上海来源key（两别名）、Agent精确read上下文或持久账本时，在首个工具前明确HOLD。Provider配置存在不代表健康、付费或外发获授权；不调用模型验证密钥。
- 同一既有research_tasks/checkpoint/研究事件/回执持久保存暂停原因、缺口、预算和原委托；不伪造research_done/decision/正式G。恢复沿已有CAS，只对零spent/零reserved的首步骤前置HOLD重新检查；非零费用、UNKNOWN/不确定回执不能靠重复请求重放。追加消息继承同一HOLD规则。
- 实际模型理解返回deterministic fallback时保守HOLD；即使Provider返回unknown而被旧understand映射回deterministic，也不冒称已理解，此精细分类限制保留。来源或资格运行时degraded同样HOLD，有限decision/leads保留在私有partial_result，不报告完成，不自动触发正式生产。
- Studio浏览器可见“委托已保存，研究暂停，尚未完成”、原因与任务编号。暂停任务刷新后通过原status可读；无收费tool回执/预算spent/reserved均0，无production，跨Owner读/恢复拒绝；同任务恢复仍HOLD，既有预算/CAS不放宽。匿名ask改为明确409前置HOLD，绝不建立无账本付费旁路。
- 公开materials只用专门MOHEN_PUBLIC_AGENT_QUALIFICATION_CONTEXT，不能继承MOHEN_G5_CONTEXTS.agent内部研究上下文；配置仍非授权，实际数据始终核独立当前G5。HTTP harness清空所有模型/上海key别名，避免继承真实配置发起外部调用。

## 真实测试与审查

定向缺前置/匿名ask/公私context各先RED再GREEN；来源降级原done真实1FAIL→HOLD/保留有限结果GREEN。25定向测试、全套444PASS/4原实网SKIP、六workspace类型通过。完整Next构建＋Chromium最终17PASS/1Storage缺配置SKIP，含新MAB_ST01_RESEARCH_HOLD_HTTP_PASS与原三消费者/WATCH/修订/Admin回归；数据库清除。独立review重跑24定向测试无Critical/Important；source runtime degraded范围限制由本批额外RED→GREEN修复，未以旧通过掩盖。旧Provider unknown分类限制具名保留。

不称ST01—04完成：实际新题理解/DAG执行、合法原件获取/长期候选资产、唯一D00—D05/独立G与导演/WorkRevision/Admin追溯仍待继续接线；已有计划登记与本批HOLD不是完整研究正例。M4混合协作、外部候选七关、预算授权及M1—M4生产条件继续。

## P0-A精确GitHub核证

上一批源码1cd854408a54e4ac98aed80b0cd317e287893f05，推送HEAD3873256b39c3a93fb19337db7a19f6fa6a26dcea：主CI41940583300、PG1741940583316、HTTP41940583384全SUCCESS。HTTP job126960047011实际日志三消费者标记、16PASS/1StorageSKIP、数据库清除已核实；原声明仅L5实际入口，不升级为整稿三消费者HTTP或独立版权回执验收。新增公开Agent专门context以本批替代前批读取全局context的接线。

本批GitHub结果取得后追加。回滚关闭对应contexts/恢复服务HOLD，不恢复无账本付费、静态降级假完成或公私上下文共用。无生产DDL/正式G/真实Provider/私人外发/费用操作。
