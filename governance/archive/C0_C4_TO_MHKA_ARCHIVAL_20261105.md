# C0—C4 最后版本归档与 MHKA 承接索引（2026-11-05）

> **性质：历史归档凭证，非现行 Authority；不是新的章程、任务计划或运行退役证明。**

## 决策与边界

- 2026-11-05 Owner 明确本轮 Codex 优先验证开发 Skill 并按 M5 施工；CodeBuddy 待日后转入时独立验证，不阻断 M5。
- 现行工程设计权威已由根 `AGENTS.md` 指向 `governance/mhka/MHKA-00—05`。原 `governance/` 根目录 C0—C4 最后版本不再承担工程设计权威，按 MHKA-00 §8 与 `OWNERSHIP_MAP.md` 归档。
- **仅移动文档位置，原 Git Blob 完全保留且内容未改；既有更早历史版本仍在 archive**。历史研究与迁移记录可能保留旧路径，按下表映射定位；旧文档不能因可检索而重新取得 Authority。
- **M8 继续拥有正式生产运行切换、旧运行代际退役、兼容路径验证、生产权限/数据恢复及最终交接的验收责任**。本次归档不说明旧运行代码已退役、迁移/Gate/上线已通过。

## 原件保全与继承

| 历史版 | 原路径 | 归档新路径 | 原始 Git Blob SHA-1 | 新架构承接入口（非一一替换合同） |
|---|---|---|---|---|
| C0 | `governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.1.md` | `governance/archive/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.1.md` | `718c1e484b11a1e5dcdcb7ddc850c246f047c2f5` | MHKA-00 治理；同时应按当代具体职责追溯 MHKA-05 |
| C1 | `governance/C1_MoHen_Product_Architecture_Evolution_Constitution_V1.1.md` | `governance/archive/C1_MoHen_Product_Architecture_Evolution_Constitution_V1.1.md` | `05badc0171b956f1ec6b45254e79889426219ee9` | MHKA-01 价值战略；产品/体验另依 MHKA-02 |
| C2 | `governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.3.md` | `governance/archive/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.3.md` | `47f5419204fffb1868ce64bb025bd2f2c4fce6c0` | MHKA-04 Agent/专业能力；知识与 D/L/G 语义另依 MHKA-03 |
| C3 | `governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.4.md` | `governance/archive/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.4.md` | `aae8258ed96793f494c6f9a62054dfd3e163ebd3` | MHKA-03 知识世界；机器数据库合同另依 MHKA-05 |
| C4 | `governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.2.md` | `governance/archive/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.2.md` | `c3ca84eb42128e3c167c0b4bbe6f1c5f30d39a3d` | MHKA-02 人文产品与体验；技术实现另依 MHKA-05 |

**验证标准**：根 `governance/` 不再有 C0—C4 最后版本；上述五个归档文件均存在且 `git hash-object` 等价哈希对应表内原 Blob；根 `AGENTS.md` 仍路由六份 MHKA；现有 MAB/M5/DS 状态和旧运行兼容责任保持不变。相关机器检查在 `scripts/guards/check-authority-routing.mjs`，不声称完成全仓库历史文本的逐一链接改写。

**恢复原则**：历史原件可从 Git/归档目录按上述 Blob 精确回读；如某个旧运行工具仍引用原路径，应针对工具单独建立受控兼容适配，不得将旧宪法正文恢复为活跃规范；生产回滚只能恢复仍合法的状态和权限。
