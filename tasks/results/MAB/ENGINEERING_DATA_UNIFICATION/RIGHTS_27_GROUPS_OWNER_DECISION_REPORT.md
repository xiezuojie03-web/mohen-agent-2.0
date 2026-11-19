# 27 组 Source/Version 权利字段冲突｜证据核查与 Owner 决策报告

> 专项：M5-P3-RIGHTS-RECONCILIATION-01（MOHEN-ENGINEERING-DATA-UNIFICATION-01 子项）
> 时间：2026-11-19 ｜ 方式：双端只读核查，零写入、零模型调用、零费用
> 数据明细：RIGHTS_27_GROUPS_EVIDENCE_RECONCILIATION.json（27 组逐条、动作级分类、云端迁移语句全文）

## 1. 核查结论（先说结论）

**云端"清空"不是数据损失，而是授权标定从未在云端执行。**

- 27 组冲突来源**全部为 `shanghai-library` 提供方**（上海图书馆开放数据平台，data1.library.sh.cn，含合作机构）。
- 云端权利投影迁移（20261116121153 / 20261119004253）的逻辑只是**新增列并默认空对象 `{}`**，从未删除或改写任何既有值——云端列生来为空。
- 本地的权利值来自 2026-11-08 的**Owner 明确授权标定**（工具 `tools/stamp-shl-open-data-rights.mjs` 写入），且 27 组共享同一份完整结构化证据（见 §3）。
- **无 HISTORICAL_VALUE_LOST**：原始依据完整保留在本地 `rights_evidence` 列与版本 `rights_snapshot` 中。

## 2. 27 组动作值全景（高度一致）

本地 27 组的 rights_by_action 模式完全相同：

| 动作 | 本地值（27/27） | 云端值 | 动作级分类 |
|---|---|---|---|
| quote（引用） | allowed | {}（键不存在） | **EVIDENCE_SUPPORTED_ALLOWED** |
| retain（留存） | allowed | {} | **EVIDENCE_SUPPORTED_ALLOWED** |
| access_view（访问查看） | allowed | {} | **EVIDENCE_SUPPORTED_ALLOWED** |
| machine_read（机器读取） | allowed | {} | **EVIDENCE_SUPPORTED_ALLOWED** |
| adapt（改编） | unknown | {} | NO_EVIDENCE（正确 HOLD） |
| display（展示） | unknown | {} | NO_EVIDENCE（正确 HOLD） |
| download（下载） | unknown | {} | NO_EVIDENCE（正确 HOLD） |
| redistribute（再分发） | unknown | {} | NO_EVIDENCE（正确 HOLD） |
| external_processing（外部处理） | unknown | {} | NO_EVIDENCE（正确 HOLD） |

统计：108 个 EVIDENCE_SUPPORTED_ALLOWED（27×4）、135 个 NO_EVIDENCE（27×5，与本地 unknown 语义一致，双端均按失败关闭 HOLD）。

## 3. 授权证据（27 组同一份，逐字段）

```json
{
  "schema": "mohen.rights-evidence.v1",
  "basis": "owner_authorization",
  "owner_decision_at": "2026-11-08",
  "dataset": "Shanghai Library Open Data Platform (data1.library.sh.cn) incl. partner institutions",
  "scope": "project_internal_research",
  "granted_actions": ["access_view", "machine_read", "retain", "quote"],
  "held_actions": ["display", "download", "adapt", "redistribute", "external_processing"],
  "recorded_by": "tools/stamp-shl-open-data-rights.mjs",
  "note": "Other providers and external_processing remain HOLD pending explicit owner decision."
}
```

- **授权主体**：Owner（2026-11-08 决定）；**权利主体**：上海图书馆开放数据平台及合作机构；**授权范围**：项目内部研究（project_internal_research）。
- **限制条件**：5 个动作明确搁置 HOLD；用途限定内部研究；无地域/有效期字段（证据未设到期）。
- **可追溯性**：本地 27 个来源的版本 rights_snapshot 与来源值一致（防"先登记后补权"触发器保护下的合法写入）。
- 未把"公开可访问"等同于复制/保存/机器读取授权；未做动作间推导——每个动作分类独立。

## 4. 云端处理逻辑与合规性

云端 20261119004253 迁移建立了**比本地更严**的约束：动作键白名单（9 键）+ 值域（allowed/denied/unknown/restricted）+ `is_rights_actions_valid` 校验 + 快照不可变触发器。**本地值与云端约束完全兼容**（9 键与值域均合法），迁移本地值不会违反云端任何现行约束。

## 5. 处理建议（交 Owner 裁决，未执行任何变更）

| 类别 | 内容 | 建议 |
|---|---|---|
| 可以恢复的权利动作 | 27 组 × 4 动作（quote/retain/access_view/machine_read） | P4 时将本地 rights_by_action + rights_evidence **连同授权证据一起迁移**（这不是"继承本地 allowed 推断"，而是迁移 Owner 2026-11-08 授权记录本身；迁移后云端正式读取即可按现行函数判定这些动作为合法授权） |
| 必须保持空值的权利动作 | 27 组 × 5 动作（adapt/display/download/redistribute/external_processing） | 云端保持空/unknown，本地同样 unknown，双端一致 HOLD；未来需放开时由 Owner 显式决策 |
| 需要进一步确认的动作 | 无 | — |
| 无法恢复的历史信息 | 无 | 原始依据完整保留于本地 |

附注（可选统一项）：云端空对象 `{}` 与本地 `{各动作:unknown}` 语义等价（均 HOLD），若希望云端可读性更好，可在 P4 将 5 个 held 动作写成显式 unknown——是否统一由 Owner 决定。

## 6. 执行限制遵守情况

未修改任何权利字段、未恢复云端值、未批量继承 allowed、未调用模型、未触碰 Gate/资格、未重新生产来源。本轮状态：**EVIDENCE_RECONCILIATION_COMPLETE / OWNER_DECISION_PENDING**。
