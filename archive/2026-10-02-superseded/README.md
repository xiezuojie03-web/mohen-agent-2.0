# 2026-10-02-superseded — 结构整治批次清单

> 本批次依 **R14（不删除只归档）** 执行：项目拥有者 2026-10-02 确认"不删除只归档"覆盖原「`git rm`」纪律，并确认当前施工图为**第 3 代**。
> 归档规则见 [`specs/OWNERSHIP_MAP.md`](../../../specs/OWNERSHIP_MAP.md) §1。
> 本批**只移动、不删除**；文件正文一字未改。

| # | 原路径 | 归档路径 | 归档理由 | 取代者 / 保留者 |
|---|---|---|---|---|
| 1 | `prototypes/交互原型_V0.9.1.html` | `archive/2026-10-02-superseded/交互原型_V0.9.1.html` | **逐字节重复副本**：与 `specs/experience-ui/source/交互原型- 墨痕 V0.9.1.html` SHA256 完全相同（`4C33904596F3A064…`） | 保留 `specs/experience-ui/source/` 侧（被 `AGENTS.md` §1 路由） |
| 2 | `docs/墨痕_五母题叙事与生产深化主稿_V0.1.md` | `archive/2026-10-02-superseded/墨痕_五母题叙事与生产深化主稿_V0.1.md` | **逐字节重复副本**：与 `specs/experience-ui/source/墨痕_五母题叙事与生产深化主稿_V0.1.md` SHA256 完全相同（`F8AED9BB28456B32…`） | 保留 `specs/experience-ui/source/` 侧 |
| 3 | `specs/experience-ui/source/墨痕_UI架构与人文叙事_完整审查及后续任务_V1.1.docx` | `archive/2026-10-02-superseded/墨痕_UI架构与人文叙事_完整审查及后续任务_V1.1.docx` | **被取代版本**：同族已有 V1.2 | `specs/experience-ui/source/墨痕_UI架构与人文叙事_完整审查及后续任务_V1.2.docx` |
| 4 | `specs/experience-ui/施工图/T05_B1_五母题帧索引.md` | `archive/2026-10-02-superseded/T05_B1_五母题帧索引.md` | **第 2 代施工图**，被第 3 代取代（项目拥有者 2026-10-02 确认） | `prototypes/墨痕_五母题施工审阅_第一批_M1_V0.1.html` + `docs/墨痕_五母题施工审阅_第一批_M1_配套规格_V0.1.md` |
| 5 | `specs/experience-ui/施工图/T05_B1_M1_完整实例.html` | `archive/2026-10-02-superseded/T05_B1_M1_完整实例.html` | 同上（第 2 代） | 同上 |

## 影响与后续确认

- 第 4、5 项的移动使 `specs/experience-ui/施工图/` 目录清空。该目录结构变更依 `specs/experience-ui/README.md` §3 属须由项目拥有者确认的事项 —— **本次已获确认**（"不删除只归档" + 第 3 代施工图确认）。
- 同步更新：`AGENTS.md` §1（施工图条目改指第 3 代）、`CURRENT.md` §10 与 §12 R14、`specs/OWNERSHIP_MAP.md` §2.1。
- 本批次**未**处理：C4 §316–344 的 8 张原型图断链、C2 §3.1 缺失的 `mohen-spatial-grounding`、`specs/DATA_CONTRACT.md` 五层 vs C2/C3 八层、`tasks/` 下的历史过程报告（R14 第二批次）。
