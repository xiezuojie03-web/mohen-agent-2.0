# MAB平台切换接续说明｜2026-11-03

Owner要求因额度不足把施工内容推送GitHub后换平台。本文件是接续索引，不另立设计/计划/进度账，不授予尚未确认的生产权限。

## 新平台开工入口

仓库：`xiezuojie03-web/mohen-agent-2.0`。唯一远端分支`main`。**先fetch最新main，不能固定回退到本文件记录的旧SHA。** 本交接前功能代码已在main，工作树干净；归档提交SHA通过Git历史确认。

顺序读取：

1. `AGENTS.md`、`CURRENT.md`。
2. `tasks/implementation/MAB/PLAN.md`、`target-diff.csv`、`progress.md`（唯一现行施工账）。
3. `tasks/results/MAB/M2_SECURITY_RECEIPT_20261102.md`及同目录`evidence/`、98条旧原件逐项CSV。
4. 本目录`inputs/MAB-ENG-01_Codex_工程施工增量交接书_20261102.md`。
5. `inputs/MoHen_MAB_完整设计交付包_20261102.zip`是原始完整设计输入，SHA256见`inputs/SHA256.json`；从包内00_README起读，按差分适配，**不得把repo_target旧镜像覆盖当前main**。

## 已推送的本轮工程

| 提交 | 内容 | 实际CI |
|---|---|---|
| `7e83f3b9f05643c310ee0524808b0f364913efaa` | 修复交接基线dae824f的5项附件路由mock失败 | 41460853487 SUCCESS |
| `4b75c7a2d4911952048c2d8cb3115d107425dcc1` | 私有原件真实PG/官方Storage闭环、资源限制、权限、PENDING恢复、rollback与98旧指针审计 | 41465083552 SUCCESS |
| `cf1c3ed61babd92179c886ebbebf36afcc3c159b` | 私有文本L0→L1→L2→准确L3 revision候选桥、独立短时字节核验签名、防SQL绕过及不可覆盖 | 41469702928 SUCCESS |
| `3ed0c8b89fd902e38d977564a455c92a6e45557f` | 补停滞408/不支持文件负测、109项单测与安全回执 | 41471113675 SUCCESS |
| `d3727ab384af581a4ec80db9554611e7127df512` | 工程账与具体交付SHA对齐 | 41471354205 SUCCESS |

没有未推送的功能源码。原本地UI stash已完整导出为`tasks/results/MAB/archives/20261103_UI_RECOVERY_UNAPPLIED.patch`，PNG和历史测试输出见相邻`20261103_UI_reference/`。该patch与当前main的8b3b9e1等成果重叠，作为未应用参考保全，不直接git apply，不复活旧状态账。

## 已实际验证及边界

- 本地109项单测PASS、4项既有联网SKIP；73项生产边界PASS；六工作区类型、正反consumer类型与Next生产构建通过。
- PG17.11真角色/RLS、Owner/跨账户/disabled/expired/伪造、CAS、不可变修订、回滚、公有/私有crypto布局通过。
- 官方Supabase Storage v1.43.0 localhost文件后端的真实HTTP测试通过：私有上传、无覆盖、认证回读hash/长度、400正文404、匿名公URL拒绝、篡改及中断恢复。
- 真实PG+Storage两系统故障、丢ACK、DB最终失败、PENDING恢复、并发、下载中撤权、同backup_id对象及pg_dump/pg_restore通过。
- Chromium实际Next HTTP两流程通过：研究记录全程；multipart原件存取与权限拒绝。
- 证据桥用实际合成中文原件验证精确UTF8字节偏移、source/version/raw/read_run/unit、材料引文、准确claim revision、Owner和项目、签名期限/范围及低权限SQL直调拒绝，不授专业Gate PASS。
- 默认`pnpm test`的旧`.env.local`/历史隔离包装器仍NOT_PASS，不等同上述专项。真实AI生产、PDF页码/图像区域读取及Owner完整体验没有准出。

## 生产状态与授权：必须保留HOLD

**平台切换前没有实施本轮新增生产迁移、bucket或核验密钥。**

尚未执行：

- `supabase/migrations/20261102140000_mab_m2_private_originals.sql`及rollback。
- `supabase/migrations/20261102145410_mab_m2_evidence_bridge.sql`及rollback。
- 私有bucket `mohen-private-originals`、`MOHEN_PRIVATE_STORAGE_SERVICE_KEY`、`MOHEN_ORIGINAL_BRIDGE_SECRET`及DB对应私有核验key的实际配置。
- `MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED`启用；默认关闭必须继续保持。

上一轮已向Owner提出有界生产准备确认（两份迁移、仅后台私有桶、独立核验密钥；不删历史、不授G、不公开、不升级免费套餐，开关先关），**截至本次切换未收到该项回复**。本次“全部推送GitHub”不是该生产准备的批准。新平台先核Owner是否随后另行批准，未批准不得据旧文案自行执行。

现有生产只读事实：项目Supabase `fwrhxddcpkibsnmddcfl` / mohen-cloud；组织当时free；private_originals不存在、Storage桶0；98条旧原件（93 memory指针，5仓库图片hash匹配但非私有对象），两桥0；专业资格guard/策略/Reviewer绑定尚未安装，candidate及资格投影各0。重核后再施工，不把历史快照当新实测。

现有Vercel项目`mohen-agent-2-0`（team napoles1），正式域名`mohen-agent-2-0.vercel.app`。按Owner裁决：GitHub优先、CI按批，关键集成门集中体验验收；保留自动部署，不逐提交手动触发/核对Vercel，不拿READY代替准出。

## 下一批顺序

1. 确认最新main、CI及工作树；复用现有测试与账，不重做MAB/KAD架构研究。
2. 在明确生产授权与私有凭据条件具备后，先备份/只读预检，再应用M2候选迁移、私有bucket与独立核验key；先保持开关关闭，受控合法样本验证后才考虑启用。失败关闭权限，保留原件/修订/收据，不删历史或恢复公有上传。
3. 将现有字节核验与证据桥服务接入原D00—D03受授权worker。旧layer1-adapters的memory原件、batch_level/第一条材料归属不能充当准确来源。PDF页码/图像区域需真实读取/定位，不推断补齐。
4. 原M3：真实独立Reviewer、策略/角色/资格守卫/撤权；不能由Producer或作品审核代签G。
5. 原M4—M8继续：受控内外AI协作与永久回执、Studio/Admin/WATCH/EXP、KAD5双题、恢复/资格/全动作回归与M8 MHKA原子切换。AGENTS旧权威入口仍有效，未完成前不宣布新旧双活。

## 密钥、预算与环境

- 密钥值、登录cookie、生产DB连接密码、临时合成DB备份均不进GitHub。现有生产配置保留在服务商安全环境中，新平台通过正式连接重获权限，不从日志抄凭据。
- AUTH_SECRET已在此前c032ec6新部署生效；Owner新增MOHEN_DATABASE_PASSWORD后网站只读DB查询通过，但旧密码失效未独立验证；误改的MOHEN_DATABASE_SESSION_SECRET曾恢复。其它已暴露旧服务凭据轮换仍待闭合。不要混淆这三类变量。
- 之前批准沿用模型服务且本轮费用上限20元；此施工没有付费模型调用，不能据此推断新平台余额或额外费用批准。
- 本地PG/Storage地址是旧平台合成测试环境，不能当生产连接；专用官方Storage/HTTPS fixture及其自建DB已清理。新平台应按已有脚本重建带标记的隔离环境。当前脚本的/workspace路径保护需按真实环境安全适配，不能移除隔离门以“跑通”。

可直接给下一平台：

> 从GitHub最新main接续墨痕MAB工程。先读tasks/implementation/MAB/PLATFORM_HANDOFF_20261103.md及其索引文件，保留main已有成果和原M0—M8唯一账。先核CI与真实环境，接续M2原件/证据桥与生产worker接线，再沿M3—M8推进。生产准备确认仍未回复，不把本次平台迁移当批准；保留失败关闭和专业Gate独立边界。原设计ZIP与增量交接书已归档inputs，禁止覆盖main旧镜像。按批测试提交并原位更新账，不逐提交Vercel体验验收，交付实际测试与安全回执。
