# 2026-10-02-superseded — 结构整治批次清单

> 本批次依 **R14（不删除只归档）** 执行：项目拥有者 2026-10-02 确认"不删除只归档"覆盖原「`git rm`」纪律，并确认当前施工图为**第 3 代**。
> 归档规则见根目录 [`OWNERSHIP_MAP.md`](../../OWNERSHIP_MAP.md) §1。
> 本批**只移动、不删除**；文件正文一字未改。

| # | 原路径 | 归档路径 | 归档理由 | 取代者 / 保留者 | 被引用于 |
|---|---|---|---|---|---|
| 1 | `prototypes/交互原型_V0.9.1.html` | `archive/2026-10-02-superseded/交互原型_V0.9.1.html` | **逐字节重复副本**：与 `specs/experience-ui/source/交互原型- 墨痕 V0.9.1.html` SHA256 完全相同（`4C33904596F3A064…`） | 保留 `specs/experience-ui/source/` 侧（被 `AGENTS.md` §1 路由） | 无（原 `prototypes/` 未被任何活跃文件按路径引用） |
| 2 | `docs/墨痕_五母题叙事与生产深化主稿_V0.1.md` | `archive/2026-10-02-superseded/墨痕_五母题叙事与生产深化主稿_V0.1.md` | **逐字节重复副本**：与 `specs/experience-ui/source/墨痕_五母题叙事与生产深化主稿_V0.1.md` SHA256 完全相同（`F8AED9BB28456B32…`） | 保留 `specs/experience-ui/source/` 侧 | 无 |
| 3 | `specs/experience-ui/source/墨痕_UI架构与人文叙事_完整审查及后续任务_V1.1.docx` | `archive/2026-10-02-superseded/…_V1.1.docx` | **被取代版本**：同族已有 V1.2 | `…_V1.2.docx` | 无（V1.1 未被活跃文件按路径引用） |
| 4 | `specs/experience-ui/施工图/T05_B1_五母题帧索引.md` | `archive/2026-10-02-superseded/T05_B1_五母题帧索引.md` | **第 2 代施工图**，被第 3 代取代（项目拥有者 2026-10-02 确认） | `specs/experience-ui/施工图/墨痕_五母题施工审阅_第一批_M1_V0.1.html` + `…_M1_配套规格_V0.1.md` | 无（`AGENTS.md` §1 已改指第 3 代） |
| 5 | `specs/experience-ui/施工图/T05_B1_M1_完整实例.html` | `archive/2026-10-02-superseded/T05_B1_M1_完整实例.html` | 同上（第 2 代） | 同上 | 无 |

> **"被引用于"一列为 2026-10-02 结构整治后补入**（见 `OWNERSHIP_MAP.md` §1 规则 4）：归档时必须一并查出引用者并改引用，否则引用会静默失效——这正是 C4 八张原型图长期断链的成因。

## 本批次的后续结构变更（同日，另两批）

| 变更 | 说明 |
|---|---|
| **`OWNERSHIP_MAP.md` 上移仓库根目录** | 由 `specs/OWNERSHIP_MAP.md` → `/OWNERSHIP_MAP.md`；与 `AGENTS.md`、`CURRENT.md` 构成"根目录三件套"。同时新增机器守卫 `check-structure-map.mjs` / `check-links.mjs`。 |
| **`docs/` 与 `prototypes/` 退役** | 其 5 个文件全部**迁入 `specs/`**（非归档）：UI 相关 4 份进 `specs/experience-ui/`（其中施工图 2 份进 `specs/experience-ui/施工图/`），夜间协议进 `specs/`。两个目录随后为空并移除。**此后 Experience/UI 内容一律放 `specs/`。**（依项目拥有者 2026-10-02 决定） |

> 注：`docs/` 与 `prototypes/` 的退役属**迁入 specs/**，不是归档——文件仍在活跃区，只是换了归属目录。
